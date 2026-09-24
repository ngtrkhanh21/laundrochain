import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { Menu, Search, Bell } from 'lucide-react';

const ROLE_LABELS = {
  ADMIN: 'Admin',
  PRICING_MANAGER: 'Pricing Manager',
  SITE_MANAGER: 'Site Manager',
  TECHNICIAN: 'Technician',
  MEMBER: 'Member',
};

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // User details
  const displayName = user?.fullName || 'Amelia Chen';
  const firstName = displayName.split(' ').filter(Boolean).slice(-1)[0] || 'Amelia';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'AC';

  const primaryRole = user?.roles?.[0] || 'ADMIN';
  const roleLabel = ROLE_LABELS[primaryRole] || 'Operations admin';

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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
              <p className="text-[11px] font-medium text-slate-400">{formattedDate}</p>
              <h1 className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-slate-900">
                Good morning, {firstName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 sm:block"
              aria-label="Search"
            >
              <Search className="size-[18px]" />
            </button>
            <button
              className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Notifications"
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-blue-500 ring-2 ring-white" />
            </button>
            <div className="h-6 w-px bg-slate-200" />
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
          </div>
        </header>

        {/* Page Content */}
        <main className="w-full px-6 py-7 sm:px-10 sm:py-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
