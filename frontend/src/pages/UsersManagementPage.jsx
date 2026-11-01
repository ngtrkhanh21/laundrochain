import { useState, useEffect } from 'react';
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
  MoreVertical,
  MapPin,
  RefreshCw,
  X,
  Lock,
  Mail,
  Phone,
  UserCheck,
} from 'lucide-react';

export default function UsersManagementPage() {
  const { isVietnamese } = useLanguage();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedUserForTransfer, setSelectedUserForTransfer] = useState(null);
  const [transferSiteId, setTransferSiteId] = useState('');

  // Create form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSiteId, setNewSiteId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch initial data
  useEffect(() => {
    loadData();
  }, [search, page]);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, rolesRes, sitesRes] = await Promise.all([
        adminApi.getUsers(search, page, 15),
        adminApi.getRoles(),
        adminApi.getSites(),
      ]);

      setUsers(usersRes.items || []);
      setTotalCount(usersRes.totalCount || usersRes.items?.length || 0);
      setRoles(rolesRes || []);
      setSites(sitesRes || []);

      if (rolesRes && rolesRes.length > 0 && !newRole) {
        setNewRole(rolesRes[0].name);
      }
    } catch (err) {
      console.error('Failed to load users data', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle create staff user
  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newUsername || !newPassword || !newRole) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      const payload = {
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
        siteId: newSiteId || null,
      };
      const res = await adminApi.createUser(payload);
      setActionMessage({
        type: 'success',
        text: isVietnamese
          ? `Tạo tài khoản ${res.username} thành công!`
          : `User ${res.username} created successfully!`,
      });
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      loadData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Không thể tạo người dùng.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Handle transfer workplace
  async function handleTransferWorkplace(e) {
    e.preventDefault();
    if (!selectedUserForTransfer || !transferSiteId) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      await adminApi.updateWorkplace(selectedUserForTransfer.userId, transferSiteId);
      setActionMessage({
        type: 'success',
        text: isVietnamese
          ? `Đã chuyển cơ sở công tác cho ${selectedUserForTransfer.username}!`
          : `Successfully transferred workplace for ${selectedUserForTransfer.username}!`,
      });
      setShowTransferModal(false);
      loadData();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Lỗi khi cập nhật cơ sở làm việc.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const roleBadgeColors = {
    ADMIN: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
    PRICING_MANAGER: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300',
    SITE_MANAGER: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300',
    TECHNICIAN: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300',
    MEMBER: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300',
  };

  const filteredUsers = users.filter((u) => {
    if (selectedRole === 'ALL') return true;
    return u.roles && u.roles.includes(selectedRole);
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            {isVietnamese ? 'Quản lý người dùng & Phân quyền' : 'User Management & Roles'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Quản lý danh sách nhân viên, gán vai trò quyền hạn và điều phối chi nhánh công tác.'
              : 'Manage staff accounts, assign system roles and coordinate store branch assignments.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-blue-500/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            {isVietnamese ? 'Thêm người dùng' : 'Create User'}
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isVietnamese
                ? 'Tìm theo username, họ tên, email...'
                : 'Search by username, full name, email...'
            }
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isVietnamese ? 'Vai trò:' : 'Role:'}
          </span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">{isVietnamese ? 'Tất cả vai trò' : 'All Roles'}</option>
            <option value="ADMIN">ADMIN</option>
            <option value="PRICING_MANAGER">PRICING_MANAGER</option>
            <option value="SITE_MANAGER">SITE_MANAGER</option>
            <option value="TECHNICIAN">TECHNICIAN</option>
            <option value="MEMBER">MEMBER</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">{isVietnamese ? 'Người dùng' : 'User'}</th>
                <th className="px-6 py-4">{isVietnamese ? 'Liên hệ' : 'Contact'}</th>
                <th className="px-6 py-4">{isVietnamese ? 'Vai trò' : 'Role'}</th>
                <th className="px-6 py-4">{isVietnamese ? 'Cơ sở công tác' : 'Workplace Site'}</th>
                <th className="px-6 py-4">{isVietnamese ? 'Trạng thái' : 'Status'}</th>
                <th className="px-6 py-4 text-right">{isVietnamese ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                      <span>{isVietnamese ? 'Đang tải dữ liệu người dùng...' : 'Loading users...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    {isVietnamese ? 'Không tìm thấy người dùng nào phù hợp.' : 'No users found matching query.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const primaryRole = u.roles?.[0] || 'MEMBER';
                  const initials = (u.fullName || u.username)
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={u.userId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {u.fullName || u.username}
                              {u.username === 'admin' && (
                                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="text-xs text-slate-400">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                          {u.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.email}</span>
                            </div>
                          )}
                          {u.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                          {!u.email && !u.phone && <span className="text-slate-400">—</span>}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r) => (
                            <span
                              key={r}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                                roleBadgeColors[r] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Workplace Site */}
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                        {u.assignedSiteName ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="font-medium">{u.assignedSiteName}</span>
                          </div>
                        ) : primaryRole === 'ADMIN' ? (
                          <span className="text-slate-400 italic">
                            {isVietnamese ? 'Trụ sở chính (HQ)' : 'Headquarters'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            {isVietnamese ? 'Chưa phân công' : 'Unassigned'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {u.status || 'ACTIVE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedUserForTransfer(u);
                            setTransferSiteId(u.assignedSiteId || (sites[0] ? sites[0].siteId : ''));
                            setShowTransferModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                        >
                          {isVietnamese ? 'Đổi cơ sở' : 'Transfer Site'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            {isVietnamese ? 'Tổng số' : 'Total'}: {filteredUsers.length} / {totalCount}{' '}
            {isVietnamese ? 'tài khoản' : 'users'}
          </span>
          <span>{isVietnamese ? 'Trang 1 / 1' : 'Page 1 of 1'}</span>
        </div>
      </div>

      {/* Modal: Thêm người dùng mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                {isVietnamese ? 'Tạo tài khoản nhân viên' : 'Create Staff User'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {isVietnamese ? 'Tên đăng nhập (Username)' : 'Username'}
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="VD: site_lead_q1"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {isVietnamese ? 'Mật khẩu tạm thời' : 'Temporary Password'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {isVietnamese
                    ? 'Nhân viên sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.'
                    : 'The user will be required to change password on first login.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {isVietnamese ? 'Vai trò phân quyền (Role)' : 'Role'}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {roles.map((r) => (
                    <option key={r.roleId || r.name} value={r.name}>
                      {r.name} - {r.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {isVietnamese ? 'Chi nhánh làm việc (Site)' : 'Workplace Site'}
                </label>
                <select
                  value={newSiteId}
                  onChange={(e) => setNewSiteId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">{isVietnamese ? '-- Trụ sở chính / Không gán --' : '-- Headquarters / None --'}</option>
                  {sites.map((s) => (
                    <option key={s.siteId} value={s.siteId}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {isVietnamese ? 'Tạo tài khoản' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chuyển cơ sở công tác */}
      {showTransferModal && selectedUserForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {isVietnamese ? 'Điều phối chi nhánh công tác' : 'Transfer Workplace Site'}
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
              <div className="text-slate-500">{isVietnamese ? 'Nhân viên:' : 'Staff member:'}</div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {selectedUserForTransfer.fullName || selectedUserForTransfer.username} (@
                {selectedUserForTransfer.username})
              </div>
              <div className="text-slate-400">
                {isVietnamese ? 'Vai trò:' : 'Role:'} {selectedUserForTransfer.roles?.join(', ')}
              </div>
            </div>

            <form onSubmit={handleTransferWorkplace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {isVietnamese ? 'Chọn chi nhánh mới' : 'Select Target Site'}
                </label>
                <select
                  required
                  value={transferSiteId}
                  onChange={(e) => setTransferSiteId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {sites.map((s) => (
                    <option key={s.siteId} value={s.siteId}>
                      {s.code} - {s.name} ({s.address})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {isVietnamese ? 'Cập nhật cơ sở' : 'Save Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
