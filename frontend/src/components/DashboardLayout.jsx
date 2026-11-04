import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Sidebar from './Sidebar';
import LanguageSwitcher from './LanguageSwitcher';
import KioskQrScannerModal from './KioskQrScannerModal';
import ForceChangePasswordModal from './ForceChangePasswordModal';
import ErrorBoundary from './ErrorBoundary';
import { Menu, Search, Bell, QrCode, Sparkles } from 'lucide-react';

export const openKioskQrScanner = () => {
  window.dispatchEvent(new CustomEvent('open-kiosk-qr-scanner'));
};

const ROLE_LABELS = {
  ADMIN: { vi: 'Quản trị viên', en: 'Admin' },
  PRICING_MANAGER: { vi: 'Quản lý giá & Rules', en: 'Pricing Manager' },
  SITE_MANAGER: { vi: 'Quản lý cửa hàng', en: 'Site Manager' },
  TECHNICIAN: { vi: 'Kỹ thuật viên', en: 'Technician' },
  MEMBER: { vi: 'Thành viên', en: 'Member' },
};

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const { language, isVietnamese } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Lắng nghe sự kiện toàn cục để mở modal quét QR từ bất cứ đâu trong app
  useEffect(() => {
    const handleOpenScanner = () => setQrModalOpen(true);
    window.addEventListener('open-kiosk-qr-scanner', handleOpenScanner);
    return () => window.removeEventListener('open-kiosk-qr-scanner', handleOpenScanner);
  }, []);

  // User details
  const displayName = user?.isGuest
    ? (isVietnamese ? 'Khách vãng lai' : 'Walk-in Guest')
    : user?.fullName || 'Amelia Chen';
  const firstName = displayName.split(' ').filter(Boolean).slice(-1)[0] || (user?.isGuest ? 'Khách' : 'Amelia');
  const initials = user?.isGuest
    ? 'KV'
    : displayName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase() || 'AC';

  const primaryRole = user?.activeRole || user?.roles?.[0] || 'ADMIN';
  const roleLabel = user?.isGuest
    ? (isVietnamese ? 'Khách Ki-ốt' : 'Kiosk Guest')
    : ROLE_LABELS[primaryRole]?.[language] || (isVietnamese ? 'Quản trị vận hành' : 'Operations admin');

  // Format date according to language
  const formattedDate = isVietnamese
    ? new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  const greeting = user?.isGuest
    ? (isVietnamese ? 'Xin chào quý khách' : 'Welcome Guest')
    : (isVietnamese ? `Xin chào, ${firstName}` : `Good morning, ${firstName}`);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Desktop Sticky Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar isMobile onClose={() => setMobileOpen(false)} />
        </>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 bg-[#f8fafc]">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 backdrop-blur-md sm:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-[11px] font-medium text-slate-400 capitalize">{formattedDate}</p>
              <h1 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-slate-900">
                {greeting}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Nút Quét mã QR Ki-ốt (Dành cho App Mobile quét vào Trạm) */}
            {!user?.isGuest && (
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer ring-2 ring-blue-400/20"
                title={isVietnamese ? 'Mở camera quét mã QR Ki-ốt để đăng nhập' : 'Scan Kiosk QR to login'}
              >
                <QrCode className="size-4 shrink-0 text-white" />
                <span className="hidden sm:inline">{isVietnamese ? 'Quét QR Ki-ốt' : 'Scan Kiosk QR'}</span>
                <span className="sm:hidden">{isVietnamese ? 'Quét Ki-ốt' : 'Quét QR'}</span>
              </button>
            )}

            {/* Search Button */}
            <button
              className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 sm:block"
              aria-label={isVietnamese ? 'Tìm kiếm' : 'Search'}
            >
              <Search className="size-[18px]" />
            </button>

            {/* Language Switcher Dropdown (nằm kế bên icon tìm kiếm) */}
            <LanguageSwitcher />

            {/* Notification Bell */}
            <button
              className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={isVietnamese ? 'Thông báo' : 'Notifications'}
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-blue-500 ring-2 ring-white" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            {/* User Profile */}
            {user?.isGuest ? (
              <div className="flex items-center gap-2 select-none">
                <div className="hidden text-right sm:block">
                  <p className="text-[12px] font-semibold text-slate-800">{displayName}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">{roleLabel}</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white shadow-2xs">
                  {initials}
                </div>
              </div>
            ) : (
              <NavLink
                to="/dashboard/profile"
                className="flex items-center gap-2 text-inherit no-underline"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-[12px] font-semibold text-slate-800">{displayName}</p>
                  <p className="text-[10px] text-slate-400">{roleLabel}</p>
                </div>
                <div className="flex size-8 items-center justify-center rounded-full bg-[#0f4e7f] text-[11px] font-semibold text-white">
                  {initials}
                </div>
              </NavLink>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="w-full px-6 py-7 sm:px-10 sm:py-8 animate-fade-in">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Modal Quét mã QR Ki-ốt */}
      <KioskQrScannerModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />

      {/* Modal Bắt buộc thay đổi mật khẩu cho tài khoản có cờ must_change_password */}
      {Boolean(user?.mustChangePassword || user?.MustChangePassword) && (
        <ForceChangePasswordModal
          isOpen={true}
          onClose={() => {}}
        />
      )}
    </div>
  );
}
