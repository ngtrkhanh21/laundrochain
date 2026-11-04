import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { adminApi } from '../api/adminApi';
import { useLanguage } from '../context/LanguageContext';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Building2,
  Shield,
  CheckCircle2,
  AlertCircle,
  MapPin,
  RefreshCw,
  X,
  Lock,
  Unlock,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Copy,
  Check,
} from 'lucide-react';

export default function UsersManagementPage() {
  const { isVietnamese } = useLanguage();

  // Dữ liệu người dùng & bộ lọc
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Thống kê người dùng (Backend Counts)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMembers: 0,
    totalStaff: 0,
    totalActive: 0,
    totalLocked: 0,
  });

  // Filter & Search & Pagination states
  const [userTypeTab, setUserTypeTab] = useState('ALL'); // 'ALL' | 'MEMBER' | 'STAFF'
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'NAME_DESC'
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedUserForTransfer, setSelectedUserForTransfer] = useState(null);
  const [transferSiteId, setTransferSiteId] = useState('');

  // Create staff user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSiteId, setNewSiteId] = useState('');
  const [createdStaffResult, setCreatedStaffResult] = useState(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Status & notifications
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Khóa scroll trang khi mở bất kỳ modal nào để cố định vị trí màn hình
  useEffect(() => {
    if (showCreateModal || showTransferModal || userToToggleStatus) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateModal, showTransferModal, userToToggleStatus]);

  // 1. Tải thống kê người dùng thực tế từ Backend
  async function loadUserStats() {
    setStatsLoading(true);
    try {
      const statsRes = await adminApi.getUserStats();
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load user stats', err);
    } finally {
      setStatsLoading(false);
    }
  }

  // 2. Tải danh sách vai trò & chi nhánh từ Backend
  async function loadMetadata() {
    try {
      const [rolesRes, sitesRes] = await Promise.all([
        adminApi.getRoles().catch(() => []),
        adminApi.getSites().catch(() => []),
      ]);
      setRoles(rolesRes || []);
      setSites(sitesRes || []);
      if (rolesRes && rolesRes.length > 0 && !newRole) {
        setNewRole(rolesRes[0].name);
      }
    } catch (err) {
      console.error('Failed to load roles/sites metadata', err);
    }
  }

  // 3. Tải danh sách người dùng chính xác theo bộ lọc từ Backend
  async function loadUsersList() {
    setLoading(true);
    try {
      let res;
      if (userTypeTab === 'STAFF') {
        // Tab Nhân viên: gọi API chuyên dụng /api/admin/users
        res = await adminApi.getStaffUsers({
          search: search.trim(),
          page,
          pageSize,
        });
      } else {
        // Tab Tất cả hoặc Hội viên: gọi /api/users với role & status
        const roleParam = userTypeTab === 'MEMBER' ? 'MEMBER' : selectedRole;
        res = await adminApi.getAllUsers({
          search: search.trim(),
          role: roleParam,
          status: selectedStatus,
          page,
          pageSize,
        });
      }

      setUsers(res?.items || []);
      setTotalCount(res?.totalCount || 0);
    } catch (err) {
      console.error('Failed to load users list', err);
      setActionMessage({
        type: 'error',
        text: err.message || (isVietnamese ? 'Không thể tải danh sách người dùng.' : 'Failed to load users list.'),
      });
    } finally {
      setLoading(false);
    }
  }

  // Khởi tạo
  useEffect(() => {
    loadMetadata();
    loadUserStats();
  }, []);

  // Tải lại danh sách khi filter thay đổi
  useEffect(() => {
    loadUsersList();
  }, [userTypeTab, search, selectedRole, selectedStatus, page]);

  // Sắp xếp người dùng hiển thị
  const sortedUsers = useMemo(() => {
    const list = [...users];
    if (sortBy === 'NEWEST') {
      return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    if (sortBy === 'OLDEST') {
      return list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
    if (sortBy === 'NAME_ASC') {
      return list.sort((a, b) => (a.fullName || a.username || '').localeCompare(b.fullName || b.username || ''));
    }
    if (sortBy === 'NAME_DESC') {
      return list.sort((a, b) => (b.fullName || b.username || '').localeCompare(a.fullName || a.username || ''));
    }
    return list;
  }, [users, sortBy]);

  // 4. Admin tạo tài khoản nhân viên mới (POST /api/admin/users)
  async function handleCreateStaffUser(e) {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newRole) {
      setActionMessage({
        type: 'error',
        text: isVietnamese ? 'Vui lòng điền đầy đủ tên đăng nhập, mật khẩu và vai trò!' : 'Please fill all required fields!',
      });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    setCreatedStaffResult(null);

    try {
      const payload = {
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: newRole,
        siteId: newSiteId || null,
      };

      const res = await adminApi.createUser(payload);
      setCreatedStaffResult(res);

      setActionMessage({
        type: 'success',
        text: isVietnamese
          ? `Đăng ký tài khoản nhân viên ${res.username} thành công!`
          : `Staff account ${res.username} created successfully!`,
      });

      setNewUsername('');
      setNewPassword('');
      loadUsersList();
      loadUserStats();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || (isVietnamese ? 'Lỗi tạo tài khoản nhân viên.' : 'Error creating staff user.'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  // 5. Điều phối chuyển cơ sở công tác (PUT /api/admin/users/{userId}/workplace)
  async function handleTransferWorkplace(e) {
    e.preventDefault();
    if (!selectedUserForTransfer || !transferSiteId) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await adminApi.updateWorkplace(selectedUserForTransfer.userId, transferSiteId);
      setActionMessage({
        type: 'success',
        text: isVietnamese
          ? `Đã điều chuyển nhân viên ${selectedUserForTransfer.username} sang cơ sở: ${res?.newSiteName || 'Mới'}!`
          : `Successfully transferred ${selectedUserForTransfer.username} to new workplace site!`,
      });
      setShowTransferModal(false);
      loadUsersList();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || (isVietnamese ? 'Lỗi khi cập nhật cơ sở làm việc.' : 'Error updating workplace.'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  // 6. Khóa hoặc Mở khóa tài khoản (PATCH /api/users/{userId}/status)
  async function confirmToggleUserStatus() {
    if (!userToToggleStatus) return;
    const user = userToToggleStatus;
    const newStatus = user.status?.toUpperCase() === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';

    setStatusUpdating(true);
    setActionMessage(null);

    try {
      await adminApi.updateUserStatus(user.userId, newStatus);
      setActionMessage({
        type: 'success',
        text: isVietnamese
          ? `Đã ${newStatus === 'LOCKED' ? 'khóa' : 'mở khóa'} tài khoản ${user.username} thành công!`
          : `Successfully ${newStatus === 'LOCKED' ? 'locked' : 'unlocked'} user ${user.username}!`,
      });
      setUserToToggleStatus(null);
      await Promise.all([loadUsersList(), loadUserStats()]);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || (isVietnamese ? 'Không thể thay đổi trạng thái tài khoản.' : 'Failed to update user status.'),
      });
    } finally {
      setStatusUpdating(false);
    }
  }

  // Tính tổng số trang
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Màu badge vai trò
  const roleBadgeColors = {
    ADMIN: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    ADMINISTRATOR: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
    SITE_MANAGER: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    PRICING_MANAGER: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
    TECHNICIAN: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
    KIOSK: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    KIOSK_DEVICE: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    MEMBER: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>{isVietnamese ? 'Quản lý người dùng & Phân quyền' : 'User Management & Roles'}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Thống kê tài khoản, phân loại hội viên / nhân viên, cấp tài khoản và điều phối cơ sở công tác.'
              : 'User statistics, member/staff segmentation, staff registration, and workplace assignments.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadUsersList();
              loadUserStats();
            }}
            className="p-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
            title={isVietnamese ? 'Làm mới dữ liệu' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading || statsLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setCreatedStaffResult(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isVietnamese ? 'Đăng ký tài khoản nhân viên' : 'Create Staff User'}</span>
          </button>
        </div>
      </div>

      {/* 2. Thống kê người dùng trong hệ thống (Backend API Statistics) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Tổng số tài khoản */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{isVietnamese ? 'Tổng người dùng' : 'Total Users'}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {statsLoading ? '...' : stats.totalUsers.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Khách hàng / Hội viên */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{isVietnamese ? 'Khách & Hội viên' : 'Members'}</div>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {statsLoading ? '...' : stats.totalMembers.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Nhân viên & Quản lý */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{isVietnamese ? 'Nhân viên & Quản lý' : 'Staff & Admins'}</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {statsLoading ? '...' : stats.totalStaff.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Đang hoạt động */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{isVietnamese ? 'Đang hoạt động' : 'Active'}</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {statsLoading ? '...' : stats.totalActive.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Bị khóa */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 col-span-2 md:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{isVietnamese ? 'Tài khoản khóa' : 'Locked'}</div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              {statsLoading ? '...' : stats.totalLocked.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Filter Tabs & Controls (Lọc theo Hội viên, Nhân viên, Sắp xếp) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        {/* Quick Tabs: Tất cả / Hội viên / Nhân viên */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setUserTypeTab('ALL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                userTypeTab === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {isVietnamese ? 'Tất cả tài khoản' : 'All Users'} ({stats.totalUsers})
            </button>
            <button
              onClick={() => {
                setUserTypeTab('MEMBER');
                setSelectedRole('ALL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                userTypeTab === 'MEMBER'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {isVietnamese ? 'Hội viên' : 'Members'} ({stats.totalMembers})
            </button>
            <button
              onClick={() => {
                setUserTypeTab('STAFF');
                setSelectedRole('ALL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                userTypeTab === 'STAFF'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {isVietnamese ? 'Nhân viên & Quản lý' : 'Staff & Admins'} ({stats.totalStaff})
            </button>
          </div>

          {/* Sắp xếp (Sort) */}
          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">{isVietnamese ? 'Sắp xếp:' : 'Sort by:'}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="NEWEST">{isVietnamese ? 'Mới nhất trước' : 'Newest First'}</option>
              <option value="OLDEST">{isVietnamese ? 'Cũ nhất trước' : 'Oldest First'}</option>
              <option value="NAME_ASC">{isVietnamese ? 'Tên (A-Z)' : 'Name (A-Z)'}</option>
              <option value="NAME_DESC">{isVietnamese ? 'Tên (Z-A)' : 'Name (Z-A)'}</option>
            </select>
          </div>
        </div>

        {/* Search bar & Dropdown Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={
                isVietnamese
                  ? 'Tìm theo username, họ tên, email, phone...'
                  : 'Search by username, name, email...'
              }
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* Vai trò */}
            {userTypeTab !== 'MEMBER' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">{isVietnamese ? 'Vai trò:' : 'Role:'}</span>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="ALL">{isVietnamese ? 'Tất cả vai trò' : 'All Roles'}</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SITE_MANAGER">SITE_MANAGER</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="PRICING_MANAGER">PRICING_MANAGER</option>
                  {userTypeTab === 'ALL' && <option value="MEMBER">MEMBER</option>}
                </select>
              </div>
            )}

            {/* Trạng thái */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">{isVietnamese ? 'Trạng thái:' : 'Status:'}</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">{isVietnamese ? 'Tất cả trạng thái' : 'All Status'}</option>
                <option value="ACTIVE">{isVietnamese ? 'Hoạt động (ACTIVE)' : 'Active'}</option>
                <option value="LOCKED">{isVietnamese ? 'Bị khóa (LOCKED)' : 'Locked'}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bảng Danh sách Người dùng */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="px-5 py-3.5">{isVietnamese ? 'Người dùng' : 'User'}</th>
                <th className="px-5 py-3.5">{isVietnamese ? 'Liên hệ' : 'Contact'}</th>
                <th className="px-5 py-3.5">{isVietnamese ? 'Vai trò' : 'Role'}</th>
                <th className="px-5 py-3.5">{isVietnamese ? 'Cơ sở công tác' : 'Workplace Site'}</th>
                <th className="px-5 py-3.5">{isVietnamese ? 'Trạng thái' : 'Status'}</th>
                <th className="px-5 py-3.5 text-right">{isVietnamese ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-14 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                      <span>{isVietnamese ? 'Đang tải danh sách người dùng...' : 'Loading users...'}</span>
                    </div>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-14 text-center text-slate-400">
                    {isVietnamese ? 'Không tìm thấy người dùng nào phù hợp với bộ lọc.' : 'No users match criteria.'}
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u) => {
                  const isStaff = u.roles?.some((r) => r !== 'MEMBER');
                  const initials = (u.fullName || u.username || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const isLocked = u.status?.toUpperCase() === 'LOCKED';

                  return (
                    <tr
                      key={u.userId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs ${
                              isStaff
                                ? 'bg-gradient-to-tr from-amber-500 to-indigo-600'
                                : 'bg-gradient-to-tr from-blue-500 to-teal-600'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.fullName || u.username}</span>
                              {u.username === 'admin' && (
                                <Shield className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>@{u.username}</span>
                              {u.memberCode && (
                                <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                                  ({u.memberCode})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1 text-slate-600 dark:text-slate-300">
                          {u.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{u.email}</span>
                            </div>
                          )}
                          {u.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                          {!u.email && !u.phone && <span className="text-slate-400">--</span>}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${
                                roleBadgeColors[r] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Workplace Site */}
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {u.assignedSiteName ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              {u.assignedSiteName}
                            </span>
                          </div>
                        ) : isStaff ? (
                          <span className="text-slate-400 italic">
                            {isVietnamese ? 'Trụ sở chính (HQ)' : 'Headquarters'}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {isVietnamese ? 'Hội viên chuỗi' : 'Chain Member'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isLocked
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          ></span>
                          {u.status || 'ACTIVE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Đổi cơ sở (chỉ dành cho nhân viên) */}
                          {isStaff && (
                            <button
                              onClick={() => {
                                setSelectedUserForTransfer(u);
                                setTransferSiteId(u.assignedSiteId || (sites[0]?.siteId || ''));
                                setShowTransferModal(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition cursor-pointer"
                              title={isVietnamese ? 'Điều phối chi nhánh làm việc' : 'Transfer Workplace'}
                            >
                              {isVietnamese ? 'Đổi cơ sở' : 'Transfer Site'}
                            </button>
                          )}

                          {/* Khóa / Mở khóa tài khoản */}
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => setUserToToggleStatus(u)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                isLocked
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}
                              title={
                                isLocked
                                  ? isVietnamese ? 'Mở khóa tài khoản' : 'Unlock Account'
                                  : isVietnamese ? 'Khóa tài khoản' : 'Lock Account'
                              }
                            >
                              {isLocked ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination & Total Count Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span>
              {isVietnamese ? 'Hiển thị' : 'Showing'} {sortedUsers.length} /{' '}
              <strong className="text-slate-800 dark:text-slate-200">{totalCount}</strong>{' '}
              {isVietnamese ? 'người dùng' : 'users'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              {isVietnamese ? 'Trang' : 'Page'} {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ĐĂNG KÝ TÀI KHOẢN NHÂN VIÊN MỚI (POST /api/admin/users) */}
      {/* ========================================================= */}
      {showCreateModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <span>{isVietnamese ? 'Đăng ký tài khoản nhân viên' : 'Create Staff Account'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedStaffResult(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto px-6 py-5 flex-1 space-y-4">
                {createdStaffResult ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{isVietnamese ? 'Tạo tài khoản thành công!' : 'Account Created!'}</span>
                      </div>
                      <p className="leading-relaxed">{createdStaffResult.message}</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isVietnamese ? 'Tên đăng nhập:' : 'Username:'}</span>
                        <strong className="font-mono text-slate-900 dark:text-white">{createdStaffResult.username}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{isVietnamese ? 'Mật khẩu tạm:' : 'Temp Password:'}</span>
                        <div className="flex items-center gap-2">
                          <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {createdStaffResult.temporaryPassword}
                          </strong>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(createdStaffResult.temporaryPassword);
                              setCopiedPass(true);
                              setTimeout(() => setCopiedPass(false), 2000);
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                            title={isVietnamese ? 'Sao chép mật khẩu' : 'Copy password'}
                          >
                            {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isVietnamese ? 'Vai trò:' : 'Role:'}</span>
                        <span className="font-bold text-blue-600">{createdStaffResult.role}</span>
                      </div>
                      {createdStaffResult.assignedSiteName && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">{isVietnamese ? 'Cơ sở phân công:' : 'Site:'}</span>
                          <span className="font-medium text-emerald-600">{createdStaffResult.assignedSiteName}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          setCreatedStaffResult(null);
                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        {isVietnamese ? 'Hoàn tất & Đóng' : 'Done & Close'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form id="create-staff-form" onSubmit={handleCreateStaffUser} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                        {isVietnamese ? 'Tên đăng nhập (Username) *' : 'Username *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.replace(/s/g, ''))}
                        placeholder="VD: lead_site_q1"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isVietnamese ? 'Từ 3-50 ký tự, không chứa dấu cách.' : '3-50 chars, no spaces.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                        {isVietnamese ? 'Mật khẩu tạm thời *' : 'Temporary Password *'}
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value.replace(/s/g, ''))}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isVietnamese
                          ? 'Nhân viên sẽ được yêu cầu đổi mật khẩu ngay lần đầu đăng nhập.'
                          : 'User will be prompted to change password on first login.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                        {isVietnamese ? 'Vai trò phân quyền (Role) *' : 'Assigned Role *'}
                      </label>
                      <select
                        required
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {roles.map((r) => (
                          <option key={r.roleId || r.name} value={r.name}>
                            {r.name} - {r.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                        {isVietnamese ? 'Chi nhánh công tác (Workplace Site)' : 'Workplace Site'}
                      </label>
                      <select
                        value={newSiteId}
                        onChange={(e) => setNewSiteId(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">
                          {isVietnamese ? '-- Trụ sở chính (HQ) / Không gán --' : '-- Headquarters / None --'}
                        </option>
                        {sites.map((s) => (
                          <option key={s.siteId} value={s.siteId}>
                            {s.code} - {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </form>
                )}
              </div>

              {/* Footer */}
              {!createdStaffResult && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    {isVietnamese ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    form="create-staff-form"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isVietnamese ? 'Lưu & Cấp tài khoản' : 'Save & Create'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================= */}
      {/* MODAL: ĐIỀU PHỐI CƠ SỞ CÔNG TÁC (PUT /api/admin/users/{userId}/workplace) */}
      {/* ========================================================= */}
      {showTransferModal &&
        selectedUserForTransfer &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span>{isVietnamese ? 'Điều phối chi nhánh làm việc' : 'Transfer Workplace Site'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5 flex-1 space-y-4">
                <form id="transfer-workplace-form" onSubmit={handleTransferWorkplace} className="space-y-4">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                    <div className="text-slate-400">{isVietnamese ? 'Nhân viên:' : 'Staff Member:'}</div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedUserForTransfer.fullName || selectedUserForTransfer.username} (@{selectedUserForTransfer.username})
                    </div>
                    <div className="text-slate-500">
                      {isVietnamese ? 'Cơ sở hiện tại:' : 'Current site:'}{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {selectedUserForTransfer.assignedSiteName || (isVietnamese ? 'Trụ sở chính' : 'HQ')}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                      {isVietnamese ? 'Chọn chi nhánh mới *' : 'Select New Branch *'}
                    </label>
                    <select
                      required
                      value={transferSiteId}
                      onChange={(e) => setTransferSiteId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">{isVietnamese ? '-- Chọn chi nhánh tiếp nhận --' : '-- Select target site --'}</option>
                      {sites.map((s) => (
                        <option key={s.siteId} value={s.siteId}>
                          {s.code} - {s.name} ({s.address})
                        </option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  form="transfer-workplace-form"
                  disabled={submitting || !transferSiteId}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isVietnamese ? 'Xác nhận điều phối' : 'Confirm Transfer'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ========================================================= */}
      {/* MODAL: XÁC NHẬN KHÓA / MỞ KHÓA TÀI KHOẢN (PATCH /api/users/{userId}/status) */}
      {/* ========================================================= */}
      {userToToggleStatus &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[calc(100vh-2.5rem)] overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  {userToToggleStatus.status?.toUpperCase() === 'ACTIVE' ? (
                    <>
                      <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <span>{isVietnamese ? 'Khóa tài khoản người dùng' : 'Lock User Account'}</span>
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Unlock className="w-5 h-5" />
                      </div>
                      <span>{isVietnamese ? 'Mở khóa tài khoản người dùng' : 'Unlock User Account'}</span>
                    </>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setUserToToggleStatus(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5 flex-1 space-y-4">
                {/* User info summary card */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                    {(userToToggleStatus.fullName || userToToggleStatus.username || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {userToToggleStatus.fullName || userToToggleStatus.username}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      @{userToToggleStatus.username} {userToToggleStatus.memberCode ? `• ${userToToggleStatus.memberCode}` : ''}
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                    userToToggleStatus.status?.toUpperCase() === 'LOCKED'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  }`}>
                    {userToToggleStatus.status}
                  </span>
                </div>

                {/* Warning message */}
                {userToToggleStatus.status?.toUpperCase() === 'ACTIVE' ? (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-sm text-rose-800 dark:text-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{isVietnamese ? 'Cảnh báo đình chỉ tài khoản' : 'Account suspension warning'}</span>
                    </div>
                    <p className="leading-relaxed pl-5.5">
                      {isVietnamese
                        ? 'Khi bị khóa, người dùng này sẽ không thể đăng nhập hoặc thực hiện bất kỳ giao dịch/đơn giặt nào trên toàn hệ thống.'
                        : 'Once locked, this user will not be able to log in or perform any orders or transactions.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-sm text-emerald-800 dark:text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isVietnamese ? 'Khôi phục quyền truy cập' : 'Restore access'}</span>
                    </div>
                    <p className="leading-relaxed pl-5.5">
                      {isVietnamese
                        ? 'Tài khoản này sẽ được kích hoạt lại ngay lập tức và có thể đăng nhập bình thường.'
                        : 'This account will be reactivated immediately and can log in normally.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => setUserToToggleStatus(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={confirmToggleUserStatus}
                  className={`px-4 py-2 text-xs font-bold rounded-xl text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    userToToggleStatus.status?.toUpperCase() === 'ACTIVE'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  {statusUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {userToToggleStatus.status?.toUpperCase() === 'ACTIVE'
                      ? isVietnamese ? 'Xác nhận Khóa tài khoản' : 'Confirm Lock Account'
                      : isVietnamese ? 'Xác nhận Mở khóa' : 'Confirm Unlock'}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
