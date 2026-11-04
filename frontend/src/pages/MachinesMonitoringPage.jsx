import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { machinesApi } from '../api/machinesApi';
import { sitesApi } from '../api/sitesApi';
import { ordersApi } from '../api/ordersApi';
import { maintenanceApi } from '../api/maintenanceApi';
import {
  WashingMachine,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  Search,
  Filter,
  Thermometer,
  Gauge,
  Flame,
  Zap,
  MapPin,
  Building2,
  Wrench,
  ShieldAlert,
  Sparkles,
  Check,
  ChevronDown,
  Radio,
  SlidersHorizontal,
  User,
  Phone,
  ArrowRightLeft,
  Info,
} from 'lucide-react';

// Trích xuất description sự cố sạch, bỏ qua các tiền tố metadata
const cleanIssueDescription = (desc) => {
  if (!desc) return '';
  const detailMatch = desc.match(/(?:Chi tiết|Ghi chú|Mô tả|Lý do):\s*([^|]+)/i);
  if (detailMatch && detailMatch[1]) {
    return detailMatch[1].trim();
  }
  if (desc.includes('|')) {
    const parts = desc.split('|');
    const last = parts[parts.length - 1].trim();
    if (last) {
      return last.replace(/^(?:Chi tiết|Ghi chú|Mô tả|Lý do):\s*/i, '').trim();
    }
  }
  return desc.replace(/^\[[^\]]+\]\s*/, '').trim();
};

export default function MachinesMonitoringPage() {
  const navigate = useNavigate();
  const { isVietnamese } = useLanguage();
  const { user } = useAuth();

  // State quản lý chi nhánh & máy móc
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Bộ lọc
  const [filterType, setFilterType] = useState('ALL'); // ALL, WASHER, DRYER
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, AVAILABLE, BUSY, MAINTENANCE, HELD
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Clock tick cho live countdown
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Tải danh sách chi nhánh (Sites), tự động ưu tiên chi nhánh Site Manager đang làm việc
  useEffect(() => {
    let isMounted = true;
    async function loadSites() {
      try {
        const res = await sitesApi.getSites();
        const siteList = Array.isArray(res) ? res : res?.items || res?.data || [];
        if (!isMounted) return;
        setSites(siteList);

        if (siteList.length > 0) {
          const userSiteId =
            user?.siteId ||
            user?.assignedSiteId ||
            user?.assignedSites?.[0]?.siteId ||
            localStorage.getItem('sitemanager_selected_site_id') ||
            localStorage.getItem('laundro_kiosk_site_id');

          const matched = siteList.find((s) => s.siteId === userSiteId) || siteList[0];
          setSelectedSiteId(matched.siteId);
          setSelectedSite(matched);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách chi nhánh:', err);
        if (isMounted) setError(isVietnamese ? 'Không thể tải danh sách chi nhánh.' : 'Failed to load sites.');
      }
    }
    loadSites();
    return () => {
      isMounted = false;
    };
  }, [user, isVietnamese]);

  // Đổi chi nhánh
  const handleSiteChange = (e) => {
    const newSiteId = e.target.value;
    setSelectedSiteId(newSiteId);
    const found = sites.find((s) => s.siteId === newSiteId);
    setSelectedSite(found || null);
    localStorage.setItem('sitemanager_selected_site_id', newSiteId);
  };

  // 2. GỌI API /api/machines KẾT HỢP ORDERS VÀ PHIẾU BẢO TRÌ ĐỂ ĐỒNG BỘ 100% TRẠNG THÁI & TÌNH TRẠNG MÁY
  const fetchMachines = useCallback(
    async (isSilent = false) => {
      if (!selectedSiteId) return;
      if (!isSilent) setRefreshing(true);
      setError(null);

      try {
        // Gọi đồng thời machines, orders và maintenance orders của trạm để đồng bộ
        const [machinesRes, ordersRes, mntRes] = await Promise.allSettled([
          machinesApi.getMachines({ siteId: selectedSiteId }),
          ordersApi.getOrders({ siteId: selectedSiteId, pageSize: 60 }),
          maintenanceApi.getMaintenanceOrders({ siteId: selectedSiteId }),
        ]);

        const rawMachines =
          machinesRes.status === 'fulfilled' && machinesRes.value
            ? Array.isArray(machinesRes.value)
              ? machinesRes.value
              : machinesRes.value?.items || machinesRes.value?.data || []
            : [];

        const rawOrders =
          ordersRes.status === 'fulfilled' && ordersRes.value
            ? Array.isArray(ordersRes.value)
              ? ordersRes.value
              : ordersRes.value?.items || ordersRes.value?.data || []
            : [];

        const rawMnt =
          mntRes.status === 'fulfilled' && mntRes.value
            ? Array.isArray(mntRes.value)
              ? mntRes.value
              : mntRes.value?.items || mntRes.value?.data || []
            : [];

        // Map các đơn hàng đang xử lý (IN_PROGRESS, CONFIRMED, PENDING_PAYMENT)
        const activeOrdersByMachine = new Map();
        rawOrders.forEach((o) => {
          const status = (o.status || '').toUpperCase();
          if (['IN_PROGRESS', 'CONFIRMED', 'PENDING_PAYMENT'].includes(status)) {
            const mId = o.items?.[0]?.machineId || o.activeMachineId;
            const mCode = (o.assignedMachines || o.items?.[0]?.machineCode || '').toUpperCase();
            if (mId) activeOrdersByMachine.set(String(mId), o);
            if (mCode) activeOrdersByMachine.set(mCode, o);
            if (o.orderId) activeOrdersByMachine.set(String(o.orderId), o);
            if (o.id) activeOrdersByMachine.set(String(o.id), o);
          }
        });

        // Map các sự cố bảo trì đang mở
        const activeMntByMachine = new Map();
        rawMnt.forEach((ticket) => {
          const tStatus = (ticket.status || '').toUpperCase();
          if (tStatus !== 'COMPLETED' && tStatus !== 'CANCELLED') {
            if (ticket.machineId) activeMntByMachine.set(String(ticket.machineId), ticket);
            if (ticket.machineCode) activeMntByMachine.set(ticket.machineCode.toUpperCase(), ticket);
          }
        });

        // Đồng bộ hóa dữ liệu từng máy
        const enriched = rawMachines.map((m) => {
          const upperCode = (m.code || '').toUpperCase();
          const mIdStr = String(m.machineId || '');
          const heldIdStr = m.heldByOrderId ? String(m.heldByOrderId) : '';

          const order =
            activeOrdersByMachine.get(mIdStr) ||
            activeOrdersByMachine.get(upperCode) ||
            (heldIdStr ? activeOrdersByMachine.get(heldIdStr) : null);

          const ticket = activeMntByMachine.get(mIdStr) || activeMntByMachine.get(upperCode);

          let finalStatus = (m.status || 'AVAILABLE').toUpperCase();
          if (finalStatus === 'MAINTENANCE' || finalStatus === 'ERROR' || finalStatus === 'OFFLINE') {
            finalStatus = 'MAINTENANCE';
          } else if (ticket && finalStatus !== 'AVAILABLE') {
            finalStatus = 'MAINTENANCE';
          } else if (order) {
            const oStatus = (order.status || '').toUpperCase();
            if (oStatus === 'IN_PROGRESS') {
              finalStatus = 'BUSY';
            } else if (oStatus === 'CONFIRMED' || oStatus === 'PENDING_PAYMENT') {
              finalStatus = 'HELD';
            }
          }

          return {
            ...m,
            status: finalStatus,
            activeOrderCode:
              m.activeOrderCode ||
              order?.orderCode ||
              (order?.orderId ? `ORD-${order.orderId.slice(0, 8).toUpperCase()}` : null),
            activeOrderId: m.activeOrderId || order?.orderId || order?.id,
            activeCustomerName:
              m.activeCustomerName ||
              order?.customerName ||
              order?.guestFullName ||
              order?.memberName ||
              (order?.isGuest ? 'Khách vãng lai' : order ? 'Thành viên' : null),
            activeCustomerPhone:
              m.activeCustomerPhone || order?.customerPhone || order?.guestPhoneNumber || order?.memberPhone,
            activeServiceName:
              m.activeServiceName || order?.items?.[0]?.offeringName || order?.serviceName,
            activeOrderStatus: m.activeOrderStatus || order?.status,
            maintenanceReason: cleanIssueDescription(m.maintenanceReason || ticket?.issueDescription),
            maintenancePriority: m.maintenancePriority || ticket?.priority,
            maintenanceTicketId: ticket?.maintenanceOrderId || ticket?.id,
          };
        });

        setMachines(enriched);
      } catch (err) {
        console.error('Lỗi khi tải danh sách máy từ /api/machines:', err);
        if (!isSilent) {
          setError(
            isVietnamese
              ? 'Không thể tải danh sách máy móc từ hệ thống (/api/machines).'
              : 'Failed to fetch machines from /api/machines.'
          );
        }
      } finally {
        setLoading(false);
        if (!isSilent) setRefreshing(false);
      }
    },
    [selectedSiteId, isVietnamese]
  );

  // Kích hoạt fetch khi chọn site
  useEffect(() => {
    if (selectedSiteId) {
      fetchMachines();
    }
  }, [selectedSiteId, fetchMachines]);

  // Polling tự động làm mới trạng thái thời gian thực mỗi 5 giây
  useEffect(() => {
    if (!selectedSiteId) return;
    const interval = setInterval(() => {
      fetchMachines(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedSiteId, fetchMachines]);

  // Cập nhật trạng thái máy qua API PATCH /api/machines/{id}/status và đóng bảo trì nếu chuyển sang AVAILABLE
  const handleUpdateStatus = async (machineId, nextStatus, note = '') => {
    setActionLoadingId(machineId);
    setStatusMessage(null);
    try {
      // 1. Cập nhật trạng thái máy
      await machinesApi.updateMachineStatus(machineId, nextStatus);

      // 2. Nếu chuyển sang AVAILABLE, đóng tất cả phiếu bảo trì đang mở của máy này qua API bảo trì (nếu có)
      if (nextStatus === 'AVAILABLE') {
        const targetMachine = machines.find((m) => m.machineId === machineId);
        if (targetMachine?.maintenanceTicketId) {
          try {
            await maintenanceApi.updateMaintenanceStatus(
              targetMachine.maintenanceTicketId,
              'COMPLETED',
              note || 'Hoàn tất bảo trì bởi Quản lý trạm'
            );
          } catch (mntErr) {
            console.warn('Lưu ý: Không thể đóng phiếu qua maintenanceApi:', mntErr);
          }
        }
      }

      setStatusMessage({
        type: 'success',
        text: isVietnamese
          ? nextStatus === 'AVAILABLE'
            ? 'Đã hoàn tất bảo trì, mở khóa máy sẵn sàng hoạt động!'
            : `Cập nhật trạng thái máy thành ${nextStatus} thành công!`
          : `Machine status updated to ${nextStatus}!`,
      });
      // Tải lại danh sách máy mới nhất
      await fetchMachines(true);
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái máy:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || (isVietnamese ? 'Cập nhật trạng thái thất bại.' : 'Status update failed.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Thống kê nhanh số lượng máy theo trạng thái
  const stats = useMemo(() => {
    const total = machines.length;
    const available = machines.filter((m) => (m.status || '').toUpperCase() === 'AVAILABLE').length;
    const busy = machines.filter((m) => (m.status || '').toUpperCase() === 'BUSY').length;
    const maintenance = machines.filter((m) =>
      ['MAINTENANCE', 'ERROR', 'OFFLINE'].includes((m.status || '').toUpperCase())
    ).length;
    const held = machines.filter((m) => (m.status || '').toUpperCase() === 'HELD').length;
    const washers = machines.filter((m) => (m.kind || m.machineClass?.kind || '').toUpperCase() === 'WASHER').length;
    const dryers = machines.filter((m) => (m.kind || m.machineClass?.kind || '').toUpperCase() === 'DRYER').length;

    return { total, available, busy, maintenance, held, washers, dryers };
  }, [machines]);

  // 4. Lọc và tìm kiếm danh sách máy
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const code = (m.code || '').toLowerCase();
      const name = (m.machineClassName || m.machineClass?.name || '').toLowerCase();
      const s = search.toLowerCase();
      const matchesSearch = !s || code.includes(s) || name.includes(s);

      const kind = (m.kind || m.machineClass?.kind || '').toUpperCase();
      const matchesType = filterType === 'ALL' || kind === filterType;

      const status = (m.status || '').toUpperCase();
      let matchesStatus = true;
      if (filterStatus === 'ALL') {
        matchesStatus = true;
      } else if (filterStatus === 'MAINTENANCE') {
        matchesStatus = ['MAINTENANCE', 'ERROR', 'OFFLINE'].includes(status);
      } else {
        matchesStatus = status === filterStatus;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [machines, search, filterType, filterStatus]);

  // Helper mô phỏng cảm biến IoT thực tế (Telemetry) dựa trên trạng thái máy
  const getMachineTelemetry = (m) => {
    const isBusy = (m.status || '').toUpperCase() === 'BUSY';
    const isDryer = (m.kind || m.machineClass?.kind || '').toUpperCase() === 'DRYER';
    const codeNum = parseInt(m.code.replace(/\D/g, '') || '1', 10);

    if (isBusy) {
      let remainingMin = m.remainingMinutes;
      if (m.busyUntil) {
        const diffMs = new Date(m.busyUntil).getTime() - currentTimestamp;
        remainingMin = diffMs > 0 ? Math.ceil(diffMs / 60000) : 0;
      }
      const totalEstimated = 45;
      const progressPercent =
        remainingMin !== null && remainingMin !== undefined
          ? Math.min(98, Math.max(8, Math.round(((totalEstimated - remainingMin) / totalEstimated) * 100)))
          : 50;

      return {
        temperature: isDryer ? 65 + (codeNum % 8) : 38 + (codeNum % 5),
        vibration: `${(0.3 + (codeNum % 4) * 0.1).toFixed(1)}g (Ổn định)`,
        powerKw: isDryer ? (2.8 + (codeNum % 5) * 0.2).toFixed(1) : (1.4 + (codeNum % 4) * 0.1).toFixed(1),
        progress: progressPercent,
      };
    }

    if (m.status === 'MAINTENANCE' || m.status === 'ERROR') {
      return {
        temperature: 26,
        vibration: '0.0g (Dừng)',
        powerKw: '0.05',
        progress: 0,
      };
    }

    // IDLE / AVAILABLE
    return {
      temperature: 28,
      vibration: '0.0g (Standby)',
      powerKw: '0.12',
      progress: 0,
    };
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Chọn chi nhánh làm việc của Site Manager */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <WashingMachine className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                {isVietnamese ? 'Giám sát máy móc trạm' : 'Station Machines Telemetry'}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  /api/machines
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isVietnamese
                  ? 'Theo dõi chu trình hoạt động, cảm biến nhiệt độ - rung lắc và điều khiển trạng thái máy.'
                  : 'Monitor wash/dry cycles, IoT sensors and control machine operational status.'}
              </p>
            </div>
          </div>
        </div>

        {/* Bộ chọn chi nhánh Site Manager đang phụ trách */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isVietnamese ? 'Cơ sở trực ban:' : 'Active Site:'}
              </span>
              <select
                value={selectedSiteId}
                onChange={handleSiteChange}
                className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer pr-4"
              >
                {sites.map((s) => (
                  <option key={s.siteId} value={s.siteId} className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchMachines(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 text-xs font-semibold"
            title="Làm mới dữ liệu từ /api/machines"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isVietnamese ? 'Cập nhật' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Thông báo cập nhật thao tác máy */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* 2. Thẻ KPI tổng quan theo thời gian thực */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Tổng số máy */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase">{isVietnamese ? 'Tổng máy' : 'Total'}</span>
            <WashingMachine className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {stats.washers} {isVietnamese ? 'giặt' : 'wash'} • {stats.dryers} {isVietnamese ? 'sấy' : 'dry'}
          </div>
        </div>

        {/* Sẵn sàng (Available) */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-xs ${
            filterStatus === 'AVAILABLE'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-[11px] font-bold uppercase">{isVietnamese ? 'Sẵn sàng' : 'Available'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.available}</div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            {stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}% {isVietnamese ? 'trống' : 'free'}
          </div>
        </div>

        {/* Đang chạy (Busy) */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'BUSY' ? 'ALL' : 'BUSY')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-xs ${
            filterStatus === 'BUSY'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
            <span className="text-[11px] font-bold uppercase">{isVietnamese ? 'Đang chạy' : 'Running'}</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{stats.busy}</div>
          <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
            {stats.total > 0 ? Math.round((stats.busy / stats.total) * 100) : 0}% {isVietnamese ? 'công suất' : 'active'}
          </div>
        </div>

        {/* Giữ chỗ (Held) */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'HELD' ? 'ALL' : 'HELD')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-xs ${
            filterStatus === 'HELD'
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 ring-2 ring-purple-500'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
            <span className="text-[11px] font-bold uppercase">{isVietnamese ? 'Giữ chỗ' : 'Held'}</span>
            <Clock className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">{stats.held}</div>
          <div className="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-0.5">{isVietnamese ? 'Chờ nhận đồ' : 'Pending load'}</div>
        </div>

        {/* Bảo trì / Sự cố (Maintenance / Error) */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'MAINTENANCE' ? 'ALL' : 'MAINTENANCE')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-xs ${
            filterStatus === 'MAINTENANCE'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase">{isVietnamese ? 'Bảo trì / Lỗi' : 'Issue / Mnt'}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.maintenance}</div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">{isVietnamese ? 'Cần kỹ thuật' : 'Needs attention'}</div>
        </div>

        {/* Trạng thái Telemetry Stream */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3.5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Telemetry</span>
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live (6s)
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">{selectedSite?.name || 'Station'}</div>
          </div>
        </div>
      </div>

      {/* 3. Thanh tìm kiếm và bộ lọc */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isVietnamese ? 'Tìm theo mã máy (W01, D01), tên loại máy...' : 'Search machine code or name...'}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Loại máy */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { id: 'ALL', labelVi: 'Tất cả', labelEn: 'All' },
              { id: 'WASHER', labelVi: 'Máy giặt', labelEn: 'Washers' },
              { id: 'DRYER', labelVi: 'Máy sấy', labelEn: 'Dryers' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterType(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterType === t.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVietnamese ? t.labelVi : t.labelEn}
              </button>
            ))}
          </div>

          {/* Trạng thái */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="ALL">{isVietnamese ? 'Mọi trạng thái' : 'All Status'}</option>
            <option value="AVAILABLE">{isVietnamese ? 'Sẵn sàng (Available)' : 'Available'}</option>
            <option value="BUSY">{isVietnamese ? 'Đang chạy (Busy)' : 'Running'}</option>
            <option value="HELD">{isVietnamese ? 'Giữ chỗ (Held)' : 'Held'}</option>
            <option value="MAINTENANCE">{isVietnamese ? 'Bảo trì / Sự cố' : 'Maintenance'}</option>
          </select>
        </div>
      </div>

      {/* 4. Danh sách máy móc (Grid) lấy từ /api/machines */}
      {loading ? (
        <div className="p-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="loading-spinner w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full mx-auto animate-spin mb-3"></div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            {isVietnamese ? 'Đang kết nối API /api/machines để lấy dữ liệu trạm...' : 'Fetching machines from /api/machines...'}
          </p>
        </div>
      ) : error ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => fetchMachines(false)}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            {isVietnamese ? 'Thử lại' : 'Retry'}
          </button>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <WashingMachine className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {isVietnamese ? 'Không tìm thấy máy giặt/sấy phù hợp' : 'No matching machines found'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isVietnamese
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm theo mã máy.'
              : 'Try clearing filters or search by machine code.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMachines.map((m) => {
            const rawStatus = (m.status || '').toUpperCase();
            const isBusy = rawStatus === 'BUSY';
            const isAvailable = rawStatus === 'AVAILABLE';
            const isHeld = rawStatus === 'HELD';
            const isMaintenance = rawStatus === 'MAINTENANCE' || rawStatus === 'ERROR';
            const isOffline = rawStatus === 'OFFLINE';

            const kind = (m.kind || m.machineClass?.kind || 'WASHER').toUpperCase();
            const isDryer = kind === 'DRYER';
            const capacity = m.capacityKg || m.machineClass?.capacityKg || 10;
            const className = m.machineClassName || m.machineClass?.name || (isDryer ? 'Máy sấy' : 'Máy giặt');
            const telemetry = getMachineTelemetry(m);
            const isActionLoading = actionLoadingId === m.machineId;

            let liveRemainingMin = m.remainingMinutes;
            if (m.busyUntil) {
              const diffMs = new Date(m.busyUntil).getTime() - currentTimestamp;
              liveRemainingMin = diffMs > 0 ? Math.ceil(diffMs / 60000) : 0;
            }

            return (
              <div
                key={m.machineId || m.code}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all duration-300 relative overflow-hidden ${
                  isBusy
                    ? 'border-blue-300 dark:border-blue-800/80 shadow-blue-500/5 ring-1 ring-blue-500/20'
                    : isMaintenance
                    ? 'border-red-300 dark:border-red-800/80 shadow-red-500/5'
                    : isHeld
                    ? 'border-purple-300 dark:border-purple-800/80'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Header card: Icon, Code, Model, Status Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-xs ${
                        isBusy
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                          : isMaintenance
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                          : isHeld
                          ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                      }`}
                    >
                      {isDryer ? (
                        <Flame className={`w-6 h-6 ${isBusy ? 'animate-pulse text-amber-500' : ''}`} />
                      ) : (
                        <WashingMachine className={`w-6 h-6 ${isBusy ? 'animate-spin' : ''}`} />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono font-black text-slate-900 dark:text-white text-lg tracking-tight">
                          {m.code}
                        </h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {capacity} kg
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isDryer ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {isDryer ? (isVietnamese ? 'Sấy' : 'Dryer') : (isVietnamese ? 'Giặt' : 'Washer')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={className}>
                        {className}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isBusy ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                        {isVietnamese ? 'ĐANG CHẠY' : 'RUNNING'}
                      </span>
                    ) : isAvailable ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {isVietnamese ? 'SẴN SÀNG' : 'AVAILABLE'}
                      </span>
                    ) : isHeld ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        {isVietnamese ? 'GIỮ CHỖ' : 'HELD'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        {isVietnamese ? 'BẢO TRÌ' : 'MAINTENANCE'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tình trạng & Tiến trình chu trình xử lý thực tế */}
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                  {/* TRƯỜNG HỢP 1: MÁY ĐANG CHẠY (BUSY) */}
                  {isBusy && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          {isVietnamese ? 'Gói hoạt động:' : 'Current Cycle:'}
                        </span>
                        <span className="font-black text-blue-700 dark:text-blue-300 truncate max-w-[210px]" title={m.activeServiceName}>
                          {m.activeServiceName || (isDryer ? (isVietnamese ? 'Sấy nhiệt tiêu chuẩn' : 'Standard Dry') : (isVietnamese ? 'Giặt tiêu chuẩn' : 'Standard Wash'))}
                        </span>
                      </div>

                      {/* Thông tin đơn hàng & Khách hàng thực tế */}
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                            <Activity className="w-3 h-3 text-blue-500" />
                            {isVietnamese ? 'Mã đơn:' : 'Order:'}
                          </span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {m.activeOrderCode || `#${String(m.heldByOrderId || '').slice(0, 8).toUpperCase()}`}
                          </span>
                        </div>
                        {m.activeCustomerName && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {isVietnamese ? 'Khách hàng:' : 'Customer:'}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                              {m.activeCustomerName} {m.activeCustomerPhone ? `(${m.activeCustomerPhone})` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tiến độ và thời gian còn lại */}
                      <div className="space-y-1 pt-0.5">
                        <div className="flex justify-between text-xs font-black">
                          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            {isVietnamese
                              ? `Còn lại: ${liveRemainingMin ?? 18} phút`
                              : `${liveRemainingMin ?? 18}m remaining`}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono">{telemetry.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${telemetry.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Phím tắt báo sự cố đơn hàng đang giặt */}
                      {(m.activeOrderId || m.activeOrderCode) && (
                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => navigate('/dashboard/orders')}
                            className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer transition"
                            title={isVietnamese ? 'Chuyển sang trang Đơn hàng để báo sự cố / đổi máy' : 'Go to orders to report issue / transfer machine'}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>{isVietnamese ? 'Báo sự cố đơn này' : 'Report issue'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TRƯỜNG HỢP 2: MÁY GIỮ CHỖ / CHỜ KHỞI ĐỘNG (HELD) */}
                  {isHeld && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider text-[10px]">
                          {isVietnamese ? 'Chờ khởi động:' : 'Awaiting Start:'}
                        </span>
                        <span className="font-black text-purple-700 dark:text-purple-300 truncate max-w-[190px]">
                          {m.activeServiceName || (isVietnamese ? 'Đã gán đơn' : 'Order Assigned')}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[10px] font-semibold">{isVietnamese ? 'Mã đơn:' : 'Order:'}</span>
                          <span className="font-mono font-black text-purple-700 dark:text-purple-300">
                            {m.activeOrderCode || `#${String(m.heldByOrderId || '').slice(0, 8).toUpperCase()}`}
                          </span>
                        </div>
                        {m.activeCustomerName && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[10px] font-semibold">{isVietnamese ? 'Khách:' : 'Customer:'}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                              {m.activeCustomerName} {m.activeCustomerPhone ? `(${m.activeCustomerPhone})` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TRƯỜNG HỢP 3: MÁY BẢO TRÌ / SỰ CỐ (MAINTENANCE) */}
                  {isMaintenance && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 font-bold">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{isVietnamese ? 'Sự cố đang xử lý:' : 'Active Fault / Issue:'}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs">
                        <p className="text-rose-900 dark:text-rose-200 font-semibold text-xs leading-relaxed" title={cleanIssueDescription(m.maintenanceReason)}>
                          {cleanIssueDescription(m.maintenanceReason) || (isVietnamese ? 'Máy gặp sự cố kỹ thuật, đang tạm dừng vận hành.' : 'Hardware fault reported, machine locked.')}
                        </p>
                        {m.maintenancePriority && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-rose-200 dark:bg-rose-900 font-black text-rose-800 dark:text-rose-200">
                              {m.maintenancePriority}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TRƯỜNG HỢP 4: MÁY SẴN SÀNG (AVAILABLE) */}
                  {isAvailable && (
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {isVietnamese ? 'Sẵn sàng nhận đồ' : 'Ready for operation'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono font-medium">
                        {isVietnamese ? 'Lồng máy trống' : 'Idle / Standby'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Các cảm biến IoT thời gian thực (Telemetry) */}
                <div className="grid grid-cols-3 gap-2 mt-3 p-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      {telemetry.temperature}°C
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Gauge className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{telemetry.vibration}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{telemetry.powerKw} kW</span>
                  </div>
                </div>

                {/* Gói dịch vụ tương thích (Compatible Offerings) */}
                {Array.isArray(m.compatibleOfferings) && m.compatibleOfferings.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold">{isVietnamese ? 'Hỗ trợ:' : 'Supports:'}</span>
                    {m.compatibleOfferings.slice(0, 2).map((off) => (
                      <span
                        key={off.offeringId}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300"
                      >
                        {off.name}
                      </span>
                    ))}
                    {m.compatibleOfferings.length > 2 && (
                      <span className="text-[10px] text-slate-400 font-mono">+{m.compatibleOfferings.length - 2}</span>
                    )}
                  </div>
                )}

                {/* Thông tin thiết bị & Thao tác bảo trì */}
                <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[150px]">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{m.siteName || selectedSite?.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isMaintenance && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleUpdateStatus(m.machineId, 'AVAILABLE', 'Hoàn tất bảo trì bởi Quản lý trạm')}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title={isVietnamese ? 'Đã sửa xong, hoàn tất bảo trì mở lại máy' : 'Finish maintenance and set available'}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isVietnamese ? 'Hoàn tất bảo trì' : 'Complete'}</span>
                      </button>
                    )}

                    {isAvailable && (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleUpdateStatus(m.machineId, 'MAINTENANCE')}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title={isVietnamese ? 'Khóa máy để bảo trì' : 'Set to maintenance'}
                      >
                        <Wrench className="w-3 h-3" />
                        <span>{isVietnamese ? 'Bảo trì' : 'Service'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
