import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  FileText,
  Search,
  Filter,
  Shield,
  UserCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Download,
} from 'lucide-react';

const MOCK_AUDIT_LOGS = [
  {
    id: 'log-101',
    timestamp: '2026-10-15 22:45:10',
    actor: 'admin',
    action: 'USER_LOGIN_SUCCESS',
    target: 'Session / Auth',
    ip: '127.0.0.1',
    status: 'SUCCESS',
    detail: 'Đăng nhập thành công từ trình duyệt Chrome, hệ điều hành Windows.',
  },
  {
    id: 'log-102',
    timestamp: '2026-10-15 22:38:22',
    actor: 'admin',
    action: 'WORKPLACE_TRANSFER',
    target: 'site_lead (@s1 -> @s2)',
    ip: '127.0.0.1',
    status: 'SUCCESS',
    detail: 'Chuyển cơ sở công tác của nhân viên Trần Văn Cửa Hàng Trưởng sang chi nhánh Bình Thạnh.',
  },
  {
    id: 'log-103',
    timestamp: '2026-10-15 21:12:05',
    actor: 'pricing',
    action: 'DMN_RULE_PUBLISH',
    target: 'Bundle v2.4 (Peak Hour Surge)',
    ip: '192.168.1.100',
    status: 'SUCCESS',
    detail: 'Xuất bản bảng giá mới: Áp dụng hệ số 1.15x cho khung giờ cao điểm 18:00 - 21:00.',
  },
  {
    id: 'log-104',
    timestamp: '2026-10-15 19:30:41',
    actor: 'system_iot',
    action: 'MACHINE_ERROR_DETECTED',
    target: 'WASH-Q1-03',
    ip: '192.168.1.50',
    status: 'WARNING',
    detail: 'Cảnh báo lỗi E04: Rung lắc lồng giặt quá mức trong chu trình vắt 1200rpm.',
  },
  {
    id: 'log-105',
    timestamp: '2026-10-15 17:05:18',
    actor: 'admin',
    action: 'USER_CREATED',
    target: 'tech_huy (TECHNICIAN)',
    ip: '127.0.0.1',
    status: 'SUCCESS',
    detail: 'Tạo tài khoản kỹ thuật viên mới, cấp mật khẩu tạm thời yêu cầu đổi khi đăng nhập.',
  },
  {
    id: 'log-106',
    timestamp: '2026-10-15 14:22:00',
    actor: 'unknown',
    action: 'LOGIN_FAILED',
    target: 'Username: admin_fake',
    ip: '14.232.18.99',
    status: 'FAILED',
    detail: 'Sai mật khẩu quá 3 lần từ địa chỉ IP không xác định.',
  },
];

export default function AuditLogPage() {
  const { isVietnamese } = useLanguage();
  const [logs] = useState(MOCK_AUDIT_LOGS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase()) ||
      l.ip.includes(search);
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            {isVietnamese ? 'Nhật ký kiểm toán hệ thống (Audit Log)' : 'System Audit Log'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Theo dõi toàn bộ các sự kiện bảo mật, thay đổi cấu hình bảng giá và thao tác quản trị.'
              : 'Audit trail of security events, pricing configuration adjustments and administrative actions.'}
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <Download className="w-4 h-4" />
          {isVietnamese ? 'Xuất CSV' : 'Export CSV'}
        </button>
      </div>

      {/* Filter and search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isVietnamese ? 'Tìm theo actor, hành động, IP...' : 'Search actor, action, IP...'}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{isVietnamese ? 'Tất cả trạng thái' : 'All Status'}</option>
            <option value="SUCCESS">Thành công (SUCCESS)</option>
            <option value="WARNING">Cảnh báo (WARNING)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">{isVietnamese ? 'Thời gian' : 'Timestamp'}</th>
                <th className="px-6 py-4">{isVietnamese ? 'Tác tử (Actor)' : 'Actor'}</th>
                <th className="px-6 py-4">{isVietnamese ? 'Hành động' : 'Action'}</th>
                <th className="px-6 py-4">{isVietnamese ? 'Đối tượng & Chi tiết' : 'Target & Details'}</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4">{isVietnamese ? 'Kết quả' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {log.timestamp}
                  </td>

                  <td className="px-6 py-4 text-xs font-semibold text-slate-900 dark:text-white">
                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                      @{log.actor}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {log.action}
                  </td>

                  <td className="px-6 py-4 text-xs">
                    <div className="font-medium text-slate-900 dark:text-white">{log.target}</div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{log.detail}</div>
                  </td>

                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{log.ip}</td>

                  <td className="px-6 py-4">
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        SUCCESS
                      </span>
                    ) : log.status === 'WARNING' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        WARNING
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                        FAILED
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
