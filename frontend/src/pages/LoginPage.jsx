import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { authApi } from '../api/authApi';
import { machinesApi } from '../api/machinesApi';
import {
  WashingMachine,
  Eye,
  EyeOff,
  LogIn,
  Shield,
  DollarSign,
  Building2,
  Wrench,
  AlertCircle,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Zap,
  CreditCard,
  Clock,
  Lock,
  X,
  RotateCw,
} from 'lucide-react';
import QRCode from 'qrcode';

// Tài khoản mẫu 5 roles cho nhân viên / kỹ thuật viên đăng nhập nội bộ
const QUICK_LOGIN_ACCOUNTS = [
  { username: 'admin', password: 'Password@123', label: 'Admin', role: 'ADMIN', icon: Shield, color: '#a855f7' },
  { username: 'pricing', password: 'Password@123', label: 'Pricing Mgr', role: 'PRICING_MANAGER', icon: DollarSign, color: '#10b981' },
  { username: 'sitemgr', password: 'Password@123', label: 'Site Mgr', role: 'SITE_MANAGER', icon: Building2, color: '#f59e0b' },
  { username: 'tech', password: 'Password@123', label: 'Technician', role: 'TECHNICIAN', icon: Wrench, color: '#06b6d4' },
];

export default function LoginPage() {
  const { isAuthenticated, login, loginWithToken, loginAsGuest } = useAuth();
  const { isVietnamese } = useLanguage();
  const navigate = useNavigate();

  // State cho Kiosk QR Login (Hội viên)
  const [qrSession, setQrSession] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState('PENDING'); // PENDING | SCANNED | CONFIRMED | EXPIRED
  const [qrStatusMessage, setQrStatusMessage] = useState('');
  const [scannedUser, setScannedUser] = useState('');
  const pollingRef = useRef(null);
  const autoRefreshTimerRef = useRef(null);
  const startNewQrSessionRef = useRef(null);

  // Kiosk Assigned Site
  const [kioskSite, setKioskSite] = useState(() => {
    const savedId = localStorage.getItem('laundro_kiosk_site_id');
    const savedName = localStorage.getItem('laundro_kiosk_site_name');
    const savedCode = localStorage.getItem('laundro_kiosk_site_code');
    if (savedId) {
      return { id: savedId, siteId: savedId, name: savedName || '', code: savedCode || '' };
    }
    return null;
  });

  // Tự động gán trạm mặc định đầu tiên nếu Ki-ốt chưa được gán trạm
  useEffect(() => {
    async function resolveKioskSite() {
      const savedId = localStorage.getItem('laundro_kiosk_site_id');
      if (!savedId) {
        try {
          const res = await machinesApi.getSites();
          const list = Array.isArray(res) ? res : (res?.value || []);
          if (list.length > 0) {
            const first = list[0];
            const siteId = first.siteId || first.id;
            localStorage.setItem('laundro_kiosk_site_id', siteId);
            localStorage.setItem('laundro_kiosk_site_name', first.name || '');
            localStorage.setItem('laundro_kiosk_site_code', first.code || '');
            localStorage.setItem('laundro_kiosk_site_address', first.address || '');
            setKioskSite({ id: siteId, siteId, name: first.name || '', code: first.code || '' });
          }
        } catch (e) {
          console.warn('Auto resolve kiosk site error', e);
        }
      }
    }
    resolveKioskSite();
  }, []);

  // Modal quản trị viên / kỹ thuật viên (ẩn kín dưới chân trang)
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminQuickLoading, setAdminQuickLoading] = useState(null);
  const [adminError, setAdminError] = useState('');

  const stopQrPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
  }, []);

  const startNewQrSession = useCallback(async () => {
    stopQrPolling();
    setQrLoading(true);
    setQrStatus('PENDING');
    setScannedUser('');
    setQrStatusMessage(isVietnamese ? 'Đang chờ quét mã QR...' : 'Waiting for mobile scan...');

    try {
      const siteName = kioskSite?.name || localStorage.getItem('laundro_kiosk_site_name');
      const deviceName = siteName ? `Kiosk ${siteName}` : 'Kiosk Trạm Giặt LaundroChain #01';
      const res = await authApi.initQrLogin({
        deviceName,
        expirationSeconds: 180,
      });

      let localQrUrl = res.qrImageUrl;
      if (res.qrData) {
        try {
          localQrUrl = await QRCode.toDataURL(res.qrData, {
            width: 280,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
        } catch (e) {
          console.warn('QR gen warning:', e);
        }
      }

      setQrSession({ ...res, localQrUrl });
      setQrLoading(false);

      // Bắt đầu Polling kiểm tra trạng thái mỗi 1.8s (chỉ tạo lại mã mới khi mã cũ ĐÃ HẾT HẠN - EXPIRED)
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await authApi.checkQrStatus(res.sessionId, res.qrToken);
          setQrStatus(statusRes.status);
          if (statusRes.message) setQrStatusMessage(statusRes.message);
          if (statusRes.scannedUserDisplay) setScannedUser(statusRes.scannedUserDisplay);

          if (statusRes.status === 'CONFIRMED' && statusRes.auth) {
            stopQrPolling();
            if (loginWithToken) {
              loginWithToken(statusRes.auth.accessToken, statusRes.auth.user);
            }
            setTimeout(() => {
              navigate('/dashboard');
            }, 600);
          } else if (statusRes.status === 'EXPIRED' || statusRes.status === 'REJECTED') {
            stopQrPolling();
            // Tự động tạo lại mã QR mới ngay khi hết hạn hoặc bị từ chối
            startNewQrSessionRef.current?.();
          }
        } catch {
          // Bỏ qua lỗi mạng tạm thời
        }
      }, 1800);
    } catch (err) {
      setQrLoading(false);
      console.warn('Init QR login error', err);
      // Tự động thử lại sau 3s nếu lỗi kết nối
      autoRefreshTimerRef.current = setTimeout(() => {
        startNewQrSessionRef.current?.();
      }, 3000);
    }
  }, [isVietnamese, loginWithToken, navigate, stopQrPolling]);

  useEffect(() => {
    startNewQrSessionRef.current = startNewQrSession;
  }, [startNewQrSession]);

  // Tự động chuyển trang khi đã có phiên đăng nhập (khách vãng lai và thành viên vào mục giới thiệu /dashboard)
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Khởi tạo phiên mã QR Ki-ốt khi tải trang
  useEffect(() => {
    startNewQrSession();
    return () => stopQrPolling();
  }, [startNewQrSession, stopQrPolling]);


  // Xử lý khi bấm nút "BẮT ĐẦU ĐẶT GIẶT NGAY" (Khách vãng lai chuyển vào mục Giới thiệu & Hướng dẫn)
  const handleGuestOrderStart = () => {
    if (loginAsGuest) {
      loginAsGuest('', 'Khách vãng lai');
    }
    navigate('/dashboard');
  };

  // Xử lý đăng nhập mật khẩu trong modal Admin
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminForm.username.trim() || !adminForm.password) {
      setAdminError(isVietnamese ? 'Vui lòng nhập đầy đủ tài khoản và mật khẩu' : 'Please enter credentials');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    const result = await login(adminForm.username.trim(), adminForm.password);
    setAdminLoading(false);
    if (result.success) {
      setShowAdminModal(false);
      navigate('/dashboard');
    } else {
      setAdminError(result.error || (isVietnamese ? 'Tài khoản hoặc mật khẩu không đúng' : 'Invalid credentials'));
    }
  };

  const handleAdminQuickLogin = async (acc) => {
    setAdminQuickLoading(acc.role);
    setAdminError('');
    const result = await login(acc.username, acc.password, acc.role);
    setAdminQuickLoading(null);
    if (result.success) {
      setShowAdminModal(false);
      navigate('/dashboard');
    } else {
      setAdminError(result.error || (isVietnamese ? 'Đăng nhập thất bại' : 'Login failed'));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Controls: Switch to Mobile App UI + Language Switcher */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20 flex items-center gap-2.5">
        <Link
          to="/mobile-login"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm transition active:scale-95"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">{isVietnamese ? 'Giao diện App Mobile' : 'Mobile App UI'}</span>
          <span className="sm:hidden">{isVietnamese ? 'App Mobile' : 'App'}</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* ========================================================= */}
      {/* KHUNG TRUNG TÂM KI-ỐT LAUNDROCHAIN                        */}
      {/* ========================================================= */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-8 lg:p-10 relative z-10 space-y-7 animate-in fade-in duration-300">

        {/* Kiosk Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-xs font-black tracking-wider uppercase shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>
              {isVietnamese
                ? `TRẠM GIẶT TỰ ĐỘNG THÔNG MINH • ${kioskSite?.name || localStorage.getItem('laundro_kiosk_site_name') || '#01'}`
                : `SMART SELF-SERVICE LAUNDROMAT • ${kioskSite?.name || localStorage.getItem('laundro_kiosk_site_name') || '#01'}`}
            </span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <WashingMachine className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Laundro<span className="text-blue-600 dark:text-blue-400">Chain</span>{' '}
              <span className="text-lg sm:text-xl font-bold text-slate-400 dark:text-slate-500">Kiosk</span>
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {isVietnamese
              ? 'Chào mừng quý khách! Vui lòng chọn hình thức sử dụng dịch vụ tại trạm'
              : 'Welcome! Please select how you would like to use our laundromat services'}
          </p>
        </div>

        {/* ========================================================= */}
        {/* MÀN HÌNH CHIA LÀM 2 BÊN: 1 BÊN QUÉT MÃ - 1 BÊN VÃNG LAI   */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">

          {/* ======================================================= */}
          {/* CỘT TRÁI: HỘI VIÊN • QUÉT MÃ QR TỪ ỨNG DỤNG MOBILE      */}
          {/* ======================================================= */}
          <div className="p-6 sm:p-7 rounded-3xl border-2 border-blue-200/90 dark:border-blue-900/60 bg-blue-50/40 dark:bg-slate-900/60 flex flex-col justify-between text-center space-y-4 shadow-sm hover:shadow-md transition">

            {/* Header Cột Trái */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] uppercase tracking-wide">
                <Smartphone className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'HỘI VIÊN • QUÉT MÃ APP' : 'MEMBER • APP QR SCAN'}</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white pt-1">
                {isVietnamese ? 'Đăng nhập bằng Điện thoại' : 'Mobile App Login'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVietnamese
                  ? 'Dùng số dư ví, ưu đãi thành viên & tích điểm tích lũy'
                  : 'Use member wallet balance, vouchers & earn reward points'}
              </p>
            </div>

            {/* Viewfinder Frame bọc mã QR */}
            <div className="py-2">
              <div className="relative inline-block p-3.5 bg-white rounded-2xl border-2 border-blue-500/30 shadow-md">
                {/* 4 Corner Target Brackets */}
                <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-blue-600 rounded-tl-md" />
                <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-blue-600 rounded-tr-md" />
                <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-blue-600 rounded-bl-md" />
                <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-blue-600 rounded-br-md" />

                {qrLoading ? (
                  <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold text-slate-500">
                      {isVietnamese ? 'Đang tạo mã QR...' : 'Generating QR...'}
                    </span>
                  </div>
                ) : qrSession?.localQrUrl || qrSession?.qrImageUrl ? (
                  <div className="relative">
                    <img
                      src={qrSession.localQrUrl || qrSession.qrImageUrl}
                      alt="Kiosk Login QR Code"
                      className="w-52 h-52 mx-auto rounded-lg object-contain"
                    />

                    {/* Overlay khi người dùng vừa quét xong */}
                    {qrStatus === 'SCANNED' && (
                      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs rounded-lg flex flex-col items-center justify-center p-3 text-white animate-in fade-in">
                        <Smartphone className="w-10 h-10 text-cyan-400 animate-bounce" />
                        <div className="text-sm font-extrabold mt-2">
                          {isVietnamese ? 'Đã quét mã!' : 'Scanned!'}
                        </div>
                        <div className="text-[11px] text-slate-300 text-center mt-1">
                          {scannedUser ? `Hội viên: ${scannedUser}` : isVietnamese ? 'Vui lòng xác nhận trên điện thoại' : 'Please confirm on your phone'}
                        </div>
                      </div>
                    )}

                    {/* Overlay khi xác nhận thành công */}
                    {qrStatus === 'CONFIRMED' && (
                      <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-xs rounded-lg flex flex-col items-center justify-center text-white animate-in fade-in">
                        <CheckCircle2 className="w-12 h-12" />
                        <div className="text-base font-extrabold mt-2">
                          {isVietnamese ? 'Thành công!' : 'Success!'}
                        </div>
                        <div className="text-xs text-emerald-100">
                          {isVietnamese ? 'Đang mở phiên Ki-ốt...' : 'Opening Kiosk session...'}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-400 gap-2.5">
                    <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold text-slate-500">
                      {isVietnamese ? 'Đang tự động cập nhật mã QR...' : 'Refreshing QR Code...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Status pill: Đang chờ quét */}
              <div className="mt-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-100/90 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                  <span>{qrStatusMessage || (isVietnamese ? 'Đang chờ quét mã QR...' : 'Waiting for scan...')}</span>
                </span>
              </div>
            </div>

            {/* 3-Step Guide for Members */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-extrabold text-[10px] flex items-center justify-center mx-auto mb-1">
                  1
                </div>
                <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                  {isVietnamese ? 'Mở app điện thoại' : 'Open Mobile App'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-extrabold text-[10px] flex items-center justify-center mx-auto mb-1">
                  2
                </div>
                <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                  {isVietnamese ? 'Bấm "Quét QR Ki-ốt"' : 'Tap "Scan Kiosk"'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-extrabold text-[10px] flex items-center justify-center mx-auto mb-1">
                  3
                </div>
                <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                  {isVietnamese ? 'Quét mã trên trạm' : 'Scan this screen'}
                </div>
              </div>
            </div>

            {/* Note mã hóa */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
              <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isVietnamese ? 'Phiên tự động mã hóa & đồng bộ ví hội viên' : 'Encrypted session & live wallet sync'}</span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* CỘT PHẢI: KHÁCH VÃNG LAI (MÀU XANH NGỌC EMERALD NỔI BẬT)  */}
          {/* ======================================================= */}
          <div className="p-6 sm:p-7 rounded-3xl border-2 border-emerald-400/80 dark:border-emerald-700/80 bg-gradient-to-b from-emerald-50/70 via-teal-50/40 to-emerald-50/50 dark:from-emerald-950/30 dark:via-slate-900/50 dark:to-teal-950/20 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition">

            {/* Header Cột Phải */}
            <div className="space-y-1.5 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-extrabold text-[11px] uppercase tracking-wide">
                <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isVietnamese ? 'KHÁCH VÃNG LAI • GIẶT TỰ DO' : 'WALK-IN GUEST • QUICK WASH'}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white pt-1">
                {isVietnamese ? 'Đặt giặt nhanh tại trạm' : 'Quick Wash at Station'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isVietnamese
                  ? 'Không cần tài khoản, không cần tải app. Bắt đầu ngay chỉ với 1 chạm.'
                  : 'No account or app download required. Start immediately in one touch.'}
              </p>
            </div>

            {/* 3 Thẻ tính năng nổi bật */}
            <div className="space-y-3">
              {/* Thẻ 1 */}
              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-emerald-200/90 dark:border-emerald-800/60 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">
                    {isVietnamese ? 'Không cần đăng ký tài khoản' : 'No Registration Needed'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isVietnamese
                      ? 'Bỏ qua mọi thủ tục, chọn máy và chu trình giặt/sấy ngay tức thì.'
                      : 'Skip paperwork. Pick an empty washer or dryer and wash right away.'}
                  </p>
                </div>
              </div>

              {/* Thẻ 2 */}
              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-emerald-200/90 dark:border-emerald-800/60 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">
                    {isVietnamese ? 'Thanh toán VietQR tiện lợi' : 'Easy VietQR Napas247'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isVietnamese
                      ? 'Quét mã chuyển khoản từ mọi ngân hàng hoặc ví (Vietcombank, MB, MoMo,...).'
                      : 'Scan to pay from any banking app or e-wallet (VCB, MB, MoMo,...).'}
                  </p>
                </div>
              </div>

              {/* Thẻ 3 */}
              <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-emerald-200/90 dark:border-emerald-800/60 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">
                    {isVietnamese ? 'Chọn máy & Theo dõi tại trạm' : 'Live Status & Auto Start'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isVietnamese
                      ? 'Tự động kích hoạt máy và đếm ngược thời gian hoàn tất đơn hàng.'
                      : 'Automatically triggers the washer and counts down completion time.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Nút bấm CTA lớn toàn chiều rộng */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGuestOrderStart}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-600/25 hover:shadow-2xl transition flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                    <WashingMachine className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight uppercase tracking-wide">
                      {isVietnamese ? 'BẮT ĐẦU ĐẶT GIẶT NGAY' : 'START LAUNDRY ORDER'}
                    </span>
                    <span className="text-[11px] font-normal text-emerald-100 block">
                      {isVietnamese ? 'Chạm để chọn máy & trả VietQR' : 'Tap to select machine & pay VietQR'}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* NÚT KÍN DƯỚI CHÂN TRANG CHO KỸ THUẬT VIÊN & QUẢN TRỊ      */}
        {/* ========================================================= */}
        <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setAdminError('');
              setShowAdminModal(true);
            }}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <Lock className="w-3 h-3" />
            <span>{isVietnamese ? 'Dành cho Quản trị viên & Kỹ thuật viên' : 'Staff & Maintenance Access'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL ĐĂNG NHẬP NỘI BỘ QUẢN TRỊ (POPUP RIÊNG BIỆT KHI CẦN)*/}
      {/* ========================================================= */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative space-y-5">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowAdminModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pr-8">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isVietnamese ? 'Đăng nhập Quản trị viên' : 'Staff & Admin Login'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isVietnamese ? 'Truy cập bảng điều khiển và kỹ thuật trạm' : 'Access store management portal'}
                </p>
              </div>
            </div>

            {/* Quick Demo 1-Click for Dev/Staff */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isVietnamese ? 'Demo nhanh 1-Click:' : 'Quick 1-Click Demo:'}
              </span>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_LOGIN_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  const isLoad = adminQuickLoading === acc.role;
                  return (
                    <button
                      key={acc.role}
                      type="button"
                      disabled={adminLoading || adminQuickLoading !== null}
                      onClick={() => handleAdminQuickLogin(acc)}
                      className="p-2 rounded-xl text-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition cursor-pointer disabled:opacity-50"
                    >
                      {isLoad ? (
                        <RotateCw className="w-4 h-4 mx-auto mb-1 animate-spin text-blue-500" />
                      ) : (
                        <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: acc.color }} />
                      )}
                      <span className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                        {acc.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {adminError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAdminSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVietnamese ? 'Tên đăng nhập' : 'Username'}
                </label>
                <input
                  type="text"
                  required
                  value={adminForm.username}
                  onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVietnamese ? 'Mật khẩu' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {isVietnamese ? 'Đóng' : 'Close'}
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {adminLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>{isVietnamese ? 'Đăng nhập' : 'Sign in'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
