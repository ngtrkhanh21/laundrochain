import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import KioskQrScannerModal from '../components/KioskQrScannerModal';
import {
  WashingMachine,
  Sparkles,
  ShieldCheck,
  DollarSign,
  Building2,
  Wrench,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  CreditCard,
  RotateCw,
  Monitor,
  QrCode,
} from 'lucide-react';

// Tài khoản nhân viên nội bộ để demo 1-click nhanh
const STAFF_QUICK_ACCOUNTS = [
  { username: 'admin', password: 'Password@123', label: 'Admin', role: 'ADMIN', icon: ShieldCheck, color: '#8b5cf6', desc: 'Quản trị toàn hệ thống' },
  { username: 'sitemgr', password: 'Password@123', label: 'Site Mgr', role: 'SITE_MANAGER', icon: Building2, color: '#f59e0b', desc: 'Quản lý vận hành trạm' },
  { username: 'pricing', password: 'Password@123', label: 'Pricing Mgr', role: 'PRICING_MANAGER', icon: DollarSign, color: '#10b981', desc: 'Thiết lập biểu giá & KM' },
  { username: 'tech', password: 'Password@123', label: 'Technician', role: 'TECHNICIAN', icon: Wrench, color: '#06b6d4', desc: 'Kỹ thuật viên bảo trì máy' },
];

export default function MobileLoginPage() {
  const { isAuthenticated, login } = useAuth();
  const { isVietnamese } = useLanguage();
  const navigate = useNavigate();

  // Mode: 'member' (Đăng nhập Google) | 'staff' (Nhân viên: Admin, Site Mgr, Tech)
  const [activeTab, setActiveTab] = useState('member');

  // State mở Camera quét mã Ki-ốt
  const [kioskScannerOpen, setKioskScannerOpen] = useState(false);

  // State cho Form Nhân viên
  const [staffForm, setStaffForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(null);
  const [staffError, setStaffError] = useState('');

  // Tự động chuyển hướng khi đã đăng nhập
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Xử lý submit form nhân viên
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!staffForm.username.trim() || !staffForm.password) {
      setStaffError(isVietnamese ? 'Vui lòng nhập tên đăng nhập và mật khẩu' : 'Please enter username and password');
      return;
    }
    setStaffLoading(true);
    setStaffError('');
    const result = await login(staffForm.username.trim(), staffForm.password);
    setStaffLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setStaffError(result.error || (isVietnamese ? 'Tài khoản hoặc mật khẩu không chính xác' : 'Invalid credentials'));
    }
  };

  // 1-Click demo nhân viên
  const handleStaffQuickLogin = async (acc) => {
    setQuickLoading(acc.role);
    setStaffError('');
    const result = await login(acc.username, acc.password, acc.role);
    setQuickLoading(null);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setStaffError(result.error || (isVietnamese ? 'Đăng nhập thất bại' : 'Login failed'));
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950 flex flex-col justify-between py-4 sm:py-8 px-3 sm:px-4 font-sans relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 bg-gradient-to-b from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Main Mobile App Card Shell */}
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-black/40 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 relative z-10 flex flex-col space-y-4 sm:space-y-5 overflow-hidden">

        {/* Top Header: App Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <WashingMachine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Laundro<span className="text-blue-600 dark:text-blue-400">Chain</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-black tracking-wider uppercase">
                  App
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isVietnamese ? 'Ứng dụng tiệm giặt thông minh' : 'Smart Laundromat App'}
              </p>
            </div>
          </div>
        </div>

        {/* Dual Mode Tab Switcher: Member (GG) vs Staff (Admin, Tech) */}
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 grid grid-cols-2 gap-1 border border-slate-200/70 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveTab('member')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'member'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{isVietnamese ? 'Hội viên' : 'Member'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'staff'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{isVietnamese ? 'Nhân viên' : 'Staff & Tech'}</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: MEMBER (ĐĂNG NHẬP BẰNG GOOGLE GMAIL)              */}
        {/* ========================================================= */}
        {activeTab === 'member' && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 overflow-hidden">
            {/* Header giới thiệu Member */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-[11px] font-black uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{isVietnamese ? 'Dành cho Khách hàng & Hội viên' : 'For Customers & Members'}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Đăng nhập vào App' : 'Sign in to Mobile App'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                {isVietnamese
                  ? 'Đăng nhập nhanh với Google để tích điểm, nạp số dư ví và quét mã QR tại trạm giặt'
                  : 'Quick sign-in with Google to manage wallet, earn points & scan kiosk QR'}
              </p>
            </div>

            {/* Google Sign In Component */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 overflow-hidden">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block text-center">
                {isVietnamese ? 'Chọn phương thức tiếp tục:' : 'Choose sign-in option:'}
              </span>

              <div className="w-full flex justify-center overflow-hidden">
                <GoogleSignInButton mode="login" />
              </div>
            </div>

            {/* 3 Lợi ích của Hội viên trên App */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {isVietnamese ? 'Tính năng nổi bật trên App:' : 'Key Member Features:'}
              </span>

              <div className="space-y-2">
                <div className="w-full p-2.5 rounded-xl bg-blue-50/80 dark:bg-slate-800/60 border border-blue-200/90 dark:border-blue-900/60 flex items-center gap-3 text-left select-none">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{isVietnamese ? 'Quét mã QR Ki-ốt trạm' : 'Scan Kiosk QR Code'}</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider">
                        Camera
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isVietnamese ? 'Dùng Camera quét mã tại trạm giặt' : 'Use camera to scan station QR'}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isVietnamese ? 'Ví điện tử & Nạp tiền VietQR' : 'LaundroPay Wallet & VietQR'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isVietnamese ? 'Thanh toán tự động, tích lũy điểm thưởng' : 'Seamless cashless auto pay & points'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: NHÂN VIÊN (ADMIN, SITE MGR, PRICING, TECH)         */}
        {/* ========================================================= */}
        {activeTab === 'staff' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header giới thiệu Nhân viên */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-900 text-purple-700 dark:text-purple-300 text-[11px] font-black uppercase tracking-wide">
                <Lock className="w-3.5 h-3.5 text-purple-600" />
                <span>{isVietnamese ? 'Cổng Nội bộ • Quản trị & Kỹ thuật' : 'Internal Staff & Ops Portal'}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {isVietnamese ? 'Đăng nhập Nhân viên' : 'Staff & Ops Sign In'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {isVietnamese
                  ? 'Dành cho Quản trị viên, Quản lý chi nhánh và Kỹ thuật viên bảo trì máy'
                  : 'For Admins, Site Managers and Maintenance Technicians'}
              </p>
            </div>

            {/* Quick 1-Click Demo Accounts */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {isVietnamese ? '⚡ Demo nhanh 1-Click theo vai trò:' : '⚡ 1-Click Quick Demo by Role:'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {STAFF_QUICK_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  const isLoading = quickLoading === acc.role;
                  return (
                    <button
                      key={acc.role}
                      type="button"
                      disabled={staffLoading || quickLoading !== null}
                      onClick={() => handleStaffQuickLogin(acc)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition cursor-pointer text-left flex items-center gap-2.5 disabled:opacity-50"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${acc.color}20` }}
                      >
                        {isLoading ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ color: acc.color }} />
                        ) : (
                          <Icon className="w-3.5 h-3.5" style={{ color: acc.color }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {acc.label}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">
                          {acc.username}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {staffError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffError}</span>
              </div>
            )}

            {/* Staff Credentials Form */}
            <form onSubmit={handleStaffSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVietnamese ? 'Tài khoản nhân viên' : 'Staff Username'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                    placeholder="admin, sitemgr, tech..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVietnamese ? 'Mật khẩu' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
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

              <button
                type="submit"
                disabled={staffLoading}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {staffLoading ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{isVietnamese ? 'Đăng nhập Nhân viên' : 'Sign In as Staff'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Switch Link: View Kiosk Screen (For testing or dual usage) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <Link
            to="/kiosk"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>
              {isVietnamese ? 'Chuyển sang Giao diện Ki-ốt trạm giặt' : 'Switch to Station Kiosk UI'}
            </span>
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center py-3 text-[11px] text-slate-400 dark:text-slate-500 relative z-10">
        <p>LaundroChain Mobile App v1.2.0 • Smart IoT Laundromat System</p>
      </div>

      {/* Modal Quét mã QR Ki-ốt */}
      <KioskQrScannerModal
        isOpen={kioskScannerOpen}
        onClose={() => setKioskScannerOpen(false)}
      />
    </div>
  );
}
