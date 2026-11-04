import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi } from '../api/authApi';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  XCircle,
} from 'lucide-react';

export default function ForceChangePasswordModal({ isOpen = true, onClose }) {
  const { user, login, logout, updateUser } = useAuth();
  const { isVietnamese } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Tiêu chí mật khẩu
  const hasMinLength = newPassword.length >= 6;
  const hasNoSpaces = newPassword.length > 0 && !/\s/.test(newPassword);
  const isDifferent = newPassword.length > 0 && currentPassword.length > 0 && newPassword !== currentPassword;
  const isMatching = confirmNewPassword.length > 0 && newPassword === confirmNewPassword;

  // Tính toán độ mạnh mật khẩu
  const calcStrength = () => {
    if (!newPassword) return { score: 0, text: '', color: 'bg-slate-200', percent: 0, textCol: 'text-slate-400' };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 2) {
      return {
        score: 1,
        text: isVietnamese ? 'Mật khẩu yếu' : 'Weak password',
        color: 'bg-rose-500',
        textCol: 'text-rose-500',
        percent: 33,
      };
    }
    if (score <= 3) {
      return {
        score: 2,
        text: isVietnamese ? 'Mật khẩu trung bình' : 'Medium password',
        color: 'bg-amber-500',
        textCol: 'text-amber-500',
        percent: 66,
      };
    }
    return {
      score: 3,
      text: isVietnamese ? 'Mật khẩu mạnh & an toàn' : 'Strong & secure',
      color: 'bg-emerald-500',
      textCol: 'text-emerald-500',
      percent: 100,
    };
  };

  const strength = calcStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError(
        isVietnamese
          ? 'Vui lòng nhập mật khẩu hiện tại hoặc mật khẩu tạm thời.'
          : 'Please enter your current or temporary password.'
      );
      return;
    }

    if (!hasMinLength) {
      setError(
        isVietnamese
          ? 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
          : 'New password must be at least 6 characters.'
      );
      return;
    }

    if (/\s/.test(newPassword)) {
      setError(
        isVietnamese
          ? 'Mật khẩu mới không được chứa khoảng trắng (spaces).'
          : 'New password cannot contain spaces.'
      );
      return;
    }

    if (newPassword === currentPassword) {
      setError(
        isVietnamese
          ? 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'
          : 'New password cannot be the same as current password.'
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError(
        isVietnamese
          ? 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới.'
          : 'Confirm password does not match.'
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Gọi backend POST /api/users/change-password
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      // 2. Cấp lại Token mới (Re-login) để xóa claim must_change_password: true trong JWT
      const username = user?.username || user?.email;
      const activeRole = user?.activeRole;

      if (username) {
        const loginRes = await login(username, newPassword, activeRole);
        if (!loginRes.success) {
          console.warn('Không thể tự động re-login sau khi đổi pass:', loginRes.error);
        }
      }

      // 3. Cập nhật state User để tắt cờ mustChangePassword
      if (user) {
        updateUser({
          ...user,
          mustChangePassword: false,
          MustChangePassword: false,
        });
      }

      setSuccess(true);
    } catch (err) {
      console.error('Lỗi khi đổi mật khẩu bắt buộc:', err);
      let msg = err.message || '';
      if (msg.includes('Current password is incorrect')) {
        msg = isVietnamese ? 'Mật khẩu hiện tại/tạm thời không chính xác.' : 'Current password is incorrect.';
      } else if (msg.includes('New password cannot be the same')) {
        msg = isVietnamese ? 'Mật khẩu mới không được trùng với mật khẩu cũ.' : 'New password cannot be the same.';
      } else if (msg.includes('spaces')) {
        msg = isVietnamese ? 'Mật khẩu mới không được chứa dấu cách.' : 'New password cannot contain spaces.';
      }
      setError(msg || (isVietnamese ? 'Đổi mật khẩu thất bại, vui lòng thử lại.' : 'Failed to change password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (user) {
      updateUser({ ...user, mustChangePassword: false, MustChangePassword: false });
    }
    if (onClose) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-password-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Accent Top Gradient Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600" />

        <div className="p-6 sm:p-7 overflow-y-auto">
          {success ? (
            /* TRẠNG THÁI THÀNH CÔNG */
            <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-8 ring-emerald-50 dark:ring-emerald-900/30">
                <ShieldCheck className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isVietnamese ? 'Đổi mật khẩu thành công!' : 'Password Changed Successfully!'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {isVietnamese
                    ? 'Tài khoản của bạn đã được kích hoạt đầy đủ quyền hạn. Hệ thống đã tự động làm mới phiên làm việc an toàn.'
                    : 'Your account has been fully unlocked. Your secure session has been refreshed.'}
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-left">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                  {isVietnamese
                    ? 'Bạn có thể tiếp tục truy cập các chức năng trạm giặt, sửa chữa và điều hành.'
                    : 'You can now proceed to all system features, repairs, and dashboard operations.'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98]"
              >
                <span>{isVietnamese ? 'Bắt đầu sử dụng ngay' : 'Continue to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* FORM YÊU CẦU ĐỔI MẬT KHẨU */
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 ring-4 ring-amber-50 dark:ring-amber-900/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{isVietnamese ? 'Bắt buộc đổi mật khẩu' : 'Password Change Required'}</span>
                  </div>
                  <h2
                    id="force-password-modal-title"
                    className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight"
                  >
                    {isVietnamese ? 'Thiết lập mật khẩu bảo mật mới' : 'Set Your Secure Password'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {isVietnamese
                      ? 'Tài khoản của bạn đang dùng mật khẩu tạm thời một lần. Vui lòng đổi mật khẩu mới để kích hoạt và sử dụng hệ thống.'
                      : 'You are using a temporary initial password. Please update your password to unlock your account.'}
                  </p>
                </div>
              </div>

              {/* Thông tin tài khoản người dùng */}
              {user && (
                <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {user.fullName || user.username}
                    </span>
                    <span className="text-slate-400">(@{user.username})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                    {user.activeRole || 'STAFF'}
                  </span>
                </div>
              )}

              {/* Thông báo lỗi nếu có */}
              {error && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Form inputs */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Mật khẩu hiện tại */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isVietnamese ? 'Mật khẩu tạm thời hiện tại' : 'Current / Temporary Password'} *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 2. Mật khẩu mới */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isVietnamese ? 'Mật khẩu mới' : 'New Password'} *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Thanh đo độ mạnh mật khẩu */}
                  {newPassword && (
                    <div className="space-y-1 pt-1">
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${strength.color}`}
                          style={{ width: `${strength.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`font-bold ${strength.textCol}`}>{strength.text}</span>
                        <span className="text-slate-400">
                          {isVietnamese ? 'Tối thiểu 6 ký tự' : 'Min 6 characters'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tiêu chí gợi ý */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    <div
                      className={`flex items-center gap-1.5 ${
                        hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                      <span>{isVietnamese ? 'Tối thiểu 6 ký tự' : 'Min 6 chars'}</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${
                        hasNoSpaces ? 'text-emerald-600 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {hasNoSpaces ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                      <span>{isVietnamese ? 'Không có dấu cách' : 'No spaces'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Xác nhận mật khẩu mới */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isVietnamese ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'} *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmNewPassword && !isMatching && (
                    <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      <span>{isVietnamese ? 'Mật khẩu xác nhận chưa khớp!' : 'Passwords do not match!'}</span>
                    </p>
                  )}
                  {confirmNewPassword && isMatching && (
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isVietnamese ? 'Mật khẩu xác nhận đã khớp!' : 'Passwords match!'}</span>
                    </p>
                  )}
                </div>

                {/* Submit & Action Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={loading || !hasMinLength || !hasNoSpaces || (confirmNewPassword && !isMatching)}
                    className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{isVietnamese ? 'Đang cập nhật...' : 'Updating...'}</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>{isVietnamese ? 'Cập nhật mật khẩu & Mở khóa' : 'Update Password & Unlock'}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      {isVietnamese ? 'Không muốn đổi lúc này?' : 'Not now?'}
                    </span>
                    <button
                      type="button"
                      onClick={logout}
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-semibold inline-flex items-center gap-1.5 hover:underline cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Đăng xuất khỏi tài khoản' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
