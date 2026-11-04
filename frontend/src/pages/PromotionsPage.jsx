import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tag,
  Search,
  Plus,
  RefreshCw,
  Calendar,
  Coins,
  CheckCircle2,
  AlertTriangle,
  X,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Ticket,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { pricingApi } from '../api/pricingApi';

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

const formatDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(d);
  }
};

const toInputDate = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [viewingPromo, setViewingPromo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budgetLimit: 50000000,
    status: 'ACTIVE',
  });

  // Load promotions list (GET /api/promotions)
  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pricingApi.getPromotions({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setPromotions(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.warn('Lỗi khi tải danh sách chiến dịch:', err);
      setError(err?.message || 'Không thể tải danh sách chiến dịch khuyến mãi.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  // Statistics
  const stats = useMemo(() => {
    const total = promotions.length;
    const active = promotions.filter((p) => p.status === 'ACTIVE').length;
    const inactive = total - active;
    const totalBudget = promotions.reduce((sum, p) => sum + Number(p.budgetCap || p.budgetLimit || 0), 0);
    const totalSpent = promotions.reduce((sum, p) => sum + Number(p.budgetUsed || 0), 0);
    return { total, active, inactive, totalBudget, totalSpent };
  }, [promotions]);

  // Quick Preset Sample (SUMMER_WASH_2026)
  const applySample1831 = () => {
    setFormData({
      code: 'SUMMER_WASH_2026',
      name: 'Chiến Dịch Hè Rực Rỡ 2026',
      description: 'Ưu đãi đặc biệt giảm giá mùa hè cho sinh viên và cư dân',
      startDate: '2026-06-01T00:00',
      endDate: '2026-08-31T23:59',
      budgetLimit: 50000000,
      status: 'ACTIVE',
    });
  };

  const openCreateModal = () => {
    setEditingPromo(null);
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 2);

    setFormData({
      code: '',
      name: '',
      description: '',
      startDate: toInputDate(now),
      endDate: toInputDate(nextMonth),
      budgetLimit: 20000000,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingPromo(p);
    setFormData({
      code: p.code || '',
      name: p.name || '',
      description: p.description || '',
      startDate: toInputDate(p.startsAt || p.startDate),
      endDate: toInputDate(p.endsAt || p.endDate),
      budgetLimit: p.budgetCap || p.budgetLimit || 0,
      status: p.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openDetailModal = (p) => {
    setViewingPromo(p);
    setIsDetailOpen(true);
  };

  // Submit Create or Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setError('Vui lòng nhập mã chiến dịch.');
      return;
    }
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên chiến dịch.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Vui lòng chọn thời gian bắt đầu và kết thúc.');
      return;
    }

    const startDt = new Date(formData.startDate);
    const endDt = new Date(formData.endDate);
    if (endDt <= startDt) {
      setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        startDate: startDt.toISOString(),
        endDate: endDt.toISOString(),
        startsAt: startDt.toISOString(),
        endsAt: endDt.toISOString(),
        budgetLimit: Number(formData.budgetLimit) || 0,
        budgetCap: Number(formData.budgetLimit) || 0,
        status: formData.status,
      };

      if (editingPromo) {
        await pricingApi.updatePromotion(editingPromo.campaignId, payload);
        setToast(`Đã cập nhật chiến dịch "${payload.name}" thành công!`);
      } else {
        await pricingApi.createPromotion(payload);
        setToast(`Tạo mới chiến dịch "${payload.name}" (${payload.code}) thành công!`);
      }

      setIsModalOpen(false);
      setTimeout(() => setToast(''), 4000);
      loadPromotions();
    } catch (err) {
      setError(err?.message || 'Thao tác thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status ACTIVE <-> INACTIVE
  const handleToggleStatus = async (p) => {
    const newStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await pricingApi.updatePromotionStatus(p.campaignId, newStatus);
      setToast(`Chiến dịch [${p.code}] đã chuyển sang ${newStatus}.`);
      setTimeout(() => setToast(''), 3000);
      setPromotions((prev) =>
        prev.map((item) => (item.campaignId === p.campaignId ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      setError(err?.message || 'Không thể đổi trạng thái chiến dịch.');
    }
  };

  // Delete Campaign
  const handleDelete = async (p) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chiến dịch "${p.name}" (${p.code})?`)) {
      return;
    }
    try {
      const res = await pricingApi.deletePromotion(p.campaignId);
      setToast(res?.message || `Đã xóa chiến dịch [${p.code}].`);
      setTimeout(() => setToast(''), 3500);
      loadPromotions();
    } catch (err) {
      setError(err?.message || 'Không thể xóa chiến dịch.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
            <Tag className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Quản lý Chiến dịch Khuyến mãi (Campaigns)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                Chiến dịch Marketing
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Tạo và quản lý các chiến dịch kích cầu, ưu đãi giờ vàng và mã voucher cho toàn hệ thống LaundroChain.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadPromotions}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-black shadow-md shadow-rose-600/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo chiến dịch mới</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Tổng chiến dịch</span>
            <Tag className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {stats.total}
          </div>
          <p className="text-[11px] text-slate-400">Đã thiết lập trong hệ thống</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Đang hoạt động (ACTIVE)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.active}
          </div>
          <p className="text-[11px] text-slate-400">Áp dụng trực tiếp khi tính giá</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Tổng ngân sách cấp</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono truncate">
            {formatVnd(stats.totalBudget)}
          </div>
          <p className="text-[11px] text-slate-400">Budget Limit toàn bộ chiến dịch</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Ngân sách đã dùng</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono truncate">
            {formatVnd(stats.totalSpent)}
          </div>
          <p className="text-[11px] text-slate-400">Đã chiết khấu cho khách hàng</p>
        </div>
      </div>

      {/* 3. Search and Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã chiến dịch (SUMMER_WASH...), tên chiến dịch, mô tả..."
            className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-rose-500/30 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang chạy (ACTIVE)</option>
            <option value="INACTIVE">⚪ Tạm dừng (INACTIVE)</option>
          </select>
        </div>
      </div>

      {/* 4. Campaigns Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-rose-500" />
          <p className="text-sm font-semibold">Đang tải danh sách chiến dịch...</p>
        </div>
      ) : promotions.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Tag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">
            Chưa có chiến dịch khuyến mãi nào.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Bấm "Tạo chiến dịch mới" để thiết lập chương trình ưu đãi đầu tiên (hoặc dùng mẫu Chiến Dịch Hè).
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            + Tạo chiến dịch ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map((p) => {
            const isActive = p.status === 'ACTIVE';
            const budgetCap = Number(p.budgetCap || p.budgetLimit || 0);
            const budgetUsed = Number(p.budgetUsed || 0);
            const budgetPercent = budgetCap > 0 ? Math.min(100, Math.round((budgetUsed / budgetCap) * 100)) : 0;

            const isExpired = new Date(p.endsAt || p.endDate) < new Date();

            return (
              <div
                key={p.campaignId}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top: Code & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-xs px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      {p.code}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                      }`}
                      title={`Bấm để chuyển sang ${isActive ? 'Tạm dừng' : 'Đang hoạt động'}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      <span>{isActive ? 'Đang hoạt động' : 'Tạm dừng'}</span>
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.description || 'Chưa có mô tả chi tiết cho chiến dịch này.'}
                    </p>
                  </div>

                  {/* Date range */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1 font-medium text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hiệu lực:</span>
                      </span>
                      {isExpired && (
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                          ĐÃ HẾT HẠN
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex justify-between">
                      <span>{formatDate(p.startsAt || p.startDate)}</span>
                      <span>→</span>
                      <span>{formatDate(p.endsAt || p.endDate)}</span>
                    </div>
                  </div>

                  {/* Budget Progress */}
                  {budgetCap > 0 && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 font-medium">Ngân sách chi tiêu:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatVnd(budgetUsed)} / {formatVnd(budgetCap)} ({budgetPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            budgetPercent > 90
                              ? 'bg-rose-500'
                              : budgetPercent > 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${budgetPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Badges: Rules and Vouchers count */}
                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>{p.rulesCount ?? p.promotionRules?.length ?? 0} Quy tắc giá</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                      <Ticket className="w-3 h-3" />
                      <span>{p.vouchersCount ?? p.vouchers?.length ?? 0} Mã voucher</span>
                    </span>
                  </div>
                </div>

                {/* Footer Action buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => openDetailModal(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Chi tiết</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                      title="Sửa chiến dịch"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer transition"
                      title="Xóa chiến dịch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal Tạo / Sửa Chiến Dịch */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center">
                  <Tag className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingPromo ? 'Cập nhật Chiến Dịch Khuyến Mãi' : 'Tạo Chiến Dịch Khuyến Mãi Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Thiết lập chương trình ưu đãi mới</p>
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

            {/* Quick Preset */}
            {!editingPromo && (
              <button
                type="button"
                onClick={applySample1831}
                className="w-full p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-rose-100 transition"
              >
                <Sparkles className="w-4 h-4 text-rose-600" />
                <span>Nạp mẫu: SUMMER_WASH_2026 (Chiến Dịch Hè Rực Rỡ)</span>
              </button>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mã chiến dịch (Code) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Mã chiến dịch (Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingPromo)}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ví dụ: SUMMER_WASH_2026"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 disabled:opacity-60"
                />
                <p className="text-[10.5px] text-slate-400">Duy nhất, viết hoa, không dấu cách.</p>
              </div>

              {/* Tên chiến dịch (Name) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Tên chiến dịch <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Chiến Dịch Hè Rực Rỡ 2026"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              {/* Mô tả (Description) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ưu đãi đặc biệt giảm giá mùa hè cho sinh viên và cư dân..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Bắt đầu (startDate) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Kết thúc (endDate) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              {/* Budget Limit & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Ngân sách tối đa (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    value={formData.budgetLimit}
                    onChange={(e) => setFormData({ ...formData, budgetLimit: e.target.value })}
                    placeholder="50000000"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20"
                  />
                  <p className="text-[10px] text-slate-400 font-mono">
                    = {formatVnd(formData.budgetLimit)}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="ACTIVE">🟢 ACTIVE (Đang chạy)</option>
                    <option value="INACTIVE">⚪ INACTIVE (Tạm dừng)</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-600/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : editingPromo
                    ? 'Cập nhật chiến dịch'
                    : 'Tạo chiến dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Xem Chi Tiết Chiến Dịch */}
      {isDetailOpen && viewingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Chi tiết: {viewingPromo.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mã CampaignId:</span>
                  <span className="font-mono font-bold">{viewingPromo.campaignId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mã Code:</span>
                  <span className="font-mono font-black text-rose-600">{viewingPromo.code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="font-bold">{viewingPromo.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Hiệu lực:</span>
                  <span className="font-mono font-bold">
                    {formatDate(viewingPromo.startsAt || viewingPromo.startDate)} →{' '}
                    {formatDate(viewingPromo.endsAt || viewingPromo.endDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Ngân sách (Budget):</span>
                  <span className="font-mono font-bold text-amber-600">
                    {formatVnd(viewingPromo.budgetCap || viewingPromo.budgetLimit)}
                  </span>
                </div>
              </div>

              {/* Vouchers list */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-purple-600" />
                  <span>Danh sách mã Voucher trực thuộc:</span>
                </h4>
                {viewingPromo.vouchers && viewingPromo.vouchers.length > 0 ? (
                  <div className="space-y-1.5">
                    {viewingPromo.vouchers.map((v) => (
                      <div
                        key={v.voucherId || v.code}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center"
                      >
                        <span className="font-mono font-black text-purple-700 dark:text-purple-300">
                          {v.code}
                        </span>
                        <span className="text-slate-500">
                          Đã dùng: {v.usedCount} / {v.maxUses || 'Không giới hạn'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Chưa có voucher nào trực thuộc chiến dịch này.</p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
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
