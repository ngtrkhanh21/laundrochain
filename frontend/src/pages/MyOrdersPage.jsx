import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { ordersApi } from '../api/ordersApi';
import { walletsApi } from '../api/walletsApi';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { extractIssueType } from './RepairsPage';
import {
  History,
  Crown,
  ChevronRight,
  Award,
  WashingMachine,
  Clock,
  CheckCircle2,
  Sparkles,
  Receipt,
  RotateCw,
  Check,
  X,
  Play,
  Search,
  Phone,
  ArrowRight,
  User,
  AlertCircle,
  AlertTriangle,
  Send,
  Wrench,
  MapPin,
  Tag,
  CreditCard,
  QrCode,
  Wallet,
  Copy,
  ExternalLink,
} from 'lucide-react';

// Danh sách loại sự cố máy giặt / sấy
const ISSUE_TYPES = [
  { value: 'MACHINE_STOPPED', labelVi: 'Máy dừng đột ngột / Mất nguồn điện', labelEn: 'Machine Stopped / Power Failure' },
  { value: 'DOOR_LOCKED', labelVi: 'Kẹt cửa máy / Không mở được lồng giặt', labelEn: 'Door Locked / Cannot Open Door' },
  { value: 'WATER_LEAK', labelVi: 'Rò rỉ nước / Thoát nước chậm', labelEn: 'Water Leak / Slow Drainage' },
  { value: 'DRAIN_ERROR', labelVi: 'Lỗi xả nước / Không vắt / Không cấp nước', labelEn: 'Drain / Spin / Water Feed Error' },
  { value: 'MOTOR_ERROR', labelVi: 'Lồng giặt không quay / Rung lắc dữ dội', labelEn: 'Drum Not Spinning / Heavy Vibration' },
  { value: 'POWER_FAILURE', labelVi: 'Mất nguồn điện / Màn hình LED tắt ngấm', labelEn: 'Power Cut / Blank Screen' },
  { value: 'NOISE_OR_SMOKE', labelVi: 'Tiếng ồn bất thường / Có mùi khét', labelEn: 'Abnormal Noise / Burning Odor' },
  { value: 'HARDWARE_MALFUNCTION', labelVi: 'Hỏng phần cứng / Lỗi bo mạch', labelEn: 'Hardware Malfunction / Board Error' },
  { value: 'NETWORK_DISCONNECTED', labelVi: 'Mất kết nối mạng / Ngoại tuyến', labelEn: 'Network Disconnected / Offline' },
  { value: 'OVERHEAT', labelVi: 'Quá nhiệt động cơ / Lỗi cảm biến', labelEn: 'Motor Overheat / Temp Sensor Error' },
  { value: 'PAYMENT_READER_ERROR', labelVi: 'Lỗi đầu đọc thẻ / Máy quét QR Ki-ốt', labelEn: 'Card / QR Reader Error' },
  { value: 'OTHER', labelVi: 'Sự cố kỹ thuật khác', labelEn: 'Other Technical Issue' },
];

function getIssueTypeLabel(val, isVietnamese = true) {
  if (!val) return isVietnamese ? 'Sự cố kỹ thuật' : 'Technical Issue';
  const cleanVal = String(val).trim().toUpperCase();
  const found = ISSUE_TYPES.find((t) => t.value === cleanVal);
  if (found) return isVietnamese ? found.labelVi : found.labelEn;
  return val;
}

// Helper định dạng giờ phút tiếng Việt (ví dụ: 14h, 14h35, 2h, 2h35)
function formatHourMinuteVi(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = d.getMinutes();
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return m === 0 ? `${h}h` : `${h}h${mStr}`;
}

// Helper tính toán tiến độ thực tế chính xác theo thời gian đã thực hiện
function calcOrderProgress(order, currentTimestamp = Date.now()) {
  const isProgress = order.status === 'IN_PROGRESS';
  const isCompleted = order.status === 'COMPLETED';

  if (isCompleted) {
    return { progressPercent: 100, timeRemainingMinutes: 0, isFinished: true };
  }
  if (!isProgress) {
    return { progressPercent: 0, timeRemainingMinutes: 0, isFinished: false };
  }

  const rawStart = order.startTime ? new Date(order.startTime).getTime() : NaN;
  const startMs = !isNaN(rawStart) ? rawStart : currentTimestamp;
  const rawEnd = order.endTime ? new Date(order.endTime).getTime() : NaN;
  const endMs = !isNaN(rawEnd) ? rawEnd : (startMs + (order.durationMinutes || 35) * 60 * 1000);
  const totalMs = Math.max(1000, endMs - startMs);
  const elapsedMs = Math.max(0, currentTimestamp - startMs);
  const remainingMs = Math.max(0, endMs - currentTimestamp);

  const ratio = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 0;
  const progressPercent = Math.round(ratio * 100);
  const timeRemainingMinutes = Math.ceil(remainingMs / (60 * 1000));

  return {
    progressPercent: isNaN(progressPercent) ? 0 : progressPercent,
    timeRemainingMinutes: isNaN(timeRemainingMinutes) ? 0 : timeRemainingMinutes,
    isFinished: remainingMs === 0,
  };
}

// Helper chuẩn hóa đơn hàng từ Backend DTO
function normalizeOrder(o, isVietnamese) {
  const rawStatus = (o.status || '').toUpperCase().trim();
  const rawTransfer = o.machineTransferInfo || o.items?.[0]?.machineTransferInfo || null;
  const isWaitingMachine = rawStatus === 'WAITING_MACHINE' || Boolean(rawTransfer?.isWaitingForMachine);
  const isProgress = rawStatus === 'IN_PROGRESS';
  const isConfirmed = rawStatus === 'CONFIRMED';
  const isPending = rawStatus === 'PENDING_PAYMENT';
  const isCompleted = rawStatus === 'COMPLETED';
  const isCancelled = rawStatus === 'CANCELLED';
  const isRefunded = rawStatus === 'REFUNDED';

  const isMachineMaintenance = o.items?.[0]?.machineStatus === 'MAINTENANCE';

  const issues = o.issuesList || [];
  const latestIssue = Array.isArray(issues) && issues.length > 0 ? issues[0] : null;

  const reportedIssueEvent = (o.events || []).slice().reverse().find((e) => e.eventType === 'MACHINE_MALFUNCTION_REPORTED');
  let reportedIssueData = null;

  if (latestIssue) {
    reportedIssueData = {
      issueType: latestIssue.issueType || 'MACHINE_STOPPED',
      description: latestIssue.description || '',
      reportedAt: latestIssue.reportedAt || o.createdAt,
    };
  } else if (reportedIssueEvent) {
    try {
      const parsed = typeof reportedIssueEvent.data === 'string' ? JSON.parse(reportedIssueEvent.data) : (reportedIssueEvent.data || {});
      reportedIssueData = {
        issueType: parsed.issueType || 'MACHINE_STOPPED',
        description: parsed.description || '',
        reportedAt: reportedIssueEvent.createdAt,
      };
    } catch {
      reportedIssueData = {
        issueType: 'MACHINE_STOPPED',
        description: typeof reportedIssueEvent.data === 'string' ? reportedIssueEvent.data : '',
        reportedAt: reportedIssueEvent.createdAt,
      };
    }
  } else if (rawTransfer?.hasMachineIssue || isMachineMaintenance) {
    const fallbackDesc = rawTransfer?.resolutionNote || rawTransfer?.note || '';
    const inferredType = extractIssueType(fallbackDesc) || 'MACHINE_STOPPED';
    reportedIssueData = {
      issueType: inferredType,
      description: fallbackDesc || (isVietnamese ? 'Thiết bị gặp sự cố kỹ thuật' : 'Machine technical malfunction'),
      reportedAt: rawTransfer?.reportedAt || o.createdAt,
    };
  }

  const hasReportedIssue = Boolean(reportedIssueData || reportedIssueEvent || isMachineMaintenance || rawTransfer?.hasMachineIssue);
  const transferredToMachineCode = rawTransfer?.transferredToMachineCode || null;
  const failedMachineCode = rawTransfer?.failedMachineCode || null;
  const issueType = reportedIssueData?.issueType || o.issueType || rawTransfer?.issueType || (hasReportedIssue ? 'MACHINE_STOPPED' : null);
  const issueDescription = reportedIssueData?.description || o.issueDescription || '';

  const serviceName =
    o.items?.[0]?.offeringName ||
    o.serviceName ||
    (isVietnamese ? 'Chu trình giặt' : 'Wash Cycle');

  const originalMachineCode = o.items?.[0]?.machineCode || o.assignedMachines || o.machineCode || '';
  const activeMachineCode = transferredToMachineCode || originalMachineCode;
  const machineKind = o.items?.[0]?.machineClassKind || o.machineKind || '';
  const machineName =
    o.machineName ||
    (activeMachineCode
      ? `${activeMachineCode}${machineKind ? ` (${machineKind === 'DRYER' ? (isVietnamese ? 'Máy sấy' : 'Dryer') : (isVietnamese ? 'Máy giặt' : 'Washer')})` : ''}`
      : '');

  const washStartedEvent = (o.events || []).find((e) => e.eventType === 'WASH_STARTED');
  let startTime = null;

  if (washStartedEvent?.createdAt) {
    startTime = new Date(washStartedEvent.createdAt);
  } else {
    const savedStart =
      localStorage.getItem(`order_started_at_${o.orderId}`) ||
      localStorage.getItem(`order_started_at_${o.orderCode}`);
    if (savedStart) {
      startTime = new Date(savedStart);
    } else if (isProgress) {
      startTime = o.updatedAt ? new Date(o.updatedAt) : new Date();
      localStorage.setItem(`order_started_at_${o.orderId}`, startTime.toISOString());
    } else {
      startTime = o.createdAt ? new Date(o.createdAt) : new Date();
    }
  }

  if (isNaN(startTime.getTime())) {
    startTime = new Date();
  }

  const durationMinutes = o.items?.[0]?.durationMin || o.durationMinutes || 35;
  const machineBusyUntil = o.items?.[0]?.machineBusyUntil;

  let endTime = null;
  if (machineBusyUntil && new Date(machineBusyUntil).getTime() > startTime.getTime()) {
    endTime = new Date(machineBusyUntil);
  } else {
    endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  }

  const startTimeFormatted = formatHourMinuteVi(startTime);
  const endTimeFormatted = formatHourMinuteVi(endTime);

  let stepDescription = isVietnamese ? 'Đang xử lý' : 'Processing';
  if (isWaitingMachine) {
    stepDescription = isVietnamese ? 'Chờ máy trống tương đồng' : 'Waiting for matching machine';
  } else if (hasReportedIssue && !transferredToMachineCode && !isCompleted && !isCancelled) {
    stepDescription = isVietnamese ? 'Máy gặp sự cố (Đang xử lý)' : 'Machine issue reported';
  } else if (isProgress) {
    stepDescription = isVietnamese ? 'Đang giặt' : 'Washing';
  } else if (isConfirmed) {
    stepDescription = isVietnamese ? 'Sẵn sàng bắt đầu giặt' : 'Ready to start';
  } else if (isPending) {
    stepDescription = isVietnamese ? 'Chờ thanh toán (Giữ máy 15p)' : 'Pending payment';
  } else if (isCancelled) {
    stepDescription = isVietnamese ? 'Đã hủy đơn' : 'Order cancelled';
  } else if (isRefunded) {
    stepDescription = isVietnamese ? 'Đã hoàn tiền' : 'Refunded';
  } else if (isCompleted) {
    stepDescription = isVietnamese ? 'Hoàn tất chu trình' : 'Completed';
  }

  return {
    orderId: o.orderId,
    orderCode: o.orderCode,
    machineCode: activeMachineCode,
    originalMachineCode: originalMachineCode,
    machineName: machineName,
    serviceName: serviceName,
    siteName: o.siteName || '',
    cycleName: serviceName,
    status: isWaitingMachine ? 'WAITING_MACHINE' : rawStatus,
    currentStep: stepDescription,
    startTime,
    endTime,
    startTimeFormatted,
    endTimeFormatted,
    durationMinutes,
    subtotal: o.subtotal ?? o.originalAmount ?? (o.total ?? 0),
    discountTotal: o.discountTotal ?? o.totalDiscount ?? 0,
    total: o.total ?? o.finalAmount ?? o.subtotal ?? 0,
    memberId: o.memberId,
    customerType: o.customerType || (o.memberId ? 'MEMBER' : 'GUEST'),
    pointsEarned: Number(o.pointsEarned ?? (rawStatus === 'COMPLETED' && (o.memberId || o.customerType === 'MEMBER') ? (o.total ?? 0) : 0)),
    appliedDiscounts: Array.isArray(o.appliedDiscounts) ? o.appliedDiscounts : [],
    items: o.items || [],
    events: o.events || [],
    hasReportedIssue,
    reportedIssueData,
    issueType,
    issueDescription,
    isMachineMaintenance,
    transferredToMachineCode,
    failedMachineCode,
    machineTransferInfo: rawTransfer,
    createdAt: o.createdAt || null,
    completedAt: o.completedAt,
    customerName: o.guestName || o.customerName || '',
    customerPhone: o.guestPhone || o.customerPhone || '',
  };
}

// Thẻ hiển thị đơn giặt với quy trình 3 bước (CONFIRMED -> IN_PROGRESS -> COMPLETED)
function OrderCard({
  order,
  isStarting,
  isCompleting,
  isCancelling,
  onStart,
  onComplete,
  onCancel,
  onPay,
  onViewReceipt,
  isVietnamese,
  now,
  isHighlighted = false,
}) {
  const isProgress = order.status === 'IN_PROGRESS';
  const isConfirmed = order.status === 'CONFIRMED';
  const isPending = order.status === 'PENDING_PAYMENT';
  const isWaiting = order.status === 'WAITING_MACHINE';
  const liveTiming = calcOrderProgress(order, now);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border-2 p-5 sm:p-6 shadow-xl space-y-4 transition-all duration-300 ${isHighlighted
        ? 'ring-4 ring-blue-500/20 border-blue-500 shadow-blue-500/10'
        : isProgress
          ? 'border-emerald-500/80 shadow-emerald-500/5'
          : isConfirmed
            ? 'border-blue-500/80 shadow-blue-500/5'
            : isWaiting
              ? 'border-amber-500/80 shadow-amber-500/5'
              : 'border-amber-400/80 shadow-amber-500/5'
        }`}
    >
      {/* Tiêu đề & Thông tin máy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${isProgress
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
              : isConfirmed
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : isWaiting
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
          >
            {isProgress ? (
              <WashingMachine className="w-7 h-7 animate-spin" />
            ) : isConfirmed ? (
              <WashingMachine className="w-7 h-7" />
            ) : (
              <Clock className="w-7 h-7" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {order.serviceName || order.cycleName}
              </h3>
              {order.machineName ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                  <WashingMachine className="w-3.5 h-3.5" />
                  <span>{order.machineName}</span>
                </span>
              ) : order.machineCode ? (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  {order.machineCode}
                </span>
              ) : null}
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
              {order.siteName && (
                <>
                  <span>{order.siteName}</span>
                  <span>•</span>
                </>
              )}
              {order.customerPhone && (
                <>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {order.customerPhone}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </div>
          </div>
        </div>

        {/* Status Badge & Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {order.hasReportedIssue && !order.transferredToMachineCode && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{isVietnamese ? 'Loại sự cố:' : 'Issue:'} {getIssueTypeLabel(order.issueType, isVietnamese)}</span>
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isProgress
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'
              : isConfirmed
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'
                : isWaiting
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
              }`}
          >
            {isProgress ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            ) : isConfirmed ? (
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>{order.currentStep}</span>
          </span>

          {isConfirmed && (
            <button
              disabled={isStarting}
              onClick={() => onStart(order.orderId)}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Kích hoạt máy giặt chạy chu trình"
            >
              {isStarting ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isVietnamese ? 'Bắt đầu giặt ngay' : 'Start Wash'}</span>
            </button>
          )}

          {isProgress && (
            <button
              disabled={isCompleting}
              onClick={() => onComplete(order.orderId)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              title="Xong chu trình & Giải phóng máy giặt"
            >
              {isCompleting ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              )}
              <span>{isVietnamese ? 'Xong chu trình' : 'Finish'}</span>
            </button>
          )}

          {isPending && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPay && onPay(order)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer active:scale-95 animate-pulse"
                title="Thanh toán ngay bằng VietQR hoặc ví"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Thanh toán ngay' : 'Pay Now'}</span>
              </button>

              <button
                disabled={isCancelling}
                onClick={() => onCancel(order.orderId)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Hủy đơn hàng chưa thanh toán"
              >
                {isCancelling ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>{isVietnamese ? 'Hủy đơn' : 'Cancel'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* THANH TIẾN TRÌNH 3 BƯỚC: 1. ĐÃ THANH TOÁN (CONFIRMED) -> 2. ĐANG GIẶT (IN_PROGRESS) -> 3. HOÀN TẤT */}
      <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-center">
        {/* Bước 1 */}
        <div
          className={`flex flex-col items-center gap-1 transition-colors ${isConfirmed || isProgress
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-400'
            }`}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isProgress
              ? 'bg-blue-600 text-white shadow-xs'
              : isConfirmed
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
          >
            {isProgress ? '✓' : isConfirmed ? '▶' : '1'}
          </div>
          <span className="text-[11px] leading-tight">{isVietnamese ? '1. Bắt đầu giặt' : '1. Start Wash'}</span>
        </div>

        {/* Bước 2 */}
        <div
          className={`flex flex-col items-center gap-1 transition-colors ${isProgress
            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
            : isConfirmed
              ? 'text-slate-500 font-medium'
              : 'text-slate-400'
            }`}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isProgress
              ? 'bg-emerald-600 text-white animate-pulse shadow-xs'
              : isConfirmed
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
          >
            {isProgress ? '⚡' : '2'}
          </div>
          <span className="text-[11px] leading-tight">{isVietnamese ? '2. Đang giặt' : '2. Washing'}</span>
        </div>

        {/* Bước 3 */}
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 font-bold">
            3
          </div>
          <span className="text-[11px] leading-tight">{isVietnamese ? '3. Hoàn tất nhận đồ' : '3. Completed'}</span>
        </div>
      </div>

      {/* Thông tin diễn tiến chi tiết */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
          <span
            className={`flex items-center gap-1.5 ${isProgress
              ? 'text-emerald-600 dark:text-emerald-400'
              : isConfirmed
                ? 'text-blue-600 dark:text-blue-400'
                : isWaiting
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            {isProgress
              ? isVietnamese
                ? `Thời gian bắt đầu ${order.startTimeFormatted}, dự kiến xong lúc ${order.endTimeFormatted} (còn ~${liveTiming.timeRemainingMinutes} phút)`
                : `Started at ${order.startTimeFormatted}, completion in ${order.endTimeFormatted} (~${liveTiming.timeRemainingMinutes}m left)`
              : isConfirmed
                ? isVietnamese
                  ? 'Đơn hàng đã thanh toán thành công. Nhấn nút "Bắt đầu giặt ngay" để khởi động máy!'
                  : 'Order paid successfully. Press "Start Wash" to run machine!'
                : isWaiting
                  ? isVietnamese
                    ? 'Đang xếp hàng chờ máy trống cùng loại khả dụng tại trạm'
                    : 'Queued for matching machine'
                  : isVietnamese
                    ? 'Đang giữ máy chờ bạn quét mã thanh toán'
                    : 'Waiting for payment'}
          </span>
          {isProgress && (
            <span className="text-slate-800 dark:text-slate-200 font-mono font-bold">
              {liveTiming.progressPercent}%
            </span>
          )}
        </div>

        {isProgress && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-300 ease-linear"
              style={{ width: `${liveTiming.progressPercent}%` }}
            ></div>
          </div>
        )}

        {/* CASE BANNERS: 0. CHỜ THANH TOÁN / 1. ĐÃ BÁO SỰ CỐ / 2. ĐỔI MÁY MỚI / 3. HÀNG ĐỢI MÁY TRỐNG */}
        {isPending && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-sm text-amber-950 dark:text-amber-100">
                  {isVietnamese ? 'Đơn hàng đang chờ thanh toán giữ máy' : 'Order Awaiting Payment'}
                </span>
                <p className="text-[11.5px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  {isVietnamese
                    ? 'Máy được giữ chỗ trong 15 phút. Bạn vui lòng quét mã VietQR Napas247 hoặc dùng số dư ví để thanh toán ngay!'
                    : 'The machine is held for 15 minutes. Please pay via VietQR or Wallet now to secure it!'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPay && onPay(order)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/25 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isVietnamese ? 'Thanh toán ngay' : 'Pay Now'}</span>
            </button>
          </div>
        )}
        {order.hasReportedIssue && !order.transferredToMachineCode && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && !isWaiting && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold block text-sm">
                  {isVietnamese ? 'Đơn hàng đang có báo cáo sự cố máy' : 'Issue Reported for Machine'}
                </span>
                {order.issueType && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-600 shadow-2xs">
                    <Wrench className="w-3 h-3 text-amber-700 dark:text-amber-300" />
                    <span>{isVietnamese ? 'Loại sự cố:' : 'Issue Type:'} {getIssueTypeLabel(order.issueType, isVietnamese)}</span>
                  </span>
                )}
              </div>
              {order.issueDescription && (
                <div className="text-xs bg-amber-100/70 dark:bg-amber-900/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100 font-medium">
                  <span className="font-bold">{isVietnamese ? 'Mô tả sự cố:' : 'Description:'}</span> {order.issueDescription}
                </div>
              )}
              <p className="text-[11.5px] text-amber-800 dark:text-amber-300 leading-relaxed">
                {isVietnamese
                  ? 'Hệ thống đã tiếp nhận và tạm khóa bảo trì máy. Đội ngũ kỹ thuật viên trạm đang xử lý khẩn cấp. Quần áo của bạn được bảo toàn an toàn. Hotline hỗ trợ 24/7: 1900 6868.'
                  : 'System has received the report and dispatched an on-site technician. Clothes are safe. 24/7 Hotline: 1900 6868.'}
              </p>
            </div>
          </div>
        )}

        {order.transferredToMachineCode && (isConfirmed || isProgress) && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5 shadow-2xs animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                {isVietnamese ? 'Đã đổi sang máy tương đồng thành công!' : 'Transferred to Equivalent Machine!'}
              </span>
              <p className="text-[11.5px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                {isVietnamese
                  ? `Máy cũ [${order.failedMachineCode || order.machineCode}] gặp sự cố đã chuyển sang bảo trì. Đơn hàng của bạn đã được chuyển sang máy [${order.transferredToMachineCode}]. Bạn vui lòng chuyển đồ sang máy mới và nhấn "Bắt đầu giặt ngay" bên trên để tiếp tục!`
                  : `Transferred from [${order.failedMachineCode || order.machineCode}] to [${order.transferredToMachineCode}]. Please move clothes and click "Start Wash" above!`}
              </p>
            </div>
          </div>
        )}

        {isWaiting && (
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5 shadow-2xs animate-fade-in">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                {isVietnamese ? 'Đang xếp hàng chờ máy trống cùng loại' : 'Queued for Matching Machine'}
              </span>
              <p className="text-[11.5px] text-blue-800 dark:text-blue-300 leading-relaxed">
                {isVietnamese
                  ? `Máy cũ [${order.failedMachineCode || order.machineCode}] gặp sự cố. Trạm hiện đang hết máy trống tương đồng 100%. Đơn của bạn được xếp hàng ưu tiên và hệ thống sẽ tự động gán máy ngay khi có máy hoàn tất chu trình!`
                  : `Old machine encountered an issue. Waiting for matching machine release. System will auto-assign as soon as available!`}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Footer thẻ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Mã đơn:{' '}
            <strong className="font-mono text-slate-600 dark:text-slate-300">
              #{order.orderCode || order.orderId}
            </strong>
          </span>
          {order.discountTotal > 0 && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>Ưu đãi: -{order.discountTotal.toLocaleString('vi-VN')} ₫</span>
            </span>
          )}
          {order.pointsEarned > 0 && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-500" />
              <span>+{order.pointsEarned.toLocaleString('vi-VN')} điểm</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span>
            Thanh toán:{' '}
            <strong className="text-blue-600 dark:text-blue-400 font-bold">
              {(order.total ?? 0).toLocaleString('vi-VN')} ₫
            </strong>
          </span>
          {isPending && (
            <button
              type="button"
              onClick={() => onPay && onPay(order)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
              title="Thanh toán ngay"
            >
              <CreditCard className="w-3 h-3" />
              <span>{isVietnamese ? 'Thanh toán ngay' : 'Pay Now'}</span>
            </button>
          )}
          {onViewReceipt && (
            <button
              type="button"
              onClick={() => onViewReceipt(order)}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              title="Xem chi tiết đơn và ưu đãi"
            >
              <Receipt className="w-3 h-3" />
              <span>{isVietnamese ? 'Xem hóa đơn' : 'Receipt'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const { isVietnamese } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuest = Boolean(user?.isGuest);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [startingId, setStartingId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(
    Boolean(location.state?.paymentSuccess)
  );

  // Modal xem chi tiết hóa đơn và các voucher/khuyến mãi đã áp dụng
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [loadingReceiptDetail, setLoadingReceiptDetail] = useState(false);

  // ==========================================
  // PAYMENT MODAL STATES & LOGIC
  // ==========================================
  const [payingOrder, setPayingOrder] = useState(null);
  const [payModalStep, setPayModalStep] = useState('PAY'); // 'PAY' | 'SUCCESS'
  const [paymentMethod, setPaymentMethod] = useState('PAYOS'); // 'PAYOS' | 'WALLET'
  const [payOsData, setPayOsData] = useState(null);
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [wallet, setWallet] = useState(null);
  const [payingWithWallet, setPayingWithWallet] = useState(false);
  const [walletPayError, setWalletPayError] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [isSyncingPayment, setIsSyncingPayment] = useState(false);
  const [simulatingMock, setSimulatingMock] = useState(false);

  // Mở modal xem chi tiết hóa đơn & danh sách voucher / khuyến mãi đã áp dụng
  async function handleViewReceipt(order) {
    setSelectedReceiptOrder(order);
    if (order?.orderId) {
      setLoadingReceiptDetail(true);
      try {
        const detail = await ordersApi.getOrderById(order.orderId);
        if (detail) {
          setSelectedReceiptOrder(normalizeOrder({ ...order, ...detail }, isVietnamese));
        }
      } catch (err) {
        console.warn('Could not fetch extra receipt detail', err);
      } finally {
        setLoadingReceiptDetail(false);
      }
    }
  }

  // Dành riêng cho Khách vãng lai: Ô nhập SĐT tra cứu độc lập
  const [phoneInput, setPhoneInput] = useState(() => {
    return location.state?.phone || '';
  });
  const [searchedPhone, setSearchedPhone] = useState(() => {
    return location.state?.phone || '';
  });
  const [hasSearched, setHasSearched] = useState(() => {
    return Boolean(location.state?.phone);
  });
  const [searchError, setSearchError] = useState('');

  // Tải đơn hàng: TÁCH BIỆT HOÀN TOÀN GIỮA KHÁCH VÃNG LAI VÀ THÀNH VIÊN
  const fetchOrders = useCallback(async (overridePhone = null, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let rawList = [];

      if (isGuest) {
        // ========================================================
        // 1. KHÁCH VÃNG LAI: CHỈ TRA CỨU THEO SỐ ĐIỆN THOẠI
        // (Tuyệt đối KHÔNG gọi API /api/orders/me của Member)
        // ========================================================
        const phoneToUse = (overridePhone !== null ? overridePhone : searchedPhone)?.trim();
        if (phoneToUse) {
          try {
            const guestData = await ordersApi.getGuestOrders(phoneToUse);
            const guestItems = Array.isArray(guestData) ? guestData : (guestData?.items || []);
            rawList.push(...guestItems);
          } catch (gErr) {
            console.warn('Guest orders lookup note', gErr);
          }

          // Kiểm tra thêm đơn hàng lưu trong localStorage (laundro_guest_orders)
          try {
            const localRaw = localStorage.getItem('laundro_guest_orders');
            if (localRaw) {
              const localList = JSON.parse(localRaw);
              if (Array.isArray(localList)) {
                const seenIds = new Set(rawList.map((x) => x.orderId || x.orderCode));
                localList.forEach((l) => {
                  if (l.guestPhone && l.guestPhone.includes(phoneToUse)) {
                    if (!seenIds.has(l.orderId) && !seenIds.has(l.orderCode)) {
                      rawList.push(l);
                      seenIds.add(l.orderId || l.orderCode);
                    }
                  }
                });
              }
            }
          } catch (locErr) {
            console.warn('Local guest orders note', locErr);
          }
        }
      } else {
        // ========================================================
        // 2. HỘI VIÊN (MEMBER): CHỈ TẢI ĐƠN CỦA TÀI KHOẢN ĐĂNG NHẬP
        // (Tuyệt đối KHÔNG gọi API getGuestOrders, KHÔNG hiện ô SĐT)
        // ========================================================
        try {
          const data = await ordersApi.getMyOrders(null, 1, 25);
          const memberItems = Array.isArray(data) ? data : (data?.items || []);
          rawList.push(...memberItems);
        } catch (mErr) {
          console.warn('Member orders lookup note', mErr);
        }
      }

      if (rawList.length > 0) {
        // Nạp chi tiết và danh sách sự cố cho các đơn active hoặc đang có sự cố
        const detailedList = await Promise.all(
          rawList.map(async (o) => {
            const rawStatus = (o.status || '').toUpperCase().trim();
            const isNeedDetail = ['IN_PROGRESS', 'CONFIRMED', 'WAITING_MACHINE'].includes(rawStatus) || o.machineTransferInfo?.hasMachineIssue;
            if (isNeedDetail) {
              try {
                const [detail, issues] = await Promise.allSettled([
                  ordersApi.getOrderById(o.orderId || o.id),
                  ordersApi.getOrderIssues(o.orderId || o.id),
                ]);
                const detailVal = detail.status === 'fulfilled' ? detail.value : {};
                const issuesVal = issues.status === 'fulfilled' ? (Array.isArray(issues.value) ? issues.value : issues.value?.items || []) : [];
                return { ...o, ...detailVal, issuesList: issuesVal };
              } catch {
                return o;
              }
            }
            return o;
          })
        );

        setOrders(detailedList.map((o) => normalizeOrder(o, isVietnamese)));
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Failed to load orders', err);
      setOrders([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [isGuest, searchedPhone, isVietnamese]);

  // Xử lý khi Khách vãng lai bấm nút Tra cứu
  const handleGuestSearch = (e) => {
    if (e) e.preventDefault();
    const clean = phoneInput.trim();
    if (!clean) {
      setSearchError(isVietnamese ? 'Vui lòng nhập số điện thoại để tra cứu!' : 'Please enter phone number!');
      return;
    }
    setSearchError('');
    setSearchedPhone(clean);
    setHasSearched(true);
    fetchOrders(clean, true);
  };

  // Khởi động trang và tự động nạp đơn ban đầu
  useEffect(() => {
    if (isGuest) {
      if (location.state?.phone) {
        setPhoneInput(location.state.phone);
        setSearchedPhone(location.state.phone);
        setHasSearched(true);
        fetchOrders(location.state.phone, true);
      } else {
        setLoading(false);
      }
    } else {
      fetchOrders(null, true);
    }
  }, [isGuest, location.state?.phone]);

  // Đồng hồ local 1 giây/lần cập nhật thanh tiến độ và thời gian đếm ngược (hoàn toàn không gọi API, không load lại)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(tickInterval);
  }, []);

  // Start order handler (POST /api/orders/{id}/start)
  async function handleStartOrder(orderId) {
    setStartingId(orderId);
    try {
      localStorage.setItem(`order_started_at_${orderId}`, new Date().toISOString());
      await ordersApi.startOrder(orderId, {
        note: isGuest ? 'Khởi động máy từ màn hình tra cứu' : 'Khởi động máy từ giao diện thành viên',
      });
      await fetchOrders(null, false);
    } catch (err) {
      console.warn('Error starting order', err);
      alert(err.message || (isVietnamese ? 'Không thể khởi động máy. Vui lòng thử lại!' : 'Failed to start machine.'));
    } finally {
      setStartingId(null);
    }
  }

  // Complete order handler (POST /api/orders/{id}/complete)
  async function handleCompleteOrder(orderId) {
    setCompletingId(orderId);
    try {
      localStorage.removeItem(`order_started_at_${orderId}`);
      await ordersApi.completeOrder(orderId);
      await fetchOrders(null, false);
    } catch (err) {
      console.warn('Error completing order', err);
    } finally {
      setCompletingId(null);
    }
  }

  // Cancel order handler (POST /api/orders/{id}/cancel)
  async function handleCancelOrder(orderId) {
    if (!window.confirm(isVietnamese ? 'Bạn có chắc chắn muốn hủy đơn hàng này không?' : 'Are you sure you want to cancel this order?')) {
      return;
    }
    setCancellingId(orderId);
    try {
      localStorage.removeItem(`order_started_at_${orderId}`);
      await ordersApi.cancelOrder(orderId, {
        reason: 'Khách hàng tự hủy đơn trước khi thanh toán',
      });
      await fetchOrders(null, false);
    } catch (err) {
      console.warn('Error cancelling order', err);
      alert(err.message || (isVietnamese ? 'Không thể hủy đơn.' : 'Failed to cancel order.'));
    } finally {
      setCancellingId(null);
    }
  }

  // Nạp số dư ví thành viên nếu là Member
  useEffect(() => {
    if (!isGuest) {
      walletsApi.getMyWallet().then(setWallet).catch(() => {});
    }
  }, [isGuest]);

  // Tạo và nạp mã VietQR PayOS cho đơn hàng
  const loadPayOsQr = useCallback(async (order) => {
    if (!order?.orderId) return;
    setQrLoading(true);
    setQrError('');
    setPayOsData(null);
    setGeneratedQrDataUrl('');
    try {
      const res = await ordersApi.createPayOsQrForOrder(order.orderId);
      setPayOsData(res);
      if (res.status === 'PAID' || res.orderStatus === 'CONFIRMED') {
        setPayModalStep('SUCCESS');
        await fetchOrders(null, false);
        return;
      }
      if (res.qrCode) {
        try {
          const url = await QRCode.toDataURL(res.qrCode, {
            width: 360,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
            errorCorrectionLevel: 'M',
          });
          setGeneratedQrDataUrl(url);
        } catch {
          setGeneratedQrDataUrl(res.qrImageUrl || '');
        }
      } else if (res.qrImageUrl) {
        setGeneratedQrDataUrl(res.qrImageUrl);
      }
    } catch (err) {
      console.warn('Failed to generate PayOS QR for order', err);
      setQrError(err.message || (isVietnamese ? 'Không thể tạo mã QR thanh toán PayOS' : 'Failed to generate PayOS QR'));
    } finally {
      setQrLoading(false);
    }
  }, [isVietnamese, fetchOrders]);

  // Mở modal thanh toán đơn hàng
  const handleOpenPaymentModal = useCallback((order) => {
    setPayingOrder(order);
    setPayModalStep('PAY');
    setWalletPayError('');
    setPaymentMethod('PAYOS');
    if (!isGuest) {
      walletsApi.getMyWallet().then(setWallet).catch(() => {});
    }
    loadPayOsQr(order);
  }, [isGuest, loadPayOsQr]);

  // Polling tự động kiểm tra trạng thái thanh toán PayOS mỗi 2.5s khi modal đang mở
  useEffect(() => {
    if (!payingOrder || payModalStep !== 'PAY' || paymentMethod !== 'PAYOS') {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const status = await ordersApi.getOrderPaymentStatus(payingOrder.orderId);
        if (status.isPaid || status.paymentStatus === 'PAID' || status.orderStatus === 'CONFIRMED') {
          clearInterval(intervalId);
          setPayModalStep('SUCCESS');
          fetchOrders(null, false);
          if (!isGuest) {
            walletsApi.getMyWallet().then(setWallet).catch(() => {});
          }
        }
      } catch (pollErr) {
        console.warn('Payment polling check note', pollErr);
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [payingOrder, payModalStep, paymentMethod, isGuest, fetchOrders]);

  // Thanh toán bằng số dư Ví thành viên
  const handlePayWithWallet = async () => {
    if (!payingOrder?.orderId) return;
    setPayingWithWallet(true);
    setWalletPayError('');
    try {
      await ordersApi.payOrderWithWallet(payingOrder.orderId);
      setPayModalStep('SUCCESS');
      await fetchOrders(null, false);
      if (!isGuest) {
        walletsApi.getMyWallet().then(setWallet).catch(() => {});
      }
    } catch (err) {
      console.warn('Wallet pay error', err);
      setWalletPayError(err.message || (isVietnamese ? 'Thanh toán bằng ví thất bại' : 'Wallet payment failed'));
    } finally {
      setPayingWithWallet(false);
    }
  };

  // Đồng bộ thủ công trạng thái thanh toán từ PayOS
  const handleManualSyncPayment = async () => {
    if (!payingOrder?.orderId) return;
    setIsSyncingPayment(true);
    try {
      const status = await ordersApi.getOrderPaymentStatus(payingOrder.orderId);
      if (status.isPaid || status.paymentStatus === 'PAID' || status.orderStatus === 'CONFIRMED') {
        setPayModalStep('SUCCESS');
        await fetchOrders(null, false);
        if (!isGuest) {
          walletsApi.getMyWallet().then(setWallet).catch(() => {});
        }
      } else {
        alert(isVietnamese ? 'Hệ thống chưa nhận được khoản thanh toán từ ngân hàng. Vui lòng thử lại sau vài giây!' : 'Payment not detected yet. Please try again in a few seconds.');
      }
    } catch (err) {
      console.warn('Manual sync error', err);
      alert(err.message || (isVietnamese ? 'Không thể đồng bộ trạng thái' : 'Sync error'));
    } finally {
      setIsSyncingPayment(false);
    }
  };

  // Giả lập thanh toán thành công (MOCK) cho kiểm thử / demo
  const handleMockPayment = async () => {
    if (!payingOrder?.orderId) return;
    setSimulatingMock(true);
    try {
      await ordersApi.payOrder(payingOrder.orderId, {
        paymentMethod: 'MOCK',
        note: 'Xác nhận thanh toán thử nghiệm trực tiếp',
      });
      setPayModalStep('SUCCESS');
      await fetchOrders(null, false);
      if (!isGuest) {
        walletsApi.getMyWallet().then(setWallet).catch(() => {});
      }
    } catch (err) {
      console.warn('Mock payment error', err);
      alert(err.message || 'Lỗi giả lập thanh toán');
    } finally {
      setSimulatingMock(false);
    }
  };

  // Helper sao chép nội dung vào Clipboard kèm phản hồi UI
  const handleCopyText = (text, fieldName) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(String(text));
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const activeOrders = orders.filter(
    (o) => o.status === 'IN_PROGRESS' || o.status === 'CONFIRMED' || o.status === 'PENDING_PAYMENT' || o.status === 'IN_USE' || o.status === 'WAITING_MACHINE'
  );
  const pastOrders = orders.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'REFUNDED' || o.status === 'CANCELLED'
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            {isGuest ? (
              <Search className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            ) : (
              <History className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            )}
            <span>
              {isGuest
                ? (isVietnamese ? 'Tra cứu đơn hàng (Khách vãng lai)' : 'Order Tracking (Guest)')
                : (isVietnamese ? 'Lịch sử & Tiến độ giặt của tôi' : 'My Wash Orders & Progress')}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isGuest
              ? (isVietnamese
                ? 'Nhập số điện thoại đã dùng khi đặt giặt tại Ki-ốt để kiểm tra tiến trình giặt sấy trực tiếp.'
                : 'Enter your phone number to track live washing cycle and pick up clothes.')
              : (isVietnamese
                ? 'Theo dõi tiến trình chu trình giặt thời gian thực và xem lại các hóa đơn giặt của tài khoản hội viên.'
                : 'Track live washing progress and view past laundry receipts.')}
          </p>
        </div>

        <button
          onClick={() => fetchOrders()}
          className="self-start sm:self-auto px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer active:scale-95 shadow-xs"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{isVietnamese ? 'Làm mới trạng thái' : 'Refresh'}</span>
        </button>
      </div>

      {/* Banner thông báo thanh toán thành công */}
      {paymentSuccessNotice && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 shadow-sm">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {isVietnamese ? 'Thanh toán thành công!' : 'Payment Successful!'}
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {isVietnamese
                  ? 'Đơn giặt của bạn đã được thanh toán thành công. Bạn có thể bấm "Bắt đầu giặt ngay" để chạy chu trình!'
                  : 'Your order has been paid successfully. Click "Start Wash" below to begin!'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setPaymentSuccessNotice(false)}
            className="p-1.5 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer transition"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. NẾU LÀ KHÁCH VÃNG LAI: HIỂN THỊ THANH TRA CỨU THEO SĐT */}
      {/* ========================================================= */}
      {isGuest && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isVietnamese ? 'Tra cứu đơn hàng bằng Số điện thoại' : 'Look up order by Phone Number'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVietnamese
                  ? 'Nhập đúng số điện thoại bạn đã điền ở Bước thanh toán tại trạm Ki-ốt'
                  : 'Enter the phone number provided during kiosk checkout'}
              </p>
            </div>
          </div>

          <form onSubmit={handleGuestSearch} className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <div className="relative flex-1 w-full">
              <input
                type="tel"
                autoComplete="off"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  if (searchError) setSearchError('');
                }}
                placeholder={isVietnamese ? 'Nhập số điện thoại (VD: 0912345678)...' : 'Enter phone number...'}
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              {phoneInput && (
                <button
                  type="button"
                  onClick={() => {
                    setPhoneInput('');
                    setSearchedPhone('');
                    setHasSearched(false);
                    setOrders([]);
                    setSearchError('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                  title="Xóa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
            >
              {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{isVietnamese ? 'Tra cứu đơn' : 'Track Order'}</span>
            </button>
          </form>

          {searchError && (
            <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{searchError}</span>
            </div>
          )}

          {searchedPhone && (
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <span>
                {isVietnamese ? 'Kết quả tra cứu cho số:' : 'Results for phone:'}{' '}
                <strong className="font-mono text-blue-600 dark:text-blue-400">{searchedPhone}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setPhoneInput('');
                  setSearchedPhone('');
                  setHasSearched(false);
                  setOrders([]);
                }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                {isVietnamese ? 'Tra cứu số khác' : 'Search other number'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DANH SÁCH ĐƠN HÀNG (ACTIVE & COMPLETED)                */}
      {/* ========================================================= */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
          <RotateCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>
            {isGuest
              ? (isVietnamese ? 'Đang tra cứu đơn giặt của bạn...' : 'Searching your laundry orders...')
              : (isVietnamese ? 'Đang tải lịch sử đơn giặt...' : 'Loading your orders...')}
          </span>
        </div>
      ) : isGuest && !hasSearched ? (
        <div className="p-8 text-center bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 text-xs space-y-2">
          <Search className="w-8 h-8 mx-auto opacity-40 text-blue-500" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {isVietnamese ? 'Vui lòng nhập số điện thoại để tra cứu' : 'Please enter your phone number to track orders'}
          </p>
          <p className="text-xs text-slate-400">
            {isVietnamese
              ? 'Hệ thống sẽ hiển thị tình trạng đơn giặt, thời gian máy chạy và thông báo khi hoàn tất.'
              : 'The system will show live machine status, remaining minutes and pickup alerts.'}
          </p>
        </div>
      ) : activeOrders.length === 0 && pastOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
            <WashingMachine className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isGuest
                ? (isVietnamese ? `Không tìm thấy đơn hàng nào cho số ${searchedPhone}` : `No orders found for ${searchedPhone}`)
                : (isVietnamese ? 'Chưa có đơn giặt nào trong tài khoản' : 'No laundry orders yet')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {isGuest
                ? (isVietnamese
                  ? 'Hãy kiểm tra lại số điện thoại đã điền khi đặt đơn tại trạm Ki-ốt hoặc đặt chu trình mới!'
                  : 'Please check your phone number or place a new laundry order.')
                : (isVietnamese
                  ? 'Hãy chọn máy giặt/sấy tại trạm và khởi động chu trình giặt ngay để tích lũy điểm thưởng hội viên!'
                  : 'Start booking a washer or dryer to earn rewards and track your clothes!')}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/dashboard/new-order')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95"
            >
              <WashingMachine className="w-4 h-4" />
              <span>{isVietnamese ? 'Đặt đơn giặt / sấy mới ngay' : 'Book a New Laundry Machine'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Nhóm đơn đang hoạt động (CONFIRMED / IN_PROGRESS / PENDING_PAYMENT) */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>
                  {isGuest
                    ? (isVietnamese ? 'Đơn giặt của bạn đang hoạt động' : 'Your Active Laundry')
                    : (isVietnamese ? 'Đơn giặt đang hoạt động' : 'Active Laundry in Progress')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-bold">
                  {activeOrders.length}
                </span>
              </h2>

              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <OrderCard
                    key={order.orderId || order.orderCode}
                    order={order}
                    isStarting={startingId === order.orderId}
                    isCompleting={completingId === order.orderId}
                    isCancelling={cancellingId === order.orderId}
                    onStart={handleStartOrder}
                    onComplete={handleCompleteOrder}
                    onCancel={handleCancelOrder}
                    onPay={handleOpenPaymentModal}
                    onViewReceipt={handleViewReceipt}
                    isVietnamese={isVietnamese}
                    now={now}
                    isHighlighted={Boolean(
                      (location.state?.orderId && (order.orderId === location.state.orderId || String(order.orderId) === String(location.state.orderId))) ||
                      (location.state?.orderCode && (order.orderCode === location.state.orderCode || String(order.orderCode) === String(location.state.orderCode)))
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Nhóm đơn đã hoàn tất / Hủy */}
          {pastOrders.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                <span>
                  {isGuest
                    ? (isVietnamese ? 'Lịch sử đơn đã hoàn tất của số này' : 'Completed Receipts for this Phone')
                    : (isVietnamese ? 'Lịch sử hóa đơn giặt đã hoàn tất' : 'Completed Laundry Receipts')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
                  {pastOrders.length}
                </span>
              </h2>

              <div className="space-y-3">
                {pastOrders.map((order) => {
                  const isCompleted = order.status === 'COMPLETED';
                  const isRefunded = order.status === 'REFUNDED';

                  return (
                    <div
                      key={order.orderId || order.orderCode}
                      className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${isCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600'
                            }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <RotateCw className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {order.serviceName || order.cycleName}
                            </span>
                            {order.machineName ? (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-1">
                                <WashingMachine className="w-3 h-3" />
                                <span>{order.machineName}</span>
                              </span>
                            ) : order.machineCode ? (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                                {order.machineCode}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                            {order.siteName && (
                              <>
                                <span>{order.siteName}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>Mã: #{order.orderCode}</span>
                            <span>•</span>
                            <span>{order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '-'}</span>
                            {order.hasReportedIssue && order.issueType && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>{isVietnamese ? 'Sự cố:' : 'Issue:'} {getIssueTypeLabel(order.issueType, isVietnamese)}</span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Mã voucher / Khuyến mãi đã áp dụng */}
                          {order.discountTotal > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span className="text-xs text-slate-400 line-through">
                                {(order.subtotal ?? (order.total + order.discountTotal)).toLocaleString('vi-VN')} ₫
                              </span>
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <Tag className="w-3 h-3 text-emerald-600" />
                                <span>
                                  {order.appliedDiscounts && order.appliedDiscounts.length > 0
                                    ? `Ưu đãi: ${order.appliedDiscounts.map((d) => d.ruleName || d.ruleCode).join(', ')} (-${order.discountTotal.toLocaleString('vi-VN')} ₫)`
                                    : `Ưu đãi: -${order.discountTotal.toLocaleString('vi-VN')} ₫`}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        {/* 1. Trạng thái */}
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{isVietnamese ? 'Hoàn tất' : 'Completed'}</span>
                          </span>
                        ) : isRefunded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>{isVietnamese ? 'Đã hoàn tiền' : 'Refunded'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                            <span>
                              {order.status === 'CANCELLED'
                                ? (isVietnamese ? 'Đã hủy' : 'Cancelled')
                                : order.status}
                            </span>
                          </span>
                        )}

                        {/* 2. Điểm tích lũy */}
                        {order.pointsEarned > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 shrink-0">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span>+{order.pointsEarned.toLocaleString('vi-VN')} điểm</span>
                          </span>
                        )}

                        {/* 3. Số tiền */}
                        <div className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white whitespace-nowrap shrink-0">
                          {(order.total ?? 0).toLocaleString('vi-VN')} ₫
                        </div>

                        {/* 4. Xem chi tiết & Voucher */}
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(order)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs shrink-0 whitespace-nowrap"
                          title="Xem chi tiết hóa đơn và các ưu đãi đã áp dụng"
                        >
                          <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{isVietnamese ? 'Xem chi tiết & Voucher' : 'View Voucher & Receipt'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL XEM CHI TIẾT ĐƠN HÀNG & MÃ VOUCHER / KHUYẾN MÃI    */}
      {/* ========================================================= */}
      {selectedReceiptOrder &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setSelectedReceiptOrder(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in cursor-pointer select-none"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white relative flex flex-col max-w-2xl w-full max-h-[90vh] animate-in zoom-in-95 duration-200 cursor-default my-auto overflow-hidden select-text"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                      {isVietnamese ? 'Chi tiết đơn hàng & Khuyến mãi' : 'Order & Promotion Details'}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      Mã đơn: #{selectedReceiptOrder.orderCode || selectedReceiptOrder.orderId}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="overflow-y-auto pr-1 space-y-3.5 my-3 [scrollbar-width:thin] flex-1">
                {loadingReceiptDetail ? (
                  <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-xs">{isVietnamese ? 'Đang nạp chi tiết đơn hàng...' : 'Loading order details...'}</span>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* 1. Trạng thái & Dịch vụ - Hiển thị từng hàng rộng rãi, không bị gãy chữ */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs sm:text-sm divide-y divide-slate-200/60 dark:divide-slate-700/50">
                      {/* Trạng thái đơn */}
                      <div className="pb-2.5 flex items-center justify-between gap-4">
                        <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
                          {isVietnamese ? 'Trạng thái đơn:' : 'Status:'}
                        </span>
                        {selectedReceiptOrder.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-md text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                            <span>{isVietnamese ? 'Đang giặt' : 'Washing'}</span>
                          </span>
                        ) : selectedReceiptOrder.status === 'CONFIRMED' ? (
                          <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-md text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{isVietnamese ? 'Sẵn sàng bắt đầu giặt' : 'Ready to start'}</span>
                          </span>
                        ) : selectedReceiptOrder.status === 'PENDING_PAYMENT' ? (
                          <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-md text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{isVietnamese ? 'Chờ thanh toán (Giữ máy 15p)' : 'Pending payment'}</span>
                          </span>
                        ) : selectedReceiptOrder.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-md text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                            <span>{isVietnamese ? ' Đã hoàn tất' : ' Completed'}</span>
                          </span>
                        ) : selectedReceiptOrder.status === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-md text-xs bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <X className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                            <span>{isVietnamese ? 'Đã hủy đơn' : 'Cancelled'}</span>
                          </span>
                        ) : selectedReceiptOrder.status === 'REFUNDED' ? (
                          <span className="inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-md text-xs bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                            <RotateCw className="w-3.5 h-3.5 shrink-0" />
                            <span>{isVietnamese ? 'Đã hoàn tiền' : 'Refunded'}</span>
                          </span>
                        ) : (
                          <span className="font-bold px-2.5 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {selectedReceiptOrder.currentStep || selectedReceiptOrder.status}
                          </span>
                        )}
                      </div>

                      {/* Dịch vụ */}
                      <div className="py-2.5 flex items-center justify-between gap-4">
                        <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
                          {isVietnamese ? 'Dịch vụ:' : 'Service:'}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base text-right">
                          {selectedReceiptOrder.serviceName || selectedReceiptOrder.cycleName}
                        </span>
                      </div>

                      {/* Thiết bị */}
                      {selectedReceiptOrder.machineName && (
                        <div className="py-2.5 flex items-center justify-between gap-4">
                          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
                            {isVietnamese ? 'Thiết bị:' : 'Machine:'}
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 text-right">
                            <WashingMachine className="w-4 h-4 shrink-0" />
                            <span>{selectedReceiptOrder.machineName}</span>
                          </span>
                        </div>
                      )}

                      {/* Trạm / Chi nhánh: Cố định 1 hàng duy nhất */}
                      {selectedReceiptOrder.siteName && (
                        <div className="py-2.5 flex items-center justify-between gap-4">
                          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
                            {isVietnamese ? 'Trạm / Chi nhánh:' : 'Site:'}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                            {selectedReceiptOrder.siteName}
                          </span>
                        </div>
                      )}

                      {/* Thời gian đặt */}
                      <div className="py-2.5 flex items-center justify-between gap-4">
                        <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
                          {isVietnamese ? 'Thời gian đặt:' : 'Placed At:'}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium text-right">
                          {selectedReceiptOrder.createdAt ? new Date(selectedReceiptOrder.createdAt).toLocaleString('vi-VN') : '-'}
                        </span>
                      </div>

                      {/* Khi đang giặt: Bắt đầu lúc & Dự kiến hoàn tất */}
                      {selectedReceiptOrder.status === 'IN_PROGRESS' && (
                        <>
                          {selectedReceiptOrder.startTimeFormatted && (
                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
                                {isVietnamese ? 'Bắt đầu giặt lúc:' : 'Started At:'}
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium text-right">
                                {selectedReceiptOrder.startTimeFormatted}
                              </span>
                            </div>
                          )}
                          {selectedReceiptOrder.endTimeFormatted && (
                            <div className="py-2.5 flex items-center justify-between gap-4">
                              <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
                                {isVietnamese ? 'Dự kiến hoàn tất lúc:' : 'Est. Completion:'}
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-right">
                                {selectedReceiptOrder.endTimeFormatted}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Thời gian hoàn tất (chỉ hiển thị khi đơn đã COMPLETED) */}
                      {selectedReceiptOrder.status === 'COMPLETED' && selectedReceiptOrder.completedAt && (
                        <div className="pt-2.5 flex items-center justify-between gap-4">
                          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
                            {isVietnamese ? 'Thời gian hoàn tất:' : 'Completed At:'}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium text-right">
                            {new Date(selectedReceiptOrder.completedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. KHỐI VOUCHER & KHUYẾN MÃI ĐÃ ÁP DỤNG */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        <span>{isVietnamese ? 'Voucher & Chương trình khuyến mãi đã áp dụng' : 'Applied Vouchers & Promotions'}</span>
                      </h4>

                      {selectedReceiptOrder.appliedDiscounts && selectedReceiptOrder.appliedDiscounts.length > 0 ? (
                        <div className="space-y-2">
                          {selectedReceiptOrder.appliedDiscounts.map((disc, idx) => (
                            <div
                              key={disc.discountId || idx}
                              className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                  <p className="font-bold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                                    {disc.ruleName || disc.ruleCode || (isVietnamese ? 'Ưu đãi giảm giá' : 'Discount')}
                                  </p>
                                  {disc.ruleCode && (
                                    <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                                      Mã áp dụng: <strong>{disc.ruleCode}</strong>
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm shrink-0">
                                -{(disc.discountAmount || 0).toLocaleString('vi-VN')} ₫
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : selectedReceiptOrder.discountTotal > 0 ? (
                        <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                              {isVietnamese ? 'Chiết khấu khuyến mãi' : 'Promotion discount'}
                            </span>
                          </div>
                          <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm shrink-0">
                            -{selectedReceiptOrder.discountTotal.toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-2 text-xs">
                          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{isVietnamese ? 'Đơn hàng này không áp dụng voucher hoặc mã khuyến mãi.' : 'No voucher or promotional discounts were applied.'}</span>
                        </div>
                      )}
                    </div>

                    {/* 3. BẢNG KÊ TIỀN VÀ THANH TOÁN */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>{isVietnamese ? 'Giá niêm yết ban đầu:' : 'Original Price:'}</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {(selectedReceiptOrder.subtotal ?? selectedReceiptOrder.total ?? 0).toLocaleString('vi-VN')} ₫
                        </span>
                      </div>

                      {selectedReceiptOrder.discountTotal > 0 && (
                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>{isVietnamese ? 'Tổng giảm giá voucher / ưu đãi:' : 'Total Discount:'}</span>
                          <span className="font-mono">
                            -{selectedReceiptOrder.discountTotal.toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {isVietnamese ? 'Tổng tiền thực tế đã trả:' : 'Total Paid:'}
                        </span>
                        <span className="font-mono font-black text-lg sm:text-xl text-blue-600 dark:text-blue-400">
                          {(selectedReceiptOrder.total ?? 0).toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                    </div>

                    {/* 4. ĐIỂM TÍCH LŨY HẠNG THÀNH VIÊN */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-yellow-500/15 border border-amber-300/60 dark:border-amber-700/60 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Crown className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-xs sm:text-sm text-amber-900 dark:text-amber-200 block">
                              {isVietnamese ? 'Điểm tích lũy thăng hạng thành viên' : 'Tier Reward Points'}
                            </span>
                            <span className="text-[10.5px] text-amber-700/80 dark:text-amber-400/80">
                              {isVietnamese ? 'Tỷ lệ: 1 VNĐ thanh toán = 1 điểm hạng' : 'Rate: 1 VND = 1 tier point'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-base sm:text-lg text-amber-600 dark:text-amber-300">
                            {selectedReceiptOrder.status === 'COMPLETED'
                              ? `+${(selectedReceiptOrder.pointsEarned || selectedReceiptOrder.total || 0).toLocaleString('vi-VN')} pts`
                              : `+${(selectedReceiptOrder.total || 0).toLocaleString('vi-VN')} pts`}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between text-xs gap-2">
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-tight">
                          {selectedReceiptOrder.status === 'COMPLETED'
                            ? (isVietnamese
                              ? '✨ Đã cộng vào hồ sơ hội viên để tự động nâng hạng Bạc, Vàng, Bạch Kim.'
                              : '✨ Credited to your member account for tier progression.')
                            : (isVietnamese
                              ? '⏳ Điểm sẽ được cộng tự động ngay khi đơn hoàn thành.'
                              : '⏳ Points will be credited once order completes.')}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceiptOrder(null);
                            navigate('/wallet');
                          }}
                          className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-0.5 whitespace-nowrap cursor-pointer shrink-0"
                        >
                          <span>{isVietnamese ? 'Xem hạng ví' : 'View tier'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
                {selectedReceiptOrder.status === 'PENDING_PAYMENT' ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedReceiptOrder(null)}
                      className="w-1/3 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer"
                    >
                      {isVietnamese ? 'Đóng' : 'Close'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedReceiptOrder;
                        setSelectedReceiptOrder(null);
                        handleOpenPaymentModal(target);
                      }}
                      className="w-2/3 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{isVietnamese ? 'Thanh toán ngay' : 'Pay Now'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedReceiptOrder(null)}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer active:scale-[0.99]"
                  >
                    {isVietnamese ? 'Đóng' : 'Close'}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================= */}
      {/* MODAL THANH TOÁN ĐƠN HÀNG (VIETQR PAYOS & VÍ THÀNH VIÊN)  */}
      {/* ========================================================= */}
      {payingOrder &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => {
              if (payModalStep === 'SUCCESS') {
                setPayingOrder(null);
              }
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in select-none"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white relative flex flex-col max-w-lg w-full max-h-[92vh] animate-in zoom-in-95 duration-200 cursor-default my-auto overflow-hidden select-text"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      payModalStep === 'SUCCESS'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {payModalStep === 'SUCCESS' ? (
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    ) : (
                      <CreditCard className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                      {payModalStep === 'SUCCESS'
                        ? (isVietnamese ? 'Thanh toán thành công!' : 'Payment Succeeded!')
                        : (isVietnamese ? 'Thanh toán đơn giặt' : 'Pay Laundry Order')}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      Mã đơn: #{payingOrder.orderCode || payingOrder.orderId}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPayingOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto pr-1 space-y-4 my-3 [scrollbar-width:thin] flex-1">
                {payModalStep === 'SUCCESS' ? (
                  <div className="py-6 px-4 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20 animate-bounce">
                      <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">
                        {isVietnamese ? 'Đã thanh toán thành công!' : 'Payment Completed!'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {isVietnamese
                          ? 'Đơn hàng đã được xác nhận thanh toán. Máy giặt đã sẵn sàng, bạn có thể nhấn bắt đầu giặt ngay!'
                          : 'Order payment confirmed. Your washing machine is ready!'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                        <span>{isVietnamese ? 'Dịch vụ:' : 'Service:'}</span>
                        <strong className="text-slate-900 dark:text-white">{payingOrder.serviceName || payingOrder.cycleName}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                        <span>{isVietnamese ? 'Thiết bị:' : 'Machine:'}</span>
                        <strong className="text-blue-600 dark:text-blue-400">{payingOrder.machineName || payingOrder.machineCode}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                        <span>{isVietnamese ? 'Số tiền đã trả:' : 'Amount Paid:'}</span>
                        <strong className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {(payingOrder.total ?? 0).toLocaleString('vi-VN')} ₫
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Tóm tắt số tiền */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                          {isVietnamese ? 'Tổng tiền thanh toán:' : 'Total Payable:'}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {payingOrder.serviceName || payingOrder.cycleName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400 block">
                          {(payingOrder.total ?? 0).toLocaleString('vi-VN')} ₫
                        </span>
                        {payingOrder.discountTotal > 0 && (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            (Đã giảm -{payingOrder.discountTotal.toLocaleString('vi-VN')} ₫)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Method Selector Tabs */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('PAYOS')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          paymentMethod === 'PAYOS'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>VietQR (PayOS)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('WALLET')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          paymentMethod === 'WALLET'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>{isVietnamese ? 'Ví thành viên' : 'Member Wallet'}</span>
                      </button>
                    </div>

                    {/* TAB 1: VIETQR PAYOS */}
                    {paymentMethod === 'PAYOS' && (
                      <div className="space-y-3.5">
                        {qrLoading ? (
                          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                            <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
                            <span className="text-xs font-medium">
                              {isVietnamese ? 'Đang tạo mã QR VietQR Napas247...' : 'Generating VietQR code...'}
                            </span>
                          </div>
                        ) : qrError ? (
                          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs text-center space-y-2">
                            <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
                            <p className="font-semibold">{qrError}</p>
                            <button
                              type="button"
                              onClick={() => loadPayOsQr(payingOrder)}
                              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                            >
                              {isVietnamese ? 'Thử lại' : 'Retry'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {/* Khung hiển thị QR code */}
                            <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900 flex flex-col items-center justify-center text-center">
                              {generatedQrDataUrl || payOsData?.qrImageUrl || payOsData?.qrUrl ? (
                                <img
                                  src={
                                    generatedQrDataUrl ||
                                    payOsData?.qrImageUrl ||
                                    payOsData?.qrUrl ||
                                    (payOsData?.qrCode
                                      ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(payOsData.qrCode)}`
                                      : '')
                                  }
                                  alt="VietQR PayOS"
                                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl shadow-md border border-slate-100 dark:border-slate-700 bg-white"
                                />
                              ) : (
                                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                                  {isVietnamese ? 'Chưa thể tải mã QR' : 'QR code unavailable'}
                                </div>
                              )}

                              {/* Ping indicator */}
                              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span>
                                  {isVietnamese
                                    ? 'Đang tự động nhận diện thanh toán từ ngân hàng...'
                                    : 'Waiting for payment confirmation...'}
                                </span>
                              </div>
                            </div>

                            {/* Thông tin chuyển khoản chi tiết */}
                            {payOsData && (
                              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                                  {isVietnamese ? 'Thông tin chuyển khoản thủ công:' : 'Transfer details:'}
                                </div>

                                {payOsData.accountNumber && (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500 dark:text-slate-400">{isVietnamese ? 'Số tài khoản:' : 'Account No:'}</span>
                                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                                      <span>{payOsData.accountNumber}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(payOsData.accountNumber, 'account')}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-blue-600"
                                        title="Sao chép số tài khoản"
                                      >
                                        {copiedField === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {payOsData.accountName && (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500 dark:text-slate-400">{isVietnamese ? 'Chủ tài khoản:' : 'Account Name:'}</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{payOsData.accountName}</span>
                                  </div>
                                )}

                                {payOsData.bin && (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500 dark:text-slate-400">{isVietnamese ? 'Ngân hàng / BIN:' : 'Bank BIN:'}</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{payOsData.bin}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-slate-500 dark:text-slate-400">{isVietnamese ? 'Số tiền:' : 'Amount:'}</span>
                                  <div className="flex items-center gap-1.5 font-mono font-black text-blue-600 dark:text-blue-400">
                                    <span>{(payOsData.amount || payingOrder.total).toLocaleString('vi-VN')} ₫</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(String(payOsData.amount || payingOrder.total), 'amount')}
                                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-blue-600"
                                      title="Sao chép số tiền"
                                    >
                                      {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                {payOsData.description && (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500 dark:text-slate-400">{isVietnamese ? 'Nội dung CK:' : 'Content:'}</span>
                                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                                      <span>{payOsData.description}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(payOsData.description, 'description')}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-blue-600"
                                        title="Sao chép nội dung chuyển khoản"
                                      >
                                        {copiedField === 'description' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Nút thao tác phụ trợ */}
                            <div className="flex flex-col sm:flex-row gap-2">
                              {payOsData?.checkoutUrl && (
                                <a
                                  href={payOsData.checkoutUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-800"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>{isVietnamese ? 'Mở cổng PayOS' : 'Open PayOS'}</span>
                                </a>
                              )}

                              <button
                                type="button"
                                disabled={isSyncingPayment}
                                onClick={handleManualSyncPayment}
                                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <RotateCw className={`w-3.5 h-3.5 ${isSyncingPayment ? 'animate-spin' : ''}`} />
                                <span>{isVietnamese ? 'Kiểm tra thanh toán' : 'Check status'}</span>
                              </button>

                              {/* Test Demo Mock */}
                              <button
                                type="button"
                                disabled={simulatingMock}
                                onClick={handleMockPayment}
                                className="py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs border border-amber-500/30 transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Xác nhận ngay không cần quét ngân hàng thật (Thử nghiệm)"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>{isVietnamese ? 'Demo xác nhận' : 'Demo pay'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: VÍ THÀNH VIÊN */}
                    {paymentMethod === 'WALLET' && (
                      <div className="space-y-4">
                        {isGuest ? (
                          <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                            <Wallet className="w-8 h-8 mx-auto text-amber-500" />
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {isVietnamese
                                ? 'Tính năng ví LaundroChain dành riêng cho tài khoản Hội viên.'
                                : 'Wallet payment is only available for Member accounts.'}
                            </p>
                            <p className="text-[11.5px] text-slate-500">
                              {isVietnamese
                                ? 'Vui lòng chọn quét mã VietQR Napas247 ở tab bên cạnh để thanh toán ngay cho khách vãng lai.'
                                : 'Please use the VietQR tab to pay for guest orders.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {/* Card thông tin ví */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white shadow-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-blue-200 font-medium">
                                  {isVietnamese ? 'Số dư ví LaundroChain' : 'Wallet Balance'}
                                </span>
                                <Wallet className="w-4 h-4 text-blue-300" />
                              </div>
                              <div className="text-2xl font-black font-mono">
                                {(wallet?.balance ?? 0).toLocaleString('vi-VN')} ₫
                              </div>
                              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-blue-200">
                                <span>{isVietnamese ? 'Cần thanh toán:' : 'Payable:'}</span>
                                <span className="font-mono font-bold text-white">
                                  {(payingOrder.total ?? 0).toLocaleString('vi-VN')} ₫
                                </span>
                              </div>
                            </div>

                            {/* Đủ hay thiếu số dư */}
                            {(wallet?.balance ?? 0) >= (payingOrder.total ?? 0) ? (
                              <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                  <span>{isVietnamese ? 'Số dư sau thanh toán:' : 'Balance after payment:'}</span>
                                  <strong className="font-mono font-bold">
                                    {((wallet?.balance ?? 0) - (payingOrder.total ?? 0)).toLocaleString('vi-VN')} ₫
                                  </strong>
                                </div>

                                <button
                                  type="button"
                                  disabled={payingWithWallet}
                                  onClick={handlePayWithWallet}
                                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                                >
                                  {payingWithWallet ? (
                                    <RotateCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  )}
                                  <span>
                                    {isVietnamese
                                      ? `Trừ ví & Thanh toán ngay (${(payingOrder.total ?? 0).toLocaleString('vi-VN')} ₫)`
                                      : `Pay with Wallet (${(payingOrder.total ?? 0).toLocaleString('vi-VN')} ₫)`}
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                                  <div className="font-bold flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    <span>{isVietnamese ? 'Số dư ví không đủ' : 'Insufficient balance'}</span>
                                  </div>
                                  <p className="text-[11.5px] text-amber-800 dark:text-amber-300">
                                    {isVietnamese
                                      ? `Bạn còn thiếu ${((payingOrder.total ?? 0) - (wallet?.balance ?? 0)).toLocaleString('vi-VN')} ₫. Bạn có thể nạp thêm tiền hoặc chọn thanh toán bằng VietQR.`
                                      : `Need ${((payingOrder.total ?? 0) - (wallet?.balance ?? 0)).toLocaleString('vi-VN')} ₫ more.`}
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPaymentMethod('PAYOS')}
                                    className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                    <span>{isVietnamese ? 'Quét VietQR thay thế' : 'Pay via VietQR'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayingOrder(null);
                                      navigate('/wallet');
                                    }}
                                    className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Wallet className="w-3.5 h-3.5" />
                                    <span>{isVietnamese ? 'Nạp tiền vào ví' : 'Top up'}</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {walletPayError && (
                              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{walletPayError}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
                {payModalStep === 'SUCCESS' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPayingOrder(null)}
                      className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer"
                    >
                      {isVietnamese ? 'Đóng & Xem danh sách' : 'Close'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = payingOrder.orderId;
                        setPayingOrder(null);
                        handleStartOrder(targetId);
                      }}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isVietnamese ? 'Bắt đầu giặt ngay' : 'Start Wash Now'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPayingOrder(null)}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer active:scale-[0.99]"
                  >
                    {isVietnamese ? 'Đóng cửa sổ thanh toán' : 'Close'}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
