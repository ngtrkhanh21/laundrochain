import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { maintenanceApi } from '../api/maintenanceApi';
import { devicesApi } from '../api/devicesApi';
import { sitesApi } from '../api/sitesApi';
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Search,
  Check,
  RotateCw,
  X,
  History,
  FileText,
  User,
  ShieldAlert,
  Sparkles,
  Layers,
  Cpu,
  Key,
  Copy,
  ExternalLink,
  Activity,
  HardDrive,
  Navigation,
  Radio,
  Info,
  Server,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// HELPER: Format Date Time
// ============================================================================
function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// ISSUE TYPES & HELPER FUNCTIONS
// ============================================================================
export const ISSUE_TYPES = [
  { value: 'MACHINE_STOPPED', labelVi: 'Máy dừng đột ngột / Mất nguồn điện', labelEn: 'Machine Stopped / Power Failure' },
  { value: 'DOOR_LOCKED', labelVi: 'Kẹt cửa máy / Không mở được lồng', labelEn: 'Door Locked / Cannot Open' },
  { value: 'WATER_LEAK', labelVi: 'Rò rỉ nước / Thoát nước chậm', labelEn: 'Water Leak / Slow Drainage' },
  { value: 'NOISE_OR_SMOKE', labelVi: 'Tiếng ồn bất thường / Mùi khét', labelEn: 'Abnormal Noise / Smoke' },
  { value: 'HARDWARE_MALFUNCTION', labelVi: 'Hỏng phần cứng / Lỗi bo mạch điều khiển', labelEn: 'Hardware Malfunction / Board Error' },
  { value: 'NETWORK_DISCONNECTED', labelVi: 'Mất kết nối mạng / Ngoại tuyến', labelEn: 'Network Disconnected / Offline' },
  { value: 'OVERHEAT', labelVi: 'Quá nhiệt động cơ / Lỗi cảm biến nhiệt', labelEn: 'Motor Overheat / Temp Sensor Error' },
  { value: 'PAYMENT_READER_ERROR', labelVi: 'Lỗi đầu đọc thẻ / Máy quét QR Ki-ốt', labelEn: 'Card / QR Reader Error' },
  { value: 'OTHER', labelVi: 'Sự cố kỹ thuật khác', labelEn: 'Other Technical Issue' },
];

export function getIssueTypeLabel(val, isVietnamese = true) {
  if (!val || String(val).toLowerCase() === 'string') {
    return isVietnamese ? 'Máy dừng đột ngột / Mất nguồn điện' : 'Machine Stopped / Power Failure';
  }
  const cleanVal = String(val).trim().toUpperCase();
  const found = ISSUE_TYPES.find((t) => t.value === cleanVal);
  if (found) return isVietnamese ? found.labelVi : found.labelEn;
  return val;
}

// Loại bỏ tiền tố "[Loại lỗi: XXX]" khỏi mô tả để hiển thị riêng issueType và description
export function stripIssuePrefix(desc) {
  if (!desc) return '';
  return String(desc)
    .replace(/^\s*\[?\s*(?:Loại lỗi|Loại sự cố|Issue Type|issueType)\s*:\s*[^\]\n|;]*\]?\s*[-–:|]?\s*/i, '')
    .trim();
}

export function extractIssueType(ticketOrDesc) {
  if (!ticketOrDesc) return 'MACHINE_STOPPED';
  if (typeof ticketOrDesc === 'object' && ticketOrDesc.issueType && ticketOrDesc.issueType.toLowerCase() !== 'string') {
    return ticketOrDesc.issueType;
  }
  const desc = typeof ticketOrDesc === 'string' ? ticketOrDesc : (ticketOrDesc.issueDescription || ticketOrDesc.description || '');
  if (!desc) return 'MACHINE_STOPPED';

  // 1. Regex trích xuất từ "Loại lỗi:" hoặc "Loại sự cố:" hoặc "issueType:"
  const match = desc.match(/(?:Loại lỗi|Loại sự cố|Issue Type|issueType)\s*:\s*([^|;\n\)\]]+)/i);
  if (match && match[1]) {
    const candidate = match[1].trim();
    if (candidate && candidate.toLowerCase() !== 'string') {
      return candidate;
    }
  }

  // 2. Phân tích từ khóa phong phú trong mô tả tiếng Việt
  const upper = desc.toUpperCase();
  if (upper.includes('DOOR_LOCKED') || upper.includes('KẸT CỬA') || upper.includes('MỞ CỬA') || upper.includes('KHÓA CỬA') || upper.includes('MỞ CỔNG') || upper.includes('KẸT LỒNG')) return 'DOOR_LOCKED';
  if (upper.includes('WATER_LEAK') || upper.includes('RÒ RỈ') || upper.includes('THOÁT NƯỚC') || upper.includes('XẢ NƯỚC') || upper.includes('CẤP NƯỚC')) return 'WATER_LEAK';
  if (upper.includes('NOISE_OR_SMOKE') || upper.includes('TIẾNG ỒN') || upper.includes('TIẾNG KÊU') || upper.includes('MÙI KHÉT') || upper.includes('KHÉT') || upper.includes('RUNG LẮC')) return 'NOISE_OR_SMOKE';
  if (upper.includes('MOTOR_ERROR') || upper.includes('LỒNG GIẶT') || upper.includes('ĐỘNG CƠ') || upper.includes('KHÔNG QUAY') || upper.includes('VẮT')) return 'MOTOR_ERROR';
  if (upper.includes('POWER_FAILURE') || upper.includes('MẤT NGUỒN') || upper.includes('MÀN HÌNH TẮT') || upper.includes('SẬP NGUỒN') || upper.includes('KHÔNG LÊN ĐIỆN')) return 'POWER_FAILURE';
  if (upper.includes('NETWORK_DISCONNECTED') || upper.includes('MẤT MẠNG') || upper.includes('NGOẠI TUYẾN') || upper.includes('OFFLINE') || upper.includes('MẤT KẾT NỐI')) return 'NETWORK_DISCONNECTED';
  if (upper.includes('PAYMENT_READER_ERROR') || upper.includes('ĐẦU ĐỌC') || upper.includes('LỖI QR') || upper.includes('KIOSK')) return 'PAYMENT_READER_ERROR';
  if (upper.includes('HARDWARE_MALFUNCTION') || upper.includes('BO MẠCH') || upper.includes('PHẦN CỨNG') || upper.includes('CẢM BIẾN') || upper.includes('HỎNG MÁY')) return 'HARDWARE_MALFUNCTION';
  if (upper.includes('MACHINE_STOPPED') || upper.includes('DỪNG ĐỘT NGỘT') || upper.includes('DỪNG') || upper.includes('ĐỔI MÁY') || upper.includes('SỰ CỐ') || upper.includes('BẢO TRÌ')) return 'MACHINE_STOPPED';

  // 3. Fallback theo thiết bị
  if (typeof ticketOrDesc === 'object') {
    if (ticketOrDesc.deviceType === 'KIOSK') return 'PAYMENT_READER_ERROR';
    if (ticketOrDesc.deviceType === 'CONTROLLER') return 'HARDWARE_MALFUNCTION';
  }

  return 'MACHINE_STOPPED';
}

// ============================================================================
// 1. MODAL: HOÀN TẤT & KHÔI PHỤC MÁY (POST /api/maintenance-orders/{id}/complete)
// ============================================================================
function CompleteRepairModal({ ticket, isVietnamese, onClose, onSuccess }) {
  const [actionTaken, setActionTaken] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const issueType = extractIssueType(ticket);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!actionTaken.trim()) {
      setError(isVietnamese ? 'Vui lòng nhập nội dung công việc đã thực hiện.' : 'Please enter action taken.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await maintenanceApi.completeMaintenanceOrder(ticket.maintenanceOrderId, {
        actionTaken: actionTaken.trim(),
        partsReplaced: partsReplaced.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      const machineInfo = ticket.machineCode
        ? `máy [${ticket.machineCode}]`
        : ticket.deviceCode
          ? `thiết bị [${ticket.deviceCode}]`
          : 'thiết bị';

      onSuccess(
        isVietnamese
          ? `Nghiệm thu thành công cho ${machineInfo}! Phiếu đã đóng (COMPLETED), máy tự động sáng xanh (AVAILABLE) trên sơ đồ trạm và tự động gán đơn đang chờ (nếu có).`
          : `Maintenance completed for ${machineInfo}! Status is now AVAILABLE and queued orders are being processed.`
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể nghiệm thu đóng phiếu.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-base animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Nghiệm Thu & Đóng Phiếu Bảo Trì' : 'Complete & Close Maintenance Order'}
              </h3>
              <p className="text-sm text-slate-500 font-mono">
                {ticket.machineCode ? `Máy: ${ticket.machineCode}` : `Thiết bị: ${ticket.deviceCode || 'N/A'}`} • {ticket.siteName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Thông tin sự cố */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-base">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {isVietnamese ? 'Sự cố ban đầu đã báo cáo:' : 'Reported Issue:'}
            </span>
            <span className="font-mono text-sm text-slate-500">
              {formatDateTime(ticket.createdAt)}
            </span>
          </div>
          {issueType && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-base rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                {isVietnamese ? 'Loại sự cố:' : 'Issue Type:'}{' '}
                <strong className="text-rose-600 dark:text-rose-400 font-black">
                  {getIssueTypeLabel(issueType, isVietnamese)}
                </strong>
              </span>
            </div>
          )}
          <p className="text-slate-800 dark:text-slate-200 text-base font-medium leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/60">
            {stripIssuePrefix(ticket.issueDescription)}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Nghiệm thu */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Action Taken (Bắt buộc) */}
          <div className="space-y-1">
            <label className="text-base font-bold text-slate-800 dark:text-slate-200 block">
              {isVietnamese ? 'Công việc đã thực hiện:' : 'Action Taken:'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder={
                isVietnamese
                  ? 'Ví dụ: Đã thông tắc van xả nước, thay gioăng đệm cao su và chạy thử chu trình giặt không tải 15 phút an toàn...'
                  : 'Describe technical actions taken...'
              }
              className="w-full p-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Parts Replaced (Tùy chọn) */}
          <div className="space-y-1">
            <label className="text-base font-bold text-slate-800 dark:text-slate-200 block">
              {isVietnamese ? 'Linh kiện thay thế (nếu có):' : 'Parts Replaced (optional):'}
            </label>
            <input
              type="text"
              value={partsReplaced}
              onChange={(e) => setPartsReplaced(e.target.value)}
              placeholder={
                isVietnamese
                  ? 'Ví dụ: Dây curoa 5PJE, Van cấp nước đôi 220V, Rơ-le áp suất...'
                  : 'E.g., Drain valve 220V, V-belt 5PJE...'
              }
              className="w-full p-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Notes (Tùy chọn) */}
          <div className="space-y-1">
            <label className="text-base font-bold text-slate-800 dark:text-slate-200 block">
              {isVietnamese ? 'Ghi chú kỹ thuật (nếu có):' : 'Technical Notes (optional):'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isVietnamese
                  ? 'Ví dụ: Đã kiểm tra dòng điện và tiếp địa, thông số kỹ thuật ổn định...'
                  : 'Additional observations or test results...'
              }
              className="w-full p-3.5 text-base rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Quy trình tự động khôi phục máy */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isVietnamese ? 'Cơ chế tự động hóa sau khi đóng phiếu:' : 'Automatic Restoration:'}</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
              <li>
                {isVietnamese
                  ? 'Phiếu chuyển sang trạng thái Đã hoàn tất.'
                  : 'Order status switches to COMPLETED.'}
              </li>
              <li>
                {isVietnamese
                  ? 'Máy giặt/sấy tự động chuyển sang Sẵn sàng (màu xanh) trên sơ đồ trạm của Site Manager.'
                  : 'Machine turns green (AVAILABLE) on Site Manager map.'}
              </li>
              <li>
                {isVietnamese
                  ? 'Tự động nhận ngay đơn hàng đang chờ máy tại trạm nếu có.'
                  : 'Automatically fulfills WAITING_MACHINE orders if present.'}
              </li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-3 text-base rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
            >
              {isVietnamese ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 text-base rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>
                {submitting
                  ? (isVietnamese ? 'Đang hoàn tất...' : 'Completing...')
                  : (isVietnamese ? 'Hoàn tất & Khôi phục máy' : 'Complete & Restore Machine')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// 2. MODAL: XEM LỊCH SỬ SỬA CHỮA (Repair History Modal)
// ============================================================================
function ViewHistoryModal({ ticket, isVietnamese, onClose }) {
  const [detail, setDetail] = useState(ticket);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      if (ticket?.maintenanceOrderId) {
        setLoading(true);
        try {
          const res = await maintenanceApi.getMaintenanceOrderById(ticket.maintenanceOrderId);
          if (res) setDetail(res);
        } catch (e) {
          console.warn('Could not load ticket detail', e);
        } finally {
          setLoading(false);
        }
      }
    }
    loadDetail();
  }, [ticket?.maintenanceOrderId]);

  const histories = detail?.histories || [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Lịch Sử Sửa Chữa & Nhật Ký Kỹ Thuật' : 'Repair History & Work Logs'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {detail.machineCode ? `Máy: ${detail.machineCode}` : `Thiết bị: ${detail.deviceCode || 'N/A'}`} • {detail.siteName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Thông tin phiếu */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {isVietnamese ? 'Sự cố ban đầu:' : 'Initial Issue:'}
            </span>
            <span className={`px-2 py-0.5 rounded font-bold text-[10.5px] ${detail.status === 'COMPLETED'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : detail.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
              {detail.status}
            </span>
          </div>
          <p className="text-slate-800 dark:text-slate-200 font-medium">
            {detail.issueDescription}
          </p>
        </div>

        {/* Danh sách nhật ký */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>{isVietnamese ? 'Nhật ký công việc đã thực hiện:' : 'Work Logs:'}</span>
          </h4>

          {loading ? (
            <div className="py-8 text-center text-slate-400">
              <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
              <span>{isVietnamese ? 'Đang tải lịch sử...' : 'Loading history...'}</span>
            </div>
          ) : histories.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-400">
              <Clock className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <span>{isVietnamese ? 'Chưa có nhật ký sửa chữa nào được ghi nhận cho phiếu này.' : 'No maintenance history recorded yet.'}</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {histories.map((h, idx) => (
                <div
                  key={h.historyId || idx}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{h.performedByName || (isVietnamese ? 'Kỹ thuật viên' : 'Technician')}</span>
                    </span>
                    <span className="font-mono">{formatDateTime(h.createdAt)}</span>
                  </div>

                  <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                    {h.actionTaken}
                  </div>

                  {h.partsReplaced && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
                      <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        {isVietnamese ? 'Linh kiện thay:' : 'Parts:'}
                      </span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{h.partsReplaced}</span>
                    </div>
                  )}

                  {h.notes && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg italic">
                      "{h.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nút đóng */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
          >
            {isVietnamese ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// 3. MODAL: CHẨN ĐOÁN THIẾT BỊ (GET /api/devices/{id}/diagnostics)
// ============================================================================
function DeviceDiagnosticsModal({
  deviceId,
  ticket,
  isVietnamese,
  onClose,
  onOpenReprovision,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDiagnostics = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await devicesApi.getDeviceDiagnostics(deviceId);
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể lấy thông tin chẩn đoán thiết bị.');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  const bundleSyncHistory = data?.bundleSyncHistory || [];
  const errorHistory = data?.errorHistory || [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
              <Cpu className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {isVietnamese ? 'Chẩn Đoán Thiết Bị IoT (Kiosk / Controller)' : 'IoT Device Diagnostics'}
                </h3>
                {data && (
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${data.status === 'ONLINE' || data.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : data.status === 'REVOKED'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                    {data.status}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Mã: {data?.code || ticket?.deviceCode || 'N/A'} • Loại: {data?.deviceType || ticket?.deviceType || 'KIOSK'} • {data?.siteName || ticket?.siteName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-600" />
            <span>{isVietnamese ? 'Đang đọc dữ liệu chẩn đoán thiết bị từ máy chủ...' : 'Loading diagnostics...'}</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchDiagnostics}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer hover:bg-rose-500"
            >
              {isVietnamese ? 'Thử lại' : 'Retry'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. Hardware & Network Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{isVietnamese ? 'Địa chỉ IP' : 'IP Address'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{data.ipAddress || '192.168.1.101'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{isVietnamese ? 'Địa chỉ MAC' : 'MAC Address'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{data.macAddress || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{isVietnamese ? 'Firmware' : 'Firmware'}</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{data.firmwareVersion || 'v1.0.1'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">{isVietnamese ? 'Ping gần nhất' : 'Last Ping'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatDateTime(data.lastPingAt)}</span>
              </div>
            </div>

            {/* 2. Phiên bản PriceBundle hiện hành */}
            <div className="p-3.5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-600" />
                  <span>{isVietnamese ? 'Phiên bản PriceBundle hiện hành:' : 'Active PriceBundle:'}</span>
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-cyan-600 text-white">
                  v{data.activeBundleVersionNo ?? 'Chưa đồng bộ'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">{isVietnamese ? 'Mã băm Bundle Hash:' : 'Bundle Hash:'} </span>
                  <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 block truncate" title={data.activeBundleHash}>
                    {data.activeBundleHash || 'Chưa đồng bộ'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">{isVietnamese ? 'Phát hành lúc:' : 'Published At:'} </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {formatDateTime(data.activeBundlePublishedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Lịch sử đồng bộ Bundle (bundleSyncHistory) */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>{isVietnamese ? 'Lịch sử đồng bộ cấu hình (Bundle Sync History):' : 'Bundle Sync History:'}</span>
              </h4>
              {bundleSyncHistory.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-center font-medium">
                  {isVietnamese ? 'Chưa có nhật ký đồng bộ PriceBundle nào.' : 'No bundle sync records.'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {bundleSyncHistory.map((s, idx) => (
                    <div
                      key={s.logId || idx}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[11px]"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{s.eventType}</span>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{s.message}</p>
                      </div>
                      <span className="font-mono text-slate-400 text-[10px] shrink-0">{formatDateTime(s.syncedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Bảng ErrorHistory (Lịch sử lỗi phần cứng / kết nối) */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>{isVietnamese ? 'Lịch sử lỗi phần cứng & kết nối (Error History):' : 'Error History:'}</span>
              </h4>
              {errorHistory.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-center font-medium">
                  {isVietnamese ? 'Không có mã lỗi phần cứng nào được ghi nhận gần đây.' : 'No hardware errors recorded.'}
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2">{isVietnamese ? 'Thời gian' : 'Time'}</th>
                        <th className="p-2">{isVietnamese ? 'Mức độ' : 'Level'}</th>
                        <th className="p-2">{isVietnamese ? 'Sự kiện' : 'Event'}</th>
                        <th className="p-2">{isVietnamese ? 'Nội dung lỗi' : 'Message'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {errorHistory.map((errItem, idx) => (
                        <tr key={errItem.logId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2 font-mono text-slate-400 whitespace-nowrap">{formatDateTime(errItem.createdAt)}</td>
                          <td className="p-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${errItem.level === 'ERROR' || errItem.level === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                              {errItem.level}
                            </span>
                          </td>
                          <td className="p-2 font-mono font-semibold text-slate-700 dark:text-slate-300">{errItem.eventType}</td>
                          <td className="p-2 text-slate-800 dark:text-slate-200 font-medium">{errItem.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-[11px] text-slate-400">
                {isVietnamese
                  ? 'Nếu bo mạch hỏng không thể phục hồi, hãy thay thế thiết bị mới.'
                  : 'If hardware is damaged, reprovision a replacement.'}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
                >
                  {isVietnamese ? 'Đóng' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenReprovision(data)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black shadow-md shadow-rose-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <HardDrive className="w-4 h-4" />
                  <span>{isVietnamese ? 'Thay thế thiết bị & Chuyển liên kết trạm' : 'Reprovision Replacement Device'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// 4. MODAL: THAY THẾ THIẾT BỊ (POST /api/devices/{id}/reprovision-replacement)
// ============================================================================
function ReprovisionDeviceModal({
  device,
  maintenanceOrderId,
  isVietnamese,
  onClose,
  onSuccess,
}) {
  const [newDeviceCode, setNewDeviceCode] = useState('');
  const [newIpAddress, setNewIpAddress] = useState('');
  const [newMacAddress, setNewMacAddress] = useState('');
  const [newFirmwareVersion, setNewFirmwareVersion] = useState('v1.0.2');
  const [reason, setReason] = useState('Chập nguồn bo mạch phần cứng Kiosk/Controller, thay thế thiết bị mới.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDeviceCode.trim()) {
      setError(isVietnamese ? 'Vui lòng nhập mã thiết bị mới.' : 'Please enter new device code.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await devicesApi.reprovisionReplacement(device.deviceId, {
        newDeviceCode: newDeviceCode.trim(),
        newIpAddress: newIpAddress.trim() || undefined,
        newMacAddress: newMacAddress.trim() || undefined,
        newFirmwareVersion: newFirmwareVersion.trim() || undefined,
        maintenanceOrderId: maintenanceOrderId || undefined,
        reason: reason.trim() || undefined,
      });

      onSuccess(result);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể cấp phát thiết bị thay thế.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <HardDrive className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Thay Thế Thiết Bị & Chuyển Liên Kết Trạm' : 'Reprovision Replacement Device'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Thiết bị cũ: <span className="font-bold text-rose-600">{device.code}</span> ({device.deviceType}) • {device.siteName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Cảnh báo thu hồi khóa */}
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>{isVietnamese ? 'Cơ chế an ninh phần cứng:' : 'Hardware Security:'}</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {isVietnamese
              ? `Thiết bị cũ [${device.code}] sẽ bị THU HỒI KHÓA (REVOKED) ngay lập tức. Thiết bị thay thế mới sẽ tiếp nhận toàn bộ liên kết cơ sở (${device.siteName}) và hệ thống sẽ sinh mã rawApiKey mới.`
              : `Old device [${device.code}] key will be REVOKED. New device inherits site bindings and generates a new rawApiKey.`}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Mã thiết bị mới */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              {isVietnamese ? 'Mã thiết bị thay thế mới (newDeviceCode):' : 'New Device Code:'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newDeviceCode}
              onChange={(e) => setNewDeviceCode(e.target.value)}
              placeholder={isVietnamese ? `Ví dụ: ${device.code}-REV2 hoặc ${device.deviceType}_NEW` : 'E.g., KIOSK_02_REV2'}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* IP & MAC */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                {isVietnamese ? 'Địa chỉ IP mới (tùy chọn):' : 'New IP (optional):'}
              </label>
              <input
                type="text"
                value={newIpAddress}
                onChange={(e) => setNewIpAddress(e.target.value)}
                placeholder="192.168.1.105"
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                {isVietnamese ? 'Địa chỉ MAC mới (tùy chọn):' : 'New MAC (optional):'}
              </label>
              <input
                type="text"
                value={newMacAddress}
                onChange={(e) => setNewMacAddress(e.target.value)}
                placeholder="00:1B:44:11:3A:B7"
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Firmware */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              {isVietnamese ? 'Phiên bản Firmware mới:' : 'Firmware Version:'}
            </label>
            <input
              type="text"
              value={newFirmwareVersion}
              onChange={(e) => setNewFirmwareVersion(e.target.value)}
              placeholder="v1.0.2"
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              {isVietnamese ? 'Lý do thay thế phần cứng:' : 'Reason for replacement:'}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
            >
              {isVietnamese ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black shadow-md shadow-rose-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Key className="w-4 h-4" />
              <span>{submitting ? (isVietnamese ? 'Đang cấp phát...' : 'Reprovisioning...') : (isVietnamese ? 'Xác nhận cấp phát & Sinh API Key' : 'Confirm & Generate Key')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// 5. MODAL: HIỂN THỊ rawApiKey MỚI ĐỂ NẠP VÀO THIẾT BỊ MỚI
// ============================================================================
function ReprovisionSuccessModal({ reprovisionData, isVietnamese, onClose }) {
  const [copied, setCopied] = useState(false);

  const rawKey = reprovisionData?.replacementDevice?.rawApiKey || 'N/A';

  const handleCopy = () => {
    if (rawKey && rawKey !== 'N/A') {
      navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <Key className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {isVietnamese ? 'Cấp Phát Thiết Bị Mới Thành Công!' : 'New Device Reprovisioned!'}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {reprovisionData.message || (isVietnamese ? 'Đã thu hồi thiết bị cũ và chuyển liên kết trạm sang thiết bị mới.' : 'Hardware replaced successfully.')}
            </p>
          </div>
        </div>

        {/* Thông tin chuyển đổi */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
          <div>
            <span className="text-slate-400 block">{isVietnamese ? 'Thiết bị cũ (Thu hồi):' : 'Old Device:'}</span>
            <span className="font-mono font-bold text-rose-600 line-through">
              {reprovisionData.oldDeviceCode} ({reprovisionData.oldDeviceStatus})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">{isVietnamese ? 'Thiết bị mới (Kích hoạt):' : 'New Device:'}</span>
            <span className="font-mono font-bold text-emerald-600">
              {reprovisionData.replacementDevice?.code} (ACTIVE)
            </span>
          </div>
          <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
            <span className="text-slate-400 block">{isVietnamese ? 'Cơ sở đã chuyển liên kết:' : 'Transferred Site:'}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {reprovisionData.transferredSiteName} • {reprovisionData.transferredSiteAddress}
            </span>
          </div>
        </div>

        {/* Khóa rawApiKey để nạp */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5 uppercase text-[11px]">
              <ShieldAlert className="w-4 h-4" />
              <span>{isVietnamese ? 'rawApiKey Mới (Nạp vào thiết bị):' : 'New rawApiKey (Flash to Device):'}</span>
            </label>
            <span className="text-[10px] text-slate-400 font-bold">{isVietnamese ? 'Chỉ hiển thị 1 lần duy nhất' : 'Shown once only'}</span>
          </div>

          <div className="relative">
            <div className="p-3.5 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs break-all border border-slate-800 select-all shadow-inner">
              {rawKey}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className={`absolute top-2.5 right-2.5 px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs ${copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Đã chép!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Sao chép' : 'Copy Key'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hướng dẫn nạp thiết bị */}
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-600" />
            <span>{isVietnamese ? 'Hướng dẫn nạp phần cứng kỹ thuật:' : 'Flashing Instructions:'}</span>
          </div>
          <p className="leading-relaxed text-slate-600 dark:text-slate-300">
            {isVietnamese
              ? 'Kỹ thuật viên nạp rawApiKey này vào file cấu hình (config.env hoặc bộ nhớ flash ROM) của Kiosk/Controller mới, sau đó khởi động lại nguồn để thiết bị gửi Heartbeat xác nhận kết nối trạm.'
              : 'Flash this rawApiKey into the new Kiosk/Controller configuration and reboot to establish heartbeat connection.'}
          </p>
        </div>

        {/* Nút đóng */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
          >
            {isVietnamese ? 'Đã ghi lại Key & Đóng' : 'Saved Key & Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// 6. MODAL: TRA CỨU THIẾT BỊ TRẠM (KIOSK / CONTROLLER)
// ============================================================================
function SiteDevicesLookupModal({ sites, isVietnamese, onClose, onSelectDevice }) {
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.siteId || '');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDevices() {
      if (!selectedSiteId) return;
      setLoading(true);
      try {
        const res = await devicesApi.getDevices({ siteId: selectedSiteId });
        setDevices(Array.isArray(res) ? res : []);
      } catch (err) {
        console.warn('Could not load devices', err);
      } finally {
        setLoading(false);
      }
    }
    loadDevices();
  }, [selectedSiteId]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
              <Cpu className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Tra Cứu & Chẩn Đoán Thiết Bị Cơ Sở' : 'Site IoT Devices Diagnostics'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isVietnamese ? 'Chọn cơ sở và thiết bị Kiosk/Controller để kiểm tra tình trạng' : 'Select site and device'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Site selector */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700 dark:text-slate-300">
            {isVietnamese ? 'Chọn cơ sở cần kiểm tra thiết bị:' : 'Select Site:'}
          </label>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
          >
            {sites.map((s) => (
              <option key={s.siteId} value={s.siteId}>
                {s.name} ({s.code || s.siteCode})
              </option>
            ))}
          </select>
        </div>

        {/* Devices list */}
        <div className="space-y-2">
          <h4 className="font-bold text-slate-800 dark:text-slate-200">
            {isVietnamese ? 'Danh sách thiết bị tại trạm:' : 'Devices at Site:'}
          </h4>

          {loading ? (
            <div className="py-6 text-center text-slate-400">
              <RotateCw className="w-5 h-5 animate-spin mx-auto mb-1 text-cyan-600" />
              <span>{isVietnamese ? 'Đang nạp thiết bị...' : 'Loading devices...'}</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-slate-400">
              {isVietnamese ? 'Chưa có thiết bị Kiosk/Controller nào được đăng ký tại trạm này.' : 'No devices found.'}
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((dev) => (
                <div
                  key={dev.deviceId}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 dark:text-white">{dev.code}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                        {dev.deviceType}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dev.status === 'ONLINE' || dev.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                        {dev.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      IP: {dev.ipAddress || '192.168.1.101'} • FW: {dev.firmwareVersion || 'v1.0.1'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectDevice(dev);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{isVietnamese ? 'Chẩn đoán' : 'Diagnostics'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
          >
            {isVietnamese ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// MAIN COMPONENT: TECHNICIAN PORTAL (/dashboard/repairs)
// ============================================================================
export default function RepairsPage() {
  const { isVietnamese } = useLanguage();
  const { user } = useAuth();

  // State
  const [tickets, setTickets] = useState([]);
  const [sites, setSites] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | IN_PROGRESS | COMPLETED
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [issueTypeFilter, setIssueTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState(null);

  // Modals state
  const [activeCompleteTicket, setActiveCompleteTicket] = useState(null);
  const [activeHistoryTicket, setActiveHistoryTicket] = useState(null);
  const [activeDiagnosticsDevice, setActiveDiagnosticsDevice] = useState(null);
  const [activeDiagnosticsTicket, setActiveDiagnosticsTicket] = useState(null);
  const [activeReprovisionDevice, setActiveReprovisionDevice] = useState(null);
  const [reprovisionSuccessData, setReprovisionSuccessData] = useState(null);
  const [showSiteDevicesModal, setShowSiteDevicesModal] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Load sites assigned or in system
  useEffect(() => {
    async function loadSites() {
      try {
        const res = await sitesApi.getSites();
        const list = Array.isArray(res) ? res : res?.items || [];
        setSites(list);
      } catch (e) {
        console.warn('Could not load sites', e);
      }
    }
    loadSites();
  }, []);

  // 1. Fetch Maintenance Orders via GET /api/maintenance-orders/my-sites
  const fetchTickets = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError(null);
    try {
      const data = await maintenanceApi.getMySitesMaintenanceOrders({
        siteId: selectedSiteFilter !== 'ALL' ? selectedSiteFilter : null,
        status: statusFilter !== 'ALL' ? statusFilter : null,
        priority: priorityFilter !== 'ALL' ? priorityFilter : null,
      });

      const list = Array.isArray(data) ? data : data?.items || [];
      setTickets(list);
    } catch (err) {
      console.error('Failed to load technician maintenance tickets:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải danh sách phiếu bảo trì.';
      setError(msg);
    } finally {
      setLoading(false);
      if (!isSilent) setRefreshing(false);
    }
  }, [selectedSiteFilter, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // 2. Technician Accepts Ticket (POST /api/maintenance-orders/{id}/accept)
  const handleAcceptTicket = async (ticket) => {
    setAcceptingId(ticket.maintenanceOrderId);
    try {
      const updated = await maintenanceApi.acceptMaintenanceOrder(ticket.maintenanceOrderId);
      const equipmentCode = ticket.machineCode || ticket.deviceCode || 'thiết bị';
      setSuccessToast(
        isVietnamese
          ? `Bạn đã nhận xử lý [${equipmentCode}] tại cơ sở [${ticket.siteName}]! Trạng thái phiếu đã chuyển sang ĐANG XỬ LÝ (IN_PROGRESS).`
          : `You have accepted maintenance task for [${equipmentCode}]!`
      );
      await fetchTickets(true);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Không thể nhận việc.');
    } finally {
      setAcceptingId(null);
    }
  };

  // KPI Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter((t) => t.status === 'PENDING').length;
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const completed = tickets.filter((t) => t.status === 'COMPLETED').length;
    const urgent = tickets.filter((t) => t.priority === 'URGENT').length;
    return { total, pending, inProgress, completed, urgent };
  }, [tickets]);

  // Filtered tickets based on search query and filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Filter by Issue Type
      const ticketIssueType = extractIssueType(t);
      if (issueTypeFilter !== 'ALL' && ticketIssueType !== issueTypeFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (t.machineCode || '').toLowerCase();
        const devCode = (t.deviceCode || '').toLowerCase();
        const site = (t.siteName || '').toLowerCase();
        const addr = (t.siteAddress || '').toLowerCase();
        const desc = (t.issueDescription || '').toLowerCase();
        const orderCode = (t.relatedOrderCode || '').toLowerCase();
        const tech = (t.technicianName || '').toLowerCase();
        const itNameVi = getIssueTypeLabel(ticketIssueType, true).toLowerCase();
        const itNameEn = getIssueTypeLabel(ticketIssueType, false).toLowerCase();
        if (
          !code.includes(q) &&
          !devCode.includes(q) &&
          !site.includes(q) &&
          !addr.includes(q) &&
          !desc.includes(q) &&
          !orderCode.includes(q) &&
          !tech.includes(q) &&
          !itNameVi.includes(q) &&
          !itNameEn.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, issueTypeFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {isVietnamese ? 'Cổng Kỹ Thuật Viên' : 'Technician Portal'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              {isVietnamese ? 'Điều phối sự cố đa cơ sở' : 'Multi-site Dispatch'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
              <Wrench className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span>
              {isVietnamese ? 'Quản Lý Sửa Chữa & Phiếu Bảo Trì Đa Cơ Sở' : 'Technician Maintenance & Repair'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Tiếp nhận báo cáo sự cố máy giặt/sấy và thiết bị IoT (Kiosk, Controller) từ toàn bộ các cơ sở phụ trách.'
              : 'Accept incident reports, diagnose IoT devices, and log repair history across assigned sites.'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Tra cứu thiết bị trạm (Kiosk / Controller) */}
          <button
            type="button"
            onClick={() => setShowSiteDevicesModal(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:hover:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{isVietnamese ? 'Chẩn đoán thiết bị trạm' : 'Diagnose IoT Device'}</span>
          </button>

          {/* Nút Làm mới */}
          <button
            type="button"
            onClick={() => fetchTickets(false)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isVietnamese ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Toast thông báo thành công */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500 text-slate-800 dark:text-slate-100 shadow-2xl flex items-start gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
              {isVietnamese ? 'Thông Báo Kỹ Thuật' : 'Technician Notification'}
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {successToast}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition text-base font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Thông báo lỗi kết nối / Phân quyền nếu có */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold block">
                {isVietnamese ? 'Thông báo kết nối máy chủ:' : 'Server Notice:'}
              </span>
              <span>{error}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchTickets(false)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition self-start sm:self-auto cursor-pointer shadow-xs active:scale-95"
          >
            {isVietnamese ? 'Thử lại' : 'Retry'}
          </button>
        </div>
      )}

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setPriorityFilter('ALL');
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${statusFilter === 'ALL' && priorityFilter === 'ALL'
              ? 'ring-2 ring-slate-500 border-slate-300 bg-slate-50 dark:bg-slate-800/80'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
            }`}
        >
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            {isVietnamese ? 'Tổng phiếu cần xử lý' : 'Total Orders'}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.total}</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Pending (Chờ tiếp nhận) */}
        <div
          onClick={() => {
            setStatusFilter('PENDING');
            setPriorityFilter('ALL');
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${statusFilter === 'PENDING'
              ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/50 dark:bg-amber-950/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-300'
            }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              {isVietnamese ? 'Chờ nhận việc' : 'Pending'}
            </span>
            {stats.pending > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {stats.pending}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* In Progress (Đang xử lý) */}
        <div
          onClick={() => {
            setStatusFilter('IN_PROGRESS');
            setPriorityFilter('ALL');
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${statusFilter === 'IN_PROGRESS'
              ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/50 dark:bg-blue-950/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
            }`}
        >
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 block mb-1">
            {isVietnamese ? 'Đang xử lý' : 'In Progress'}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {stats.inProgress}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Completed (Đã hoàn tất) */}
        <div
          onClick={() => {
            setStatusFilter('COMPLETED');
            setPriorityFilter('ALL');
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${statusFilter === 'COMPLETED'
              ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300'
            }`}
        >
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block mb-1">
            {isVietnamese ? 'Đã hoàn tất' : 'Completed'}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.completed}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

      </div>

      {/* 3. Filter Bar & Search */}
      <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'ALL', labelVi: 'Tất cả phiếu', labelEn: 'All Tickets' },
            { key: 'PENDING', labelVi: `⏳ Chờ nhận (${stats.pending})`, labelEn: `⏳ Pending (${stats.pending})` },
            { key: 'IN_PROGRESS', labelVi: `🛠️ Đang xử lý (${stats.inProgress})`, labelEn: `🛠️ In Progress (${stats.inProgress})` },
            { key: 'COMPLETED', labelVi: `✅ Đã hoàn tất (${stats.completed})`, labelEn: `✅ Completed (${stats.completed})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${statusFilter === tab.key
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              {isVietnamese ? tab.labelVi : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Site filter & Priority select & Search Input */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc theo cơ sở */}
          {sites.length > 0 && (
            <select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border-0 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/20 max-w-[170px] truncate"
            >
              <option value="ALL">{isVietnamese ? 'Tất cả cơ sở' : 'All Sites'}</option>
              {sites.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  📍 {s.name}
                </option>
              ))}
            </select>
          )}

          {/* Lọc theo loại sự cố (issueType) */}
          <select
            value={issueTypeFilter}
            onChange={(e) => setIssueTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border-0 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/20 max-w-[190px] truncate"
          >
            <option value="ALL">{isVietnamese ? 'Tất cả loại sự cố' : 'All Issue Types'}</option>
            {ISSUE_TYPES.map((it) => (
              <option key={it.value} value={it.value}>
                ⚠️ {isVietnamese ? it.labelVi : it.labelEn}
              </option>
            ))}
          </select>

          {/* Ô tìm kiếm */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVietnamese ? 'Tìm mã máy, thiết bị, trạm, mã đơn, loại lỗi...' : 'Search ticket...'}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* 4. Tickets List */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            {isVietnamese ? 'Đang nạp danh sách báo cáo sự cố từ các cơ sở phụ trách...' : 'Loading tickets from assigned sites...'}
          </p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <Wrench className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isVietnamese ? 'Không tìm thấy phiếu sửa chữa phù hợp' : 'No matching tickets'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {tickets.length > 0
                ? (isVietnamese
                  ? `Hiện có ${tickets.length} phiếu trong hệ thống nhưng không khớp với bộ lọc hiện tại.`
                  : `${tickets.length} tickets available but none match the current filters.`)
                : (isVietnamese
                  ? 'Tất cả máy móc và thiết bị tại các cơ sở bạn phụ trách đang hoạt động bình thường hoặc chưa có sự cố mới.'
                  : 'All machines and devices across your assigned sites are operating normally.')}
            </p>
          </div>
          {(statusFilter !== 'ALL' || priorityFilter !== 'ALL' || selectedSiteFilter !== 'ALL' || issueTypeFilter !== 'ALL' || searchQuery.trim()) && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                  setSelectedSiteFilter('ALL');
                  setIssueTypeFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95 inline-flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Xem tất cả phiếu (Đặt lại bộ lọc)' : 'Show All Tickets'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const isPending = ticket.status === 'PENDING';
            const isInProgress = ticket.status === 'IN_PROGRESS';
            const isCompleted = ticket.status === 'COMPLETED';

            const isUrgent = ticket.priority === 'URGENT';
            const isHigh = ticket.priority === 'HIGH';

            // Check if ticket is tied to a device
            const hasDevice = Boolean(ticket.deviceId || ticket.deviceCode);
            const issueType = extractIssueType(ticket);

            return (
              <div
                key={ticket.maintenanceOrderId}
                className={`rounded-3xl border p-4 sm:p-5 transition shadow-sm space-y-4 bg-white dark:bg-slate-900 ${isPending
                    ? 'border-amber-200 dark:border-amber-900/60'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
              >
                {/* 1. Top Bar: Mã máy / Mã thiết bị + Priority + Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Badge Máy hỏng (machineCode - machineClassName) */}
                    {ticket.machineCode && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5 text-blue-400 dark:text-blue-600" />
                          <span>{ticket.machineCode}</span>
                        </span>
                        {ticket.machineClassName && (
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {ticket.machineClassName}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Badge Thiết bị hỏng (deviceCode - deviceType) */}
                    {ticket.deviceCode && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs px-2.5 py-1 rounded-xl bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5" />
                          <span>{ticket.deviceCode}</span>
                        </span>
                        {ticket.deviceType && (
                          <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">
                            ({ticket.deviceType})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Badge Loại lỗi / Loại sự cố (issueType) - Màu cam/đỏ nổi bật */}
                    {issueType && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Loại lỗi: <strong>{getIssueTypeLabel(issueType, isVietnamese)}</strong></span>
                      </span>
                    )}


                    {/* Mã đơn bị ảnh hưởng (relatedOrderCode) */}
                    {ticket.relatedOrderCode && (
                      <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                        <span>Đơn ảnh hưởng:</span>
                        <strong className="underline">#{ticket.relatedOrderCode}</strong>
                      </span>
                    )}
                  </div>

                  {/* Trạng thái phiếu (PENDING / IN_PROGRESS / COMPLETED) */}
                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                        <span>{isVietnamese ? 'CHỜ TIẾP NHẬN' : 'PENDING'}</span>
                      </span>
                    ) : isInProgress ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 shadow-2xs">
                        <Wrench className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>{isVietnamese ? 'ĐANG XỬ LÝ' : 'IN PROGRESS'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isVietnamese ? 'ĐÃ HOÀN TẤT' : 'COMPLETED'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Địa chỉ cơ sở chi tiết (siteName + siteAddress để Kỹ thuật viên biết cần di chuyển đến đâu) */}
                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{ticket.siteName}</span>
                        {ticket.siteCode && (
                          <span className="text-[10px] font-mono text-slate-400 font-normal">
                            ({ticket.siteCode})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        {ticket.siteAddress || (isVietnamese ? 'Địa chỉ đang cập nhật...' : 'Address unavailable')}
                      </p>
                    </div>
                  </div>

                  {ticket.siteAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${ticket.siteName} ${ticket.siteAddress}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center gap-1 shrink-0 self-start sm:self-auto transition shadow-2xs cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 text-blue-500" />
                      <span>{isVietnamese ? 'Chỉ đường' : 'Navigate'}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
                </div>

                {/* 3. Mô tả sự cố */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-100 font-medium leading-relaxed space-y-2">
                  <div className="font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isVietnamese ? 'Hiện tượng lỗi báo cáo:' : 'Reported Issue:'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono font-normal">
                      {formatDateTime(ticket.createdAt)}
                    </span>
                  </div>

                  {/* Hiển thị loại lỗi rõ ràng */}
                  {issueType && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800 text-amber-950 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-bold">
                        {isVietnamese ? 'Loại sự cố (Issue Type):' : 'Issue Type:'}{' '}
                        <strong className="text-rose-600 dark:text-rose-400 font-black">
                          {getIssueTypeLabel(issueType, isVietnamese)}
                        </strong>
                      </span>
                    </div>
                  )}

                  <p className="text-sm font-semibold">{stripIssuePrefix(ticket.issueDescription)}</p>
                </div>

                {/* 4. Footer: Người báo, Kỹ thuật viên & Action Buttons */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                  {/* Reporter & Technician Name info */}
                  <div className="flex items-center gap-3 text-[11px] flex-wrap">
                    <span>
                      Báo bởi:{' '}
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                        {ticket.reporterName || 'Site Manager'}
                      </strong>
                    </span>
                    <span>•</span>
                    {ticket.technicianName ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>KTV phụ trách: @{ticket.technicianName}</span>
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {isVietnamese ? 'Chưa phân công KTV' : 'Unassigned'}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons: 1. Chẩn đoán thiết bị / 2. Nhận xử lý / 3. Hoàn tất & Khôi phục máy / 4. Xem lịch sử */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Nút Xem lịch sử sửa chữa */}
                    <button
                      type="button"
                      onClick={() => setActiveHistoryTicket(ticket)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Lịch sử' : 'History'}</span>
                    </button>

                    {/* Nút Chẩn đoán thiết bị (nếu phiếu có gắn deviceId / deviceCode) */}
                    {hasDevice && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDiagnosticsDevice({
                            deviceId: ticket.deviceId,
                            code: ticket.deviceCode,
                            deviceType: ticket.deviceType || 'KIOSK',
                            siteName: ticket.siteName,
                            siteAddress: ticket.siteAddress,
                          });
                          setActiveDiagnosticsTicket(ticket);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{isVietnamese ? 'Chẩn đoán Kiosk/Controller' : 'Device Diagnostics'}</span>
                      </button>
                    )}

                    {/* Nút 1: Nhận xử lý (POST /api/maintenance-orders/{id}/accept - Dành cho phiếu PENDING) */}
                    {isPending && (
                      <button
                        type="button"
                        disabled={acceptingId === ticket.maintenanceOrderId}
                        onClick={() => handleAcceptTicket(ticket)}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>
                          {acceptingId === ticket.maintenanceOrderId
                            ? (isVietnamese ? 'Đang nhận việc...' : 'Accepting...')
                            : (isVietnamese ? 'Nhận xử lý' : 'Accept Task')}
                        </span>
                      </button>
                    )}

                    {/* Nút 2: Nghiệm thu & Hoàn tất sửa chữa (POST /api/maintenance-orders/{id}/complete - Dành cho phiếu IN_PROGRESS) */}
                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => setActiveCompleteTicket(ticket)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isVietnamese ? 'Nghiệm thu & Khôi phục máy' : 'Complete & Restore Machine'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL HOÀN TẤT & KHÔI PHỤC MÁY */}
      {activeCompleteTicket && (
        <CompleteRepairModal
          ticket={activeCompleteTicket}
          isVietnamese={isVietnamese}
          onClose={() => setActiveCompleteTicket(null)}
          onSuccess={(msg) => {
            setActiveCompleteTicket(null);
            setSuccessToast(msg);
            fetchTickets(false);
          }}
        />
      )}

      {/* 6. MODAL XEM CHI TIẾT LỊCH SỬ SỬA CHỮA */}
      {activeHistoryTicket && (
        <ViewHistoryModal
          ticket={activeHistoryTicket}
          isVietnamese={isVietnamese}
          onClose={() => setActiveHistoryTicket(null)}
        />
      )}

      {/* 7. MODAL CHẨN ĐOÁN THIẾT BỊ IoT */}
      {activeDiagnosticsDevice && (
        <DeviceDiagnosticsModal
          deviceId={activeDiagnosticsDevice.deviceId}
          ticket={activeDiagnosticsTicket || activeDiagnosticsDevice}
          isVietnamese={isVietnamese}
          onClose={() => {
            setActiveDiagnosticsDevice(null);
            setActiveDiagnosticsTicket(null);
          }}
          onOpenReprovision={(devData) => {
            setActiveReprovisionDevice(devData);
            setActiveDiagnosticsDevice(null);
          }}
        />
      )}

      {/* 8. MODAL THAY THẾ THIẾT BỊ & CHUYỂN LIÊN KẾT TRẠM */}
      {activeReprovisionDevice && (
        <ReprovisionDeviceModal
          device={activeReprovisionDevice}
          maintenanceOrderId={activeDiagnosticsTicket?.maintenanceOrderId}
          isVietnamese={isVietnamese}
          onClose={() => setActiveReprovisionDevice(null)}
          onSuccess={(result) => {
            setActiveReprovisionDevice(null);
            setReprovisionSuccessData(result);
            fetchTickets(true);
          }}
        />
      )}

      {/* 9. MODAL HIỂN THỊ rawApiKey MỚI */}
      {reprovisionSuccessData && (
        <ReprovisionSuccessModal
          reprovisionData={reprovisionSuccessData}
          isVietnamese={isVietnamese}
          onClose={() => setReprovisionSuccessData(null)}
        />
      )}

      {/* 10. MODAL TRA CỨU THIẾT BỊ TRẠM */}
      {showSiteDevicesModal && (
        <SiteDevicesLookupModal
          sites={sites}
          isVietnamese={isVietnamese}
          onClose={() => setShowSiteDevicesModal(false)}
          onSelectDevice={(device) => {
            setActiveDiagnosticsDevice(device);
          }}
        />
      )}
    </div>
  );
}
