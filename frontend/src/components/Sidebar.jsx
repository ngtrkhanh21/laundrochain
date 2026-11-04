import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Zap,
  ChevronDown,
  PackageCheck,
  Users,
  Settings,
  MoreHorizontal,
  User,
  LogOut,
  X,
  Store,
  Building2,
  Cpu,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  Ticket,
  Tag,
  Sparkles,
  WashingMachine,
  AlertTriangle,
  History,
  Wrench,
  RefreshCw,
  Wallet,
  DollarSign,
  Search,
  Check,
  QrCode,
  LayoutDashboard,
} from 'lucide-react';

export const WORKSPACES = [
  {
    role: 'ADMIN',
    badge: 'LC',
    badgeColor: 'bg-blue-100 text-blue-700',
    title: 'Main operations',
    labelVi: 'Quản trị viên',
    labelEn: 'Administrator',
  },
  {
    role: 'PRICING_MANAGER',
    badge: 'PR',
    badgeColor: 'bg-amber-100 text-amber-700',
    title: 'Pricing & Rules',
    labelVi: 'Quản lý giá & Rules',
    labelEn: 'Pricing Manager',
  },
  {
    role: 'SITE_MANAGER',
    badge: 'SM',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    title: 'Store operations',
    labelVi: 'Quản lý cửa hàng',
    labelEn: 'Site Manager',
  },
  {
    role: 'TECHNICIAN',
    badge: 'TC',
    badgeColor: 'bg-cyan-100 text-cyan-700',
    title: 'Field maintenance',
    labelVi: 'Kỹ thuật viên',
    labelEn: 'Technician',
  },
  {
    role: 'MEMBER',
    badge: 'MB',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    title: 'Member portal',
    labelVi: 'Thành viên',
    labelEn: 'Member',
  },
];

function getRoleConfig(user, t, isVietnamese = true) {
  let primaryRole = user?.activeRole || user?.roles?.[0] || 'MEMBER';

  if (!['ADMIN', 'PRICING_MANAGER', 'SITE_MANAGER', 'TECHNICIAN', 'MEMBER'].includes(primaryRole)) {
    const roles = user?.roles || [];
    if (roles.includes('ADMIN')) primaryRole = 'ADMIN';
    else if (roles.includes('PRICING_MANAGER')) primaryRole = 'PRICING_MANAGER';
    else if (roles.includes('SITE_MANAGER')) primaryRole = 'SITE_MANAGER';
    else if (roles.includes('TECHNICIAN')) primaryRole = 'TECHNICIAN';
    else primaryRole = 'MEMBER';
  }

  const configs = {
    ADMIN: {
      label: t('roles.ADMIN', 'Quản trị viên'),
      workspaceName: t('workspaces.ADMIN', 'Main operations'),
      workspaceBadge: 'LC',
      badgeColor: 'bg-blue-100 text-blue-700',
      navItems: [
        { label: t('sidebar.users', 'Quản lý người dùng'), icon: Users, path: '/dashboard/users' },
        { label: t('sidebar.brands', 'Quản lý thương hiệu'), icon: Store, path: '/dashboard/brands' },
        { label: t('sidebar.branches', 'Chi nhánh & Cửa hàng'), icon: Building2, path: '/dashboard/branches' },
        { label: t('sidebar.devices', 'Thiết bị IoT'), icon: Cpu, path: '/dashboard/devices', badge: '42' },
        { label: t('sidebar.auditLog', 'Audit Log'), icon: FileText, path: '/dashboard/audit-log' },
        { label: t('sidebar.settings', 'Hồ sơ cá nhân'), icon: User, path: '/dashboard/settings' },
      ],
    },
    PRICING_MANAGER: {
      label: t('roles.PRICING_MANAGER', 'Pricing Manager'),
      workspaceName: t('workspaces.PRICING_MANAGER', 'Pricing & Rules'),
      workspaceBadge: 'PR',
      badgeColor: 'bg-amber-100 text-amber-700',
      navItems: [
        { label: t('sidebar.pricingRules', 'Quy tắc định giá'), icon: SlidersHorizontal, path: '/dashboard/pricing-rules' },
        // { label: t('sidebar.vouchers', 'Mã Voucher'), icon: Ticket, path: '/dashboard/vouchers' },
        // { label: t('sidebar.priceFloor', 'Cấu hình Giá Sàn'), icon: ShieldCheck, path: '/dashboard/price-floor' },
        { label: t('sidebar.basePrices', 'Bảng giá cơ sở'), icon: Tag, path: '/dashboard/base-prices' },
        { label: t('sidebar.promotions', 'Chiến dịch khuyến mãi'), icon: Sparkles, path: '/dashboard/promotions' },
        { label: t('sidebar.settings', 'Hồ sơ cá nhân'), icon: User, path: '/dashboard/settings' },
      ],
    },
    SITE_MANAGER: {
      label: t('roles.SITE_MANAGER', 'Site Manager'),
      workspaceName: t('workspaces.SITE_MANAGER', 'Store operations'),
      workspaceBadge: 'SM',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      navItems: [
        { label: isVietnamese ? 'Tổng quan trạm' : 'Site Overview', icon: LayoutDashboard, path: '/dashboard/site-overview' },
        { label: isVietnamese ? 'Quản lý đơn hàng' : 'Store Orders', icon: History, path: '/dashboard/orders' },
        { label: t('sidebar.machines', 'Giám sát máy móc'), icon: WashingMachine, path: '/dashboard/machines' },
        { label: t('sidebar.settings', 'Hồ sơ cá nhân'), icon: User, path: '/dashboard/settings' },
      ],
    },
    TECHNICIAN: {
      label: t('roles.TECHNICIAN', 'Technician'),
      workspaceName: t('workspaces.TECHNICIAN', 'Field maintenance'),
      workspaceBadge: 'TC',
      badgeColor: 'bg-cyan-100 text-cyan-700',
      navItems: [
        { label: t('sidebar.repairs', 'Sửa chữa máy'), icon: Wrench, path: '/dashboard/repairs', badge: '3' },
        { label: t('sidebar.equipment', 'Quản lý thiết bị'), icon: Cpu, path: '/dashboard/equipment' },
        { label: t('sidebar.kioskSwap', 'Thay thế Ki-ốt'), icon: RefreshCw, path: '/dashboard/kiosk-swap' },
        { label: t('sidebar.settings', 'Hồ sơ cá nhân'), icon: User, path: '/dashboard/settings' },
      ],
    },
    MEMBER: {
      label: t('roles.MEMBER', 'Member'),
      workspaceName: t('workspaces.MEMBER', 'Member portal'),
      workspaceBadge: 'MB',
      badgeColor: 'bg-indigo-100 text-indigo-700',
      navItems: [
        { label: isVietnamese ? 'Tổng quan' : 'Overview', icon: LayoutDashboard, path: '/dashboard' },
        { label: t('sidebar.newOrder', 'Dịch vụ giặt'), icon: WashingMachine, path: '/dashboard/new-order' },
        {
          label: user?.isGuest
            ? (isVietnamese ? 'Tra cứu đơn hàng' : 'Track Orders')
            : (isVietnamese ? 'Lịch sử đơn hàng' : 'My Orders'),
          icon: user?.isGuest ? Search : History,
          path: '/dashboard/my-orders',
        },
        ...(!user?.isGuest
          ? [
            { label: t('sidebar.wallet', 'Ví & Nạp tiền'), icon: Wallet, path: '/dashboard/wallet' },
            { label: t('sidebar.settings', 'Hồ sơ cá nhân'), icon: User, path: '/dashboard/settings' },
          ]
          : []),
      ],
    },
  };

  return { config: configs[primaryRole] || configs.MEMBER, primaryRole };
}

export default function Sidebar({ onClose, isMobile = false }) {
  const { user, logout, switchRole } = useAuth();
  const { t, isVietnamese } = useLanguage();
  const navigate = useNavigate();

  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const workspaceRef = useRef(null);
  const userMenuRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target)) {
        setWorkspaceDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic role config
  const { config, primaryRole } = getRoleConfig(user, t, isVietnamese);

  // User details
  const displayName = user?.isGuest
    ? (isVietnamese ? 'Khách vãng lai' : 'Walk-in Guest')
    : user?.fullName || user?.username || 'Người dùng';
  const initials = user?.isGuest
    ? 'KV'
    : displayName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase() || 'LC';

  const roleLabel = user?.isGuest
    ? (isVietnamese ? 'Khách Ki-ốt' : 'Kiosk Guest')
    : config.label || primaryRole;

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside
      className={
        isMobile
          ? 'w-64 min-w-[16rem] h-screen fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col justify-between p-4 select-none shadow-2xl lg:hidden'
          : 'w-64 min-w-[16rem] h-screen sticky top-0 bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between p-4 select-none z-30'
      }
    >
      {/* Khối nội dung trên (Logo, Selector Workspace, Menu navigation) */}
      <div className="flex flex-col flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* 2. Header & Logo */}
        <div className="flex items-center justify-between px-2 py-3 mb-4">
          <NavLink
            to={config.navItems?.[0]?.path || '/dashboard'}
            onClick={handleNavClick}
            className="flex items-center gap-3 no-underline"
          >
            <div className="bg-blue-600 text-white p-2 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/20">
              <Zap className="size-5 fill-current" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              LaundroChain
            </span>
          </NavLink>
          {isMobile && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* 3. Selector Workspace Dropdown (Hỗ trợ chuyển đổi trực tiếp 5 vai trò) */}
        {!user?.isGuest ? (
          <div className="relative mb-6" ref={workspaceRef}>
            <button
              type="button"
              onClick={() => setWorkspaceDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/90 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title={isVietnamese ? 'Nhấn để chuyển đổi Workspace / Vai trò' : 'Click to switch Workspace / Role'}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg ${config.badgeColor} font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                  {config.workspaceBadge}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                    {config.workspaceName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                    {roleLabel}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${workspaceDropdownOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
              />
            </button>

            {/* Danh sách 5 Không gian làm việc / Role Dropdown */}
            {workspaceDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-fade-in">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isVietnamese ? 'CHỌN ROLE / KHÔNG GIAN' : 'SWITCH WORKSPACE'}
                </div>
                <div className="space-y-1">
                  {WORKSPACES.map((ws) => {
                    const isActive = primaryRole === ws.role;
                    return (
                      <button
                        key={ws.role}
                        type="button"
                        onClick={() => {
                          switchRole(ws.role);
                          setWorkspaceDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer border-0 ${isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-md ${ws.badgeColor} font-bold text-[10px] flex items-center justify-center shrink-0`}
                          >
                            {ws.badge}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate leading-tight">
                              {t(`workspaces.${ws.role}`, ws.title)}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                              {t(`roles.${ws.role}`, isVietnamese ? ws.labelVi : ws.labelEn)}
                            </p>
                          </div>
                        </div>
                        {isActive && <Check className="size-3.5 text-blue-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                KV
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-950 truncate leading-tight">
                  {isVietnamese ? 'Khách vãng lai' : 'Walk-in Guest'}
                </p>
                <p className="text-[10px] text-emerald-600 truncate leading-tight mt-0.5">
                  {isVietnamese ? 'Phiên dùng Ki-ốt' : 'Kiosk Session'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Menu Items */}
        <nav className="space-y-1">
          {config.navItems.map(({ label, icon: Icon, path, end, badge }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all no-underline ${isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="size-[18px] shrink-0" />
                <span className="truncate">{label}</span>
              </div>
              {badge && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* 4.5. Nút Quét QR Đăng nhập Ki-ốt (chỉ hiện cho tài khoản thường / mobile) */}
      {!user?.isGuest && (
        <div className="pt-3 pb-1">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-kiosk-qr-scanner'));
              handleNavClick();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-[#0f4e7f] border border-blue-200/80 text-xs font-bold transition shadow-xs active:scale-[0.98] cursor-pointer"
            title={isVietnamese ? 'Quét mã QR trên màn hình Ki-ốt để đăng nhập' : 'Scan Kiosk QR code to login'}
          >
            <QrCode className="size-4 shrink-0 text-blue-600" />
            <span>{isVietnamese ? 'Quét QR Ki-ốt' : 'Scan Kiosk QR'}</span>
          </button>
        </div>
      )}

      {/* 5. Footer người dùng ở dưới cùng */}
      <div className="relative mt-auto pt-3 border-t border-slate-200" ref={userMenuRef}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-9 h-9 rounded-full ${user?.isGuest ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'} font-bold text-xs flex items-center justify-center shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                {displayName}
              </p>
              <p className={`text-xs ${user?.isGuest ? 'text-emerald-600 font-medium' : 'text-slate-400'} truncate leading-tight mt-0.5`}>
                {roleLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0 cursor-pointer"
            aria-label={t('sidebar.accountOptions', 'Tùy chọn tài khoản')}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>

        {/* Dropdown Options */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-fade-in">
            {!user?.isGuest && (
              <NavLink
                to="/dashboard/profile"
                onClick={() => {
                  setUserMenuOpen(false);
                  handleNavClick();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 no-underline"
              >
                <User className="size-3.5 text-slate-500" />
                {t('profile.title', 'Hồ sơ người dùng')}
              </NavLink>
            )}
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer border-0 bg-transparent"
            >
              <LogOut className="size-3.5" />
              {user?.isGuest
                ? (isVietnamese ? 'Kết thúc phiên' : 'End session')
                : t('common.logout', 'Đăng xuất')}
            </button>
          </div>
        )}
      </div>

      {/* Modal xác nhận Đăng xuất / Kết thúc phiên */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 overflow-hidden flex flex-col text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon cảnh báo */}
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3.5 border border-red-100 dark:border-red-900/50 shadow-2xs">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              {user?.isGuest
                ? (isVietnamese ? 'Xác nhận kết thúc phiên' : 'Confirm End Session')
                : (isVietnamese ? 'Xác nhận đăng xuất' : 'Confirm Logout')}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              {user?.isGuest
                ? (isVietnamese
                  ? 'Bạn có chắc chắn muốn kết thúc phiên làm việc này không? Toàn bộ phiên Ki-ốt hiện tại sẽ được đóng.'
                  : 'Are you sure you want to end this session? The current kiosk session will be closed.')
                : (isVietnamese
                  ? 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không? Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng dịch vụ.'
                  : 'Are you sure you want to log out? You will need to log in again to access your account.')}
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer"
              >
                {isVietnamese ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>
                  {user?.isGuest
                    ? (isVietnamese ? 'Kết thúc phiên' : 'End Session')
                    : (isVietnamese ? 'Đăng xuất' : 'Log Out')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
