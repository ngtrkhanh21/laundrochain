import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Search,
  Filter,
  ShieldAlert,
  Bell,
  Clock,
  MapPin,
  X,
} from 'lucide-react';

const INITIAL_ALERTS = [
  {
    id: 'alt-01',
    severity: 'CRITICAL',
    title: 'Rò rỉ nước lồng giặt (Water Leakage)',
    machineCode: 'WASH-03',
    siteName: 'LaundroChain Quận 1 - Flagship',
    time: '5 phút trước',
    status: 'ACTIVE',
    description: 'Cảm biến đáy lồng giặt phát hiện mực nước tràn 15mm. Van cấp nước tự động ngắt khẩn cấp.',
  },
  {
    id: 'alt-02',
    severity: 'WARNING',
    title: 'Khay lọc bụi vải máy sấy bị đầy (Lint Filter Blocked)',
    machineCode: 'DRY-01',
    siteName: 'LaundroChain Quận 1 - Flagship',
    time: '25 phút trước',
    status: 'ACTIVE',
    description: 'Cảm biến chênh áp khí thoát vượt ngưỡng 120Pa. Cần nhân viên hoặc kỹ thuật viên vệ sinh khay lọc.',
  },
  {
    id: 'alt-03',
    severity: 'WARNING',
    title: 'Ki-ốt mất tín hiệu Wi-Fi (Weak Wi-Fi RSSI)',
    machineCode: 'KIOSK-Q7-01',
    siteName: 'LaundroChain Quận 7 - Sunrise',
    time: '1 giờ trước',
    status: 'ACTIVE',
    description: 'Cường độ sóng rơi xuống -85 dBm, có thể gây chậm phản hồi khi quét mã QR thanh toán.',
  },
  {
    id: 'alt-04',
    severity: 'INFO',
    title: 'Hoàn tất chu trình tự làm sạch lồng giặt (Tub Clean Completed)',
    machineCode: 'WASH-01',
    siteName: 'LaundroChain Bình Thạnh - Campus',
    time: '3 giờ trước',
    status: 'RESOLVED',
    description: 'Chu trình khử khuẩn nhiệt độ cao 90°C tự động định kỳ đã hoàn thành thành công.',
  },
];

export default function AlertsPage() {
  const { isVietnamese } = useLanguage();
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [severityFilter, setSeverityFilter] = useState('ALL');

  function handleAcknowledge(id) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'RESOLVED' } : a))
    );
  }

  const filtered = alerts.filter(
    (a) => severityFilter === 'ALL' || a.severity === severityFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-600 dark:text-red-400" />
            {isVietnamese ? 'Cảnh báo & Sự cố kỹ thuật' : 'Alerts & Incidents Management'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Theo dõi và xử lý kịp thời các sự cố phần cứng, cảm biến và kết nối thiết bị.'
              : 'Monitor and promptly resolve hardware anomalies, sensor thresholds, and device connectivity faults.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{isVietnamese ? 'Tất cả mức độ' : 'All Severities'}</option>
            <option value="CRITICAL">{isVietnamese ? 'Nghiêm trọng (Critical)' : 'Critical'}</option>
            <option value="WARNING">{isVietnamese ? 'Cảnh báo (Warning)' : 'Warning'}</option>
            <option value="INFO">{isVietnamese ? 'Thông tin (Info)' : 'Info'}</option>
          </select>
        </div>
      </div>

      {/* Alerts list */}
      <div className="space-y-4">
        {filtered.map((alert) => {
          const isCritical = alert.severity === 'CRITICAL';
          const isWarning = alert.severity === 'WARNING';
          const isResolved = alert.status === 'RESOLVED';

          return (
            <div
              key={alert.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                isResolved
                  ? 'opacity-60 border-slate-200 dark:border-slate-800'
                  : isCritical
                  ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
                  : 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {isCritical ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      CRITICAL
                    </span>
                  ) : isWarning ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      WARNING
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      INFO
                    </span>
                  )}

                  <span className="font-bold text-slate-900 dark:text-white text-base">
                    {alert.title}
                  </span>

                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {alert.machineCode}
                  </span>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300">{alert.description}</p>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {alert.siteName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {alert.time}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {!isResolved ? (
                  <>
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isVietnamese ? 'Xác nhận xử lý' : 'Acknowledge'}
                    </button>
                    <button
                      onClick={() =>
                        alert(
                          isVietnamese
                            ? `Đã thông báo lệnh điều phối Kỹ thuật viên tới ${alert.machineCode}`
                            : `Dispatched technician to ${alert.machineCode}`
                        )
                      }
                      className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-1.5"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      {isVietnamese ? 'Cử kỹ thuật viên' : 'Dispatch Tech'}
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {isVietnamese ? 'Đã giải quyết' : 'Resolved'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
