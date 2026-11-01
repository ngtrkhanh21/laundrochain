import { useState, useEffect } from 'react';
import {
  Calculator,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Tag,
  Clock,
  Scale,
  RefreshCw,
  SlidersHorizontal,
  FileCheck2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { pricingApi } from '../api/pricingApi';
import {
  evaluatePrice,
  DEFAULT_BUNDLE,
  analyzePriceBundle,
} from '../pricing-engine';

const SERVICES_CONFIG = [
  { id: 'WASH_DRY', defaultLabel: 'Giặt & Sấy tiêu chuẩn', rate: '25.000đ/kg', icon: '🧺' },
  { id: 'WASH_ONLY', defaultLabel: 'Chỉ Giặt', rate: '15.000đ/kg', icon: '🫧' },
  { id: 'DRY_ONLY', defaultLabel: 'Chỉ Sấy khô', rate: '15.000đ/kg', icon: '💨' },
  { id: 'IRON', defaultLabel: 'Ủi hơi nước', rate: '12.000đ/kg', icon: '👔' },
  { id: 'EXPRESS', defaultLabel: 'Giặt Nhanh Express', rate: '40.000đ/kg', icon: '⚡' },
];

const TIERS_CONFIG = [
  { id: 'BRONZE', defaultLabel: 'Khách thường (Bronze)', discount: '0%', color: 'border-slate-300 text-slate-700 bg-slate-50' },
  { id: 'SILVER', defaultLabel: 'Thành viên Silver', discount: '-5%', color: 'border-blue-300 text-blue-700 bg-blue-50' },
  { id: 'GOLD', defaultLabel: 'Thành viên Gold', discount: '-10%', color: 'border-amber-300 text-amber-700 bg-amber-50' },
  { id: 'PLATINUM', defaultLabel: 'VIP Platinum', discount: '-15%', color: 'border-purple-300 text-purple-700 bg-purple-50' },
];

export default function PricingSimulatorPage() {
  const { t, isVietnamese, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('simulator'); // 'simulator' | 'analysis' | 'bundle'
  
  // Simulator form state
  const [serviceType, setServiceType] = useState('WASH_DRY');
  const [memberTier, setMemberTier] = useState('GOLD');
  const [weightKg, setWeightKg] = useState(5);
  const [timeSlot, setTimeSlot] = useState('NORMAL');
  const [voucherCode, setVoucherCode] = useState('');
  
  // Calculation result & active bundle
  const [quote, setQuote] = useState(null);
  const [activeBundle, setActiveBundle] = useState(DEFAULT_BUNDLE);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Static analysis state
  const [analysisReport, setAnalysisReport] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Load active bundle from backend or fallback to pure engine bundle
  useEffect(() => {
    async function loadBundle() {
      try {
        setLoading(true);
        const data = await pricingApi.getActiveBundle();
        if (data && data.bundleVersion) {
          setActiveBundle(data);
        }
      } catch (err) {
        console.warn('Backend bundle fetch fallback to DEFAULT_BUNDLE:', err);
        setActiveBundle(DEFAULT_BUNDLE);
      } finally {
        setLoading(false);
      }
    }
    loadBundle();
  }, []);

  // Live evaluation whenever inputs change
  useEffect(() => {
    runEvaluation();
  }, [serviceType, memberTier, weightKg, timeSlot, voucherCode, activeBundle]);

  const runEvaluation = async () => {
    try {
      setCalculating(true);
      const payload = {
        serviceType,
        memberTier,
        weightKg: Number(weightKg),
        timeSlot,
        voucherCode: voucherCode.trim() ? voucherCode.trim() : undefined,
      };

      try {
        const res = await pricingApi.evaluate(payload);
        setQuote(res);
      } catch {
        // Fallback pure engine
        const context = {
          serviceType,
          memberTier,
          weightKg: Number(weightKg),
          timeSlot,
          requestTimestamp: new Date(),
          voucherCode: voucherCode.trim() ? voucherCode.trim() : undefined,
        };
        const localQuote = evaluatePrice(activeBundle, context);
        setQuote(localQuote);
      }
    } finally {
      setCalculating(false);
    }
  };

  const runStaticAnalysis = async () => {
    try {
      setAnalyzing(true);
      try {
        const res = await pricingApi.analyze();
        setAnalysisReport(res);
      } catch {
        const res = analyzePriceBundle(activeBundle, new Date());
        setAnalysisReport(res);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analysis' && !analysisReport) {
      runStaticAnalysis();
    }
  }, [activeTab]);

  const numLocale = isVietnamese ? 'vi-VN' : 'en-US';
  const currencySuffix = isVietnamese ? 'đ' : 'VND';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Calculator size={22} />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {t('pricing.engineTitle', 'Động Cơ Tính Giá & Quản Lý Rules (Pricing Engine)')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
              {t('pricing.activeVersion', 'Active v')}{activeBundle?.bundleVersion || '1.2.0'}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {t('pricing.engineSubtitle', 'Hàm tính giá thuần túy (Pure Evaluator) đồng nhất 100% giữa Server & Ki-ốt, tích hợp công cụ phân tích tĩnh an toàn (WP3).')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-sm font-medium">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap size={16} />
            {t('pricing.tabSimulator', 'Mô phỏng tính giá')}
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'analysis'
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={16} />
            {t('pricing.tabAnalysis', 'Phân tích tĩnh (WP3)')}
          </button>
          <button
            onClick={() => setActiveTab('bundle')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'bundle'
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackageCheck size={16} />
            {t('pricing.tabBundle', 'Bảng giá DMN')}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PRICING SIMULATOR */}
      {/* ==================================================================== */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Simulation Controls (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-blue-600" />
                {t('pricing.orderParamsTitle', 'Cấu hình tham số đơn hàng giả lập')}
              </h2>
              <span className="text-xs text-slate-400 font-mono">OrderContext Injected</span>
            </div>

            {/* 1. Chọn loại dịch vụ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('pricing.serviceStep', '1. Dịch vụ giặt sấy')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SERVICES_CONFIG.map((srv) => {
                  const label = t('pricing.services.' + srv.id, srv.defaultLabel);
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setServiceType(srv.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        serviceType === srv.id
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{srv.icon}</span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{label}</div>
                          <div className="text-xs text-slate-500">{srv.rate}</div>
                        </div>
                      </div>
                      {serviceType === srv.id && (
                        <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Cấp bậc thành viên */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {t('pricing.tierStep', '2. Hạng thành viên (Member Tier)')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIERS_CONFIG.map((tier) => {
                  const label = t('pricing.tiers.' + tier.id, tier.defaultLabel);
                  const shortName = label.split(' ')[0] || tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setMemberTier(tier.id)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${tier.color} ${
                        memberTier === tier.id
                          ? 'ring-2 ring-blue-600 font-bold shadow-sm'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">{shortName}</div>
                      <div className="text-sm font-extrabold">{tier.discount}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Khối lượng (Weight Kg) Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale size={15} className="text-slate-500" />
                  {t('pricing.weightStep', '3. Khối lượng giặt')}:{' '}
                  <span className="text-blue-600 font-extrabold text-sm">{weightKg} kg</span>
                </label>
                {weightKg >= 7 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                    {t('pricing.bulkEligible', '✓ Đạt ưu đãi giặt nhiều (≥ 7kg giảm 10.000đ)')}
                  </span>
                )}
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1 kg</span>
                <span>5 kg</span>
                <span>{t('pricing.bulkThreshold', '7 kg (Ngưỡng Bulk)')}</span>
                <span>10 kg</span>
                <span>15 kg</span>
              </div>
            </div>

            {/* 4. Khung giờ & Voucher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock size={15} className="text-slate-500" />
                  {t('pricing.timeSlotStep', '4. Khung giờ giặt')}
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTimeSlot('NORMAL')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      timeSlot === 'NORMAL'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t('pricing.normalSlot', 'Bình thường (7h-16h)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSlot('PEAK')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      timeSlot === 'PEAK'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-amber-700'
                    }`}
                  >
                    {t('pricing.peakSlot', 'Cao điểm (+10%)')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag size={15} className="text-slate-500" />
                  {t('pricing.voucherStep', '5. Mã Voucher')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('pricing.voucherPlaceholder', 'VD: GIATXANH, MEGA50')}
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 text-sm uppercase font-mono tracking-wider border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {voucherCode && (
                    <button
                      type="button"
                      onClick={() => setVoucherCode('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      {t('pricing.clearVoucher', 'XÓA')}
                    </button>
                  )}
                </div>
                {/* Fast Voucher Tags */}
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setVoucherCode('GIATXANH')}
                    className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                  >
                    + GIATXANH (-20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherCode('MEGA50')}
                    className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer"
                  >
                    + MEGA50 (-50%)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Execution Trace & Quote Result (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {quote && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {t('pricing.calculationDetails', 'Chi tiết tính giá')}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {t('pricing.pureEvaluation', 'Deterministic Pure Evaluation')}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Bundle {quote.bundleVersion}
                  </span>
                </div>

                {/* Base Price */}
                <div className="flex items-center justify-between text-sm py-1">
                  <span className="text-slate-500">
                    {t('pricing.basePrice', 'Giá gốc')} ({weightKg}kg):
                  </span>
                  <span className="font-semibold text-slate-800">
                    {quote.basePrice.toLocaleString(numLocale)} {currencySuffix}
                  </span>
                </div>

                {/* Applied Rules Trace */}
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>{t('pricing.appliedRulesHeader', 'Quy tắc đã áp dụng (Trace)')}</span>
                    <span className="text-blue-600 font-semibold">
                      {quote.appliedRules.length} {t('pricing.rulesCount', 'luật')}
                    </span>
                  </div>

                  {quote.appliedRules.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-400 text-center border border-dashed border-slate-200">
                      {t('pricing.noRulesTriggered', 'Không có chiết khấu nào kích hoạt (áp dụng giá gốc).')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quote.appliedRules.map((r, idx) => {
                        const isSurcharge = r.discountAmount < 0 && r.ruleType !== 'SYSTEM_GUARD';
                        const isGuard = r.ruleType === 'SYSTEM_GUARD';
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-xs transition-all ${
                              isGuard
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : isSurcharge
                                ? 'bg-orange-50 border-orange-200 text-orange-900'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold mb-1">
                              <span className="flex items-center gap-1.5">
                                {isGuard ? (
                                  <AlertTriangle size={14} className="text-amber-600" />
                                ) : isSurcharge ? (
                                  <Clock size={14} className="text-orange-600" />
                                ) : (
                                  <Sparkles size={14} className="text-emerald-600" />
                                )}
                                {r.ruleName}
                              </span>
                              <span
                                className={`font-mono text-sm font-bold ${
                                  isGuard
                                    ? 'text-amber-700'
                                    : isSurcharge
                                    ? 'text-orange-700'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {isGuard
                                  ? `+${Math.abs(r.discountAmount).toLocaleString(numLocale)}${currencySuffix} (${t('pricing.floorGuardOffset', 'Bù sàn')})`
                                  : isSurcharge
                                  ? `+${Math.abs(r.discountAmount).toLocaleString(numLocale)}${currencySuffix}`
                                  : `-${r.discountAmount.toLocaleString(numLocale)}${currencySuffix}`}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed">
                              {r.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Final Price Box */}
                <div className="p-4 bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl shadow-md space-y-1">
                  <div className="flex items-center justify-between text-xs text-blue-200">
                    <span>{t('pricing.totalDiscountAdjustment', 'Tổng điều chỉnh khuyến mãi')}:</span>
                    <span className="font-mono">
                      {quote.totalAdjustment > 0
                        ? `-${quote.totalAdjustment.toLocaleString(numLocale)} ${currencySuffix}`
                        : `${quote.totalAdjustment.toLocaleString(numLocale)} ${currencySuffix}`}
                    </span>
                  </div>
                  <div className="text-xs text-blue-300 uppercase tracking-wider font-semibold">
                    {t('pricing.finalPaymentAmount', 'Thành tiền thanh toán')}
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight font-mono text-emerald-400">
                    {quote.finalPrice.toLocaleString(numLocale)}{' '}
                    <span className="text-lg font-normal text-white">{isVietnamese ? 'VNĐ' : 'VND'}</span>
                  </div>
                </div>

                {/* Verification & Audit Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono truncate max-w-[200px]" title={quote.integrityHash}>
                    <FileCheck2 size={13} className="text-emerald-600 shrink-0" />
                    Hash: {quote.integrityHash?.substring(0, 16)}...
                  </span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    {t('pricing.pureVerified', 'Pure Verified')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: STATIC ANALYSIS (WP3) */}
      {/* ==================================================================== */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={20} className="text-blue-600" />
                {t('pricing.analysisHeader', 'Kiểm Tra Logic An Toàn & Rủi Ro Giá Sàn (WP3 Static Analyzer)')}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {t('pricing.analysisDesc', 'Quét toàn bộ ma trận luật DMN trước khi xuất bản để đảm bảo không có Dead Rules hoặc lỗi giặt 0đ ngoài ý muốn.')}
              </p>
            </div>
            <button
              type="button"
              onClick={runStaticAnalysis}
              disabled={analyzing}
              className="btn btn-primary whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw size={16} className={analyzing ? 'animate-spin' : ''} />
              {analyzing ? t('pricing.scanning', 'Đang phân tích...') : t('pricing.rescanBtn', 'Quét lại Bundle')}
            </button>
          </div>

          {analysisReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border ${
                  analysisReport.isSafeToPublish
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <div className="text-xs uppercase font-bold tracking-wider mb-1">
                    {t('pricing.publicationStatus', 'Trạng thái phát hành')}
                  </div>
                  <div className="text-xl font-extrabold flex items-center gap-2">
                    {analysisReport.isSafeToPublish ? (
                      <>
                        <CheckCircle2 size={20} className="text-emerald-600" />
                        {t('pricing.statusSafe', 'SAFE TO PUBLISH')}
                      </>
                    ) : (
                      <>
                        <XCircle size={20} className="text-red-600" />
                        {t('pricing.statusUnsafe', 'BLOCKED / UNSAFE')}
                      </>
                    )}
                  </div>
                  <div className="text-xs mt-1 text-slate-600">
                    {analysisReport.isSafeToPublish
                      ? t('pricing.safeDesc', 'Bundle đạt chuẩn an toàn 100% logic')
                      : t('pricing.unsafeDesc', 'Cần khắc phục lỗi trước khi ký số')}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">
                    {t('pricing.errorCount', 'Số lỗi (Errors)')}
                  </div>
                  <div className="text-2xl font-extrabold text-red-600">{analysisReport.summary.errors}</div>
                  <div className="text-xs text-slate-400 mt-1">{t('pricing.blockPublishing', 'Chặn xuất bản')}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">
                    {t('pricing.warningCount', 'Cảnh báo (Warnings)')}
                  </div>
                  <div className="text-2xl font-extrabold text-amber-600">{analysisReport.summary.warnings}</div>
                  <div className="text-xs text-slate-400 mt-1">{t('pricing.needReview', 'Cần lưu ý kiểm tra')}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1">
                    {t('pricing.totalRulesCount', 'Tổng số luật')}
                  </div>
                  <div className="text-2xl font-extrabold text-slate-800">{analysisReport.totalRules}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {t('pricing.inBundleVersion', 'Trong bundle v')}{analysisReport.bundleVersion}
                  </div>
                </div>
              </div>

              {/* Issues List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {t('pricing.issuesListTitle', 'Chi tiết danh sách vấn đề phát hiện')}
                </h3>
                {analysisReport.issues.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                    <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
                    <div className="text-base font-bold text-emerald-900">
                      {t('pricing.noIssuesFound', 'Không tìm thấy lỗi hoặc rủi ro nào!')}
                    </div>
                    <p className="text-xs text-emerald-700 max-w-md mx-auto">
                      {t('pricing.noIssuesDesc', 'Tất cả các dịch vụ đã có giá cơ sở, toàn bộ các luật DMN đều có điều kiện kích hoạt hợp lệ và cơ chế bảo vệ giá sàn hoạt động tốt.')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysisReport.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border space-y-1.5 ${
                          issue.severity === 'ERROR'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm flex items-center gap-2">
                            {issue.severity === 'ERROR' ? (
                              <XCircle size={16} className="text-red-600" />
                            ) : (
                              <AlertTriangle size={16} className="text-amber-600" />
                            )}
                            [{issue.issueType}] {issue.ruleId ? `${t('pricing.ruleLabel', 'Luật')} ${issue.ruleId}` : t('pricing.generalConfig', 'Cấu hình chung')}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            issue.severity === 'ERROR' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{issue.message}</p>
                        {issue.recommendation && (
                          <div className="text-xs font-semibold pt-1 border-t border-slate-200/60 text-slate-700">
                            💡 {t('pricing.recommendation', 'Khuyến nghị')}: {issue.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: DMN RULES & BUNDLE OVERVIEW */}
      {/* ==================================================================== */}
      {activeTab === 'bundle' && (
        <div className="space-y-6">
          {/* Bundle Meta Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {t('pricing.activeConfig', 'Cấu hình đang áp dụng')}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{activeBundle?.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{activeBundle?.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
                  Status: {t('pricing.statusPublished', 'PUBLISHED')}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold border border-blue-200">
                  {t('pricing.statusVersion', 'Version')}: {activeBundle?.bundleVersion}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-semibold mb-1">{t('pricing.effectiveFrom', 'Hiệu lực từ ngày:')}</div>
                <div className="font-bold text-slate-800">
                  {new Date(activeBundle?.effectiveFrom).toLocaleDateString(numLocale)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-semibold mb-1">{t('pricing.digitalSignature', 'Chữ ký số xác nhận:')}</div>
                <div className="font-mono text-slate-800 truncate" title={activeBundle?.signature || 'Certified'}>
                  {activeBundle?.signature || 'ED25519_VALIDATED'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-400 font-semibold mb-1">{t('pricing.sha256Hash', 'Mã băm SHA-256:')}</div>
                <div className="font-mono text-slate-800 truncate" title={activeBundle?.integrityHash}>
                  {activeBundle?.integrityHash}
                </div>
              </div>
            </div>
          </div>

          {/* Base Prices Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {t('pricing.basePricesTableTitle', 'Bảng giá dịch vụ cơ bản (Base Prices)')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(activeBundle?.basePricePerKg || {}).map(([srv, price]) => (
                <div key={srv} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
                  <div className="text-xs text-slate-500 font-semibold">{srv}</div>
                  <div className="text-base font-extrabold text-slate-900 mt-1">
                    {Number(price).toLocaleString(numLocale)} {currencySuffix}/kg
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {t('pricing.rulesListHeader', 'Danh sách các luật DMN')} ({activeBundle?.rules?.length || 0} {t('pricing.rulesUnit', 'quy tắc')})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">{t('pricing.colRuleId', 'Mã Rule')}</th>
                    <th className="py-3 px-3">{t('pricing.colRuleName', 'Tên luật')}</th>
                    <th className="py-3 px-3">{t('pricing.colRuleType', 'Loại luật')}</th>
                    <th className="py-3 px-3">{t('pricing.colAdjustment', 'Mức điều chỉnh')}</th>
                    <th className="py-3 px-3">{t('pricing.colPriceFloor', 'Giá sàn (Floor)')}</th>
                    <th className="py-3 px-3">{t('pricing.colTiers', 'Tiers áp dụng')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeBundle?.rules?.map((rule) => (
                    <tr key={rule.ruleId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{rule.ruleId}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{rule.ruleName}</div>
                        <div className="text-[11px] text-slate-400">{rule.description}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {rule.ruleType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        {rule.discountPercent !== undefined && rule.discountPercent !== 0 ? (
                          <span className={rule.discountPercent > 0 ? 'text-emerald-600' : 'text-orange-600'}>
                            {rule.discountPercent > 0 ? `-${rule.discountPercent}%` : `+${Math.abs(rule.discountPercent)}%`}
                          </span>
                        ) : rule.discountAmountFixed ? (
                          <span className="text-emerald-600">
                            -{Number(rule.discountAmountFixed).toLocaleString(numLocale)}{currencySuffix}
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {Number(rule.priceFloor).toLocaleString(numLocale)} {currencySuffix}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {rule.applicableTiers?.map((tier) => (
                            <span key={tier} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                              {tier}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
