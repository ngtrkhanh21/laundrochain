import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ticket,
  Search,
  Plus,
  RefreshCw,
  Coins,
  CheckCircle2,
  AlertTriangle,
  X,
  Pencil,
  Trash2,
  Users,
  Calendar,
  Sparkles,
  TrendingUp,
  History,
  Copy,
  Check,
  Percent,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  Clock,
  UserCheck,
  Sliders,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { pricingApi } from '../api/pricingApi';

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;

const formatDate = (d) => {
  if (!d) return 'Vô thời hạn';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
};

const toInputDate = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

export default function VouchersSection() {
  const [vouchers, setVouchers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [discountTypeFilter, setDiscountTypeFilter] = useState('ALL'); // 'ALL' | 'PERCENT' | 'AMOUNT'
  const [memberOnlyFilter, setMemberOnlyFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Usages Modal State
  const [usagesModalVoucher, setUsagesModalVoucher] = useState(null);
  const [usagesList, setUsagesList] = useState([]);
  const [usagesLoading, setUsagesLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    campaignId: '',
    code: '',
    name: '',
    description: '',
    discountType: 'FIXED_AMOUNT', // 'FIXED_AMOUNT' | 'PERCENT_OFF'
    discountValue: 10000,
    maxDiscount: '',
    minOrderAmount: 40000,
    maxUsageTotal: 500,
    maxUsagePerUser: 2,
    validFrom: '2026-06-01',
    validTo: '2026-08-31',
    memberOnly: true,
    status: 'ACTIVE',
  });

  // Simulated order subtotal for live preview inside modal
  const [previewSubtotal, setPreviewSubtotal] = useState(50000);

  // Load Vouchers
  const loadVouchers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await pricingApi.getVouchers({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        campaignId: campaignFilter || undefined,
        memberOnly: memberOnlyFilter === 'MEMBER_ONLY' ? true : memberOnlyFilter === 'ALL_USERS' ? false : null,
        pageNumber: page,
        pageSize,
      });

      if (res && Array.isArray(res.items)) {
        setVouchers(res.items);
        setTotalCount(res.totalCount || res.items.length);
        setTotalPages(res.totalPages || Math.ceil((res.totalCount || res.items.length) / pageSize) || 1);
      } else if (Array.isArray(res)) {
        setVouchers(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / pageSize) || 1);
      } else {
        setVouchers([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.warn('Lỗi khi tải danh sách voucher:', err);
      setError(err?.message || 'Không thể tải danh sách voucher.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, campaignFilter, memberOnlyFilter, page, pageSize]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  // Load campaigns for dropdowns
  useEffect(() => {
    pricingApi
      .getPromotions({ status: 'ACTIVE' })
      .then((res) => setCampaigns(Array.isArray(res) ? res : res?.items || []))
      .catch(() => setCampaigns([]));
  }, []);

  // Filter vouchers locally by discount type if chosen
  const filteredVouchers = useMemo(() => {
    if (discountTypeFilter === 'ALL') return vouchers;
    return vouchers.filter((v) => {
      const isAmt = String(v.discountType || '').toUpperCase().includes('AMOUNT');
      return discountTypeFilter === 'AMOUNT' ? isAmt : !isAmt;
    });
  }, [vouchers, discountTypeFilter]);

  // Copy code helper
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  // KPIs
  const stats = useMemo(() => {
    const total = totalCount || vouchers.length;
    const active = vouchers.filter((v) => v.status === 'ACTIVE').length;
    const percentCount = vouchers.filter((v) => !String(v.discountType || '').toUpperCase().includes('AMOUNT')).length;
    const amountCount = total - percentCount;
    const totalUsed = vouchers.reduce((sum, v) => sum + (v.usedCount || 0), 0);
    const totalGiven = vouchers.reduce((sum, v) => sum + (Number(v.totalDiscountGiven) || 0), 0);
    return { total, active, percentCount, amountCount, totalUsed, totalGiven };
  }, [vouchers, totalCount]);

  // Mẫu Preset 1: Giảm Tiền Mặt (VND)
  const applyPresetFixedAmount = () => {
    const foundCamp = campaigns.length > 0 ? campaigns[0].campaignId : '';
    setFormData({
      campaignId: foundCamp,
      code: 'GIATHE2026',
      name: 'Voucher Hè Sảng Khoái',
      description: 'Giảm ngay 10,000 VNĐ cho đơn từ 40,000 VNĐ',
      discountType: 'FIXED_AMOUNT',
      discountValue: 10000,
      maxDiscount: '',
      minOrderAmount: 40000,
      maxUsageTotal: 500,
      maxUsagePerUser: 2,
      validFrom: toInputDate(new Date()),
      validTo: toInputDate(new Date(Date.now() + 90 * 86400000)),
      memberOnly: true,
      status: 'ACTIVE',
    });
  };

  // Mẫu Preset 2: Giảm Theo Phần Trăm (%)
  const applyPresetPercentage = () => {
    const foundCamp = campaigns.length > 0 ? campaigns[0].campaignId : '';
    setFormData({
      campaignId: foundCamp,
      code: 'HE20PERCENT',
      name: 'Ưu Đãi Chiết Khấu 20%',
      description: 'Giảm 20% cho đơn từ 50,000 VNĐ (tối đa 25,000 VNĐ)',
      discountType: 'PERCENT_OFF',
      discountValue: 20,
      maxDiscount: 25000,
      minOrderAmount: 50000,
      maxUsageTotal: 300,
      maxUsagePerUser: 1,
      validFrom: toInputDate(new Date()),
      validTo: toInputDate(new Date(Date.now() + 60 * 86400000)),
      memberOnly: true,
      status: 'ACTIVE',
    });
  };

  const openCreateModal = () => {
    setEditingVoucher(null);
    setFormData({
      campaignId: campaigns.length > 0 ? campaigns[0].campaignId : '',
      code: '',
      name: '',
      description: '',
      discountType: 'FIXED_AMOUNT',
      discountValue: 10000,
      maxDiscount: '',
      minOrderAmount: 40000,
      maxUsageTotal: 500,
      maxUsagePerUser: 2,
      validFrom: toInputDate(new Date()),
      validTo: toInputDate(new Date(Date.now() + 90 * 86400000)),
      memberOnly: true,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (v) => {
    setEditingVoucher(v);
    setFormData({
      campaignId: v.campaignId || '',
      code: v.code || '',
      name: v.name || '',
      description: v.description || '',
      discountType: v.discountType?.includes('AMOUNT') ? 'FIXED_AMOUNT' : 'PERCENT_OFF',
      discountValue: v.discountValue || (v.discountType?.includes('AMOUNT') ? 10000 : 10),
      maxDiscount: v.maxDiscount || '',
      minOrderAmount: v.minOrderSubtotal || v.minOrderAmount || 0,
      maxUsageTotal: v.maxUses || '',
      maxUsagePerUser: v.maxUsesPerMember || 1,
      validFrom: toInputDate(v.validFrom),
      validTo: toInputDate(v.validTo),
      memberOnly: Boolean(v.memberOnly),
      status: v.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Submit form (POST or PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setError('Vui lòng nhập mã voucher.');
      return;
    }

    const dVal = Number(formData.discountValue);
    if (!dVal || dVal <= 0) {
      setError('Mức giảm giá phải lớn hơn 0.');
      return;
    }

    if (formData.discountType === 'PERCENT_OFF' && dVal > 70) {
      setError('Tỷ lệ giảm theo phần trăm không được vượt quá 70% (để đảm bảo chính sách giá sàn).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        campaignId: formData.campaignId || undefined,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim() || undefined,
        description: formData.description.trim() || undefined,
        discountType: formData.discountType,
        discountValue: dVal,
        maxDiscount: formData.discountType === 'PERCENT_OFF' && formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        minOrderAmount: formData.minOrderAmount ? Number(formData.minOrderAmount) : 0,
        minOrderSubtotal: formData.minOrderAmount ? Number(formData.minOrderAmount) : 0,
        maxUsageTotal: formData.maxUsageTotal ? Number(formData.maxUsageTotal) : undefined,
        maxUsagePerUser: Number(formData.maxUsagePerUser) || 1,
        validFrom: formData.validFrom ? `${formData.validFrom}T00:00:00Z` : undefined,
        validTo: formData.validTo ? `${formData.validTo}T23:59:59Z` : undefined,
        memberOnly: Boolean(formData.memberOnly),
        status: formData.status,
      };

      if (editingVoucher) {
        await pricingApi.updateVoucher(editingVoucher.voucherId, payload);
        setToast(`Đã cập nhật mã voucher [${payload.code}] thành công!`);
      } else {
        await pricingApi.createVoucher(payload);
        setToast(`Tạo mã voucher [${payload.code}] thành công!`);
      }

      setIsModalOpen(false);
      setTimeout(() => setToast(''), 4000);
      loadVouchers();
    } catch (err) {
      setError(err?.message || 'Không thể lưu mã voucher.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (v) => {
    const newStatus = v.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await pricingApi.updateVoucherStatus(v.voucherId, newStatus);
      setToast(
        `Đã chuyển mã voucher [${v.code}] sang ${newStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}`
      );
      setTimeout(() => setToast(''), 3000);
      loadVouchers();
    } catch (err) {
      alert(err?.message || 'Lỗi khi cập nhật trạng thái voucher.');
    }
  };

  // Delete Voucher
  const handleDeleteVoucher = async (v) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa voucher [${v.code}]?\nNếu đã có đơn sử dụng, voucher sẽ được chuyển sang TẠM NGƯNG để bảo toàn dữ liệu.`)) {
      return;
    }
    try {
      await pricingApi.deleteVoucher(v.voucherId);
      setToast(`Đã xóa voucher [${v.code}] thành công!`);
      setTimeout(() => setToast(''), 3000);
      loadVouchers();
    } catch (err) {
      alert(err?.message || 'Lỗi khi xóa voucher.');
    }
  };

  // Open Usages Modal
  const openUsagesModal = async (v) => {
    setUsagesModalVoucher(v);
    setUsagesLoading(true);
    try {
      const data = await pricingApi.getVoucherUsages(v.voucherId);
      setUsagesList(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.warn('Lỗi khi tải lịch sử sử dụng voucher:', err);
      setUsagesList([]);
    } finally {
      setUsagesLoading(false);
    }
  };

  // Live simulation calculation in modal
  const simulatedDiscount = useMemo(() => {
    const sub = Number(previewSubtotal) || 0;
    const minOrder = Number(formData.minOrderAmount) || 0;
    const dVal = Number(formData.discountValue) || 0;

    if (sub < minOrder) {
      return {
        applied: false,
        reason: `Đơn hàng ${formatVnd(sub)} chưa đạt mức tối thiểu ${formatVnd(minOrder)}`,
        discount: 0,
        payAmount: sub,
      };
    }

    let discount = 0;
    if (formData.discountType === 'PERCENT_OFF') {
      discount = Math.round((sub * dVal) / 100);
      if (formData.maxDiscount && Number(formData.maxDiscount) > 0) {
        discount = Math.min(discount, Number(formData.maxDiscount));
      }
    } else {
      discount = Math.min(sub, dVal);
    }

    return {
      applied: true,
      reason: 'Đủ điều kiện áp dụng voucher',
      discount,
      payAmount: Math.max(0, sub - discount),
    };
  }, [previewSubtotal, formData.minOrderAmount, formData.discountType, formData.discountValue, formData.maxDiscount]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-lg shadow-emerald-600/30 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs shrink-0">
            <Ticket className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Quản lý Voucher Khuyến Mãi
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Mã ưu đãi
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Thiết lập mã giảm giá linh hoạt: Chiết khấu theo % (kèm trần giảm tối đa) hoặc Giảm số tiền cố định (VNĐ), cùng các điều kiện kích hoạt chặt chẽ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadVouchers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md shadow-purple-600/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo Voucher mới</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total & Active */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Tổng số Voucher</span>
            <Ticket className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              ({stats.active} đang hoạt động)
            </span>
          </div>
        </div>

        {/* Phân loại mức giảm: % vs Số tiền */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Phân loại mức giảm</span>
            <Percent className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <span>% Giảm:</span>
              <span>{stats.percentCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <span>VNĐ Giảm:</span>
              <span>{stats.amountCount}</span>
            </div>
          </div>
        </div>

        {/* Total Used */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Tổng lượt đã dùng</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalUsed.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-slate-400">lượt giặt</span>
          </div>
        </div>

        {/* Total Discount Value Given */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Tổng tiền đã chiết khấu</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {formatVnd(stats.totalGiven)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã voucher (GIATHE2026, SUMMER10...), tên voucher..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Filter: Loại giảm giá (% vs Số tiền) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setDiscountTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                discountTypeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Mọi loại giảm
            </button>
            <button
              type="button"
              onClick={() => setDiscountTypeFilter('PERCENT')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                discountTypeFilter === 'PERCENT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Theo %</span>
            </button>
            <button
              type="button"
              onClick={() => setDiscountTypeFilter('AMOUNT')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                discountTypeFilter === 'AMOUNT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Theo VNĐ</span>
            </button>
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-bold"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang hoạt động</option>
            <option value="INACTIVE">⏸️ Tạm dừng</option>
          </select>

          {/* Filter Member Only */}
          <select
            value={memberOnlyFilter}
            onChange={(e) => {
              setMemberOnlyFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-bold"
          >
            <option value="ALL">Mọi đối tượng</option>
            <option value="MEMBER_ONLY">👑 Chỉ Hội viên</option>
            <option value="ALL_USERS">🌐 Mọi khách hàng (Cả vãng lai)</option>
          </select>

          {/* Filter Campaign */}
          {campaigns.length > 0 && (
            <select
              value={campaignFilter}
              onChange={(e) => {
                setCampaignFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-bold max-w-[200px] truncate"
            >
              <option value="">Tất cả chiến dịch</option>
              {campaigns.map((c) => (
                <option key={c.campaignId} value={c.campaignId}>
                  🎯 {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. Vouchers Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="uppercase tracking-wider font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3.5">Mã Voucher & Tên</th>
                <th className="px-4 py-3.5">Mức giá giảm</th>
                <th className="px-4 py-3.5">Điều kiện kích hoạt</th>
                <th className="px-4 py-3.5">Tiến độ sử dụng</th>
                <th className="px-4 py-3.5">Thời hạn hiệu lực</th>
                <th className="px-4 py-3.5 text-center">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>Đang tải danh sách voucher...</span>
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 space-y-2">
                    <Ticket className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      Chưa có mã voucher nào phù hợp.
                    </p>
                    <p className="text-xs text-slate-400">
                      Bấm "Tạo Voucher mới" hoặc chọn nạp mẫu giảm theo % / giảm tiền mặt.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const isAmount = String(v.discountType || '').toUpperCase().includes('AMOUNT');
                  const percentUsed = v.maxUses && v.maxUses > 0 ? Math.min(100, Math.round((v.usedCount / v.maxUses) * 100)) : null;

                  const now = new Date();
                  const validFromDate = v.validFrom ? new Date(v.validFrom) : null;
                  const validToDate = v.validTo ? new Date(v.validTo) : null;
                  const isExpired = validToDate && now > validToDate;
                  const isNotStarted = validFromDate && now < validFromDate;

                  return (
                    <tr
                      key={v.voucherId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Code & Name */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800 tracking-wide">
                            {v.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(v.code)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition"
                            title="Sao chép mã"
                          >
                            {copiedCode === v.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">
                          {v.name || `Voucher ${v.code}`}
                        </div>

                        {v.campaignName && (
                          <div className="text-[10.5px] text-slate-400 truncate mt-0.5" title={v.campaignName}>
                            🎯 {v.campaignName}
                          </div>
                        )}
                      </td>

                      {/* Mức giá giảm (Phân biệt % vs Số tiền rõ rệt) */}
                      <td className="px-4 py-3.5">
                        {isAmount ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              <span>GIẢM {formatVnd(v.discountValue)}</span>
                            </span>
                            <div className="text-[10.5px] text-slate-400 font-medium">
                              Số tiền cố định
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-100 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <Percent className="w-3.5 h-3.5 text-indigo-600" />
                              <span>GIẢM {v.discountValue}%</span>
                            </span>
                            {v.maxDiscount ? (
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium font-mono">
                                Tối đa: {formatVnd(v.maxDiscount)}
                              </div>
                            ) : (
                              <div className="text-[10.5px] text-slate-400">Không trần tối đa</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Điều kiện kích hoạt */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="space-y-1.5">
                          {/* Đơn tối thiểu */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium">Đơn tối thiểu:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {v.minOrderSubtotal || v.minOrderAmount ? formatVnd(v.minOrderSubtotal || v.minOrderAmount) : '0 ₫ (Mọi đơn)'}
                            </span>
                          </div>

                          {/* Đối tượng */}
                          <div>
                            {v.memberOnly ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Chỉ Hội viên đăng nhập</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <span>🌐 Mọi khách (Cả vãng lai)</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tiến độ sử dụng */}
                      <td className="px-4 py-3.5 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-[11px] font-bold">
                            <span className="text-purple-700 dark:text-purple-400">{v.usedCount} đã dùng</span>
                            <span className="text-slate-400">{v.maxUses ? `/ ${v.maxUses}` : '(Vô hạn)'}</span>
                          </div>

                          {percentUsed !== null ? (
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  percentUsed >= 90
                                    ? 'bg-rose-500'
                                    : percentUsed >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-purple-600'
                                }`}
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                          ) : null}

                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Tối đa {v.maxUsesPerMember || 1} lần/người</span>
                            {v.remainingUses !== null && v.remainingUses !== undefined ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Còn {v.remainingUses} lượt
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Thời hạn hiệu lực */}
                      <td className="px-4 py-3.5">
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 space-y-0.5">
                          <div>Từ: {formatDate(v.validFrom)}</div>
                          <div>Đến: {formatDate(v.validTo)}</div>
                        </div>
                        {isExpired ? (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                            Đã hết hạn
                          </span>
                        ) : isNotStarted ? (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            Chưa bắt đầu
                          </span>
                        ) : (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Đang hiệu lực
                          </span>
                        )}
                      </td>

                      {/* Trạng thái: Đang hoạt động vs Tạm dừng */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(v)}
                          title={`Bấm để chuyển sang ${v.status === 'ACTIVE' ? 'Tạm dừng' : 'Đang hoạt động'}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs ${
                            v.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/80'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              v.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`}
                          />
                          <span>{v.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Lịch sử sử dụng */}
                          <button
                            type="button"
                            onClick={() => openUsagesModal(v)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition"
                            title="Xem lịch sử đơn hàng đã dùng"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Sửa */}
                          <button
                            type="button"
                            onClick={() => openEditModal(v)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer transition"
                            title="Chỉnh sửa voucher"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Xóa */}
                          <button
                            type="button"
                            onClick={() => handleDeleteVoucher(v)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition"
                            title="Xóa voucher"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
            <div>
              Hiển thị trang {page} / {totalPages} (Tổng {totalCount} voucher)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal Tạo / Sửa Voucher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center">
                  <Ticket className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingVoucher ? 'Cập Nhật Voucher & Điều Kiện' : 'Tạo Mã Voucher Khuyến Mãi Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Cấu hình chiết khấu theo % hoặc số tiền & điều kiện kích hoạt</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets Buttons (Khi tạo mới) */}
            {!editingVoucher && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Nạp nhanh mẫu cấu hình chuẩn:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={applyPresetFixedAmount}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition shadow-2xs"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mẫu VNĐ: GIATHE2026 (Giảm 10k đơn từ 40k)</span>
                  </button>

                  <button
                    type="button"
                    onClick={applyPresetPercentage}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/80 text-indigo-800 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition shadow-2xs"
                  >
                    <Percent className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mẫu %: HE20PERCENT (Giảm 20% tối đa 25k)</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* PHẦN 1: THÔNG TIN CƠ BẢN */}
              <div className="space-y-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-purple-600" />
                  <span>1. Thông tin định danh Voucher</span>
                </div>

                {/* Campaign select */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Chiến dịch khuyến mãi liên kết
                  </label>
                  <select
                    value={formData.campaignId}
                    onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="">-- Tự động gán Chiến dịch Voucher Hệ Thống --</option>
                    {campaigns.map((c) => (
                      <option key={c.campaignId} value={c.campaignId}>
                        🎯 [{c.code}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Code & Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Mã voucher (Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingVoucher)}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="GIATHE2026 hoặc HE20PERCENT"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Tên hiển thị voucher
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Voucher Hè Sảng Khoái"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Mô tả ưu đãi cho khách hàng
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Giảm ngay 10,000 VNĐ cho đơn từ 40,000 VNĐ"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* PHẦN 2: CẤU HÌNH MỨC GIÁ GIẢM (% VS SỐ TIỀN) */}
              <div className="space-y-3.5 p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/60">
                <div className="text-xs font-black uppercase text-purple-900 dark:text-purple-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-purple-600" />
                    <span>2. Mức giá giảm (Chọn theo % hoặc Số tiền cố định)</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 lowercase">
                    {formData.discountType === 'PERCENT_OFF' ? 'đang chọn: giảm theo %' : 'đang chọn: giảm theo VNĐ'}
                  </span>
                </div>

                {/* 2 Big Choice Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => {
                      if (formData.discountType !== 'FIXED_AMOUNT') {
                        setFormData({
                          ...formData,
                          discountType: 'FIXED_AMOUNT',
                          discountValue: 10000,
                          maxDiscount: '',
                        });
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                      formData.discountType === 'FIXED_AMOUNT'
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${formData.discountType === 'FIXED_AMOUNT' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm">Giảm Số Tiền Cố Định (VNĐ)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Trừ thẳng số tiền cụ thể (VD: Giảm 10.000 ₫, 20.000 ₫) không phụ thuộc % đơn.
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (formData.discountType !== 'PERCENT_OFF') {
                        setFormData({
                          ...formData,
                          discountType: 'PERCENT_OFF',
                          discountValue: 20,
                          maxDiscount: 25000,
                        });
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                      formData.discountType === 'PERCENT_OFF'
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${formData.discountType === 'PERCENT_OFF' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm">Giảm Theo Phần Trăm (%)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Chiết khấu % trên tổng đơn (VD: Giảm 10%, 20%), kèm mức trần giảm tối đa.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Fields for Values */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Discount Value */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>
                        {formData.discountType === 'PERCENT_OFF' ? 'Tỷ lệ giảm (%)' : 'Số tiền giảm (VNĐ)'}
                        <span className="text-rose-500"> *</span>
                      </span>
                      {formData.discountType === 'PERCENT_OFF' && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Tối đa 70%</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={formData.discountType === 'PERCENT_OFF' ? 70 : 10000000}
                        required
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        placeholder={formData.discountType === 'PERCENT_OFF' ? '20' : '10000'}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-black text-base text-purple-700 dark:text-purple-300"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        {formData.discountType === 'PERCENT_OFF' ? '%' : 'VNĐ'}
                      </span>
                    </div>

                    {/* Quick values buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">Chọn nhanh:</span>
                      {formData.discountType === 'PERCENT_OFF' ? (
                        [10, 15, 20, 30, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setFormData({ ...formData, discountValue: pct })}
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition ${
                              Number(formData.discountValue) === pct
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))
                      ) : (
                        [10000, 20000, 30000, 50000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setFormData({ ...formData, discountValue: amt })}
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition ${
                              Number(formData.discountValue) === amt
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {amt / 1000}k
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Max Discount (Chỉ hiển thị khi là %) */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Mức giảm tối đa (Trần VNĐ)</span>
                      {formData.discountType === 'FIXED_AMOUNT' && (
                        <span className="text-[10px] text-slate-400">(Không áp dụng cho tiền mặt)</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        disabled={formData.discountType === 'FIXED_AMOUNT'}
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                        placeholder={formData.discountType === 'FIXED_AMOUNT' ? 'Giảm đúng số tiền cố định' : '25000 (để trống = không trần)'}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                      />
                      {formData.discountType === 'PERCENT_OFF' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                          VNĐ
                        </span>
                      )}
                    </div>

                    {formData.discountType === 'PERCENT_OFF' ? (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">Trần gợi ý:</span>
                        {[20000, 25000, 30000, 50000].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setFormData({ ...formData, maxDiscount: t })}
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition ${
                              Number(formData.maxDiscount) === t
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {t / 1000}k
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, maxDiscount: '' })}
                          className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 cursor-pointer"
                        >
                          Bỏ trần
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10.5px] text-slate-400 italic">
                        Khi giảm theo số tiền, hệ thống sẽ trừ đúng số tiền cố định trên.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bảng xem trước mô phỏng kết quả tính giá (Live Preview) */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Xem trước kết quả áp dụng voucher:</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400">Thử với đơn:</span>
                      <select
                        value={previewSubtotal}
                        onChange={(e) => setPreviewSubtotal(Number(e.target.value))}
                        className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-[11px]"
                      >
                        <option value={30000}>30.000 ₫</option>
                        <option value={50000}>50.000 ₫</option>
                        <option value={80000}>80.000 ₫</option>
                        <option value={120000}>120.000 ₫</option>
                      </select>
                    </div>
                  </div>

                  {simulatedDiscount.applied ? (
                    <div className="flex items-center justify-between text-xs font-bold p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                      <div>
                        Đơn {formatVnd(previewSubtotal)} {formData.discountType === 'PERCENT_OFF' ? `chiết khấu ${formData.discountValue}%` : `giảm trừ tiền mặt`}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">-{formatVnd(simulatedDiscount.discount)}</span>
                        <span>➔</span>
                        <span>Khách trả: <span className="font-mono text-slate-900 dark:text-white font-black">{formatVnd(simulatedDiscount.payAmount)}</span></span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>{simulatedDiscount.reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PHẦN 3: ĐIỀU KIỆN KÍCH HOẠT VOUCHER */}
              <div className="space-y-3.5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>3. Điều kiện kích hoạt Voucher</span>
                  </span>
                  <span className="text-[10.5px] font-semibold text-slate-400">Quy tắc bảo vệ ngân sách & phòng chống gian lận</span>
                </div>

                {/* Điều kiện 1: Đơn tối thiểu */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Giá trị đơn hàng tối thiểu để kích hoạt (VNĐ)</span>
                    <span className="text-[10px] text-slate-400">0 = Không giới hạn</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                      placeholder="40000"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      VNĐ
                    </span>
                  </div>

                  {/* Nút chọn nhanh giá trị đơn tối thiểu */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Gợi ý đơn tối thiểu:</span>
                    {[0, 30000, 40000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFormData({ ...formData, minOrderAmount: amt })}
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition ${
                          Number(formData.minOrderAmount) === amt
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {amt === 0 ? 'Mọi đơn (0₫)' : `${amt / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Điều kiện 2: Đối tượng áp dụng (Member Only vs Mọi khách) */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Đối tượng khách hàng được kích hoạt
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div
                      onClick={() => setFormData({ ...formData, memberOnly: true })}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                        formData.memberOnly
                          ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <ShieldCheck className={`w-4 h-4 ${formData.memberOnly ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div>
                        <div>Chỉ dành cho Thành Viên</div>
                        <div className="text-[10px] text-slate-400 font-normal">Yêu cầu đăng nhập, quản lý số lần dùng</div>
                      </div>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, memberOnly: false })}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                        !formData.memberOnly
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Users className={`w-4 h-4 ${!formData.memberOnly ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div>
                        <div>Mọi Khách Hàng (Công khai)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Áp dụng cả cho khách vãng lai tại Ki-ốt</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Điều kiện 3: Giới hạn lượt dùng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Tổng số lượt dùng toàn hệ thống
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxUsageTotal}
                      onChange={(e) => setFormData({ ...formData, maxUsageTotal: e.target.value })}
                      placeholder="500 (Để trống = vô hạn)"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Giới hạn lượt dùng mỗi khách hàng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.maxUsagePerUser}
                      onChange={(e) => setFormData({ ...formData, maxUsagePerUser: e.target.value })}
                      placeholder="2"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Điều kiện 4: Khung thời gian hiệu lực */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Thời gian bắt đầu (validFrom)
                    </label>
                    <input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Thời gian kết thúc (validTo)
                    </label>
                    <input
                      type="date"
                      value={formData.validTo}
                      onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Điều kiện 5: Kích hoạt ngay */}
                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.status === 'ACTIVE'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })}
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <span>Kích hoạt voucher ngay lập tức (Status: ACTIVE)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black shadow-md shadow-purple-600/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : editingVoucher
                    ? 'Cập nhật Voucher'
                    : 'Lưu & Phát hành Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Lịch Sử Sử Dụng Voucher */}
      {usagesModalVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center">
                  <History className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Lịch Sử Sử Dụng: [{usagesModalVoucher.code}]
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Đã dùng {usagesModalVoucher.usedCount} lượt • Tổng giảm {formatVnd(usagesModalVoucher.totalDiscountGiven)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUsagesModalVoucher(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto text-xs">
              {usagesLoading ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                  <span>Đang tải lịch sử đơn hàng...</span>
                </div>
              ) : usagesList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-1">
                  <History className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-bold">Chưa có đơn hàng nào áp dụng mã voucher này.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="uppercase tracking-wider font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-3.5 py-2.5">Mã Đơn</th>
                      <th className="px-3.5 py-2.5">Khách hàng</th>
                      <th className="px-3.5 py-2.5">Giá trị đơn</th>
                      <th className="px-3.5 py-2.5">Số tiền giảm</th>
                      <th className="px-3.5 py-2.5">Thời gian dùng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usagesList.map((u) => (
                      <tr key={u.usageId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-purple-600">
                          {u.orderCode || 'N/A'}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-slate-800 dark:text-white">{u.customerName}</div>
                          {u.customerPhone && <div className="text-[10px] text-slate-400">{u.customerPhone}</div>}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono">
                          {formatVnd(u.orderSubtotal)}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-rose-600">
                          -{formatVnd(u.discountAmount)}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-500 text-[11px]">
                          {formatDate(u.usedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setUsagesModalVoucher(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
