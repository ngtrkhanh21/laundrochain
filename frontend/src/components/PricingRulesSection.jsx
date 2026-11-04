import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SlidersHorizontal,
  Search,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Pencil,
  Trash2,
  Layers,
  Crown,
  Percent,
  Coins,
  Tag,
  Ticket,
  UserCheck,
  ShieldCheck,
  ArrowUpDown,
  Code,
  DollarSign,
} from 'lucide-react';
import { pricingApi } from '../api/pricingApi';

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;

const RULE_TYPES = [
  {
    value: 'HAPPY_HOUR',
    aliases: ['TIME_OF_DAY', 'HAPPY_NIGHT'],
    labelVi: 'Giờ Vàng',
    icon: Clock,
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
  },
  {
    value: 'TIER_DISCOUNT',
    aliases: ['TIER_RATE', 'TIER'],
    labelVi: 'Chiết khấu Hạng Hội Viên',
    icon: Crown,
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
  },
  {
    value: 'VOUCHER',
    aliases: [],
    labelVi: 'Khuyến mãi Mã Voucher',
    icon: Tag,
    color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800',
  },
  {
    value: 'CATEGORY_DISCOUNT',
    aliases: ['CATEGORY'],
    labelVi: 'Theo Nhóm Dịch Vụ',
    icon: Layers,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
  },
  {
    value: 'GENERAL_DISCOUNT',
    aliases: ['GENERAL'],
    labelVi: 'Giảm Giá Chung Toàn Hệ Thống',
    icon: Percent,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800',
  },
];

export function getRuleTypeBadge(type) {
  const normType = String(type || '').toUpperCase();
  const found = RULE_TYPES.find(
    (r) => r.value === normType || (r.aliases && r.aliases.includes(normType))
  );
  if (found) return found;

  return {
    value: type || 'CUSTOM',
    labelVi: type || 'Tùy chỉnh',
    icon: SlidersHorizontal,
    color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
  };
}

/**
 * Hiển thị Điều kiện kích hoạt dưới dạng các Tag/Badge trực quan, thân thiện
 * Không hiển thị chuỗi JSON thô như {"timeTo":"23:00","timeFrom":"21:00"} hoặc {"tiers":["GOLD"]}
 */
export function ConditionsDisplay({ conditions }) {
  if (!conditions) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Áp dụng cho mọi đơn hàng</span>
      </span>
    );
  }

  let parsed = null;
  try {
    parsed = typeof conditions === 'string' ? JSON.parse(conditions) : conditions;
  } catch {
    return <span className="text-xs text-slate-600 font-mono">{String(conditions)}</span>;
  }

  if (!parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Áp dụng cho mọi đơn hàng</span>
      </span>
    );
  }

  // 1. Khung giờ áp dụng
  let timeFrom = parsed.timeFrom || parsed.time_from || parsed.hourFrom || parsed.hour_from;
  let timeTo = parsed.timeTo || parsed.time_to || parsed.hourTo || parsed.hour_to;
  if (parsed.time_window) {
    if (parsed.time_window.start_hour !== undefined) timeFrom = `${String(parsed.time_window.start_hour).padStart(2, '0')}:00`;
    if (parsed.time_window.end_hour !== undefined) timeTo = `${String(parsed.time_window.end_hour).padStart(2, '0')}:00`;
  }
  if (typeof timeFrom === 'number') timeFrom = `${String(timeFrom).padStart(2, '0')}:00`;
  if (typeof timeTo === 'number') timeTo = `${String(timeTo).padStart(2, '0')}:00`;

  // 2. Hạng thành viên
  let tiers = parsed.tiers || parsed.applicable_tiers || parsed.allowed_tiers || parsed.applicableTiers || parsed.allowedTiers || (parsed.tier ? [parsed.tier] : null);
  if (typeof tiers === 'string') tiers = [tiers];
  if (!Array.isArray(tiers) && tiers) tiers = [String(tiers)];

  // 3. Mã Voucher
  const voucherCode = parsed.voucherCode || parsed.voucher_code || parsed.code;

  // 4. Đơn hàng tối thiểu
  const minSubtotal = parsed.minOrderSubtotal || parsed.min_subtotal || parsed.minSubtotal || parsed.min_order_subtotal;

  // 5. Đối tượng khách hàng
  const customerType = parsed.customer_type || parsed.customerType;

  const hasAnyKnownCondition = timeFrom || timeTo || (tiers && tiers.length > 0) || voucherCode || minSubtotal || customerType;

  if (!hasAnyKnownCondition) {
    const entries = Object.entries(parsed);
    if (entries.length === 1) {
      return (
        <span className="inline-block text-xs text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
          {entries[0][0]}: {String(entries[0][1])}
        </span>
      );
    }
    return (
      <span className="text-[11px] text-slate-600 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
        {JSON.stringify(parsed)}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 py-0.5 items-start">
      {/* Khung giờ vàng / giờ áp dụng */}
      {(timeFrom || timeTo) && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            Khung giờ: {timeFrom || '00:00'} - {timeTo || '24:00'}
          </span>
        </div>
      )}

      {/* Hạng thành viên áp dụng */}
      {tiers && tiers.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {tiers.map((t) => {
            const tUpper = String(t).toUpperCase();
            let label = `Hạng ${tUpper}`;
            let style = 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800';
            let iconText = '👑';

            if (tUpper === 'GOLD') {
              label = 'Hạng Vàng';
              style = 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 font-black';
              iconText = '👑';
            } else if (tUpper === 'SILVER') {
              label = 'Hạng Bạc';
              style = 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 font-black';
              iconText = '🥈';
            } else if (tUpper === 'PLATINUM') {
              label = 'Hạng Bạch Kim';
              style = 'bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700 font-black';
              iconText = '💎';
            } else if (tUpper === 'BRONZE' || tUpper === 'STANDARD') {
              label = 'Hạng Đồng';
              style = 'bg-orange-50 text-orange-950 border-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800 font-black';
              iconText = '🥉';
            }

            return (
              <span
                key={t}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs border shadow-2xs ${style}`}
              >
                <span>{iconText}</span>
                <span>{label}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Mã Voucher liên kết */}
      {voucherCode && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-mono font-bold bg-purple-50 dark:bg-purple-950/70 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800/80 shadow-2xs">
          <Ticket className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>Mã Voucher: {voucherCode}</span>
        </div>
      )}

      {/* Đơn hàng tối thiểu */}
      {minSubtotal && Number(minSubtotal) > 0 && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
          <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Đơn tối thiểu: {formatVnd(minSubtotal)}</span>
        </div>
      )}

      {/* Chỉ thành viên đăng nhập */}
      {customerType === 'MEMBER' && !tiers?.length && (
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 shadow-2xs">
          <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Chỉ thành viên đăng nhập</span>
        </div>
      )}
    </div>
  );
}

// Fallback string formatter for exports
export function formatConditionsDisplay(conditionsStr) {
  if (!conditionsStr) return 'Áp dụng cho mọi đơn hàng';
  try {
    const parsed = typeof conditionsStr === 'string' ? JSON.parse(conditionsStr) : conditionsStr;
    const parts = [];
    if (parsed.timeFrom || parsed.timeTo) {
      parts.push(`Khung giờ: ${parsed.timeFrom || '00:00'} - ${parsed.timeTo || '24:00'}`);
    } else if (parsed.time_window) {
      parts.push(`Khung giờ: ${parsed.time_window.start_hour}h:00 - ${parsed.time_window.end_hour}h:00`);
    }
    const t = parsed.tiers || parsed.applicable_tiers || (parsed.tier ? [parsed.tier] : null);
    if (t && t.length > 0) {
      parts.push(`Hạng: ${Array.isArray(t) ? t.join(', ') : t}`);
    }
    const vc = parsed.voucherCode || parsed.voucher_code;
    if (vc) parts.push(`Voucher: ${vc}`);
    const minS = parsed.minOrderSubtotal || parsed.min_subtotal;
    if (minS) parts.push(`Đơn từ ${formatVnd(minS)}`);
    return parts.length > 0 ? parts.join(' • ') : JSON.stringify(parsed);
  } catch {
    return String(conditionsStr);
  }
}

export default function PricingRulesSection() {
  const [rules, setRules] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    campaignId: '',
    code: '',
    name: '',
    ruleType: 'HAPPY_HOUR',
    timeFrom: '13:00',
    timeTo: '17:00',
    selectedTiers: ['GOLD'],
    voucherCode: '',
    minOrderSubtotal: 0,
    conditionsRaw: '{"time_window":{"start_hour":13,"end_hour":17}}',
    useRawJson: false,
    actionType: 'PERCENT_OFF',
    actionValue: 20,
    maxDiscount: 20000,
    scope: 'ORDER',
    priority: 10,
    stackable: true,
    isActive: true,
  });

  // Load Rules
  const loadRules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const isActiveParam = statusFilter === 'ACTIVE' ? true : statusFilter === 'INACTIVE' ? false : null;
      const data = await pricingApi.getPricingRules({
        search: search.trim() || undefined,
        ruleType: typeFilter !== 'ALL' ? typeFilter : undefined,
        isActive: isActiveParam,
      });
      setRules(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.warn('Lỗi khi tải danh sách quy tắc giá:', err);
      setError(err?.message || 'Không thể tải danh sách quy tắc định giá.');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Load campaigns for dropdown selection
  useEffect(() => {
    pricingApi
      .getPromotions({ status: 'ACTIVE' })
      .then((res) => setCampaigns(Array.isArray(res) ? res : res?.items || []))
      .catch(() => setCampaigns([]));
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.isActive).length;
    const happyHour = rules.filter((r) => ['HAPPY_HOUR', 'TIME_OF_DAY'].includes(r.ruleType)).length;
    const tierDiscount = rules.filter((r) => ['TIER_DISCOUNT', 'TIER_RATE', 'TIER'].includes(r.ruleType)).length;
    return { total, active, happyHour, tierDiscount };
  }, [rules]);

  // Preset 1: Giờ Vàng Chiều
  const applyPresetHappyHour = () => {
    const foundCamp = campaigns.length > 0 ? campaigns[0].campaignId : '';
    setFormData({
      campaignId: foundCamp,
      code: 'HAPPY_HOUR_AFTERNOON',
      name: 'Giờ Vàng Giặt Sấy Buổi Chiều (13h-17h)',
      ruleType: 'HAPPY_HOUR',
      timeFrom: '13:00',
      timeTo: '17:00',
      selectedTiers: ['GOLD'],
      voucherCode: '',
      minOrderSubtotal: 0,
      conditionsRaw: '{"timeFrom":"13:00","timeTo":"17:00","time_window":{"start_hour":13,"end_hour":17}}',
      useRawJson: false,
      actionType: 'PERCENT_OFF',
      actionValue: 20,
      maxDiscount: 20000,
      scope: 'ORDER',
      priority: 10,
      stackable: true,
      isActive: true,
    });
  };

  // Preset 2: Chiết Khấu Hạng Gold
  const applyPresetTierGold = () => {
    const foundCamp = campaigns.length > 0 ? campaigns[0].campaignId : '';
    setFormData({
      campaignId: foundCamp,
      code: 'TIER_GOLD_DISCOUNT',
      name: 'Chiết Khấu Thành Viên Hạng Vàng',
      ruleType: 'TIER_DISCOUNT',
      timeFrom: '00:00',
      timeTo: '23:59',
      selectedTiers: ['GOLD'],
      voucherCode: '',
      minOrderSubtotal: 0,
      conditionsRaw: '{"tiers":["GOLD"]}',
      useRawJson: false,
      actionType: 'PERCENT_OFF',
      actionValue: 10,
      maxDiscount: 15000,
      scope: 'ORDER',
      priority: 20,
      stackable: true,
      isActive: true,
    });
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setFormData({
      campaignId: campaigns.length > 0 ? campaigns[0].campaignId : '',
      code: '',
      name: '',
      ruleType: 'HAPPY_HOUR',
      timeFrom: '13:00',
      timeTo: '17:00',
      selectedTiers: ['GOLD'],
      voucherCode: '',
      minOrderSubtotal: 0,
      conditionsRaw: '{"timeFrom":"13:00","timeTo":"17:00","time_window":{"start_hour":13,"end_hour":17}}',
      useRawJson: false,
      actionType: 'PERCENT_OFF',
      actionValue: 20,
      maxDiscount: 20000,
      scope: 'ORDER',
      priority: 10,
      stackable: true,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    let timeFrom = '13:00';
    let timeTo = '17:00';
    let selectedTiers = ['GOLD'];
    let vCode = '';
    let minSub = 0;
    let isRaw = false;

    try {
      const parsed = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
      if (parsed) {
        if (parsed.timeFrom || parsed.time_from) timeFrom = parsed.timeFrom || parsed.time_from;
        if (parsed.timeTo || parsed.time_to) timeTo = parsed.timeTo || parsed.time_to;
        if (parsed.time_window) {
          if (parsed.time_window.start_hour !== undefined) timeFrom = `${String(parsed.time_window.start_hour).padStart(2, '0')}:00`;
          if (parsed.time_window.end_hour !== undefined) timeTo = `${String(parsed.time_window.end_hour).padStart(2, '0')}:00`;
        }

        const t = parsed.tiers || parsed.applicable_tiers || parsed.allowed_tiers || (parsed.tier ? [parsed.tier] : null);
        if (t) {
          selectedTiers = Array.isArray(t) ? t : [t];
        }

        if (parsed.voucherCode || parsed.voucher_code) {
          vCode = parsed.voucherCode || parsed.voucher_code;
        }

        if (parsed.minOrderSubtotal || parsed.min_subtotal) {
          minSub = Number(parsed.minOrderSubtotal || parsed.min_subtotal);
        }
      }
    } catch {
      isRaw = true;
    }

    const normAct = String(rule.actionType || '').toUpperCase();
    const resolvedActionType = normAct.includes('PERCENT')
      ? 'PERCENT_OFF'
      : normAct === 'SET_PRICE'
      ? 'SET_PRICE'
      : 'AMOUNT_OFF';

    setFormData({
      campaignId: rule.campaignId || '',
      code: rule.code || '',
      name: rule.name || '',
      ruleType: rule.ruleType || 'HAPPY_HOUR',
      timeFrom,
      timeTo,
      selectedTiers,
      voucherCode: vCode,
      minOrderSubtotal: minSub,
      conditionsRaw: typeof rule.conditions === 'string' ? rule.conditions : JSON.stringify(rule.conditions || {}),
      useRawJson: isRaw,
      actionType: resolvedActionType,
      actionValue: rule.actionValue || 0,
      maxDiscount: rule.maxDiscount || 0,
      scope: rule.scope || 'ORDER',
      priority: rule.priority ?? 10,
      stackable: rule.stackable ?? true,
      isActive: rule.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setError('Vui lòng nhập mã quy tắc giá.');
      return;
    }
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên quy tắc giá.');
      return;
    }

    let finalConditions = formData.conditionsRaw;

    if (!formData.useRawJson) {
      if (formData.ruleType === 'HAPPY_HOUR' || formData.ruleType === 'TIME_OF_DAY') {
        const startH = Number((formData.timeFrom || '13:00').split(':')[0]);
        const endH = Number((formData.timeTo || '17:00').split(':')[0]);
        finalConditions = JSON.stringify({
          timeFrom: formData.timeFrom || '13:00',
          timeTo: formData.timeTo || '17:00',
          time_window: {
            start_hour: startH,
            end_hour: endH,
          },
        });
      } else if (['TIER_DISCOUNT', 'TIER_RATE', 'TIER'].includes(formData.ruleType)) {
        const tiersToSave = formData.selectedTiers && formData.selectedTiers.length > 0
          ? formData.selectedTiers
          : ['GOLD'];
        finalConditions = JSON.stringify({
          tiers: tiersToSave,
          applicable_tiers: tiersToSave,
        });
      } else if (formData.ruleType === 'VOUCHER') {
        const condObj = {};
        if (formData.voucherCode.trim()) {
          condObj.voucherCode = formData.voucherCode.trim().toUpperCase();
          condObj.voucher_code = formData.voucherCode.trim().toUpperCase();
        }
        if (Number(formData.minOrderSubtotal) > 0) {
          condObj.minOrderSubtotal = Number(formData.minOrderSubtotal);
          condObj.min_subtotal = Number(formData.minOrderSubtotal);
        }
        finalConditions = JSON.stringify(condObj);
      } else {
        const condObj = {};
        if (Number(formData.minOrderSubtotal) > 0) {
          condObj.minOrderSubtotal = Number(formData.minOrderSubtotal);
          condObj.min_subtotal = Number(formData.minOrderSubtotal);
        }
        finalConditions = JSON.stringify(condObj);
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        campaignId: formData.campaignId ? formData.campaignId : undefined,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        ruleType: formData.ruleType,
        conditions: finalConditions,
        actionType: formData.actionType,
        actionValue: Number(formData.actionValue),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        scope: formData.scope,
        priority: Number(formData.priority) || 10,
        stackable: Boolean(formData.stackable),
        isActive: Boolean(formData.isActive),
      };

      if (editingRule) {
        await pricingApi.updatePricingRule(editingRule.ruleId, payload);
        setToast(`Đã cập nhật quy tắc giá "${payload.name}"!`);
      } else {
        await pricingApi.createPricingRule(payload);
        setToast(`Tạo quy tắc giá "${payload.name}" (${payload.code}) thành công!`);
      }

      setIsModalOpen(false);
      setTimeout(() => setToast(''), 4000);
      loadRules();
    } catch (err) {
      setError(err?.message || 'Không thể lưu quy tắc giá.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle IsActive
  const handleToggleActive = async (rule) => {
    try {
      await pricingApi.updatePricingRule(rule.ruleId, {
        isActive: !rule.isActive,
      });
      setToast(
        `Đã chuyển quy tắc [${rule.code}] sang ${!rule.isActive ? 'Đang hoạt động' : 'Tạm dừng'}`
      );
      setTimeout(() => setToast(''), 3000);
      loadRules();
    } catch (err) {
      alert(err?.message || 'Lỗi khi cập nhật trạng thái quy tắc giá.');
    }
  };

  // Delete Rule
  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa quy tắc định giá [${rule.code}]?`)) {
      return;
    }
    try {
      await pricingApi.deletePricingRule(rule.ruleId);
      setToast(`Đã xóa quy tắc [${rule.code}] thành công!`);
      setTimeout(() => setToast(''), 3000);
      loadRules();
    } catch (err) {
      alert(err?.message || 'Lỗi khi xóa quy tắc định giá.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-lg shadow-emerald-600/30 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs shrink-0">
            <SlidersHorizontal className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Quản lý Quy Tắc Giảm Giá (Pricing Rules)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Khuyến mãi tự động
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Thiết lập quy tắc giảm giá động: Giờ vàng (Happy Hour), chiết khấu hạng hội viên, giảm giá nhóm dịch vụ và mức trần tối đa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadRules}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md shadow-amber-600/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo quy tắc mới</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Tổng quy tắc</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Đang hoạt động</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.active}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Giờ Vàng</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.happyHour}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Chiết khấu Hội viên</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats.tierDiscount}
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã quy tắc (HAPPY_HOUR_AFTERNOON...), tên quy tắc..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-bold"
          >
            <option value="ALL">Tất cả loại quy tắc</option>
            {RULE_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.labelVi}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-bold"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang hoạt động</option>
            <option value="INACTIVE">⏸️ Tạm dừng</option>
          </select>
        </div>
      </div>

      {/* 4. Rules Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="uppercase tracking-wider font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3.5">Mã & Tên Quy Tắc</th>
                <th className="px-4 py-3.5">Loại quy tắc</th>
                <th className="px-4 py-3.5">Điều kiện kích hoạt</th>
                <th className="px-4 py-3.5">Mức giảm giá</th>
                <th className="px-4 py-3.5 text-center">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    <span>Đang tải danh sách quy tắc...</span>
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 space-y-2">
                    <SlidersHorizontal className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      Chưa có quy tắc định giá nào phù hợp.
                    </p>
                    <p className="text-xs text-slate-400">
                      Bấm "Tạo quy tắc mới" hoặc nạp mẫu Giờ Vàng để tạo quy tắc đầu tiên.
                    </p>
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const badge = getRuleTypeBadge(rule.ruleType);
                  return (
                    <tr
                      key={rule.ruleId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Code & Name */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900 inline-block">
                          {rule.code}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white mt-1 line-clamp-1">
                          {rule.name}
                        </div>
                        {rule.campaignName && (
                          <div className="text-[10.5px] text-slate-400 truncate mt-0.5" title={rule.campaignName}>
                            🎯 {rule.campaignName}
                          </div>
                        )}
                      </td>

                      {/* Rule Type */}
                      <td className="px-4 py-3.5">
                        {(() => {
                          const IconComp = badge?.icon || SlidersHorizontal;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${badge?.color || 'bg-slate-100 text-slate-800 border-slate-300'}`}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                              <span>{badge?.labelVi || rule.ruleType}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Điều kiện kích hoạt (Hiển thị thẻ trực quan, KHÔNG để JSON thô) */}
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <ConditionsDisplay conditions={rule.conditions} />
                      </td>

                      {/* Mức giảm giá: Phân biệt rõ ràng PERCENT_OFF vs AMOUNT_OFF */}
                      <td className="px-4 py-3.5">
                        {(() => {
                          const actionUpper = String(rule.actionType || '').toUpperCase();
                          const isPercent = actionUpper.includes('PERCENT');
                          const isSetPrice = actionUpper === 'SET_PRICE' || actionUpper.includes('FIXED_PRICE');

                          if (isPercent) {
                            return (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-100 dark:bg-indigo-950/90 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                                  <Percent className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>GIẢM {rule.actionValue}%</span>
                                </span>
                                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                                  {rule.maxDiscount ? `Tối đa: ${formatVnd(rule.maxDiscount)}` : 'Giảm theo %'}
                                </div>
                              </div>
                            );
                          }

                          if (isSetPrice) {
                            return (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 shadow-2xs">
                                  <span>Đặt giá: {formatVnd(rule.actionValue)}</span>
                                </span>
                                <div className="text-[10.5px] text-slate-400">
                                  Giá cố định
                                </div>
                              </div>
                            );
                          }

                          // Default: AMOUNT_OFF (hoặc FIXED_DISCOUNT)
                          return (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>GIẢM {formatVnd(rule.actionValue)}</span>
                              </span>
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                                Số tiền cố định
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Trạng thái: Đang hoạt động vs Tạm dừng */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(rule)}
                          title={`Bấm để chuyển sang ${rule.isActive ? 'Tạm dừng' : 'Đang hoạt động'}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shadow-2xs ${
                            rule.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/80'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              rule.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`}
                          />
                          <span>{rule.isActive ? 'Đang hoạt động' : 'Tạm dừng'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(rule)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer transition"
                            title="Sửa quy tắc"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition"
                            title="Xóa quy tắc"
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
      </div>

      {/* 5. Modal Tạo / Cập nhật Quy Tắc */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingRule ? 'Cập Nhật Quy Tắc Định Giá' : 'Tạo Quy Tắc Định Giá Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Áp dụng trực tiếp vào bộ quy tắc định giá</p>
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

            {/* Quick Presets (Tạo nhanh khi tạo mới) */}
            {!editingRule && (
              <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/80 space-y-1.5">
                <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Nạp nhanh mẫu quy tắc phổ biến:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={applyPresetHappyHour}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-amber-50 transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mẫu Giờ Vàng (13h-17h, Giảm 20%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetTierGold}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-blue-50 transition"
                  >
                    <Crown className="w-3.5 h-3.5 text-blue-600" />
                    <span>Mẫu Hạng Vàng (Gold, Giảm 10%)</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Campaign select */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Chiến dịch liên kết (Campaign)
                </label>
                <select
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Quy tắc độc lập (Không thuộc chiến dịch) --</option>
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
                    Mã quy tắc (Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingRule)}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="HAPPY_HOUR_AFTERNOON"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Tên quy tắc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Giờ Vàng Buổi Chiều"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Rule Type & Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Loại quy tắc (Rule Type)
                  </label>
                  <select
                    value={formData.ruleType}
                    onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {RULE_TYPES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.labelVi}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Phạm vi áp dụng (Scope)
                  </label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="ORDER">ORDER (Toàn bộ đơn hàng)</option>
                    <option value="LINE">LINE (Từng dòng dịch vụ)</option>
                  </select>
                </div>
              </div>

              {/* Conditions Builder (Giao diện trực quan - Không bắt gõ JSON) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Điều kiện kích hoạt quy tắc</span>
                  </span>

                  <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useRawJson}
                      onChange={(e) => setFormData({ ...formData, useRawJson: e.target.checked })}
                      className="rounded accent-amber-600 w-3.5 h-3.5"
                    />
                    <span>Chế độ JSON tùy chỉnh</span>
                  </label>
                </div>

                {!formData.useRawJson ? (
                  <div className="space-y-3">
                    {/* Trường hợp 1: Giờ vàng / Khung thời gian */}
                    {(formData.ruleType === 'HAPPY_HOUR' || formData.ruleType === 'TIME_OF_DAY') && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Giờ bắt đầu (timeFrom)
                            </label>
                            <input
                              type="time"
                              value={formData.timeFrom || '13:00'}
                              onChange={(e) => setFormData({ ...formData, timeFrom: e.target.value })}
                              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Giờ kết thúc (timeTo)
                            </label>
                            <input
                              type="time"
                              value={formData.timeTo || '17:00'}
                              onChange={(e) => setFormData({ ...formData, timeTo: e.target.value })}
                              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Quick hour tags */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[10px] text-slate-400 font-medium">Khung gợi ý:</span>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, timeFrom: '13:00', timeTo: '17:00' })}
                            className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 cursor-pointer"
                          >
                            13:00 - 17:00 (Chiều)
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, timeFrom: '21:00', timeTo: '23:00' })}
                            className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 cursor-pointer"
                          >
                            21:00 - 23:00 (Tối)
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, timeFrom: '23:00', timeTo: '05:00' })}
                            className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 cursor-pointer"
                          >
                            23:00 - 05:00 (Đêm)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Trường hợp 2: Chiết khấu Hạng hội viên */}
                    {(formData.ruleType === 'TIER_DISCOUNT' || formData.ruleType === 'TIER_RATE' || formData.ruleType === 'TIER') && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                          Chọn các hạng thành viên được áp dụng:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'BRONZE', name: 'Hạng Đồng', icon: '🥉', color: 'border-orange-300 text-orange-950 bg-orange-50' },
                            { id: 'SILVER', name: 'Hạng Bạc', icon: '🥈', color: 'border-slate-300 text-slate-900 bg-slate-50' },
                            { id: 'GOLD', name: 'Hạng Vàng', icon: '👑', color: 'border-amber-300 text-amber-950 bg-amber-50' },
                            { id: 'PLATINUM', name: 'Hạng Bạch Kim', icon: '💎', color: 'border-purple-300 text-purple-950 bg-purple-50' },
                          ].map((t) => {
                            const isChecked = (formData.selectedTiers || []).includes(t.id);
                            return (
                              <label
                                key={t.id}
                                className={`p-2 rounded-xl border-2 flex items-center gap-1.5 cursor-pointer transition select-none text-[11px] ${
                                  isChecked
                                    ? `${t.color} font-black shadow-2xs`
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const cur = formData.selectedTiers || [];
                                    const next = e.target.checked
                                      ? [...cur, t.id]
                                      : cur.filter((x) => x !== t.id);
                                    setFormData({ ...formData, selectedTiers: next });
                                  }}
                                  className="rounded accent-amber-600 w-3.5 h-3.5"
                                />
                                <span>{t.icon} {t.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Trường hợp 3: Mã Voucher */}
                    {formData.ruleType === 'VOUCHER' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Mã Voucher liên kết
                          </label>
                          <input
                            type="text"
                            value={formData.voucherCode || ''}
                            onChange={(e) => setFormData({ ...formData, voucherCode: e.target.value.toUpperCase() })}
                            placeholder="SUMMER10 hoặc GIATHE2026"
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Đơn hàng tối thiểu (VNĐ)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={formData.minOrderSubtotal || 0}
                            onChange={(e) => setFormData({ ...formData, minOrderSubtotal: e.target.value })}
                            placeholder="30000"
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Trường hợp 4: Giảm giá chung hoặc nhóm dịch vụ */}
                    {(formData.ruleType === 'GENERAL_DISCOUNT' || formData.ruleType === 'CATEGORY_DISCOUNT') && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Đơn hàng tối thiểu để kích hoạt (VNĐ - 0 = Mọi đơn)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={formData.minOrderSubtotal || 0}
                          onChange={(e) => setFormData({ ...formData, minOrderSubtotal: e.target.value })}
                          placeholder="0"
                          className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={3}
                      value={formData.conditionsRaw}
                      onChange={(e) => setFormData({ ...formData, conditionsRaw: e.target.value })}
                      placeholder='{"timeFrom":"21:00","timeTo":"23:00"} hoặc {"tiers":["GOLD"]}'
                      className="w-full p-2 font-mono text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Mức giảm giá: PERCENT_OFF vs AMOUNT_OFF */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>Hình thức & Mức giảm giá</span>
                  </span>
                  <span className="text-[10.5px] font-bold text-slate-500">
                    {formData.actionType === 'PERCENT_OFF' ? 'Đang chọn: Giảm theo % chiết khấu' : 'Đang chọn: Giảm số tiền cố định (₫)'}
                  </span>
                </div>

                {/* 2 Big Choice Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setFormData({ ...formData, actionType: 'PERCENT_OFF', actionValue: formData.actionValue > 70 ? 20 : formData.actionValue || 20 })}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex items-start gap-2.5 ${
                      formData.actionType === 'PERCENT_OFF'
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${formData.actionType === 'PERCENT_OFF' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-xs">Giảm theo % chiết khấu</div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Giảm theo % đơn hàng (VD: Giảm 20%, Giảm 10%), có mức trần tối đa.
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, actionType: 'AMOUNT_OFF', actionValue: formData.actionValue <= 70 ? 20000 : formData.actionValue, maxDiscount: '' })}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex items-start gap-2.5 ${
                      formData.actionType === 'AMOUNT_OFF'
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${formData.actionType === 'AMOUNT_OFF' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-xs">Giảm số tiền cố định (₫)</div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Giảm trừ trực tiếp số tiền cụ thể (VD: Giảm 10.000 ₫, 20.000 ₫).
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>
                        {formData.actionType === 'PERCENT_OFF' ? 'Tỷ lệ giảm (%)' : 'Số tiền giảm (VNĐ)'}
                        <span className="text-rose-500"> *</span>
                      </span>
                      {formData.actionType === 'PERCENT_OFF' && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Tối đa 70%</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={formData.actionType === 'PERCENT_OFF' ? 70 : 10000000}
                        required
                        value={formData.actionValue}
                        onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                        placeholder={formData.actionType === 'PERCENT_OFF' ? '20' : '20000'}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-black text-base text-purple-700 dark:text-purple-300"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        {formData.actionType === 'PERCENT_OFF' ? '%' : 'VNĐ'}
                      </span>
                    </div>

                    {/* Quick values buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">Chọn nhanh:</span>
                      {formData.actionType === 'PERCENT_OFF' ? (
                        [10, 15, 20, 30, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setFormData({ ...formData, actionValue: pct })}
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition ${
                              Number(formData.actionValue) === pct
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
                            onClick={() => setFormData({ ...formData, actionValue: amt })}
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition ${
                              Number(formData.actionValue) === amt
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

                  {/* Max Discount */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Mức giảm tối đa (Trần VNĐ)</span>
                      {formData.actionType === 'AMOUNT_OFF' && (
                        <span className="text-[10px] text-slate-400">(Không áp dụng cho tiền mặt)</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        disabled={formData.actionType === 'AMOUNT_OFF'}
                        value={formData.maxDiscount}
                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                        placeholder={formData.actionType === 'AMOUNT_OFF' ? 'Giảm đúng số tiền cố định' : '20000 (để trống = không trần)'}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                      />
                      {formData.actionType === 'PERCENT_OFF' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                          VNĐ
                        </span>
                      )}
                    </div>

                    {formData.actionType === 'PERCENT_OFF' ? (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">Trần gợi ý:</span>
                        {[15000, 20000, 25000, 50000].map((t) => (
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
                      </div>
                    ) : (
                      <p className="text-[10.5px] text-slate-400 italic">
                        Khi chọn AMOUNT_OFF, hệ thống sẽ trừ đúng số tiền cố định đã cấu hình.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Priority & Stackable & IsActive */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Độ ưu tiên (Priority)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.stackable}
                      onChange={(e) => setFormData({ ...formData, stackable: e.target.checked })}
                      className="rounded accent-amber-600 w-4 h-4"
                    />
                    <span>Cho phép cộng dồn</span>
                  </label>
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <span>Kích hoạt ngay</span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black shadow-md shadow-amber-600/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : editingRule
                    ? 'Cập nhật quy tắc'
                    : 'Tạo quy tắc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
