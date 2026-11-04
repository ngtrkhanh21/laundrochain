import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Clock,
  Coins,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  Info,
  Timer,
  Lock,
} from 'lucide-react';
import { pricingApi } from '../api/pricingApi';

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

export default function PriceFloorConfigSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Server state
  const [serverConfig, setServerConfig] = useState(null);

  // Form state
  const [priceFloorPct, setPriceFloorPct] = useState(50);
  const [priceFloorAmount, setPriceFloorAmount] = useState(15000);
  const [quoteTtlSeconds, setQuoteTtlSeconds] = useState(600);
  const [machineHoldSeconds, setMachineHoldSeconds] = useState(600);
  const [bundleMaxAgeHours, setBundleMaxAgeHours] = useState(72);

  // Load config from backend
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pricingApi.getPricingConfig();
      if (data) {
        setServerConfig(data);
        setPriceFloorPct(data.priceFloorPct ?? 50);
        setPriceFloorAmount(data.priceFloorAmount ?? 15000);
        setQuoteTtlSeconds(data.quoteTtlSeconds ?? 600);
        setMachineHoldSeconds(data.machineHoldSeconds ?? 600);
        setBundleMaxAgeHours(data.bundleMaxAgeHours ?? 72);
      }
    } catch (err) {
      console.warn('Không thể tải cấu hình giá sàn từ backend:', err);
      setError(err?.message || 'Không thể tải cấu hình từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Apply Quick Presets
  const applyPreset = (preset) => {
    if (preset === 'DEFAULT_SAFE') {
      setPriceFloorPct(50);
      setPriceFloorAmount(15000);
      setQuoteTtlSeconds(600);
      setMachineHoldSeconds(600);
    } else if (preset === 'HIGH_SECURITY') {
      setPriceFloorPct(60);
      setPriceFloorAmount(20000);
      setQuoteTtlSeconds(300);
      setMachineHoldSeconds(300);
    } else if (preset === 'HIGH_PROMO') {
      setPriceFloorPct(30);
      setPriceFloorAmount(10000);
      setQuoteTtlSeconds(900);
      setMachineHoldSeconds(900);
    }
  };

  const handleReset = () => {
    if (serverConfig) {
      setPriceFloorPct(serverConfig.priceFloorPct ?? 50);
      setPriceFloorAmount(serverConfig.priceFloorAmount ?? 15000);
      setQuoteTtlSeconds(serverConfig.quoteTtlSeconds ?? 600);
      setMachineHoldSeconds(serverConfig.machineHoldSeconds ?? 600);
      setBundleMaxAgeHours(serverConfig.bundleMaxAgeHours ?? 72);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setToast('');

    // Client validation
    if (priceFloorPct < 1 || priceFloorPct > 100) {
      setError('Tỷ lệ giá sàn phải từ 1% đến 100% (không được để 0% để tránh giặt miễn phí).');
      return;
    }
    if (priceFloorAmount < 2000) {
      setError('Mức giá sàn tối thiểu phải từ 2.000đ trở lên.');
      return;
    }
    if (quoteTtlSeconds < 60 || quoteTtlSeconds > 3600) {
      setError('Thời hạn giữ báo giá phải từ 60 đến 3.600 giây (1 - 60 phút).');
      return;
    }
    if (machineHoldSeconds < 60 || machineHoldSeconds > 3600) {
      setError('Thời hạn giữ máy phải từ 60 đến 3.600 giây (1 - 60 phút).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        priceFloorPct: Number(priceFloorPct),
        priceFloorAmount: Number(priceFloorAmount),
        quoteTtlSeconds: Number(quoteTtlSeconds),
        machineHoldSeconds: Number(machineHoldSeconds),
        bundleMaxAgeHours: Number(bundleMaxAgeHours) || undefined,
      };

      const res = await pricingApi.updatePricingConfig(payload);
      setServerConfig(res);
      setToast('Cập nhật cấu hình giá sàn (Price Floor) & thời hạn giữ chỗ thành công!');
      setTimeout(() => setToast(''), 4000);
    } catch (err) {
      setError(err?.message || 'Cập nhật cấu hình giá sàn thất bại.');
    } finally {
      setSaving(false);
    }
  };

  // Live simulation for preview card
  const sampleBasePrice = 32000; // Giặt 10kg tiêu chuẩn
  const sampleDiscountPct = 70; // Khách có voucher khủng 70%
  const discountedPrice = Math.round(sampleBasePrice * (1 - sampleDiscountPct / 100)); // 9.600đ
  const floorByPct = Math.round(sampleBasePrice * (priceFloorPct / 100)); // ví dụ 50% = 16.000đ
  const finalPrice = Math.max(discountedPrice, floorByPct, priceFloorAmount);
  const savedRevenue = finalPrice - discountedPrice;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Cấu hình Giá Sàn (Price Floor Guard) & Hạn Giữ Chỗ
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Hệ Thống An Toàn
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Bảo vệ doanh thu: ngăn ngừa cộng dồn voucher / giờ vàng gây lỗ hoặc giặt 0đ, đồng thời kiểm soát thời hạn giữ chỗ máy.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadConfig}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Tải lại</span>
        </button>
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

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Tỷ lệ giá sàn (Floor %)</span>
            <Lock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {priceFloorPct}%
          </div>
          <p className="text-[11px] text-slate-400">
            Giảm giá tối đa được phép: <strong>{100 - priceFloorPct}%</strong>
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Giá sàn tối thiểu</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {formatVnd(priceFloorAmount)}
          </div>
          <p className="text-[11px] text-slate-400">
            Hóa đơn mẻ giặt không bao giờ dưới mức này
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Hạn giữ báo giá</span>
            <Timer className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {Math.round(quoteTtlSeconds / 60)} phút
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {quoteTtlSeconds} giây (Quote TTL)
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Hạn tạm giữ máy</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {Math.round(machineHoldSeconds / 60)} phút
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {machineHoldSeconds} giây (Hold TTL)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Edit Controls (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Điều chỉnh thông số giá sàn & thời gian
              </h3>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => applyPreset('DEFAULT_SAFE')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer transition"
                title="Mẫu tiêu chuẩn: Sàn 50%, 15.000đ, 600s"
              >
                Mẫu chuẩn (50% / 15k)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('HIGH_SECURITY')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer transition"
                title="Sàn chặt chẽ: 60%, 20.000đ, 300s"
              >
                Chặt chẽ (60% / 20k)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('HIGH_PROMO')}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer transition"
                title="Khuyến mãi cao: 30%, 10.000đ, 900s"
              >
                Khuyến mại (30% / 10k)
              </button>
            </div>
          </div>

          {/* 1. Tỷ lệ giá sàn (priceFloorPct) */}
          <div className="space-y-2 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Tỷ lệ giá sàn tối thiểu (priceFloorPct):</span>
              </label>
              <span className="text-base font-black font-mono text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
                {priceFloorPct}%
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={priceFloorPct}
              onChange={(e) => setPriceFloorPct(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />

            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
              <span>1% (Cho phép giảm 99%)</span>
              <span className="text-indigo-600 font-bold">Khuyến nghị: 50%</span>
              <span>100% (Không cho phép giảm)</span>
            </div>

            <p className="text-[11.5px] text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
              Mức giá sàn theo tỷ lệ: Nếu dịch vụ 30.000đ và đặt sàn 50%, thì dù áp dụng bao nhiêu voucher, khách vẫn phải trả ít nhất <strong>{formatVnd(30000 * (priceFloorPct / 100))}</strong>.
            </p>
          </div>

          {/* 2. Mức giá sàn tuyệt đối (priceFloorAmount) */}
          <div className="space-y-2 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Mức giá sàn tối thiểu tuyệt đối (priceFloorAmount):</span>
              </label>
              <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-xl border border-amber-200 dark:border-amber-800">
                {formatVnd(priceFloorAmount)}
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min="2000"
                step="1000"
                value={priceFloorAmount}
                onChange={(e) => setPriceFloorAmount(Number(e.target.value))}
                className="w-full p-2.5 pr-14 text-sm font-mono font-bold rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20"
                placeholder="15000"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                VNĐ
              </span>
            </div>

            <p className="text-[11.5px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
              Ngưỡng chặn tuyệt đối: Áp dụng khi mẻ giặt sau khi chiết khấu bị tụt xuống dưới mức này. Tối thiểu từ 2.000đ trở lên.
            </p>
          </div>

          {/* 3. Quote TTL & Machine Hold Timers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hạn giữ báo giá (quoteTtlSeconds):</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="60"
                  max="3600"
                  step="30"
                  value={quoteTtlSeconds}
                  onChange={(e) => setQuoteTtlSeconds(Number(e.target.value))}
                  className="flex-1 p-2 rounded-xl text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  = {Math.round(quoteTtlSeconds / 60)} phút
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Hiệu lực của báo giá trước khi phải kiểm tra lại (60 - 3600s).
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Hạn giữ máy (machineHoldSeconds):</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="60"
                  max="3600"
                  step="30"
                  value={machineHoldSeconds}
                  onChange={(e) => setMachineHoldSeconds(Number(e.target.value))}
                  className="flex-1 p-2 rounded-xl text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  = {Math.round(machineHoldSeconds / 60)} phút
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Thời gian tạm giữ chỗ máy giặt cho khách thanh toán (60 - 3600s).
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Khôi phục ban đầu</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu cấu hình...' : 'Lưu cấu hình giá sàn'}</span>
            </button>
          </div>
        </form>

        {/* Right Panel: Simulation & Explanation (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card Simulation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mô phỏng cơ chế kẹp giá sàn
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Dịch vụ mẫu: Giặt tiêu chuẩn 10kg</span>
                <span className="font-mono font-bold">{formatVnd(sampleBasePrice)}</span>
              </div>
              <div className="flex items-center justify-between text-rose-600 font-medium">
                <span>Khách áp voucher cộng dồn ưu đãi (giảm 70%):</span>
                <span className="font-mono font-bold">-{formatVnd(sampleBasePrice * 0.7)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 border-t border-slate-200 dark:border-slate-700 pt-2">
                <span>Giá nếu không có Giá Sàn:</span>
                <span className="font-mono font-bold line-through text-slate-400">
                  {formatVnd(discountedPrice)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-1.5 text-indigo-950 dark:text-indigo-200">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Giá sàn quy định ({priceFloorPct}% hoặc tối thiểu {formatVnd(priceFloorAmount)}):</span>
                  </span>
                  <span className="font-mono">{formatVnd(Math.max(floorByPct, priceFloorAmount))}</span>
                </div>
                <div className="flex items-center justify-between text-base font-black text-indigo-700 dark:text-indigo-300 pt-1 border-t border-indigo-200/60 dark:border-indigo-800/60">
                  <span>Giá thanh toán thực tế:</span>
                  <span className="font-mono text-lg">{formatVnd(finalPrice)}</span>
                </div>
              </div>

              {savedRevenue > 0 && (
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    Bảo vệ doanh thu: Đã ngăn thất thoát <strong>{formatVnd(savedRevenue)}</strong> cho trạm!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card Documentation Info */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
              <Info className="w-4 h-4 text-blue-500" />
              <span>Quy tắc vận hành Giá Sàn (WP3 Guard Rules):</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 leading-relaxed text-[11.5px]">
              <li>
                <strong>PriceFloorPct:</strong> Luôn kẹp giá thanh toán cuối cùng không bao giờ thấp hơn tỷ lệ phần trăm này so với giá niêm yết ban đầu.
              </li>
              <li>
                <strong>PriceFloorAmount:</strong> Ngưỡng chặn tiền mặt cố định tuyệt đối cho mỗi mẻ giặt/sấy.
              </li>
              <li>
                <strong>Quote TTL:</strong> Ngăn ngừa khách hàng giữ báo giá quá lâu trong khi giá trạm hoặc giờ cao điểm đã biến động.
              </li>
              <li>
                <strong>Machine Hold:</strong> Tự động nhả máy cho khách khác nếu sau thời hạn giữ chỗ khách chưa tiến hành quét mã thanh toán.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
