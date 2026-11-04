import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ordersApi } from '../api/ordersApi';
import { machinesApi } from '../api/machinesApi';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { extractIssueType } from './RepairsPage';
import {
  WashingMachine,
  History,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Wrench,
  Lock,
  Play,
  RotateCw,
  Search,
  Phone,
  User,
  MapPin,
  Tag,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Receipt,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  Send,
  SlidersHorizontal,
  Flame,
  Layers,
  CreditCard,
  Coins,
  Package,
  Calendar,
} from 'lucide-react';

// Helper định dạng giờ phút
function formatHourMinuteVi(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = d.getMinutes();
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${h}h${mStr}`;
}

// Helper tính toán tiến độ giặt thực tế
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
  const endMs = !isNaN(rawEnd) ? rawEnd : startMs + (order.durationMinutes || 45) * 60 * 1000;
  const totalMs = Math.max(1000, endMs - startMs);
  const elapsedMs = Math.max(0, currentTimestamp - startMs);
  const remainingMs = Math.max(0, endMs - currentTimestamp);

  const ratio = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 0;
  const calculatedPercent = Math.round(ratio * 100);
  // Khi đơn đang giặt (IN_PROGRESS), giới hạn 1% -> 99% để hiển thị tiến trình đang chạy theo thời gian thực
  const progressPercent = Math.min(99, Math.max(1, calculatedPercent));
  const timeRemainingMinutes = Math.ceil(remainingMs / (60 * 1000));

  return {
    progressPercent: isNaN(progressPercent) ? 1 : progressPercent,
    timeRemainingMinutes: isNaN(timeRemainingMinutes) ? 0 : timeRemainingMinutes,
    isFinished: remainingMs === 0
  };
}

// Map tên sự cố sang tiếng Việt
const ISSUE_TYPES = [
  { value: 'MACHINE_STOPPED', labelVi: 'Máy dừng đột ngột / Mất nguồn điện', labelEn: 'Machine Stopped / Power Failure' },
  { value: 'DOOR_LOCKED', labelVi: 'Kẹt cửa máy / Không mở được lồng', labelEn: 'Door Locked / Cannot Open' },
  { value: 'WATER_LEAK', labelVi: 'Rò rỉ nước / Thoát nước chậm', labelEn: 'Water Leak / Slow Drainage' },
  { value: 'NOISE_OR_SMOKE', labelVi: 'Tiếng ồn bất thường / Mùi khét', labelEn: 'Abnormal Noise / Smoke' },
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


// Chuẩn hóa Order từ Backend API cho Site Manager (kèm bản đồ trạng thái máy thực tế & danh sách sự cố)
function normalizeSiteOrder(o, isVietnamese = true, machinesMap = null, issuesMap = null) {
  const rawStatus = (o.status || '').toUpperCase().trim();
  const rawTransfer = o.machineTransferInfo || o.items?.[0]?.machineTransferInfo || null;
  const isWaitingMachine = rawStatus === 'WAITING_MACHINE' || Boolean(rawTransfer?.isWaitingForMachine);
  const isProgress = rawStatus === 'IN_PROGRESS';
  const isConfirmed = rawStatus === 'CONFIRMED';
  const isCompleted = rawStatus === 'COMPLETED';
  const isCancelled = rawStatus === 'CANCELLED';
  const isRefunded = rawStatus === 'REFUNDED';
  const isPending = rawStatus === 'PENDING_PAYMENT';

  const originalMachineCode = o.items?.[0]?.machineCode || o.assignedMachines || o.machineCode || '';
  let activeMachineCode = originalMachineCode;
  if (rawTransfer?.transferredToMachineCode) {
    activeMachineCode = rawTransfer.transferredToMachineCode;
  }

  // Tra cứu thực thể máy thực tế tại trạm để lấy trạng thái mới nhất từ database
  const machineEntity = machinesMap && activeMachineCode
    ? (machinesMap.get(activeMachineCode.toUpperCase()) || machinesMap.get(String(o.activeMachineId || o.items?.[0]?.machineId)))
    : null;

  // Trạng thái máy giặt (AVAILABLE, BUSY, MAINTENANCE, ERROR, HELD)
  let rawMachineStatus = (
    machineEntity?.status ||
    o.machineStatus ||
    o.items?.[0]?.machineStatus ||
    (rawTransfer?.failedMachineStatus && !rawTransfer?.transferredToMachineCode ? rawTransfer.failedMachineStatus : '') ||
    ''
  ).toUpperCase().trim();

  // Yêu cầu hệ thống: HELD coi là ĐANG BẬN (BUSY)
  if (rawMachineStatus === 'HELD') {
    rawMachineStatus = 'BUSY';
  }

  const isMachineMaintenance =
    rawMachineStatus === 'MAINTENANCE' ||
    rawMachineStatus === 'ERROR' ||
    rawMachineStatus === 'OFFLINE' ||
    Boolean(rawTransfer?.hasMachineIssue && !rawTransfer?.transferredToMachineCode);

  // Phân loại thiết bị (WASHER / DRYER)
  const rawKind = o.machineKind || o.items?.[0]?.machineClassKind || '';
  const inferredKind = rawKind
    ? rawKind.toUpperCase()
    : (activeMachineCode.toUpperCase().startsWith('D') ? 'DRYER' : 'WASHER');
  const machineKind = inferredKind;

  const machineLabel = machineKind === 'DRYER'
    ? (isVietnamese ? 'Máy sấy' : 'Dryer')
    : (isVietnamese ? 'Máy giặt' : 'Washer');

  const machineName =
    o.machineName ||
    (activeMachineCode
      ? `${activeMachineCode} (${machineLabel})`
      : machineLabel);

  const defaultService = machineKind === 'DRYER'
    ? (isVietnamese ? 'Sấy tiêu chuẩn 45p' : 'Standard Dry 45m')
    : (isVietnamese ? 'Giặt tiêu chuẩn 35p' : 'Standard Wash 35m');

  const serviceName =
    o.serviceName ||
    o.items?.[0]?.offeringName ||
    defaultService;

  const washStartedEvent = (o.events || []).find((e) => e.eventType === 'WASH_STARTED');
  let startTime = null;

  if (o.washStartedAt) {
    startTime = new Date(o.washStartedAt);
  } else if (washStartedEvent?.createdAt) {
    startTime = new Date(washStartedEvent.createdAt);
  } else {
    const orderKey = o.orderId || o.id;
    const savedStart =
      (orderKey ? localStorage.getItem(`order_started_at_${orderKey}`) : null) ||
      (o.orderCode ? localStorage.getItem(`order_started_at_${o.orderCode}`) : null);

    if (savedStart) {
      startTime = new Date(savedStart);
    } else if (isProgress) {
      startTime = o.updatedAt ? new Date(o.updatedAt) : (o.createdAt ? new Date(o.createdAt) : new Date());
      if (orderKey) {
        localStorage.setItem(`order_started_at_${orderKey}`, startTime.toISOString());
      }
    } else {
      startTime = o.createdAt ? new Date(o.createdAt) : new Date();
    }
  }

  if (!startTime || isNaN(startTime.getTime())) {
    startTime = new Date();
  }

  const durationMinutes =
    o.durationMinutes ||
    o.items?.[0]?.durationMin ||
    (machineKind === 'DRYER' ? 40 : 45);

  const machineBusyUntil = o.machineBusyUntil || o.items?.[0]?.machineBusyUntil;
  let endTime = null;
  if (machineBusyUntil && new Date(machineBusyUntil).getTime() > startTime.getTime()) {
    endTime = new Date(machineBusyUntil);
  } else {
    endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  }

  // Machine Transfer Info
  let machineTransferInfo = null;
  if (rawTransfer || isWaitingMachine) {
    machineTransferInfo = {
      hasMachineIssue: Boolean(rawTransfer?.hasMachineIssue || isWaitingMachine || rawTransfer?.failedMachineCode),
      failedMachineId: rawTransfer?.failedMachineId || null,
      failedMachineCode: rawTransfer?.failedMachineCode || (isWaitingMachine ? originalMachineCode : null),
      failedMachineStatus: rawTransfer?.failedMachineStatus || 'MAINTENANCE',
      transferredToMachineId: rawTransfer?.transferredToMachineId || null,
      transferredToMachineCode: rawTransfer?.transferredToMachineCode || null,
      transferredToMachineStatus: rawTransfer?.transferredToMachineStatus || 'AVAILABLE',
      isWaitingForMachine: Boolean(rawTransfer?.isWaitingForMachine || isWaitingMachine),
      transferStatus: rawTransfer?.transferStatus || (isWaitingMachine ? 'WAITING_MACHINE' : null),
      resolutionNote: rawTransfer?.resolutionNote || rawTransfer?.note || '',
      reportedAt: rawTransfer?.reportedAt || null,
      resolvedAt: rawTransfer?.resolvedAt || null
    };
  }

  // Báo cáo sự cố máy từ issuesMap, OrderEvents hoặc fallback
  const orderId = o.orderId || o.id;
  const issues = issuesMap ? issuesMap.get(orderId) : null;
  const latestIssue = Array.isArray(issues) && issues.length > 0 ? issues[0] : null;

  const reportedIssueEvent = (o.events || []).slice().reverse().find((e) => e.eventType === 'MACHINE_MALFUNCTION_REPORTED');
  let reportedIssueData = null;

  if (latestIssue) {
    reportedIssueData = {
      issueType: latestIssue.issueType || 'MACHINE_STOPPED',
      description: latestIssue.description || '',
      contactPhone: latestIssue.contactPhone || o.customerPhone || '',
      reportedAt: latestIssue.reportedAt || o.createdAt,
      machineCode: latestIssue.machineCode || activeMachineCode
    };
  } else if (reportedIssueEvent) {
    try {
      const parsed = typeof reportedIssueEvent.data === 'string' ? JSON.parse(reportedIssueEvent.data) : (reportedIssueEvent.data || {});
      reportedIssueData = {
        issueType: parsed.issueType || 'MACHINE_STOPPED',
        description: parsed.description || '',
        contactPhone: parsed.contactPhone || o.customerPhone || '',
        reportedAt: reportedIssueEvent.createdAt,
        machineCode: parsed.machineCode || activeMachineCode
      };
    } catch {
      reportedIssueData = {
        issueType: 'MACHINE_STOPPED',
        description: 'Sự cố máy giặt/sấy',
        contactPhone: o.customerPhone || '',
        reportedAt: reportedIssueEvent.createdAt,
        machineCode: activeMachineCode
      };
    }
  } else if (machineTransferInfo?.hasMachineIssue || isMachineMaintenance) {
    const fallbackDesc = machineTransferInfo?.resolutionNote || machineTransferInfo?.note || '';
    const inferredType = extractIssueType(fallbackDesc) || 'MACHINE_STOPPED';
    reportedIssueData = {
      issueType: inferredType,
      description: fallbackDesc || (isVietnamese ? 'Thiết bị gặp sự cố kỹ thuật' : 'Machine technical malfunction'),
      contactPhone: o.customerPhone || '',
      reportedAt: machineTransferInfo?.reportedAt || o.createdAt,
      machineCode: activeMachineCode
    };
  }

  const hasReportedIssue = Boolean(reportedIssueData || isMachineMaintenance || machineTransferInfo?.hasMachineIssue);

  // Chuẩn hóa đúng số tiền thực tế từ Backend API (total, subtotal, discountTotal)
  const totalAmount = Number(o.total ?? o.Total ?? o.totalAmount ?? o.finalAmount ?? 0);
  const subtotal = Number(o.subtotal ?? o.Subtotal ?? totalAmount);
  const discountTotal = Number(o.discountTotal ?? o.DiscountTotal ?? 0);
  const pointsEarned = Number(o.pointsEarned ?? o.PointsEarned ?? 0);

  return {
    id: o.orderId || o.id,
    orderId: o.orderId || o.id,
    orderCode: o.orderCode || `ORD-${String(o.orderId || o.id).slice(0, 8).toUpperCase()}`,
    status: isWaitingMachine ? 'WAITING_MACHINE' : rawStatus,
    isWaitingForMachine: isWaitingMachine,
    customerType: o.customerType || (o.isGuest ? 'GUEST' : 'MEMBER'),
    customerName: o.customerName || o.guestFullName || o.guestName || o.memberName || (o.customerType === 'GUEST' || o.isGuest ? (isVietnamese ? 'Khách vãng lai' : 'Walk-in Guest') : (isVietnamese ? 'Thành viên' : 'Member')),
    customerPhone: o.customerPhone || o.guestPhoneNumber || o.guestPhone || o.memberPhone || '',
    serviceName,
    machineName,
    activeMachineCode,
    activeMachineId: machineEntity?.machineId || machineEntity?.id || rawTransfer?.transferredToMachineId || o.activeMachineId || o.items?.[0]?.machineId,
    originalMachineCode,
    machineKind: machineEntity?.machineClass?.kind || machineKind,
    machineStatus: rawMachineStatus || (isProgress ? 'BUSY' : isConfirmed ? 'BUSY' : 'AVAILABLE'),
    isMachineMaintenance,
    hasReportedIssue,
    reportedIssueData,
    machineClassId: machineEntity?.machineClassId || machineEntity?.machineClass?.machineClassId || o.machineClassId || o.items?.[0]?.machineClassId,
    siteId: o.siteId || o.items?.[0]?.siteId || null,
    siteName: o.siteName || o.items?.[0]?.siteName || 'Trạm Giặt Trung Tâm',
    channel: o.channel || 'KIOSK',
    itemsCount: o.itemsCount || o.items?.length || 1,
    items: o.items || [],
    appliedDiscounts: o.appliedDiscounts || [],
    events: o.events || [],
    paymentInfo: o.paymentInfo || null,
    totalAmount,
    total: totalAmount,
    subtotal,
    discountTotal,
    pointsEarned,
    startTime,
    endTime,
    durationMinutes,
    createdAt: o.createdAt || new Date().toISOString(),
    completedAt: o.completedAt || null,
    machineTransferInfo,
    rawOrder: o
  };
}

export default function SiteManagerOrdersPage() {
  const { t, isVietnamese } = useLanguage();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL'); // ALL | WAITING_MACHINE | CONFIRMED | IN_PROGRESS | COMPLETED | MAINTENANCE
  const [kindFilter, setKindFilter] = useState('ALL'); // ALL | WASHER | DRYER
  const [machineStatusFilter, setMachineStatusFilter] = useState('ALL'); // ALL | MAINTENANCE | BUSY | AVAILABLE
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [resolvingOrder, setResolvingOrder] = useState(null);
  const [reportingOrder, setReportingOrder] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Auto-dismiss success message after 8s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Clock tick for live countdown
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimestamp(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch orders and machines for this station
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      setError(null);
      // Site Manager fetches all orders of station alongside real machine status
      const [ordersRes, machinesRes] = await Promise.all([
        ordersApi.getAllOrders(),
        machinesApi.getMachines().catch(() => []),
      ]);
      const rawList = Array.isArray(ordersRes) ? ordersRes : ordersRes?.items || ordersRes?.data || [];
      const mList = Array.isArray(machinesRes) ? machinesRes : machinesRes?.items || [];

      // Lấy song song danh sách sự cố đã báo cho các đơn hàng active hoặc có sự cố
      const activeOrIssueOrders = rawList.filter((o) =>
        ['WAITING_MACHINE', 'CONFIRMED', 'IN_PROGRESS'].includes((o.status || '').toUpperCase()) ||
        o.machineTransferInfo?.hasMachineIssue ||
        mList.some((m) => (m.code === o.assignedMachines || m.machineId === o.items?.[0]?.machineId) && m.status === 'MAINTENANCE')
      );

      const issuesMap = new Map();
      if (activeOrIssueOrders.length > 0) {
        const issuesResults = await Promise.all(
          activeOrIssueOrders.map((o) =>
            ordersApi.getOrderIssues(o.orderId || o.id).catch(() => [])
          )
        );
        activeOrIssueOrders.forEach((o, idx) => {
          const res = issuesResults[idx];
          const list = Array.isArray(res) ? res : res?.items || [];
          if (list.length > 0) {
            issuesMap.set(o.orderId || o.id, list);
          }
        });
      }

      const machinesMap = new Map();
      mList.forEach((m) => {
        if (m.code) machinesMap.set(m.code.toUpperCase(), m);
        if (m.machineId) machinesMap.set(String(m.machineId), m);
        if (m.id) machinesMap.set(String(m.id), m);
      });

      const normalized = rawList.map((item) => normalizeSiteOrder(item, isVietnamese, machinesMap, issuesMap));
      setOrders(normalized);
    } catch (err) {
      console.error('Failed to load station orders:', err);
      if (!isSilent) {
        setError(isVietnamese ? 'Không thể tải danh sách đơn hàng của trạm.' : 'Failed to load station orders.');
      }
    } finally {
      setLoading(false);
      if (!isSilent) setRefreshing(false);
    }
  }, [isVietnamese]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Polling every 3.5s when there are active/waiting orders
  useEffect(() => {
    const hasActiveOrders = orders.some((o) =>
      ['WAITING_MACHINE', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status)
    );
    if (!hasActiveOrders) return;

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [orders, fetchOrders]);

  // Statistics KPI
  const stats = useMemo(() => {
    const total = orders.length;
    const waitingMachine = orders.filter((o) => o.status === 'WAITING_MACHINE').length;
    const confirmed = orders.filter((o) => o.status === 'CONFIRMED').length;
    const inProgress = orders.filter((o) => o.status === 'IN_PROGRESS').length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    const maintenance = orders.filter((o) => o.isMachineMaintenance).length;
    return { total, waitingMachine, confirmed, inProgress, completed, maintenance };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab === 'WAITING_MACHINE' && o.status !== 'WAITING_MACHINE') return false;
      if (activeTab === 'CONFIRMED' && o.status !== 'CONFIRMED') return false;
      if (activeTab === 'IN_PROGRESS' && o.status !== 'IN_PROGRESS') return false;
      if (activeTab === 'COMPLETED' && o.status !== 'COMPLETED') return false;
      if (activeTab === 'MAINTENANCE' && !o.isMachineMaintenance) return false;

      // Kind filter
      if (kindFilter !== 'ALL' && o.machineKind !== kindFilter) return false;

      // Machine Status filter
      if (machineStatusFilter !== 'ALL') {
        if (machineStatusFilter === 'MAINTENANCE' && !o.isMachineMaintenance) return false;
        if (machineStatusFilter === 'BUSY' && o.machineStatus !== 'BUSY') return false;
        if (machineStatusFilter === 'AVAILABLE' && (o.machineStatus !== 'AVAILABLE' || o.isMachineMaintenance)) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (o.orderCode || '').toLowerCase();
        const mCode = (o.activeMachineCode || '').toLowerCase();
        const cName = (o.customerName || '').toLowerCase();
        const cPhone = (o.customerPhone || '').toLowerCase();
        if (!code.includes(q) && !mCode.includes(q) && !cName.includes(q) && !cPhone.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, kindFilter, machineStatusFilter, searchQuery]);


  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {isVietnamese ? 'Quản Lý Đơn Giặt Trạm' : 'Station Orders Management'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isVietnamese
                  ? 'Bảng điều phối vận hành dành riêng cho Quản lý trạm (Site Manager)'
                  : 'Operational dispatch board dedicated to Site Managers'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchOrders(false)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isVietnamese ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Toast thông báo từ BE gửi về cho FE */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500 text-slate-800 dark:text-slate-100 shadow-2xl flex items-start gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-black text-emerald-700 dark:text-emerald-400 text-sm mb-1">
              {isVietnamese ? 'Thông Báo Từ Hệ Thống' : 'System Notification'}
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {successMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition text-base font-bold shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
            {isVietnamese ? 'Tổng đơn hôm nay' : 'Total Orders'}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.total}</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Waiting Machine (Pulsing Amber) */}
        <div
          onClick={() => setActiveTab('WAITING_MACHINE')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${activeTab === 'WAITING_MACHINE'
            ? 'ring-2 ring-amber-500 border-amber-300 bg-amber-50/50 dark:bg-amber-950/30'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-300'
            }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              {isVietnamese ? 'Chờ máy tương đồng' : 'Waiting Machine'}
            </span>
            {stats.waitingMachine > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {stats.waitingMachine}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Confirmed - Ready to start */}
        <div
          onClick={() => setActiveTab('CONFIRMED')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${activeTab === 'CONFIRMED'
            ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/50 dark:bg-blue-950/30'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
            }`}
        >
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 block mb-1">
            {isVietnamese ? 'Chờ bấm Bắt đầu' : 'Ready to Start'}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{stats.confirmed}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center">
              <Play className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${activeTab === 'IN_PROGRESS'
            ? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300'
            }`}
        >
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 block mb-1">
            {isVietnamese ? 'Đang giặt / sấy' : 'In Progress'}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {stats.inProgress}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center">
              <WashingMachine className="w-4 h-4 animate-spin" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs col-span-2 sm:col-span-1 ${activeTab === 'COMPLETED'
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
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'ALL', labelVi: 'Tất cả', labelEn: 'All' },
            { key: 'WAITING_MACHINE', labelVi: '⚠️ Chờ máy tương đồng', labelEn: '⚠️ Waiting Machine' },
            { key: 'CONFIRMED', labelVi: '⏳ Chờ Start', labelEn: '⏳ Ready' },
            { key: 'IN_PROGRESS', labelVi: '🌀 Đang chạy', labelEn: '🌀 In Progress' },
            { key: 'COMPLETED', labelVi: '✅ Hoàn tất', labelEn: '✅ Completed' },
            { key: 'MAINTENANCE', labelVi: `🛠️ Máy bảo trì (${stats.maintenance})`, labelEn: `🛠️ Maint (${stats.maintenance})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${activeTab === tab.key
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              {isVietnamese ? tab.labelVi : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Kind & Search */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Machine Kind Select */}
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border-0 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">{isVietnamese ? 'Tất cả máy' : 'All Machines'}</option>
            <option value="WASHER">{isVietnamese ? 'Máy giặt' : 'Washers'}</option>
            <option value="DRYER">{isVietnamese ? 'Máy sấy' : 'Dryers'}</option>
          </select>

          {/* Machine Status Select */}
          <select
            value={machineStatusFilter}
            onChange={(e) => setMachineStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border-0 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">{isVietnamese ? 'Trạng thái máy' : 'Status'}</option>
            <option value="MAINTENANCE">🛠️ {isVietnamese ? 'Đang bảo trì' : 'Maintenance'}</option>
            <option value="BUSY">🌀 {isVietnamese ? 'Đang chạy' : 'Busy'}</option>
            <option value="AVAILABLE">✅ {isVietnamese ? 'Sẵn sàng' : 'Available'}</option>
          </select>

          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVietnamese ? 'Mã đơn, mã máy, tên khách...' : 'Search orders, machines...'}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* 4. Orders List */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="loading-spinner w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full mx-auto animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            {isVietnamese ? 'Đang tải dữ liệu đơn giặt của trạm...' : 'Loading station orders...'}
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <WashingMachine className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {isVietnamese ? 'Không tìm thấy đơn hàng nào' : 'No orders found'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isVietnamese
              ? 'Hãy thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.'
              : 'Try changing your filter or search query.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((order) => {
            const isWaiting = order.status === 'WAITING_MACHINE';
            const isConfirmed = order.status === 'CONFIRMED';
            const isProgress = order.status === 'IN_PROGRESS';
            const isCompleted = order.status === 'COMPLETED';

            const progressInfo = isProgress ? calcOrderProgress(order, currentTimestamp) : null;
            const transfer = order.machineTransferInfo;
            const startTimeFormatted = formatHourMinuteVi(order.startTime);
            const endTimeFormatted = formatHourMinuteVi(order.endTime);

            return (
              <div
                key={order.id}
                className={`rounded-2xl border p-4 sm:p-5 transition shadow-xs space-y-3.5 ${isWaiting
                  ? 'border-amber-300/80 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/15'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
              >
                {/* 1. Header Row (Icon + Tên gói giặt + Mã máy + Subtitle & Nút hành động góc phải) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: Icon + Tên dịch vụ + Badge máy + Chi nhánh & SĐT & Giờ */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/80 shadow-xs">
                      <WashingMachine className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg leading-tight truncate">
                          {order.serviceName}
                        </h4>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold border border-blue-200/80 dark:border-blue-800">
                          <WashingMachine className="w-3.5 h-3.5" />
                          <span>
                            {isWaiting
                              ? (isVietnamese ? 'Đang chờ máy trống' : 'Waiting Machine')
                              : (order.activeMachineCode || (isVietnamese ? 'Chưa gán máy' : 'Unassigned'))}
                          </span>
                          <span className="text-[11px] font-normal opacity-80">
                            ({order.machineKind === 'DRYER' ? (isVietnamese ? 'Máy sấy' : 'Dryer') : (isVietnamese ? 'Máy giặt' : 'Washer')})
                          </span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                        <span className="truncate">{order.siteName}</span>
                        <span>•</span>
                        {order.customerPhone ? (
                          <>
                            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                              {order.customerPhone}
                            </span>
                            <span>•</span>
                          </>
                        ) : null}
                        {order.customerName ? (
                          <>
                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                              {order.customerName}
                            </span>
                            <span>•</span>
                          </>
                        ) : null}
                        <span className="font-mono">
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badge trạng thái & Nút thao tác nhanh (Quick Action Button) */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">

                    {/* Status Badge */}
                    {isWaiting ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>{isVietnamese ? 'Chờ máy trống' : 'Waiting Machine'}</span>
                      </span>
                    ) : isConfirmed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isVietnamese ? 'Chờ bấm Start' : 'Ready'}</span>
                      </span>
                    ) : isProgress ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>{isVietnamese ? 'Đang giặt' : 'Washing'}</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isVietnamese ? 'Hoàn tất' : 'Completed'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                        <span>{order.status}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Thanh tiến trình 3 bước (1. Bắt đầu giặt -> 2. Đang giặt -> 3. Hoàn tất nhận đồ) */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-center">
                  {/* Bước 1 */}
                  <div
                    className={`flex flex-col items-center gap-1 transition-colors ${isConfirmed || isProgress || isCompleted
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-400'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isProgress || isCompleted
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isConfirmed
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}
                    >
                      {isProgress || isCompleted ? '✓' : isConfirmed ? '▶' : '1'}
                    </div>
                    <span className="text-[11px] leading-tight">
                      {isVietnamese ? '1. Bắt đầu giặt' : '1. Start Wash'}
                    </span>
                  </div>

                  {/* Bước 2 */}
                  <div
                    className={`flex flex-col items-center gap-1 transition-colors ${isProgress
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : isConfirmed
                          ? 'text-slate-500 font-medium'
                          : 'text-slate-400'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isProgress
                        ? 'bg-emerald-600 text-white animate-pulse shadow-xs'
                        : isCompleted
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isConfirmed
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}
                    >
                      {isProgress ? '⚡' : isCompleted ? '✓' : '2'}
                    </div>
                    <span className="text-[11px] leading-tight">
                      {isVietnamese
                        ? order.machineKind === 'DRYER' ? '2. Đang sấy' : '2. Đang giặt'
                        : '2. Washing'}
                    </span>
                  </div>

                  {/* Bước 3 */}
                  <div
                    className={`flex flex-col items-center gap-1 transition-colors ${isCompleted
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-slate-400'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}
                    >
                      {isCompleted ? '✓' : '3'}
                    </div>
                    <span className="text-[11px] leading-tight">
                      {isVietnamese ? '3. Hoàn tất nhận đồ' : '3. Completed'}
                    </span>
                  </div>
                </div>

                {/* 3. Chi tiết diễn tiến & Thanh tiến trình dài full width */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                    <span
                      className={`flex items-center gap-1.5 ${isProgress
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isConfirmed
                          ? 'text-blue-600 dark:text-blue-400'
                          : isCompleted
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      {isProgress
                        ? isVietnamese
                          ? `Thời gian bắt đầu ${startTimeFormatted}, dự kiến xong lúc ${endTimeFormatted} (còn ~${progressInfo?.timeRemainingMinutes || 0} phút)`
                          : `Started at ${startTimeFormatted}, completion in ${endTimeFormatted} (~${progressInfo?.timeRemainingMinutes || 0}m left)`
                        : isConfirmed
                          ? isVietnamese
                            ? 'Máy đã sẵn sàng giữ chỗ. Nhấn nút "Bắt đầu giặt ngay" để khởi động máy!'
                            : 'Machine reserved. Press "Start Wash" to run machine!'
                          : isCompleted
                            ? isVietnamese
                              ? `Chu trình đã hoàn tất lúc ${endTimeFormatted || new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                              : 'Cycle completed successfully.'
                            : isWaiting
                              ? isVietnamese
                                ? 'Đang chờ máy trống cùng loại tự động giải phóng...'
                                : 'Waiting for matching machine release...'
                              : order.status}
                    </span>
                    {(isProgress || isCompleted) && (
                      <span className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                        {isCompleted ? '100%' : `${progressInfo?.progressPercent || 0}%`}
                      </span>
                    )}
                  </div>

                  {/* Thanh Progress Bar dài tương tự như ảnh mẫu */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-linear ${isCompleted
                        ? 'bg-emerald-500 w-full'
                        : isProgress
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      style={{ width: `${isCompleted ? 100 : (progressInfo?.progressPercent || 0)}%` }}
                    />
                  </div>
                </div>

                {/* 4. CASE BANNERS (Đổi máy sự cố nếu có) */}
                {(isConfirmed || isProgress) && transfer?.transferredToMachineCode && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {isVietnamese ? 'Đã đổi sang máy tương đồng thành công!' : 'Transferred to equivalent machine!'}
                      </span>
                      <p className="text-[11.5px] text-emerald-700 dark:text-emerald-300 mt-0.5 leading-relaxed">
                        {isVietnamese ? (
                          <>
                            Máy cũ <strong className="font-mono text-rose-600">{transfer.failedMachineCode}</strong> đã
                            chuyển về bảo trì. Đơn hàng đã được chuyển sang máy tương đồng 100%{' '}
                            <strong className="font-mono text-emerald-700 bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded">
                              {transfer.transferredToMachineCode}
                            </strong>
                            . Hướng dẫn khách chuyển đồ sang máy mới và bấm <strong>Bắt đầu giặt ngay</strong> bên trên.
                          </>
                        ) : (
                          `Old machine ${transfer.failedMachineCode} in maintenance. Order moved to ${transfer.transferredToMachineCode}. Press Start above.`
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {isWaiting && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {isVietnamese ? 'Trạm đang hết máy trống tương đồng 100%' : 'Out of matching machines'}
                      </span>
                      <p className="text-[11.5px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                        {isVietnamese ? (
                          <>
                            Máy cũ <strong className="font-mono text-rose-600">{transfer?.failedMachineCode || order.originalMachineCode}</strong> gặp sự cố.
                            Toàn bộ máy cùng dịch vụ tại trạm đều đang có khách sử dụng hoặc bảo trì.
                            Hệ thống sẽ <strong>tự động gán ngay</strong> và chuyển đơn về <strong>CONFIRMED</strong> khi có máy trống hoàn tất.
                          </>
                        ) : (
                          'All matching machines at station are currently busy. Order will be auto-assigned upon release.'
                        )}
                      </p>
                    </div>
                  </div>
                )}



                {/* 5. Footer Row (Mã đơn, Thanh toán: 2.000 đ, Xem hóa đơn, Nút kỹ thuật) */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Left: Mã đơn & Loại khách & Giảm giá */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400">
                      Mã đơn:{' '}
                      <strong className="font-mono text-slate-800 dark:text-slate-200">
                        #{order.orderCode}
                      </strong>
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {order.customerType === 'GUEST' ? 'Khách vãng lai' : 'Thành viên'}
                    </span>
                    {order.discountTotal > 0 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>Ưu đãi: -{order.discountTotal.toLocaleString('vi-VN')} ₫</span>
                      </span>
                    )}
                  </div>

                  {/* Right: Thanh toán số tiền & Action Buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-slate-500 dark:text-slate-400">
                      Thanh toán:{' '}
                      <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold text-sm">
                        {order.totalAmount.toLocaleString('vi-VN')} ₫
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetail(order)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Xem chi tiết đơn và ưu đãi"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Xem chi tiết' : 'Details'}</span>
                    </button>

                    {/* Site Manager Action: Báo cáo sự cố hoặc xử lý sự cố */}
                    {order.status !== 'CANCELLED' && !isCompleted && !isWaiting && (
                      <button
                        type="button"
                        onClick={() => (order.hasReportedIssue ? setResolvingOrder(order) : setReportingOrder(order))}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                        title={isVietnamese ? (order.hasReportedIssue ? 'Xử lý giải quyết sự cố' : 'Báo cáo sự cố cho đơn hàng này') : 'Report or resolve issue'}
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        <span>{isVietnamese ? (order.hasReportedIssue ? 'Xử lý sự cố' : 'Báo cáo sự cố') : (order.hasReportedIssue ? 'Resolve' : 'Report Issue')}</span>
                      </button>
                    )}


                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: BÁO HỎNG & ĐỔI MÁY (Resolve Issue Modal) */}
      {resolvingOrder && (
        <ResolveIssueModal
          order={resolvingOrder}
          isVietnamese={isVietnamese}
          onClose={() => setResolvingOrder(null)}
          onSuccess={(msg) => {
            setResolvingOrder(null);
            if (msg) setSuccessMessage(msg);
            fetchOrders(false);
          }}
        />
      )}

      {/* 6. MODAL: BÁO CÁO SỰ CỐ MÁY (Report Issue Modal) */}
      {reportingOrder && (
        <ReportIssueModal
          order={reportingOrder}
          isVietnamese={isVietnamese}
          onClose={() => setReportingOrder(null)}
          onSuccess={(msg) => {
            setReportingOrder(null);
            if (msg) setSuccessMessage(msg);
            fetchOrders(false);
          }}
        />
      )}

      {/* 7. MODAL: CHI TIẾT ĐƠN HÀNG & LỊCH SỬ KỸ THUẬT */}
      {selectedOrderDetail && (
        <SiteOrderDetailModal
          order={selectedOrderDetail}
          isVietnamese={isVietnamese}
          onClose={() => setSelectedOrderDetail(null)}
          onOpenResolve={() => {
            const cur = selectedOrderDetail;
            setSelectedOrderDetail(null);
            setResolvingOrder(cur);
          }}
          onOpenReport={() => {
            const cur = selectedOrderDetail;
            setSelectedOrderDetail(null);
            setReportingOrder(cur);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MODAL: XỬ LÝ SỰ CỐ & GIẢI QUYẾT CHO KHÁCH HÀNG (4 PHƯƠNG ÁN)
// -------------------------------------------------------------
function ResolveIssueModal({ order, isVietnamese, onClose, onSuccess }) {
  const [issueType, setIssueType] = useState(order.reportedIssueData?.issueType || 'MACHINE_STOPPED');
  const [action, setAction] = useState('TRANSFER_MACHINE'); // TRANSFER_MACHINE | RESUME_MACHINE | COMPLETE_ORDER | REFUND_AND_CANCEL
  const [contactPhone, setContactPhone] = useState(order.customerPhone || order.reportedIssueData?.contactPhone || '');
  const [note, setNote] = useState('Máy gặp sự cố trong lúc vận hành, Site Manager hỗ trợ đổi máy tương đồng 100%.');
  const [submitting, setSubmitting] = useState(false);

  // Cập nhật mẫu ghi chú theo hành động
  const handleSelectAction = (act) => {
    setAction(act);
    if (act === 'TRANSFER_MACHINE') {
      setNote('Máy gặp sự cố trong lúc vận hành, Site Manager hỗ trợ đổi máy tương đồng 100%.');
    } else if (act === 'REFUND_AND_CANCEL') {
      setNote(
        order.customerType === 'MEMBER'
          ? 'Máy gặp sự cố không thể khắc phục tiếp, hoàn tiền 100% vào Ví Laundro của thành viên và hủy đơn.'
          : 'Máy gặp sự cố không thể khắc phục tiếp, Site Manager hoàn tiền mặt 100% tại quầy cho khách và hủy đơn.'
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Gọi DUY NHẤT 1 API: POST /api/orders/{id}/report-issue
      const selectedIssueType = issueType || order.reportedIssueData?.issueType || 'MACHINE_STOPPED';
      const cleanNote = note.trim() || getIssueTypeLabel(selectedIssueType, isVietnamese);
      const formattedDescription = cleanNote.replace(/^\s*\[Loại lỗi:[^\]]*\]\s*/i, '');

      const payload = {
        issueType: selectedIssueType,
        description: formattedDescription,
        resolutionAction: action,
        contactPhone: contactPhone.trim() || order.customerPhone || order.reportedIssueData?.contactPhone || undefined,
      };

      const res = await ordersApi.reportIssue(order.id, payload);

      // Nhận trực tiếp thông báo từ Backend gửi về cho Frontend
      const beNotification =
        res?.message ||
        res?.supportMessage ||
        (action === 'TRANSFER_MACHINE'
          ? (res?.isWaitingForMachine
            ? (isVietnamese ? 'Báo cáo sự cố thành công! Máy cũ đã chuyển bảo trì, đơn đang chờ máy tương đồng (WAITING_MACHINE).' : 'Issue reported successfully! Machine set to maintenance, order queued.')
            : (isVietnamese ? `Báo cáo sự cố thành công! Đã chuyển đơn sang máy tương đồng [${res?.transferredToMachineCode || 'mới'}].` : 'Issue reported successfully! Transferred to equivalent machine.'))
          : (isVietnamese ? 'Báo cáo sự cố thành công! Đã xử lý hủy đơn và hoàn tiền.' : 'Issue reported successfully! Order cancelled and refunded.'));

      onSuccess(beNotification);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Không thể xử lý giải quyết sự cố.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Xử Lý Đổi Máy & Sự Cố' : 'Resolve Machine Issue'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Đơn hàng: #{order.orderCode} • Máy hiện tại: {order.activeMachineCode || (isVietnamese ? 'Đang chờ máy' : 'Waiting Machine')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thông tin sự cố nếu có */}
        {order.reportedIssueData && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>⚠️ Sự cố máy cần xử lý</span>
              {order.reportedIssueData.contactPhone && (
                <span className="font-mono text-blue-600 dark:text-blue-400">SĐT khách: {order.reportedIssueData.contactPhone}</span>
              )}
            </div>
            <p className="text-[11.5px] text-amber-800 dark:text-amber-300">
              {order.reportedIssueData.description || 'Máy gặp sự cố trong lúc vận hành'}
            </p>
          </div>
        )}

        {/* Form xử lý */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Loại sự cố (issueType) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              {isVietnamese ? 'Loại sự cố gặp phải (issueType):' : 'Issue Type:'}
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {isVietnamese ? `${t.labelVi} (${t.value})` : `${t.labelEn} (${t.value})`}
                </option>
              ))}
            </select>
          </div>
          {/* Lựa chọn phương án xử lý (2 hành động chuẩn) */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              {isVietnamese ? 'Chọn phương án xử lý & giải quyết cho khách hàng:' : 'Select Resolution Action:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. TRANSFER_MACHINE */}
              <button
                type="button"
                onClick={() => handleSelectAction('TRANSFER_MACHINE')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition flex items-start gap-2.5 ${action === 'TRANSFER_MACHINE'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-xs">1. Đổi máy tương đồng</span>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    Gán máy trống cùng loại. Máy cũ đưa về bảo trì.
                  </p>
                </div>
              </button>

              {/* 2. REFUND_AND_CANCEL */}
              <button
                type="button"
                onClick={() => handleSelectAction('REFUND_AND_CANCEL')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition flex items-start gap-2.5 ${action === 'REFUND_AND_CANCEL'
                  ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 font-bold ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
              >
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-xs">2. Hủy đơn & Hoàn tiền</span>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    Hoàn tiền ví hội viên hoặc tiền mặt cho khách.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Chi tiết cho từng Action */}
          {action === 'TRANSFER_MACHINE' && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-200 text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{isVietnamese ? 'Hệ thống tự động điều phối máy tương đồng:' : 'Automatic Equivalent Machine Assignment:'}</span>
              </div>
              <p className="text-[11.5px] text-indigo-800/90 dark:text-indigo-300 leading-relaxed">
                {isVietnamese
                  ? 'Hệ thống sẽ tự động tìm và gán máy trống cùng loại khả dụng tại trạm. Nếu trạm hết máy trống, đơn sẽ được đưa vào hàng đợi ưu tiên (WAITING_MACHINE) và tự gán ngay khi có máy hoàn tất chu trình.'
                  : 'System will automatically find and assign an available equivalent machine, or queue the order (WAITING_MACHINE) if none is currently available.'}
              </p>
            </div>
          )}

          {action === 'REFUND_AND_CANCEL' && (
            <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-950 dark:text-rose-200 space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span>Số tiền hoàn trả:</span>
                <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                  {Number(order.totalAmount || order.total || 0).toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <p className="text-[11.5px] text-rose-800 dark:text-rose-300 leading-relaxed">
                {order.customerType === 'MEMBER'
                  ? '✨ Khách hàng là THÀNH VIÊN: Hệ thống sẽ tự động hoàn 100% số tiền vào Ví Laundro của khách ngay lập tức.'
                  : '💵 Khách hàng là KHÁCH VÃNG LAI: Quản lý trạm hoàn trả tiền mặt hoặc chuyển khoản lại trực tiếp tại quầy cho khách.'}
              </p>
            </div>
          )}

          {/* Ghi chú xử lý */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              {isVietnamese ? 'Ghi chú xử lý sự cố của Quản lý trạm:' : 'Resolution Note:'}
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
              placeholder={isVietnamese ? 'Nhập ghi chú chi tiết...' : 'Enter resolution details...'}
            />
          </div>

          {/* Số điện thoại liên hệ (contactPhone) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              {isVietnamese ? 'Số điện thoại liên hệ:' : 'Contact Phone:'}
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="0901234567"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Buttons */}
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
              className={`px-5 py-2 rounded-xl text-white font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${action === 'TRANSFER_MACHINE'
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? (isVietnamese ? 'Đang xử lý...' : 'Processing...')
                  : action === 'TRANSFER_MACHINE'
                    ? (isVietnamese ? 'Xác nhận Báo cáo sự cố' : 'Confirm Report Issue')
                    : (isVietnamese ? 'Xác nhận hủy & hoàn tiền' : 'Confirm Refund & Cancel')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// -------------------------------------------------------------
// MODAL: BÁO CÁO SỰ CỐ MÁY
// -------------------------------------------------------------
function ReportIssueModal({ order, isVietnamese, onClose, onSuccess }) {
  return <ResolveIssueModal order={order} isVietnamese={isVietnamese} onClose={onClose} onSuccess={onSuccess} />;
}

function UnusedLegacyReportIssueModal({ order, isVietnamese, onClose, onSuccess }) {
  const [issueType, setIssueType] = useState('MACHINE_STOPPED');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState(order.customerPhone || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanDesc = description.trim() || getIssueTypeLabel(issueType, isVietnamese);
      const formattedDescription = cleanDesc.includes('Loại lỗi:')
        ? cleanDesc
        : `[Loại lỗi: ${issueType}] ${cleanDesc}`;

      const res = await ordersApi.reportIssue(order.id, {
        issueType,
        description: formattedDescription,
        resolutionAction: 'TRANSFER_MACHINE',
        contactPhone,
      });

      // Nhận trực tiếp thông báo từ Backend gửi về cho Frontend
      const beNotification =
        res?.supportMessage ||
        res?.message ||
        (isVietnamese ? 'Báo cáo sự cố thành công! Đã gửi thông tin đến bộ phận kỹ thuật trạm.' : 'Issue report sent successfully.');

      onSuccess(beNotification);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Không thể gửi báo cáo sự cố.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Báo Cáo Sự Cố Máy' : 'Report Machine Issue'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {order.orderCode} • {order.activeMachineCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {isVietnamese ? 'Mô tả chi tiết hiện tượng:' : 'Detailed Description:'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isVietnamese ? 'Ví dụ: Máy dừng lúc còn 12 phút, có tiếng kêu to...' : 'Describe what happened...'}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {isVietnamese ? 'Số điện thoại liên hệ:' : 'Contact Phone:'}
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="0912..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
            >
              {isVietnamese ? 'Đóng' : 'Close'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang gửi...' : isVietnamese ? 'Gửi báo cáo' : 'Submit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// -------------------------------------------------------------
// MODAL: CHI TIẾT ĐƠN HÀNG & LỊCH SỬ KỸ THUẬT
// -------------------------------------------------------------
function SiteOrderDetailModal({
  order,
  isVietnamese,
  onClose,
  onOpenResolve,
  onOpenReport,
}) {
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [issues, setIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingDetail(true);
      setLoadingIssues(true);
      try {
        const [orderRes, issuesRes] = await Promise.allSettled([
          ordersApi.getOrderById(order.id),
          ordersApi.getOrderIssues(order.id),
        ]);

        if (isMounted) {
          if (orderRes.status === 'fulfilled' && orderRes.value) {
            setDetailData(orderRes.value);
          }
          if (issuesRes.status === 'fulfilled') {
            const list = Array.isArray(issuesRes.value) ? issuesRes.value : issuesRes.value?.items || [];
            setIssues(list);
          }
        }
      } catch (err) {
        console.error('Failed to load order detail:', err);
      } finally {
        if (isMounted) {
          setLoadingDetail(false);
          setLoadingIssues(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [order.id]);

  const displayOrder = detailData ? normalizeSiteOrder(detailData, isVietnamese) : order;
  const transfer = displayOrder.machineTransferInfo;
  const items = detailData?.items || displayOrder.items || [];
  const appliedDiscounts = detailData?.appliedDiscounts || displayOrder.appliedDiscounts || [];
  const events = detailData?.events || displayOrder.events || [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl max-h-[92vh] flex flex-col space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Chi Tiết Đơn Hàng & Vận Hành Trạm' : 'Order & Operation Details'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                {displayOrder.channel || 'KIOSK'}
              </span>
            </div>
            <p className="font-mono text-slate-400 text-xs mt-0.5">
              Mã đơn: <span className="text-slate-900 dark:text-slate-100 font-bold">{displayOrder.orderCode}</span>
              <span className="mx-2">•</span>
              <span>
                {new Date(displayOrder.createdAt).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Machine Transfer Block (nếu có sự cố hoặc đã đổi máy) */}
          {transfer && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
              <span className="font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>{isVietnamese ? 'Thông Tin Đổi Máy Sự Cố' : 'Machine Transfer Log'}</span>
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div>
                  <span className="text-slate-500 block">Máy sự cố (cũ):</span>
                  <span className="font-mono font-bold text-rose-600">{transfer.failedMachineCode || 'Chưa rõ'}</span>
                  <span className="text-[10px] text-rose-500 block">({transfer.failedMachineStatus})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Máy mới gán vào đơn:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {transfer.transferredToMachineCode || 'Đang chờ gán...'}
                  </span>
                  <span className="text-[10px] text-emerald-500 block">({transfer.transferredToMachineStatus || 'AVAILABLE'})</span>
                </div>
              </div>
              {transfer.resolutionNote && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1 border-t border-indigo-200/60">
                  Ghi chú: {transfer.resolutionNote}
                </p>
              )}
            </div>
          )}

          {/* Info Summary: Customer & Station & Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px]">{isVietnamese ? 'Khách hàng:' : 'Customer:'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{displayOrder.customerName}</span>
              <span className="font-mono text-slate-500 text-[11px] block">{displayOrder.customerPhone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">{isVietnamese ? 'Loại khách:' : 'Customer Type:'}</span>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md text-[10.5px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {displayOrder.customerType === 'MEMBER' ? 'Hội viên' : 'Khách vãng lai'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">{isVietnamese ? 'Trạng thái đơn:' : 'Status:'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block">{displayOrder.status}</span>
              <span className="text-slate-500 text-[11px] block">
                {displayOrder.isWaitingForMachine ? 'Chờ máy tương đồng' : 'Bình thường'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">{isVietnamese ? 'Trạm thực hiện:' : 'Station:'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate" title={displayOrder.siteName}>
                {displayOrder.siteName}
              </span>
            </div>
          </div>

          {/* Bảng Dịch Vụ & Thiết Bị (Items Breakdown) */}
          <div className="space-y-2">
            <span className="font-black text-slate-900 dark:text-white flex items-center justify-between">
              <span>{isVietnamese ? 'Chi Tiết Dịch Vụ & Thiết Bị' : 'Order Items & Assigned Machines'}</span>
              {loadingDetail && (
                <span className="text-[11px] text-slate-400 font-normal">
                  {isVietnamese ? 'Đang tải chi tiết...' : 'Loading details...'}
                </span>
              )}
            </span>

            {items && items.length > 0 ? (
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, idx) => (
                    <div key={item.orderItemId || idx} className="p-3 bg-white dark:bg-slate-900/50 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {item.offeringName || displayOrder.serviceName}
                          </span>
                          {item.category && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-mono text-emerald-600 font-bold">
                            {item.machineCode || displayOrder.activeMachineCode || 'Chưa gán máy'}
                          </span>
                          <span>•</span>
                          <span>
                            {item.quantity} x {Number(item.unitPrice || 0).toLocaleString('vi-VN')} ₫
                          </span>
                          {item.lineDiscount > 0 && (
                            <span className="text-rose-500 font-mono">
                              (-{Number(item.lineDiscount).toLocaleString('vi-VN')} ₫)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-slate-900 dark:text-white block">
                          {Number(item.lineTotal || (item.unitPrice * item.quantity - (item.lineDiscount || 0)) || displayOrder.totalAmount).toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{displayOrder.serviceName}</span>
                  <span className="font-mono text-slate-500 text-[11px]">Thiết bị: {displayOrder.machineName}</span>
                </div>
                <span className="font-mono font-black text-slate-900 dark:text-white">
                  {displayOrder.totalAmount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            )}
          </div>

          {/* Chi Tiết Số Tiền Thanh Toán (Financial Breakdown) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <span className="font-black text-slate-900 dark:text-white text-xs block">
              {isVietnamese ? 'Thông Tin Thanh Toán & Tiền Tệ' : 'Payment & Financial Breakdown'}
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>{isVietnamese ? 'Tạm tính (Subtotal):' : 'Subtotal:'}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {displayOrder.subtotal.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>{isVietnamese ? 'Chiết khấu / Giảm giá (Discounts):' : 'Discounts:'}</span>
                <span className={`font-mono font-bold ${displayOrder.discountTotal > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {displayOrder.discountTotal > 0 ? `-${displayOrder.discountTotal.toLocaleString('vi-VN')} ₫` : '0 ₫'}
                </span>
              </div>
              {displayOrder.pointsEarned > 0 && (
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>{isVietnamese ? 'Điểm tích lũy nhận được:' : 'Points Earned:'}</span>
                  <span className="font-mono font-bold text-amber-600">+{displayOrder.pointsEarned} pts</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="font-black text-slate-900 dark:text-white text-sm">
                  {isVietnamese ? 'Tổng tiền thanh toán:' : 'Total Amount Paid:'}
                </span>
                <span className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                  {displayOrder.totalAmount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          </div>

          {/* Lịch Sử Sự Kiện Chu Trình Đơn Hàng (Order Events Timeline) */}
          {events && events.length > 0 && (
            <div className="space-y-2">
              <span className="font-black text-slate-900 dark:text-white block">
                {isVietnamese ? 'Nhật Ký Chu Trình & Sự Kiện' : 'Order Events History'}
              </span>
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900/50 space-y-2.5">
                {events.slice(0, 5).map((ev, idx) => (
                  <div key={ev.eventId || idx} className="flex items-start gap-2.5 text-[11px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {ev.eventType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }) : ''}
                        </span>
                      </div>
                      {ev.actorName && (
                        <span className="text-slate-400 text-[10px] block">Người thực hiện: {ev.actorName}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues List (Báo Cáo Sự Cố Máy) */}
          <div className="space-y-2">
            <span className="font-black text-slate-900 dark:text-white block">
              {isVietnamese ? 'Lịch Sử Báo Cáo Sự Cố Máy' : 'Incident Reports History'}
            </span>
            {loadingIssues ? (
              <p className="text-slate-400 text-xs">{isVietnamese ? 'Đang tải...' : 'Loading...'}</p>
            ) : issues.length === 0 ? (
              <p className="text-slate-400 text-xs italic">
                {isVietnamese ? 'Chưa có lượt báo cáo sự cố nào cho đơn này.' : 'No issues reported.'}
              </p>
            ) : (
              <div className="space-y-2">
                {issues.map((iss, idx) => (
                  <div
                    key={iss.id || idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-600">
                        {isVietnamese ? 'Báo cáo sự cố' : 'Incident Report'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {iss.createdAt ? new Date(iss.createdAt).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">{iss.description}</p>
                    {iss.resolutionAction && (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Đã xử lý: {iss.resolutionAction}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {displayOrder.status !== 'CANCELLED' && displayOrder.status !== 'COMPLETED' && displayOrder.status !== 'WAITING_MACHINE' ? (
              <button
                type="button"
                onClick={displayOrder.hasReportedIssue ? onOpenResolve : onOpenReport}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title={isVietnamese ? (displayOrder.hasReportedIssue ? 'Xử lý giải quyết sự cố' : 'Báo cáo sự cố cho đơn hàng này') : 'Report or resolve issue'}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{isVietnamese ? (displayOrder.hasReportedIssue ? 'Xử lý sự cố' : 'Báo cáo sự cố') : (displayOrder.hasReportedIssue ? 'Resolve' : 'Report Issue')}</span>
              </button>
            ) : displayOrder.status === 'WAITING_MACHINE' ? (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold italic flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Đơn đang xếp hàng chờ máy trống' : 'Order is waiting for machine'}</span>
              </span>
            ) : displayOrder.status === 'CANCELLED' ? (
              <span className="text-[11px] text-slate-400 font-medium italic">
                {isVietnamese ? 'Đơn đã bị hủy — Không thể báo lỗi' : 'Order cancelled — issue reporting closed'}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {isVietnamese ? 'Đóng' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
