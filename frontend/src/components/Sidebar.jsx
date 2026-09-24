import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap,
  ChevronDown,
  LayoutDashboard,
  PackageCheck,
  Gauge,
  BarChart3,
  Users,
  Settings,
  MoreHorizontal,
  User,
  LogOut,
  X,
  Building2,
  Cpu,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  Tag,
  WashingMachine,
  AlertTriangle,
  History,
  Wrench,
  RefreshCw,
  Wallet,
  DollarSign,
  Search,
} from 'lucide-react';

const ROLE_CONFIGS = {
  ADMIN: {
    label: 'Quản trị viên',
    workspaceName: 'Main operations',
    workspaceBadge: 'LC',
    group1: 'Manage',
    navItems: [
      { label: 'Overview', icon: LayoutDashboard, path: '/dashboard', end: true },
      { label: 'Quản lý người dùng', icon: Users, path: '/dashboard/users' },
      { label: 'Chi nhánh & Cửa hàng', icon: Building2, path: '/dashboard/branches' },
      { label: 'Thiết bị IoT', icon: Cpu, path: '/dashboard/devices', badge: '42' },
    ],
    group2: 'Workspace',
    workspaceItems: [
      { label: 'Audit Log', icon: FileText, path: '/dashboard/audit-log' },
      { label: 'Cài đặt hệ thống', icon: Settings, path: '/dashboard/settings' },
    ],
  },
  PRICING_MANAGER: {
    label: 'Pricing Manager',
    workspaceName: 'Pricing & Rules',
    workspaceBadge: 'PR',
    group1: 'Manage',
    navItems: [
      { label: 'Overview', icon: LayoutDashboard, path: '/dashboard', end: true },
      { label: 'Cấu hình giá (DMN)', icon: SlidersHorizontal, path: '/dashboard/pricing-rules' },
      { label: 'Price Bundles', icon: PackageCheck, path: '/dashboard/price-bundles', badge: 'v2.4' },
      { label: 'Phân tích tĩnh (WP3)', icon: ShieldCheck, path: '/dashboard/static-analysis' },
    ],
    group2: 'Workspace',
    workspaceItems: [
      { label: 'Voucher & Promotion', icon: Tag, path: '/dashboard/promotions' },
      { label: 'Cài đặt', icon: Settings, path: '/dashboard/settings' },
    ],
  },
  SITE_MANAGER: {
    label: 'Site Manager',
    workspaceName: 'Store operations',
    workspaceBadge: 'SM',
    group1: 'Manage',
    navItems: [
      { label: 'Overview', icon: LayoutDashboard, path: '/dashboard', end: true },
      { label: 'Giám sát máy móc', icon: WashingMachine, path: '/dashboard/machines', badge: '42/45' },
      { label: 'Cảnh báo & Sự cố', icon: AlertTriangle, path: '/dashboard/alerts', badge: '2' },
      { label: 'Lịch sử đơn giặt', icon: History, path: '/dashboard/orders' },
    ],
    group2: 'Workspace',
    workspaceItems: [
      { label: 'Tra cứu Rule Trace', icon: Search, path: '/dashboard/rule-trace' },
      { label: 'Cài đặt cửa hàng', icon: Settings, path: '/dashboard/settings' },
    ],
  },
  TECHNICIAN: {
    label: 'Technician',
    workspaceName: 'Field maintenance',
    workspaceBadge: 'TC',
    group1: 'Manage',
    navItems: [
      { label: 'Overview', icon: LayoutDashboard, path: '/dashboard', end: true },
      { label: 'Sửa chữa máy', icon: Wrench, path: '/dashboard/repairs', badge: '3' },
      { label: 'Quản lý thiết bị', icon: Cpu, path: '/dashboard/equipment' },
    ],
    group2: 'Workspace',
    workspaceItems: [
      { label: 'Thay thế Ki-ốt', icon: RefreshCw, path: '/dashboard/kiosk-swap' },
      { label: 'Cài đặt', icon: Settings, path: '/dashboard/settings' },
    ],
  },
  MEMBER: {
    label: 'Member',
    workspaceName: 'Member portal',
    workspaceBadge: 'MB',
    group1: 'Manage',
    navItems: [
      { label: 'Overview', icon: LayoutDashboard, path: '/dashboard', end: true },
      { label: 'Đặt lệnh giặt', icon: WashingMachine, path: '/dashboard/new-order' },
      { label: 'Lịch sử giặt', icon: History, path: '/dashboard/my-orders' },
    ],
    group2: 'Workspace',
    workspaceItems: [
      { label: 'Ví & Nạp tiền', icon: Wallet, path: '/dashboard/wallet' },
      { label: 'Lịch sử giao dịch', icon: DollarSign, path: '/dashboard/transactions' },
    ],
  },
};

function getRoleConfig(roles) {
  const priority = ['ADMIN', 'PRICING_MANAGER', 'SITE_MANAGER', 'TECHNICIAN', 'MEMBER'];
  if (Array.isArray(roles)) {
    for (const role of priority) {
      if (roles.includes(role)) {
        return { config: ROLE_CONFIGS[role], primaryRole: role };
      }
    }
  }
  return { config: ROLE_CONFIGS.ADMIN, primaryRole: 'ADMIN' };
}

export default function Sidebar({ onClose, isMobile = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Dynamic role config
  const { config, primaryRole } = getRoleConfig(user?.roles);

  // User details
  const displayName = user?.fullName || 'Người dùng';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'LC';

  const roleLabel = config.label || primaryRole;

  const handleLogout = () => {
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
            to="/dashboard"
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* 3. Selector chi nhánh / Workspace (theo Role) */}
        <button
          type="button"
          className="w-full flex items-center justify-between p-2.5 mb-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
              {config.workspaceBadge}
            </div>
            <span className="text-sm font-semibold text-slate-700 truncate">
              {config.workspaceName}
            </span>
          </div>
          <ChevronDown className="size-4 text-slate-400 shrink-0 ml-1" />
        </button>

        {/* 4. Danh mục Menu & Khoảng cách (Phân quyền theo Role) */}
        <nav className="flex-1 space-y-1" aria-label="Main navigation">
          {/* Nhóm 1: MANAGE */}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2 block">
            {config.group1}
          </span>
          {config.navItems.map(({ label, icon: Icon, path, end, badge }) => (
            <NavLink
              key={label}
              to={path}
              end={end}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all no-underline ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="truncate">{label}</span>
              {badge && (
                <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Nhóm 2: WORKSPACE */}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mt-6 mb-2 block">
            {config.group2}
          </span>
          {config.workspaceItems.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={label}
              to={path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all no-underline ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* 5. Footer người dùng ở dưới cùng */}
      <div className="relative mt-auto pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-xs text-slate-400 truncate leading-tight mt-0.5">
                {roleLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0 cursor-pointer"
            aria-label="Account options"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>

        {/* Dropdown Options */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
            <NavLink
              to="/dashboard/profile"
              onClick={() => {
                setUserMenuOpen(false);
                handleNavClick();
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 no-underline"
            >
              <User className="size-3.5 text-slate-500" />
              Hồ sơ cá nhân
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer border-0 bg-transparent"
            >
              <LogOut className="size-3.5" />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
