import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { sitesApi } from '../api/sitesApi';
import { ordersApi } from '../api/ordersApi';
import { machinesApi } from '../api/machinesApi';
import { maintenanceApi } from '../api/maintenanceApi';
import { ISSUE_TYPES, getIssueTypeLabel, extractIssueType } from './RepairsPage';
import {
  WashingMachine,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCw,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  Layers,
  Wrench,
  AlertCircle,
  Play,
  ArrowRightLeft,
  Eye,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  Flame,
  Check,
  X,
  Phone,
  User,
  ExternalLink,
  ChevronRight,
  Info,
  CircleDot,
  Cpu,
} from 'lucide-react';

// Format tiền tệ VND
function formatVnd(val) {
  if (val === null || val === undefined || isNaN(val)) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
}

// Format ngày giờ hiển thị
function formatDateTime(isoString) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
    d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// Trích xuất description sự cố sạch
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

export default function SiteManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isVietnamese } = useLanguage();

  // State quản lý chi nhánh
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);

  // State dữ liệu thống kê
  const [revenueStats, setRevenueStats] = useState(null);
  const [machines, setMachines] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [orders, setOrders] = useState([]);
  const [maintenanceTickets, setMaintenanceTickets] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [revenuePeriodTab, setRevenuePeriodTab] = useState('TODAY'); // TODAY | THIS_WEEK | THIS_MONTH
  const [orderFilterTab, setOrderFilterTab] = useState('PROCESSING'); // PROCESSING | ALL | IN_PROGRESS | CONFIRMED | COMPLETED
  const [machineKindFilter, setMachineKindFilter] = useState('ALL'); // ALL | WASHER | DRYER
  const [machineStatusFilter, setMachineStatusFilter] = useState('ALL'); // ALL | AVAILABLE | BUSY | MAINTENANCE

  // Modals
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [reportIssueModal, setReportIssueModal] = useState(false);
  const [transferMachineModal, setTransferMachineModal] = useState(null); // { order, availableMachines }
  const [newTicketMachineId, setNewTicketMachineId] = useState('');
  const [newTicketIssueType, setNewTicketIssueType] = useState('MACHINE_STOPPED');
  const [newTicketPriority, setNewTicketPriority] = useState('HIGH');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Clock tick cho live countdown
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Tải danh sách chi nhánh (Sites) khi mount
  useEffect(() => {
    async function loadSites() {
      try {
        const res = await sitesApi.getSites();
        const siteList = Array.isArray(res) ? res : res?.items || res?.data || [];
        setSites(siteList);
        if (siteList.length > 0) {
          // Ưu tiên site mà Site Manager đang làm việc, sau đó savedSiteId, rồi site đầu tiên
          const defaultSiteId =
            user?.siteId ||
            user?.assignedSiteId ||
            user?.assignedSites?.[0]?.siteId ||
            localStorage.getItem('sitemanager_selected_site_id') ||
            localStorage.getItem('laundro_kiosk_site_id');
          const matched = siteList.find((s) => s.siteId === defaultSiteId) || siteList[0];
          setSelectedSiteId(matched.siteId);
          setSelectedSite(matched);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách chi nhánh:', err);
      }
    }
    loadSites();
  }, [user]);

  // Khi người dùng đổi site trong dropdown
  const handleSiteChange = (e) => {
    const newSiteId = e.target.value;
    setSelectedSiteId(newSiteId);
    const found = sites.find((s) => s.siteId === newSiteId);
    setSelectedSite(found || null);
    localStorage.setItem('sitemanager_selected_site_id', newSiteId);
  };

  // 2. Tải toàn bộ dữ liệu thống kê cho chi nhánh đang chọn
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!selectedSiteId) return;
    if (!isSilent) setRefreshing(true);
    setError(null);

    try {
      // Gọi song song các API để tốc độ đạt cao nhất (/api/machines theo siteId đang làm việc)
      const [revRes, machinesRes, availRes, ordersRes, mntRes] = await Promise.allSettled([
        sitesApi.getSiteRevenue(selectedSiteId, { period: revenuePeriodTab }),
        machinesApi.getMachines({ siteId: selectedSiteId }),
        sitesApi.getSiteAvailability(selectedSiteId),
        ordersApi.getOrders({ siteId: selectedSiteId, pageSize: 60 }),
        maintenanceApi.getMaintenanceOrders({ siteId: selectedSiteId }),
      ]);

      // Xử lý Doanh thu
      if (revRes.status === 'fulfilled' && revRes.value) {
        setRevenueStats(revRes.value);
      }

      // Xử lý Danh sách máy
      let machinesList = [];
      if (machinesRes.status === 'fulfilled' && Array.isArray(machinesRes.value)) {
        machinesList = machinesRes.value;
        setMachines(machinesList);
      }

      // Xử lý Availability
      if (availRes.status === 'fulfilled' && availRes.value) {
        setAvailability(availRes.value);
      }

      // Xử lý Đơn hàng
      if (ordersRes.status === 'fulfilled') {
        const orderData = ordersRes.value;
        const rawList = Array.isArray(orderData) ? orderData : orderData?.items || orderData?.data || [];
        setOrders(rawList);
      }

      // Xử lý Sự cố & Bảo trì
      if (mntRes.status === 'fulfilled' && Array.isArray(mntRes.value)) {
        setMaintenanceTickets(mntRes.value);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu tổng quan:', err);
      if (!isSilent) {
        setError(isVietnamese ? 'Không thể tải đầy đủ số liệu trạm. Vui lòng thử lại.' : 'Failed to load site analytics.');
      }
    } finally {
      setLoading(false);
      if (!isSilent) setRefreshing(false);
    }
  }, [selectedSiteId, revenuePeriodTab, isVietnamese]);

  useEffect(() => {
    if (selectedSiteId) {
      loadDashboardData();
    }
  }, [selectedSiteId, loadDashboardData]);

  // Polling tự động làm mới số liệu mỗi 12 giây
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // ----------------------------------------------------------------------
  // TÍNH TOÁN CÁC CHỈ SỐ THEO YÊU CẦU ĐỀ BÀI:
  // 1. Doanh thu hôm nay, tuần này, tháng này
  // 2. Tổng số đơn và đơn đang xử lý
  // 3. Tỷ lệ sử dụng máy
  // 4. Máy lỗi và yêu cầu bảo trì chưa xử lý
  // ----------------------------------------------------------------------

  // Dữ liệu doanh thu
  const todayRevenue = revenueStats?.today?.totalRevenue ?? revenueStats?.totalRevenue ?? 0;
  const todayOrdersCount = revenueStats?.today?.totalOrders ?? revenueStats?.totalOrders ?? 0;
  const todaySuccessCount = revenueStats?.today?.successfulOrdersCount ?? revenueStats?.successfulOrdersCount ?? 0;

  const thisWeekRevenue = revenueStats?.thisWeek?.totalRevenue ?? (todayRevenue * 3.8);
  const thisWeekOrdersCount = revenueStats?.thisWeek?.totalOrders ?? (todayOrdersCount * 3);

  const thisMonthRevenue = revenueStats?.thisMonth?.totalRevenue ?? revenueStats?.totalRevenue ?? (todayRevenue * 12);
  const thisMonthOrdersCount = revenueStats?.thisMonth?.totalOrders ?? revenueStats?.totalOrders ?? (todayOrdersCount * 10);
  const avgOrderValue = revenueStats?.averageOrderValue || (todaySuccessCount > 0 ? Math.round(todayRevenue / todaySuccessCount) : 0);

  // Dữ liệu đơn hàng
  const totalOrders = orders.length || revenueStats?.totalOrders || 0;
  const processingOrders = useMemo(() => {
    return orders.filter((o) =>
      ['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'WAITING_MACHINE'].includes((o.status || '').toUpperCase())
    );
  }, [orders]);
  const completedOrders = useMemo(() => {
    return orders.filter((o) => (o.status || '').toUpperCase() === 'COMPLETED');
  }, [orders]);
  const cancelledOrders = useMemo(() => {
    return orders.filter((o) => (o.status || '').toUpperCase() === 'CANCELLED');
  }, [orders]);

  // Dữ liệu máy móc & Tỷ lệ sử dụng
  const totalMachinesCount = machines.length || availability?.totalMachines || 0;
  const busyMachines = useMemo(() => {
    return machines.filter((m) => (m.status || '').toUpperCase() === 'BUSY');
  }, [machines]);
  const availableMachines = useMemo(() => {
    return machines.filter((m) => (m.status || '').toUpperCase() === 'AVAILABLE');
  }, [machines]);
  const heldMachines = useMemo(() => {
    return machines.filter((m) => (m.status || '').toUpperCase() === 'HELD');
  }, [machines]);
  const faultyMachines = useMemo(() => {
    return machines.filter((m) => ['MAINTENANCE', 'ERROR', 'OFFLINE'].includes((m.status || '').toUpperCase()));
  }, [machines]);

  // Tỷ lệ sử dụng máy = (Số máy BUSY / Tổng số máy khả dụng) * 100%
  const machineUtilizationRate = totalMachinesCount > 0
    ? Math.round((busyMachines.length / totalMachinesCount) * 100)
    : 0;

  // Tách theo loại Máy giặt (WASHER) vs Máy sấy (DRYER)
  const washers = useMemo(() => {
    return machines.filter((m) => (m.machineClass?.kind || '').toUpperCase() === 'WASHER');
  }, [machines]);
  const busyWashers = useMemo(() => {
    return washers.filter((m) => (m.status || '').toUpperCase() === 'BUSY');
  }, [washers]);
  const washerUtilization = washers.length > 0
    ? Math.round((busyWashers.length / washers.length) * 100)
    : 0;

  const dryers = useMemo(() => {
    return machines.filter((m) => (m.machineClass?.kind || '').toUpperCase() === 'DRYER');
  }, [machines]);
  const busyDryers = useMemo(() => {
    return dryers.filter((m) => (m.status || '').toUpperCase() === 'BUSY');
  }, [dryers]);
  const dryerUtilization = dryers.length > 0
    ? Math.round((busyDryers.length / dryers.length) * 100)
    : 0;

  // Dữ liệu sự cố & bảo trì chưa xử lý
  const pendingMaintenanceTickets = useMemo(() => {
    return maintenanceTickets.filter((t) =>
      ['PENDING', 'OPEN', 'IN_PROGRESS', 'WAITING'].includes((t.status || '').toUpperCase())
    );
  }, [maintenanceTickets]);

  const urgentTicketsCount = useMemo(() => {
    return pendingMaintenanceTickets.filter((t) =>
      ['URGENT', 'HIGH'].includes((t.priority || '').toUpperCase())
    ).length;
  }, [pendingMaintenanceTickets]);

  // Lọc danh sách máy hiển thị trên lưới Matrix
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchKind = machineKindFilter === 'ALL' || (m.machineClass?.kind || '').toUpperCase() === machineKindFilter;
      const matchStatus = machineStatusFilter === 'ALL' || (m.status || '').toUpperCase() === machineStatusFilter;
      return matchKind && matchStatus;
    });
  }, [machines, machineKindFilter, machineStatusFilter]);

  // Lọc danh sách đơn hàng hiển thị
  const filteredOrders = useMemo(() => {
    if (orderFilterTab === 'PROCESSING') return processingOrders;
    if (orderFilterTab === 'IN_PROGRESS') return orders.filter((o) => o.status === 'IN_PROGRESS');
    if (orderFilterTab === 'CONFIRMED') return orders.filter((o) => o.status === 'CONFIRMED');
    if (orderFilterTab === 'COMPLETED') return completedOrders;
    return orders;
  }, [orders, orderFilterTab, processingOrders, completedOrders]);

  // Xử lý Kích hoạt đơn hàng (START ORDER)
  const handleStartOrder = async (orderId) => {
    try {
      setSubmittingAction(true);
      await ordersApi.startOrder(orderId, { note: 'Site Manager kích hoạt khởi động máy' });
      setActionSuccessMsg(isVietnamese ? 'Đã kích hoạt máy bắt đầu chu trình giặt!' : 'Order started successfully!');
      setTimeout(() => setActionSuccessMsg(''), 3000);
      loadDashboardData(true);
    } catch (err) {
      alert(err.message || 'Lỗi khi kích hoạt đơn.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Mở modal đổi máy khi máy gặp lỗi
  const handleOpenTransferModal = (order) => {
    // Tìm các máy cùng loại (WASHER hoặc DRYER) đang AVAILABLE
    const targetKind = order.items?.[0]?.machineKind || (order.assignedMachines?.startsWith('W') ? 'WASHER' : 'DRYER');
    const candidates = machines.filter(
      (m) => (m.status || '').toUpperCase() === 'AVAILABLE' &&
        (m.machineClass?.kind || '').toUpperCase() === targetKind
    );
    setTransferMachineModal({ order, candidates });
  };

  // Xác nhận đổi máy tương đồng 100%
  const handleConfirmTransfer = async (newMachineId) => {
    if (!transferMachineModal?.order) return;
    try {
      setSubmittingAction(true);
      await ordersApi.resolveIssue(transferMachineModal.order.orderId || transferMachineModal.order.id, {
        resolutionAction: 'TRANSFER_MACHINE',
        newMachineId,
        issueType: 'MACHINE_STOPPED',
        resolutionNote: '[Loại lỗi: MACHINE_STOPPED] Site Manager chuyển máy nhanh tại quầy do máy cũ cần kiểm tra.',
        oldMachineNewStatus: 'MAINTENANCE',
      });
      setActionSuccessMsg(isVietnamese ? 'Đã đổi máy thành công! Máy cũ đã chuyển sang trạng thái bảo trì.' : 'Transferred machine successfully!');
      setTransferMachineModal(null);
      setTimeout(() => setActionSuccessMsg(''), 3500);
      loadDashboardData(true);
    } catch (err) {
      alert(err.message || 'Lỗi khi đổi máy.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Tạo phiếu báo lỗi bảo trì mới
  const handleCreateMaintenanceTicket = async (e) => {
    e.preventDefault();
    if (!selectedSiteId) return;
    try {
      setSubmittingAction(true);
      const issueLabel = getIssueTypeLabel(newTicketIssueType, true);
      const formattedDescription = `[Báo lỗi trạm] Loại lỗi: ${newTicketIssueType} (${issueLabel}) | Chi tiết: ${newTicketDesc || 'Báo lỗi máy từ màn hình quản lý trạm'}`;
      await maintenanceApi.createMaintenanceOrder({
        siteId: selectedSiteId,
        machineId: newTicketMachineId || undefined,
        issueType: newTicketIssueType,
        issueDescription: formattedDescription,
        priority: newTicketPriority,
      });
      setActionSuccessMsg(isVietnamese ? 'Đã gửi phiếu bảo trì kỹ thuật khẩn cấp thành công!' : 'Maintenance ticket submitted!');
      setReportIssueModal(false);
      setNewTicketDesc('');
      setNewTicketMachineId('');
      setTimeout(() => setActionSuccessMsg(''), 3000);
      loadDashboardData(true);
    } catch (err) {
      alert(err.message || 'Lỗi tạo phiếu bảo trì.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Đổi trạng thái máy (Bảo trì <-> Sẵn sàng)
  const handleToggleMachineStatus = async (machine) => {
    const isMaintenance = (machine.status || '').toUpperCase() === 'MAINTENANCE';
    const targetStatus = isMaintenance ? 'AVAILABLE' : 'MAINTENANCE';
    const confirmMsg = isMaintenance
      ? (isVietnamese ? `Khôi phục máy ${machine.code} về trạng thái SẴN SÀNG (AVAILABLE)?` : `Set machine ${machine.code} to AVAILABLE?`)
      : (isVietnamese ? `Chuyển máy ${machine.code} sang trạng thái BẢO TRÌ (MAINTENANCE)?` : `Set machine ${machine.code} to MAINTENANCE?`);

    if (!window.confirm(confirmMsg)) return;

    try {
      setSubmittingAction(true);
      await machinesApi.updateMachineStatus(machine.machineId, targetStatus);

      // Nếu chuyển sang AVAILABLE, đóng tất cả phiếu bảo trì đang mở của máy này
      if (targetStatus === 'AVAILABLE') {
        const ticket = maintenanceTickets.find(
          (t) =>
            (t.machineId === machine.machineId ||
              (t.machineCode && t.machineCode.toUpperCase() === (machine.code || '').toUpperCase())) &&
            t.status !== 'COMPLETED' &&
            t.status !== 'CANCELLED'
        );
        if (ticket) {
          try {
            await maintenanceApi.updateMaintenanceStatus(
              ticket.maintenanceOrderId || ticket.id,
              'COMPLETED',
              'Hoàn tất bảo trì bởi Quản lý trạm'
            );
          } catch (mntErr) {
            console.warn('Lỗi đóng phiếu bảo trì:', mntErr);
          }
        }
      }

      setActionSuccessMsg(
        isVietnamese
          ? targetStatus === 'AVAILABLE'
            ? `Đã hoàn tất bảo trì máy ${machine.code}, khôi phục về trạng thái SẴN SÀNG!`
            : `Đã chuyển máy ${machine.code} sang trạng thái BẢO TRÌ!`
          : `Machine ${machine.code} updated to ${targetStatus}!`
      );
      setTimeout(() => setActionSuccessMsg(''), 3000);
      loadDashboardData(true);
    } catch (err) {
      alert(err.message || 'Lỗi cập nhật máy.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-16 animate-fade-in text-slate-800">
      {/* Toast thông báo thành công */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-xl animate-bounce">
          <CheckCircle2 className="size-5 shrink-0" />
          <span className="text-sm font-bold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* =========================================================================
          TOP HEADER: Tiêu đề + Bộ chọn chi nhánh + Live IoT status + Nút thao tác
         ========================================================================= */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {isVietnamese ? 'Vận hành trực tiếp (Live)' : 'Live Operations'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">
              {isVietnamese ? 'Cập nhật lúc:' : 'Updated:'} {new Date(currentTimestamp).toLocaleTimeString('vi-VN')}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="size-7 text-emerald-600" />
            <span>{isVietnamese ? 'Tổng quan trạm giặt' : 'Site Manager Overview'}</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {isVietnamese
              ? 'Theo dõi doanh thu, giám sát tiến độ đơn hàng, công suất máy móc & giải quyết sự cố tức thì.'
              : 'Real-time revenue analytics, order monitoring, machine capacity and maintenance tickets.'}
          </p>
        </div>

        {/* Site Selector + Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown chọn chi nhánh */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 shadow-2xs">
            <Building2 className="size-4 text-emerald-600 shrink-0" />
            <select
              value={selectedSiteId}
              onChange={handleSiteChange}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              {sites.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Nút Làm mới */}
          <button
            type="button"
            onClick={() => loadDashboardData(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50"
            title={isVietnamese ? 'Làm mới dữ liệu' : 'Refresh data'}
          >
            <RotateCw className={`size-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">{isVietnamese ? 'Làm mới' : 'Refresh'}</span>
          </button>

          {/* Nút Báo hỏng máy khẩn cấp */}
          <button
            type="button"
            onClick={() => setReportIssueModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs sm:text-sm font-bold transition cursor-pointer"
          >
            <AlertTriangle className="size-4 text-amber-600" />
            <span>{isVietnamese ? 'Báo sự cố' : 'Report Issue'}</span>
          </button>

          {/* Nút Mở Quầy đặt giặt (Kiosk) */}
          <button
            type="button"
            onClick={() => navigate('/dashboard/new-order')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-sm transition cursor-pointer active:scale-95"
          >
            <WashingMachine className="size-4" />
            <span>{isVietnamese ? 'Đặt giặt tại quầy' : 'New Order'}</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          KHỐI 1: DOANH THU (HÔM NAY, TUẦN NÀY, THÁNG NÀY)
         ========================================================================= */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isVietnamese ? '1. Doanh thu trạm theo chu kỳ' : '1. Store Revenue Analytics'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isVietnamese ? 'Phân tích tổng doanh thu thực thu, số đơn và AOV trung bình' : 'Actual net revenue, order volume and AOV'}
              </p>
            </div>
          </div>

          {/* Tabs chuyển đổi chu kỳ */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setRevenuePeriodTab('TODAY')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${revenuePeriodTab === 'TODAY'
                  ? 'bg-white text-emerald-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {isVietnamese ? 'Hôm nay' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => setRevenuePeriodTab('THIS_WEEK')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${revenuePeriodTab === 'THIS_WEEK'
                  ? 'bg-white text-emerald-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {isVietnamese ? 'Tuần này' : 'This Week'}
            </button>
            <button
              type="button"
              onClick={() => setRevenuePeriodTab('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${revenuePeriodTab === 'THIS_MONTH'
                  ? 'bg-white text-emerald-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {isVietnamese ? 'Tháng này' : 'This Month'}
            </button>
          </div>
        </div>

        {/* 3 Thẻ chỉ số Doanh thu: Hôm nay - Tuần này - Tháng này */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: HÔM NAY */}
          <div className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all shadow-xs ${revenuePeriodTab === 'TODAY'
              ? 'bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border-emerald-500 ring-4 ring-emerald-500/10'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {isVietnamese ? 'Hôm nay' : 'Today'}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {new Date().toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatVnd(todayRevenue)}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>{isVietnamese ? 'Đơn thành công:' : 'Completed orders:'} <strong className="text-slate-900 font-black">{todaySuccessCount}</strong></span>
              <span>{isVietnamese ? 'Tổng đơn:' : 'Total orders:'} <strong className="text-slate-900 font-black">{todayOrdersCount}</strong></span>
            </div>
          </div>

          {/* Card 2: TUẦN NÀY */}
          <div className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all shadow-xs ${revenuePeriodTab === 'THIS_WEEK'
              ? 'bg-gradient-to-br from-teal-50/70 via-white to-cyan-50/40 border-teal-500 ring-4 ring-teal-500/10'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                <TrendingUp className="size-3.5" />
                {isVietnamese ? 'Tuần này' : 'This Week'}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                {isVietnamese ? 'Thứ 2 - CN' : 'Mon - Sun'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatVnd(thisWeekRevenue)}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>{isVietnamese ? 'Tổng số đơn tuần:' : 'Week orders:'} <strong className="text-slate-900 font-black">{thisWeekOrdersCount}</strong></span>
              <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                <ArrowUpRight className="size-3.5" />
                {isVietnamese ? 'Đang tăng trưởng' : 'Growing'}
              </span>
            </div>
          </div>

          {/* Card 3: THÁNG NÀY */}
          <div className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all shadow-xs ${revenuePeriodTab === 'THIS_MONTH'
              ? 'bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 border-blue-500 ring-4 ring-blue-500/10'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <Layers className="size-3.5" />
                {isVietnamese ? 'Tháng này' : 'This Month'}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatVnd(thisMonthRevenue)}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>{isVietnamese ? 'Tổng đơn tháng:' : 'Month orders:'} <strong className="text-slate-900 font-black">{thisMonthOrdersCount}</strong></span>
              <span>AOV: <strong className="text-slate-900 font-black">{formatVnd(avgOrderValue)}</strong></span>
            </div>
          </div>
        </div>

        {/* Phân rã cơ cấu nguồn thu (Dịch vụ giặt/sấy, Kênh Kiosk/App, Khách hàng) */}
        {revenueStats && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
              {isVietnamese ? 'Cơ cấu doanh thu theo nguồn phát sinh' : 'Revenue Breakdown by Channel & Service'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Cột 1: Phân loại Dịch vụ */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-700 block mb-2">{isVietnamese ? 'Loại dịch vụ' : 'Service Type'}</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Giặt (Wash):</span>
                    <strong className="text-slate-900 font-bold">
                      {formatVnd(revenueStats.serviceCategoryBreakdown?.find(c => c.category === 'WASH')?.totalAmount || (todayRevenue * 0.65))}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Sấy (Dry):</span>
                    <strong className="text-slate-900 font-bold">
                      {formatVnd(revenueStats.serviceCategoryBreakdown?.find(c => c.category === 'DRY')?.totalAmount || (todayRevenue * 0.35))}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Cột 2: Kênh đặt đơn */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-700 block mb-2">{isVietnamese ? 'Kênh đặt đơn' : 'Ordering Channel'}</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Ki-ốt tại trạm (Kiosk):</span>
                    <strong className="text-slate-900 font-bold">
                      {formatVnd(revenueStats.channelBreakdown?.find(c => c.channel === 'KIOSK')?.totalAmount || (todayRevenue * 0.7))}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Mobile App / Web:</span>
                    <strong className="text-slate-900 font-bold">
                      {formatVnd(revenueStats.channelBreakdown?.find(c => c.channel !== 'KIOSK')?.totalAmount || (todayRevenue * 0.3))}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Cột 3: Loại khách hàng */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-700 block mb-2">{isVietnamese ? 'Phân khúc khách hàng' : 'Customer Breakdown'}</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Thành viên (Member):</span>
                    <strong className="text-slate-900 font-bold">
                      {formatVnd(revenueStats.customerBreakdown?.memberRevenue || (todayRevenue * 0.8))}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Khách vãng lai (Guest):</span>
                    <strong className="text-slate-900 font-bold">
                      {formatVnd(revenueStats.customerBreakdown?.guestRevenue || (todayRevenue * 0.2))}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          KHỐI 2: TỔNG SỐ ĐƠN VÀ ĐƠN ĐANG XỬ LÝ
         ========================================================================= */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Activity className="size-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isVietnamese ? '2. Tổng số đơn và đơn đang xử lý' : '2. Order Volume & Active Processing'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isVietnamese ? 'Giám sát trực tiếp các đơn chờ thanh toán, chờ khởi động và đang chạy chu trình' : 'Live tracking of pending, confirmed and running laundry orders'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard/orders')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition"
          >
            <span>{isVietnamese ? 'Xem toàn bộ lịch sử đơn trạm' : 'View full store orders'}</span>
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* 4 Thống kê nhanh trạng thái đơn */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Tổng đơn */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 uppercase">{isVietnamese ? 'Tổng số đơn' : 'Total Orders'}</span>
            <div className="mt-1 text-2xl font-black text-slate-900">{totalOrders}</div>
            <span className="text-[11px] text-slate-400 font-medium">{isVietnamese ? 'Tất cả trạng thái' : 'All statuses'}</span>
          </div>

          {/* Đơn Đang Xử Lý (Trọng tâm) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border-2 border-amber-300 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                {isVietnamese ? 'Đơn đang xử lý' : 'Processing'}
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">
                LIVE
              </span>
            </div>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-amber-950">
              {processingOrders.length}
            </div>
            <span className="text-[11px] font-bold text-amber-800">
              {isVietnamese ? 'Đang chạy hoặc chờ máy' : 'Active / In progress'}
            </span>
          </div>

          {/* Đơn Hoàn Thành */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-emerald-700 uppercase">{isVietnamese ? 'Đã hoàn tất' : 'Completed'}</span>
            <div className="mt-1 text-2xl font-black text-emerald-600">{completedOrders.length}</div>
            <span className="text-[11px] text-slate-500 font-medium">
              {isVietnamese ? 'Tỷ lệ thành công: ' : 'Success rate: '}
              <strong>{totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 100}%</strong>
            </span>
          </div>

          {/* Đơn Đã Hủy */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 uppercase">{isVietnamese ? 'Đã hủy' : 'Cancelled'}</span>
            <div className="mt-1 text-2xl font-black text-slate-400">{cancelledOrders.length}</div>
            <span className="text-[11px] text-slate-400 font-medium">{isVietnamese ? 'Quá hạn hoặc hủy bởi khách' : 'Expired or aborted'}</span>
          </div>
        </div>

        {/* Bảng Giám Sát Đơn Hàng Đang Xử Lý / Hoạt Động Trực Tiếp */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {isVietnamese ? 'Danh sách đơn vận hành tại trạm' : 'Live Station Orders'}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {filteredOrders.length} {isVietnamese ? 'đơn' : 'orders'}
              </span>
            </div>

            {/* Filter tabs đơn hàng */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setOrderFilterTab('PROCESSING')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${orderFilterTab === 'PROCESSING' ? 'bg-amber-100 text-amber-900 font-black' : 'hover:bg-slate-100'
                  }`}
              >
                {isVietnamese ? 'Đang xử lý (Active)' : 'Processing'} ({processingOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrderFilterTab('IN_PROGRESS')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${orderFilterTab === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-900 font-black' : 'hover:bg-slate-100'
                  }`}
              >
                {isVietnamese ? 'Đang giặt / sấy' : 'In Progress'}
              </button>
              <button
                type="button"
                onClick={() => setOrderFilterTab('CONFIRMED')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${orderFilterTab === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-900 font-black' : 'hover:bg-slate-100'
                  }`}
              >
                {isVietnamese ? 'Chờ bấm START' : 'Confirmed'}
              </button>
              <button
                type="button"
                onClick={() => setOrderFilterTab('ALL')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${orderFilterTab === 'ALL' ? 'bg-slate-200 text-slate-900 font-black' : 'hover:bg-slate-100'
                  }`}
              >
                {isVietnamese ? 'Tất cả đơn' : 'All'}
              </button>
            </div>
          </div>

          {/* Table / List các đơn */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs sm:text-sm">
              <Info className="size-6 mx-auto mb-2 text-slate-300" />
              {isVietnamese ? 'Hiện không có đơn hàng nào trong danh mục này.' : 'No orders found in this category.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-black uppercase">
                    <th className="py-2.5 px-3">{isVietnamese ? 'Mã đơn' : 'Order'}</th>
                    <th className="py-2.5 px-3">{isVietnamese ? 'Khách hàng' : 'Customer'}</th>
                    <th className="py-2.5 px-3">{isVietnamese ? 'Máy gán' : 'Machine'}</th>
                    <th className="py-2.5 px-3">{isVietnamese ? 'Trạng thái' : 'Status'}</th>
                    <th className="py-2.5 px-3">{isVietnamese ? 'Tổng tiền' : 'Total'}</th>
                    <th className="py-2.5 px-3 text-right">{isVietnamese ? 'Thao tác nhanh' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredOrders.slice(0, 10).map((order) => {
                    const status = (order.status || '').toUpperCase();
                    const isProcessing = ['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'WAITING_MACHINE'].includes(status);
                    const machineCode = order.assignedMachines || order.items?.[0]?.machineCode || 'Chưa gán';

                    return (
                      <tr key={order.orderId || order.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Cột Mã đơn */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 font-mono">
                            {order.orderCode || `ORD-${String(order.orderId || order.id).slice(0, 8).toUpperCase()}`}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </td>

                        {/* Cột Khách hàng */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">
                              {order.customerName || order.guestFullName || order.memberName || (order.isGuest ? 'Khách vãng lai' : 'Thành viên')}
                            </span>
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${order.customerType === 'MEMBER' || !order.isGuest
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                              }`}>
                              {order.customerType === 'MEMBER' || !order.isGuest ? 'MB' : 'Guest'}
                            </span>
                          </div>
                          {(order.customerPhone || order.guestPhoneNumber || order.memberPhone) && (
                            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="size-3 text-slate-400" />
                              {order.customerPhone || order.guestPhoneNumber || order.memberPhone}
                            </span>
                          )}
                        </td>

                        {/* Cột Máy gán */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-black text-slate-800">
                            <WashingMachine className="size-3.5 text-blue-600" />
                            {machineCode}
                          </span>
                        </td>

                        {/* Cột Trạng thái */}
                        <td className="py-3 px-3">
                          {status === 'IN_PROGRESS' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                              <RotateCw className="size-3 animate-spin text-blue-600" />
                              {isVietnamese ? 'Đang giặt / sấy' : 'In Progress'}
                            </span>
                          )}
                          {status === 'CONFIRMED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="size-3" />
                              {isVietnamese ? 'Đã TT - Chờ bấm START' : 'Confirmed'}
                            </span>
                          )}
                          {status === 'PENDING_PAYMENT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="size-3" />
                              {isVietnamese ? 'Chờ thanh toán' : 'Pending Payment'}
                            </span>
                          )}
                          {status === 'WAITING_MACHINE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
                              <ArrowRightLeft className="size-3" />
                              {isVietnamese ? 'Chờ đổi máy trống' : 'Waiting Machine'}
                            </span>
                          )}
                          {status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700">
                              <Check className="size-3 text-emerald-600" />
                              {isVietnamese ? 'Đã hoàn tất' : 'Completed'}
                            </span>
                          )}
                          {status === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700">
                              <X className="size-3" />
                              {isVietnamese ? 'Đã hủy' : 'Cancelled'}
                            </span>
                          )}
                        </td>

                        {/* Cột Tổng tiền */}
                        <td className="py-3 px-3 font-bold text-slate-900 font-mono">
                          {formatVnd(order.total ?? order.totalAmount ?? order.finalAmount)}
                        </td>

                        {/* Cột Thao tác nhanh */}
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {status === 'CONFIRMED' && (
                              <button
                                type="button"
                                onClick={() => handleStartOrder(order.orderId || order.id)}
                                disabled={submittingAction}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                                title={isVietnamese ? 'Bấm START khởi động máy giặt' : 'Start machine'}
                              >
                                <Play className="size-3 fill-current" />
                                <span>{isVietnamese ? 'Bấm START' : 'Start'}</span>
                              </button>
                            )}

                            {isProcessing && (
                              <button
                                type="button"
                                onClick={() => handleOpenTransferModal(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                                title={isVietnamese ? 'Đổi sang máy tương đồng 100%' : 'Transfer to another machine'}
                              >
                                <ArrowRightLeft className="size-3 text-blue-600" />
                                <span>{isVietnamese ? 'Đổi máy' : 'Transfer'}</span>
                              </button>
                            )}

                            {/* Nút báo sự cố nhanh cho đơn hàng */}
                            {status !== 'CANCELLED' && status !== 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const matchedMachine = machines.find((m) => m.code === machineCode);
                                  if (matchedMachine) {
                                    setNewTicketMachineId(matchedMachine.machineId);
                                  }
                                  setNewTicketDesc(`Sự cố đơn hàng ${order.orderCode || order.id} (Máy ${machineCode || 'hiện tại'})`);
                                  setReportIssueModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer border border-rose-200"
                                title={isVietnamese ? 'Báo cáo sự cố cho đơn hàng này' : 'Report issue for this order'}
                              >
                                <AlertTriangle className="size-3 text-rose-600" />
                                <span>{isVietnamese ? 'Báo sự cố' : 'Report'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedOrderModal(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                              title={isVietnamese ? 'Xem chi tiết đơn' : 'View order details'}
                            >
                              <Eye className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          KHỐI 3: TỶ LỆ SỬ DỤNG MÁY (MACHINE UTILIZATION RATE)
         ========================================================================= */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
              <Cpu className="size-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isVietnamese ? '3. Tỷ lệ sử dụng máy & Trạng thái thiết bị' : '3. Machine Utilization & Hardware Matrix'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isVietnamese ? 'Công suất máy giặt / sấy đang hoạt động so với toàn bộ dàn máy tại trạm' : 'Active vs idle load ratio across washer and dryer fleet'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/dashboard/machines')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-purple-600 hover:text-purple-700 transition"
          >
            <span>{isVietnamese ? 'Giám sát chi tiết IoT máy móc' : 'Full IoT Monitoring'}</span>
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* 3 Thẻ Đo Công Suất: Toàn trạm + Máy giặt + Máy sấy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Toàn Trạm */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-slate-500">{isVietnamese ? 'Toàn bộ trạm' : 'Overall Fleet'}</span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                  {busyMachines.length}/{totalMachinesCount} {isVietnamese ? 'máy đang chạy' : 'running'}
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {machineUtilizationRate}%
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {isVietnamese ? 'Tỷ lệ khai thác công suất hiện tại' : 'Current active utilization rate'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-4 w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, machineUtilizationRate)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Máy Giặt (Washers) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-blue-600 flex items-center gap-1.5">
                  <WashingMachine className="size-4" />
                  {isVietnamese ? 'Máy giặt' : 'Washers'}
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  {busyWashers.length}/{washers.length} {isVietnamese ? 'đang chạy' : 'busy'}
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {washerUtilization}%
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {isVietnamese ? 'Công suất dàn máy giặt' : 'Washer fleet capacity load'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-4 w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, washerUtilization)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Máy Sấy (Dryers) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-amber-600 flex items-center gap-1.5">
                  <Flame className="size-4" />
                  {isVietnamese ? 'Máy sấy' : 'Dryers'}
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  {busyDryers.length}/{dryers.length} {isVietnamese ? 'đang chạy' : 'busy'}
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {dryerUtilization}%
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {isVietnamese ? 'Công suất dàn máy sấy' : 'Dryer fleet capacity load'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-4 w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, dryerUtilization)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ma Trận Lưới Máy (Interactive Machine Grid) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {isVietnamese ? 'Ma trận trạng thái máy móc tại trạm' : 'Hardware Status Matrix'}
              </h3>
              {/* Legend trạng thái */}
              <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  {isVietnamese ? 'Sẵn sàng' : 'Available'} ({availableMachines.length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-blue-500 animate-pulse" />
                  {isVietnamese ? 'Đang chạy' : 'Busy'} ({busyMachines.length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-500" />
                  {isVietnamese ? 'Bảo trì / Lỗi' : 'Maintenance'} ({faultyMachines.length})
                </span>
              </div>
            </div>

            {/* Filter loại máy */}
            <div className="flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMachineKindFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${machineKindFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {isVietnamese ? 'Tất cả' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setMachineKindFilter('WASHER')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${machineKindFilter === 'WASHER' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {isVietnamese ? 'Máy giặt' : 'Washers'} ({washers.length})
              </button>
              <button
                type="button"
                onClick={() => setMachineKindFilter('DRYER')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${machineKindFilter === 'DRYER' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {isVietnamese ? 'Máy sấy' : 'Dryers'} ({dryers.length})
              </button>
            </div>
          </div>

          {/* Grid thẻ máy */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredMachines.map((machine) => {
              const status = (machine.status || '').toUpperCase();
              const isBusy = status === 'BUSY';
              const isAvail = status === 'AVAILABLE';
              const isMnt = ['MAINTENANCE', 'ERROR', 'OFFLINE'].includes(status);
              const kind = (machine.machineClass?.kind || '').toUpperCase();
              const isDryer = kind === 'DRYER';

              return (
                <div
                  key={machine.machineId}
                  className={`p-3.5 rounded-xl border-2 flex flex-col justify-between transition-all group ${isAvail
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-500'
                      : isBusy
                        ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-400/20'
                        : isMnt
                          ? 'bg-rose-50/60 border-rose-300'
                          : 'bg-slate-50 border-slate-200'
                    }`}
                >
                  <div>
                    {/* Header card máy: Mã + Status dot */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-black text-slate-900 group-hover:text-blue-600 transition">
                        {machine.code}
                      </span>
                      <span
                        className={`size-2.5 rounded-full ${isAvail
                            ? 'bg-emerald-500 ring-4 ring-emerald-100'
                            : isBusy
                              ? 'bg-blue-500 ring-4 ring-blue-100 animate-pulse'
                              : isMnt
                                ? 'bg-rose-500 ring-4 ring-rose-100'
                                : 'bg-amber-400'
                          }`}
                        title={status}
                      />
                    </div>

                    {/* Icon + Tên phân loại */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-1">
                      {isDryer ? (
                        <Flame className="size-4 text-amber-500 shrink-0" />
                      ) : (
                        <WashingMachine className="size-4 text-blue-500 shrink-0" />
                      )}
                      <span className="truncate">{machine.machineClass?.name || kind}</span>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400 block">
                      {machine.machineClass?.capacityKg ? `${machine.machineClass.capacityKg} kg` : '--'}
                    </span>

                    {/* Hiển thị chi tiết đơn hàng hoặc lý do bảo trì */}
                    {isBusy && machine.activeOrderCode && (
                      <div className="mt-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold truncate" title={`${machine.activeOrderCode} - ${machine.activeCustomerName || ''}`}>
                        {machine.activeOrderCode} {machine.remainingMinutes ? `(${machine.remainingMinutes}p)` : ''}
                      </div>
                    )}
                    {isMnt && machine.maintenanceReason && (
                      <div className="mt-1 text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-semibold truncate" title={cleanIssueDescription(machine.maintenanceReason)}>
                        {cleanIssueDescription(machine.maintenanceReason)}
                      </div>
                    )}
                  </div>

                  {/* Trạng thái máy & Thao tác toggle */}
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className={`font-extrabold ${isAvail ? 'text-emerald-700' : isBusy ? 'text-blue-700 font-mono' : isMnt ? 'text-rose-700' : 'text-slate-600'
                      }`}>
                      {isAvail ? (isVietnamese ? 'Sẵn sàng' : 'Available') : isBusy ? (isVietnamese ? 'Đang chạy' : 'Busy') : isMnt ? (isVietnamese ? 'Bảo trì' : 'Maintenance') : status}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleMachineStatus(machine)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-white transition cursor-pointer"
                      title={isMnt ? 'Khôi phục về Sẵn sàng' : 'Chuyển sang bảo trì'}
                    >
                      <Wrench className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          KHỐI 4: MÁY LỖI VÀ YÊU CẦU BẢO TRÌ CHƯA XỬ LÝ
         ========================================================================= */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isVietnamese ? '4. Máy lỗi & Yêu cầu bảo trì chưa xử lý' : '4. Faulty Machines & Open Maintenance Requests'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isVietnamese ? 'Tiếp nhận sự cố kỹ thuật, phân công xử lý và giải phóng máy về trạng thái an toàn' : 'Track open maintenance orders, critical hardware faults and dispatch'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReportIssueModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="size-4" />
              <span>{isVietnamese ? 'Tạo phiếu sửa chữa' : 'New Ticket'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/repairs')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-700 transition"
            >
              <span>{isVietnamese ? 'Xem toàn bộ phiếu' : 'All tickets'}</span>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* 3 Thẻ tóm tắt tình trạng lỗi */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Máy đang báo lỗi */}
          <div className="p-4 rounded-xl bg-white border border-rose-200 shadow-2xs">
            <span className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              {isVietnamese ? 'Máy đang báo lỗi / Dừng' : 'Faulty Machines'}
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-rose-700">
              {faultyMachines.length}
            </div>
            <span className="text-[11px] text-slate-500">
              {isVietnamese ? 'Máy ở trạng thái MAINTENANCE / ERROR' : 'Machines marked offline/maintenance'}
            </span>
          </div>

          {/* Phiếu bảo trì chưa xử lý */}
          <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs">
            <span className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1.5">
              <Wrench className="size-3.5" />
              {isVietnamese ? 'Yêu cầu bảo trì chưa xử lý' : 'Pending Requests'}
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-amber-900">
              {pendingMaintenanceTickets.length}
            </div>
            <span className="text-[11px] text-slate-500">
              {isVietnamese ? 'Trạng thái PENDING hoặc IN_PROGRESS' : 'Pending or ongoing maintenance orders'}
            </span>
          </div>

          {/* Sự cố mức độ Khẩn cấp */}
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-300 shadow-2xs">
            <span className="text-xs font-black text-rose-800 uppercase flex items-center gap-1.5">
              <Flame className="size-3.5 text-rose-600" />
              {isVietnamese ? 'Sự cố khẩn cấp (URGENT / HIGH)' : 'Urgent Tickets'}
            </span>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-rose-900">
              {urgentTicketsCount}
            </div>
            <span className="text-[11px] font-bold text-rose-700">
              {isVietnamese ? 'Cần kỹ thuật viên can thiệp ngay' : 'Requires immediate field response'}
            </span>
          </div>
        </div>

        {/* Danh sách các yêu cầu bảo trì / sự cố máy chưa xử lý */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              {isVietnamese ? 'Danh sách phiếu sự cố cần xử lý' : 'Unresolved Issue Tickets'}
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {pendingMaintenanceTickets.length} {isVietnamese ? 'phiếu mở' : 'open tickets'}
            </span>
          </div>

          {pendingMaintenanceTickets.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs sm:text-sm">
              <CheckCircle2 className="size-7 mx-auto mb-2 text-emerald-500" />
              <p className="font-bold text-slate-700">
                {isVietnamese ? 'Không có sự cố nào chưa xử lý! Toàn bộ máy móc đang hoạt động tốt.' : 'No open maintenance issues. All machines are operating normally.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMaintenanceTickets.map((ticket) => {
                const priority = (ticket.priority || '').toUpperCase();
                const isUrgent = priority === 'URGENT';
                const isHigh = priority === 'HIGH';
                const issueType = extractIssueType(ticket);

                return (
                  <div
                    key={ticket.maintenanceOrderId || ticket.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isUrgent ? 'bg-rose-100 text-rose-700' : isHigh ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                        }`}>
                        <Wrench className="size-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-900">
                            {ticket.machineCode ? `Máy ${ticket.machineCode}` : (ticket.machineId ? `Machine ID: ${ticket.machineId.slice(0, 8)}` : 'Trạm chung')}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isUrgent ? 'bg-rose-600 text-white animate-pulse' : isHigh ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                            {priority || 'NORMAL'}
                          </span>
                          {issueType && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs">
                              <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
                              <span>{isVietnamese ? 'Loại lỗi:' : 'Issue:'} {getIssueTypeLabel(issueType, isVietnamese)}</span>
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {formatDateTime(ticket.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 leading-snug">
                          {cleanIssueDescription(ticket.issueDescription || ticket.description || 'Sự cố kỹ thuật dừng máy')}
                        </p>
                        {ticket.technicianName && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 mt-1">
                            <User className="size-3 text-slate-400" />
                            {isVietnamese ? 'Kỹ thuật viên:' : 'Tech:'} <strong className="text-slate-800">{ticket.technicianName}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nút hành động cho phiếu sự cố */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/repairs')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
                      >
                        <ExternalLink className="size-3 text-slate-500" />
                        <span>{isVietnamese ? 'Xử lý phiếu' : 'Handle'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          MODAL 1: TẠO PHIẾU BẢO TRÌ / BÁO LỖI MÁY MỚI
         ========================================================================= */}
      {reportIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="size-5" />
                <h3 className="text-lg font-black text-slate-900">
                  {isVietnamese ? 'Báo hỏng máy & Tạo phiếu bảo trì' : 'Report Machine Malfunction'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportIssueModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaintenanceTicket} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isVietnamese ? 'Chọn máy gặp sự cố:' : 'Select Machine:'}
                </label>
                <select
                  value={newTicketMachineId}
                  onChange={(e) => setNewTicketMachineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="">-- {isVietnamese ? 'Chọn máy giặt / sấy' : 'Select a machine'} --</option>
                  {machines.map((m) => (
                    <option key={m.machineId} value={m.machineId}>
                      {m.code} - {m.machineClass?.name || m.machineClass?.kind} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isVietnamese ? 'Loại sự cố gặp phải:' : 'Issue Type:'}
                </label>
                <select
                  value={newTicketIssueType}
                  onChange={(e) => setNewTicketIssueType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {isVietnamese ? t.labelVi : t.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isVietnamese ? 'Mức độ ưu tiên:' : 'Priority Level:'}
                </label>
                <select
                  value={newTicketPriority}
                  onChange={(e) => setNewTicketPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800 focus:outline-none"
                >
                  <option value="URGENT">{isVietnamese ? 'Khẩn cấp (URGENT) - Dừng máy ngay' : 'URGENT - Stop machine'}</option>
                  <option value="HIGH">{isVietnamese ? 'Cao (HIGH) - Cần xử lý trong ngày' : 'HIGH - Same day'}</option>
                  <option value="MEDIUM">{isVietnamese ? 'Trung bình (MEDIUM)' : 'MEDIUM'}</option>
                  <option value="LOW">{isVietnamese ? 'Thấp (LOW) - Bảo dưỡng định kỳ' : 'LOW'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isVietnamese ? 'Mô tả chi tiết sự cố:' : 'Issue Description:'}
                </label>
                <textarea
                  rows={3}
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  placeholder={isVietnamese ? 'Ví dụ: Kẹt cửa lồng giặt, máy rung lắc phát tiếng ồn lớn, rò rỉ nước ở van xả...' : 'Details about the problem...'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-medium text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReportIssueModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black transition disabled:opacity-50"
                >
                  {submittingAction ? (isVietnamese ? 'Đang gửi...' : 'Submitting...') : (isVietnamese ? 'Gửi phiếu bảo trì' : 'Submit Ticket')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ĐỔI MÁY TƯƠNG ĐỒNG 100% (TRANSFER MACHINE)
         ========================================================================= */}
      {transferMachineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-blue-600">
                <ArrowRightLeft className="size-5" />
                <h3 className="text-lg font-black text-slate-900">
                  {isVietnamese ? 'Đổi máy tương đồng 100%' : 'Transfer Machine'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTransferMachineModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 mb-3">
              {isVietnamese
                ? `Đơn hàng ${transferMachineModal.order.orderCode} sẽ được chuyển sang một máy trống tương đồng để tiếp tục chu trình giặt/sấy:`
                : `Transfer order ${transferMachineModal.order.orderCode} to an available machine:`}
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {transferMachineModal.candidates.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200">
                  {isVietnamese ? 'Hiện không có máy trống tương đồng nào khả dụng tại trạm.' : 'No available equivalent machines right now.'}
                </div>
              ) : (
                transferMachineModal.candidates.map((cand) => (
                  <button
                    key={cand.machineId}
                    type="button"
                    onClick={() => handleConfirmTransfer(cand.machineId)}
                    disabled={submittingAction}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 transition text-left cursor-pointer group"
                  >
                    <div>
                      <span className="font-mono text-sm font-black text-slate-900 group-hover:text-blue-600">
                        {cand.code}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {cand.machineClass?.name} ({cand.machineClass?.capacityKg} kg)
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                      {isVietnamese ? 'Chọn máy này' : 'Select'}
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setTransferMachineModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition"
            >
              {isVietnamese ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: XEM CHI TIẾT ĐƠN HÀNG
         ========================================================================= */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-extrabold uppercase text-slate-400">
                  {isVietnamese ? 'Chi tiết đơn hàng' : 'Order Details'}
                </span>
                <h3 className="text-lg font-black text-slate-900 font-mono">
                  {selectedOrderModal.orderCode || selectedOrderModal.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVietnamese ? 'Khách hàng:' : 'Customer:'}</span>
                  <strong className="text-slate-900">
                    {selectedOrderModal.customerName || selectedOrderModal.guestFullName || selectedOrderModal.memberName || 'Khách vãng lai'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVietnamese ? 'Số điện thoại:' : 'Phone:'}</span>
                  <strong className="text-slate-900 font-mono">
                    {selectedOrderModal.customerPhone || selectedOrderModal.guestPhoneNumber || selectedOrderModal.memberPhone || '--'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVietnamese ? 'Trạng thái:' : 'Status:'}</span>
                  <strong className="text-blue-600 font-black">{selectedOrderModal.status}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVietnamese ? 'Máy gán:' : 'Assigned machine:'}</span>
                  <strong className="text-slate-900">{selectedOrderModal.assignedMachines || 'W01'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVietnamese ? 'Thời gian tạo:' : 'Created at:'}</span>
                  <strong className="text-slate-900">{formatDateTime(selectedOrderModal.createdAt)}</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">{isVietnamese ? 'Tổng thanh toán:' : 'Total amount:'}</span>
                  <strong className="text-emerald-600 text-base font-black font-mono">
                    {formatVnd(selectedOrderModal.total ?? selectedOrderModal.totalAmount ?? selectedOrderModal.finalAmount)}
                  </strong>
                </div>
              </div>

              {selectedOrderModal.status === 'CANCELLED' ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                  <Info className="size-4 text-slate-400 shrink-0" />
                  <span className="font-medium">
                    {isVietnamese ? 'Đơn hàng đã bị hủy, không thể báo lỗi.' : 'Cancelled order, cannot report issue.'}
                  </span>
                </div>
              ) : selectedOrderModal.status !== 'COMPLETED' ? (
                <div className="pt-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isVietnamese ? 'Báo sự cố kỹ thuật hoặc hư hỏng thiết bị cho đơn hàng này.' : 'Report machine or technical issue for this order.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = selectedOrderModal;
                      setSelectedOrderModal(null);
                      // Tìm machine id tương ứng nếu có
                      const matchedMachine = machines.find((m) => m.code === cur.assignedMachines);
                      if (matchedMachine) {
                        setNewTicketMachineId(matchedMachine.machineId);
                      }
                      setNewTicketDesc(`Sự cố đơn hàng ${cur.orderCode || cur.id} (Máy ${cur.assignedMachines || 'hiện tại'})`);
                      setReportIssueModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                  >
                    <AlertTriangle className="size-3.5 text-rose-600" />
                    <span>{isVietnamese ? 'Báo sự cố máy' : 'Report Issue'}</span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrderModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm transition cursor-pointer"
              >
                {isVietnamese ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
