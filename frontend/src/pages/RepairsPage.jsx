import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Plus,
  Search,
  Filter,
  Check,
  CheckSquare,
} from 'lucide-react';

const INITIAL_TICKETS = [
  {
    id: 'REP-2026-001',
    machineCode: 'WASH-03',
    siteName: 'LaundroChain Quận 1 - Flagship',
    priority: 'HIGH',
    issue: 'Thay dây curoa truyền động & cảm biến rung lắc lồng giặt',
    assignedTo: 'tech_huy',
    status: 'IN_PROGRESS',
    createdAt: '2026-10-15 19:40',
    partsNeeded: ['Dây curoa V-Belt 5PJE 1238', 'Cảm biến gia tốc rung 3 trục'],
  },
  {
    id: 'REP-2026-002',
    machineCode: 'DRY-01',
    siteName: 'LaundroChain Quận 1 - Flagship',
    priority: 'MEDIUM',
    issue: 'Vệ sinh định kỳ màng lọc xơ vải & đường ống thoát khí nóng',
    assignedTo: 'tech_huy',
    status: 'OPEN',
    createdAt: '2026-10-15 20:15',
    partsNeeded: ['Bộ kit vệ sinh khí nén công nghiệp'],
  },
  {
    id: 'REP-2026-003',
    machineCode: 'KIOSK-CG-01',
    siteName: 'LaundroChain Cầu Giấy - Hà Nội',
    priority: 'URGENT',
    issue: 'Ki-ốt mất nguồn đột ngột, kiểm tra bộ nguồn Meanwell 24V',
    assignedTo: 'tech_nam',
    status: 'OPEN',
    createdAt: '2026-10-15 18:30',
    partsNeeded: ['Bộ nguồn Switching 24V 10A LRS-200-24'],
  },
  {
    id: 'REP-2026-004',
    machineCode: 'WASH-02',
    siteName: 'LaundroChain Bình Thạnh - Campus',
    priority: 'LOW',
    issue: 'Bảo trì tra dầu mỡ bạc đạn trục quay',
    assignedTo: 'tech_huy',
    status: 'RESOLVED',
    createdAt: '2026-10-14 10:00',
    partsNeeded: ['Mỡ bò chịu nhiệt SKF LGHP 2'],
  },
];

export default function RepairsPage() {
  const { isVietnamese } = useLanguage();
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [filterStatus, setFilterStatus] = useState('ALL');

  function handleComplete(id) {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'RESOLVED' } : t))
    );
  }

  const filtered = tickets.filter(
    (t) => filterStatus === 'ALL' || t.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            {isVietnamese ? 'Phiếu sửa chữa & Bảo trì kỹ thuật' : 'Maintenance & Repair Tickets'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Tiếp nhận, xử lý và ghi nhận linh kiện thay thế cho các máy giặt/sấy báo lỗi.'
              : 'Dispatch, repair and log spare parts for malfunctioning machines and kiosks.'}
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition">
          <Plus className="w-4 h-4" />
          {isVietnamese ? 'Tạo phiếu sửa chữa' : 'New Ticket'}
        </button>
      </div>

      {/* Filter status */}
      <div className="flex items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
        >
          <option value="ALL">{isVietnamese ? 'Tất cả trạng thái' : 'All Status'}</option>
          <option value="OPEN">Chờ tiếp nhận (OPEN)</option>
          <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
          <option value="RESOLVED">Đã hoàn thành (RESOLVED)</option>
        </select>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filtered.map((ticket) => {
          const isResolved = ticket.status === 'RESOLVED';
          const isInProgress = ticket.status === 'IN_PROGRESS';
          const isUrgent = ticket.priority === 'URGENT';
          const isHigh = ticket.priority === 'HIGH';

          return (
            <div
              key={ticket.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm space-y-4 transition ${
                isResolved
                  ? 'opacity-65 border-slate-200 dark:border-slate-800'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                    {ticket.id}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">
                    {ticket.machineCode}
                  </span>
                  {isUrgent ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      URGENT
                    </span>
                  ) : isHigh ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      HIGH
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {ticket.priority}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {isInProgress ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      ĐANG XỬ LÝ
                    </span>
                  ) : isResolved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ĐÃ XONG
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      CHỜ TIẾP NHẬN
                    </span>
                  )}

                  {!isResolved && (
                    <button
                      onClick={() => handleComplete(ticket.id)}
                      className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isVietnamese ? 'Hoàn thành' : 'Done'}
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {ticket.issue}
              </div>

              {/* Parts needed */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
                <div className="font-semibold text-slate-500 dark:text-slate-400">
                  {isVietnamese ? 'Linh kiện / Phụ tùng cần dùng:' : 'Spare parts required:'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ticket.partsNeeded.map((part, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300"
                    >
                      • {part}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {ticket.siteName}
                </span>
                <span>
                  {isVietnamese ? 'Kỹ thuật viên:' : 'Assigned:'} <strong>@{ticket.assignedTo}</strong> ({ticket.createdAt})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
