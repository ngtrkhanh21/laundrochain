import { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi } from '../api/authApi';
import { memberApi } from '../api/memberApi';
import { memberTiersApi } from '../api/memberTiersApi';
import {
  User,
  Mail,
  Phone,
  Shield,
  Edit3,
  Save,
  X,
  CheckCircle2,
  Calendar,
  BadgeCheck,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Crown,
  Wallet,
  History,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Award,
  ExternalLink,
  RotateCw,
} from 'lucide-react';

function getTierInfo(tierCode, tierName, isVietnamese, discount = null) {
  const code = (tierCode || '').toUpperCase();
  if (code.includes('PLATINUM') || code.includes('KIM')) {
    const disc = discount != null ? discount : 0;
    return {
      name: tierName || (isVietnamese ? 'Hội viên Bạch Kim' : 'Platinum Member'),
      badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      gradient: 'from-purple-600 via-indigo-600 to-violet-700',
      icon: Crown,
      discount: disc,
      perks: disc > 0
        ? (isVietnamese ? `Giảm ${disc}% tất cả chu trình giặt, ưu tiên giữ máy` : `${disc}% off all cycles, machine priority`)
        : (isVietnamese ? 'Ưu tiên giữ máy 20 phút, hỗ trợ VIP 24/7' : '20min hold priority, 24/7 VIP support'),
    };
  }
  if (code.includes('GOLD') || code.includes('VÀNG') || code.includes('VANG')) {
    const disc = discount != null ? discount : 6;
    return {
      name: tierName || (isVietnamese ? 'Hội viên Vàng' : 'Gold Member'),
      badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      gradient: 'from-amber-500 via-orange-600 to-yellow-600',
      icon: Crown,
      discount: disc,
      perks: disc > 0
        ? (isVietnamese ? `Giảm ${disc}% các chu trình giặt sấy theo khuyến mãi` : `${disc}% off laundry & drying promotion`)
        : (isVietnamese ? 'Ưu tiên giữ máy 10 phút, tích lũy điểm thưởng' : '10-min machine hold priority'),
    };
  }
  if (code.includes('SILVER') || code.includes('BẠC') || code.includes('BAC')) {
    const disc = discount != null ? discount : 3;
    return {
      name: tierName || (isVietnamese ? 'Hội viên Bạc' : 'Silver Member'),
      badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      gradient: 'from-slate-500 via-zinc-600 to-neutral-700',
      icon: Award,
      discount: disc,
      perks: disc > 0
        ? (isVietnamese ? `Giảm ${disc}% mọi đơn giặt, tích điểm thăng hạng` : `${disc}% off every order, tier points multiplier`)
        : (isVietnamese ? 'Tích lũy điểm thăng hạng sau mỗi lần giặt sấy' : 'Earn tier points with every wash'),
    };
  }
  return {
    name: tierName || (isVietnamese ? 'Hội viên Tiêu chuẩn' : 'Standard Member'),
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    gradient: 'from-blue-600 via-indigo-600 to-sky-600',
    icon: Sparkles,
    discount: 0,
    perks: isVietnamese ? 'Tích lũy điểm thăng hạng cho từng lần thanh toán' : 'Earn tier points with every wash',
  };
}

function getPasswordStrength(password, isVietnamese) {
  if (!password) return { score: 0, text: '', color: '' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return {
      score: 1,
      text: isVietnamese ? 'Mật khẩu yếu' : 'Weak password',
      color: 'bg-rose-500',
      textColor: 'text-rose-500',
      percent: 33,
    };
  }
  if (score <= 3) {
    return {
      score: 2,
      text: isVietnamese ? 'Mật khẩu trung bình' : 'Medium password',
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      percent: 66,
    };
  }
  return {
    score: 3,
    text: isVietnamese ? 'Mật khẩu mạnh & an toàn' : 'Strong & secure',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    percent: 100,
  };
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { isVietnamese, language, setLanguage } = useLanguage();

  if (user?.isGuest) {
    return <Navigate to="/dashboard/new-order" replace />;
  }

  // Active Tab: 'personal' | 'security' | 'privileges'
  const [activeTab, setActiveTab] = useState('personal');

  // Member profile & wallet summary
  const [memberProfile, setMemberProfile] = useState(() => {
    try {
      const cached = localStorage.getItem('laundro_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [cachedWallet] = useState(() => {
    try {
      const cached = localStorage.getItem('laundro_cached_wallet');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [tierDiscount, setTierDiscount] = useState(null);

  // Tải dữ liệu hồ sơ hội viên mới nhất & chiết khấu theo CTKM
  const fetchMemberProfile = useCallback(async () => {
    try {
      const [profileRes, tiersRes] = await Promise.allSettled([
        memberApi.getProfile(),
        memberTiersApi.getTiers(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setMemberProfile(profileRes.value);
        localStorage.setItem('laundro_cached_profile', JSON.stringify(profileRes.value));
      }

      if (tiersRes.status === 'fulfilled' && Array.isArray(tiersRes.value)) {
        const rawCode = (
          (profileRes.status === 'fulfilled' ? profileRes.value?.tier?.tierCode || profileRes.value?.tierCode : null) ||
          user?.tierCode ||
          'STANDARD'
        ).toUpperCase();
        const matched = tiersRes.value.find((t) => (t.code || '').toUpperCase() === rawCode);
        if (matched && typeof matched.discount === 'number') {
          setTierDiscount(matched.discount);
        }
      }
    } catch {
      // ignore
    }
  }, [user?.tierCode]);

  useEffect(() => {
    fetchMemberProfile();
  }, [fetchMemberProfile]);

  // Editing profile state
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || user?.phone || '',
    email: user?.email || '',
    preferredLang: user?.language || language || 'vi',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState(null);

  // Toast alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync form when user changes
  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || user.phone || '',
        email: user.email || '',
        preferredLang: user.language || language || 'vi',
      });
    }
  }, [user, language]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handlePasswordChange = (e) => {
    setPasswordForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  // Lưu thông tin cá nhân
  const handleSaveProfile = async () => {
    if (!form.fullName.trim()) {
      setError(isVietnamese ? 'Họ tên không được để trống' : 'Full name cannot be empty');
      return;
    }
    if (form.fullName.trim().length < 2) {
      setError(isVietnamese ? 'Họ tên phải có ít nhất 2 ký tự' : 'Full name must be at least 2 characters');
      return;
    }
    if (form.phoneNumber && !/^[0-9]{10,11}$/.test(form.phoneNumber.trim())) {
      setError(isVietnamese ? 'Số điện thoại phải từ 10 đến 11 chữ số' : 'Phone number must be 10-11 digits');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError(isVietnamese ? 'Email không hợp lệ' : 'Invalid email address');
      return;
    }

    setSavingProfile(true);
    setError('');
    try {
      const result = await authApi.updateMe({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber ? form.phoneNumber.trim() : undefined,
        email: form.email ? form.email.trim() : undefined,
        language: form.preferredLang,
      });

      const updated = result?.user || result;
      updateUser(updated);

      if (form.preferredLang !== language) {
        setLanguage(form.preferredLang);
      }

      setSuccess(isVietnamese ? 'Cập nhật thông tin tài khoản thành công!' : 'Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      setError(err.message || (isVietnamese ? 'Không thể cập nhật thông tin' : 'Could not update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setForm({
      fullName: user?.fullName || '',
      phoneNumber: user?.phoneNumber || user?.phone || '',
      email: user?.email || '',
      preferredLang: user?.language || language || 'vi',
    });
    setError('');
    setIsEditing(false);
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      setError(isVietnamese ? 'Vui lòng nhập mật khẩu hiện tại' : 'Current password is required');
      return;
    }
    if (!passwordForm.newPassword) {
      setError(isVietnamese ? 'Vui lòng nhập mật khẩu mới' : 'New password is required');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError(isVietnamese ? 'Mật khẩu mới phải từ 6 ký tự trở lên' : 'New password must be at least 6 characters');
      return;
    }
    if (/\s/.test(passwordForm.newPassword)) {
      setError(isVietnamese ? 'Mật khẩu mới không được chứa khoảng trắng' : 'New password cannot contain spaces');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setError(isVietnamese ? 'Mật khẩu xác nhận không khớp' : 'Password confirmation does not match');
      return;
    }

    setChangingPass(true);
    setError('');
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      });

      setSuccess(isVietnamese ? 'Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.' : 'Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || (isVietnamese ? 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.' : 'Change password failed.'));
    } finally {
      setChangingPass(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return isVietnamese ? 'Chưa cập nhật' : 'Not set';
    return new Date(dateStr).toLocaleDateString(isVietnamese ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name) => {
    if (!name) return 'LC';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  // Tier calculation
  const tierCode = memberProfile?.tier?.tierCode || memberProfile?.tierCode || 'STANDARD';
  const tierName = memberProfile?.tier?.tierName || memberProfile?.tierName;
  const tierData = getTierInfo(tierCode, tierName, isVietnamese, tierDiscount);
  const TierIcon = tierData.icon;

  const memberCode = memberProfile?.memberCode || (user?.id ? `MEM-${String(user.id).slice(0, 8).toUpperCase()}` : 'MEM-USER');
  const walletBalance = memberProfile?.wallet?.balance ?? cachedWallet?.balance ?? 0;
  const passStrength = getPasswordStrength(passwordForm.newPassword, isVietnamese);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <User className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>{isVietnamese ? 'Hồ sơ cá nhân' : 'My Profile'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Quản lý thông tin định danh, quyền lợi hội viên và bảo mật đăng nhập'
              : 'Manage your personal details, membership tier and account security'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isVietnamese ? 'Tài khoản hoạt động' : 'Active Account'}</span>
          </span>
        </div>
      </div>

      {/* 2. Banner Hồ sơ / Thẻ đại diện (Hero Card) - Màu sắc dịu nhẹ, thanh lịch */}
      <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50/80 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 text-slate-900 dark:text-white border border-blue-100/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Họa tiết nền dịu nhẹ */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-200/30 dark:bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-200/25 dark:bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          {/* Avatar chữ cái viết tắt */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xl sm:text-2xl tracking-tight shadow-md shadow-blue-500/20">
              {getInitials(user?.fullName || user?.username)}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center"
              title="Đang trực tuyến"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>
          </div>

          {/* Thông tin đại diện */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black truncate tracking-tight text-slate-900 dark:text-white">
                {user?.fullName || user?.username}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70">
                <TierIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>{tierData.name}</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">@{user?.username}</span>
              <span>•</span>
              <span className="font-mono bg-blue-100/70 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70 px-2 py-0.5 rounded text-[11px] font-bold">
                {memberCode}
              </span>
              <span>•</span>
              <span className="text-slate-400 dark:text-slate-500">
                {isVietnamese ? 'Tham gia:' : 'Joined:'} {formatDate(user?.createdAt)}
              </span>
            </div>

            {/* Lời chúc / Đặc quyền ngắn */}
            <p className="text-xs text-slate-600 dark:text-slate-400 pt-0.5 flex items-center gap-1.5 line-clamp-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{tierData.perks}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Thông báo Alert Toast */}
      {error && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 font-medium">{error}</div>
          <button type="button" onClick={() => setError('')} className="p-1 hover:opacity-70 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 font-semibold">{success}</div>
          <button type="button" onClick={() => setSuccess('')} className="p-1 hover:opacity-70 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Thanh Tab Điều Hướng Hiện Đại */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'personal'
            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <User className="w-4 h-4" />
          <span>{isVietnamese ? 'Thông tin cá nhân' : 'Personal Info'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'security'
            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <Shield className="w-4 h-4" />
          <span>{isVietnamese ? 'Bảo mật & Mật khẩu' : 'Security & Password'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('privileges')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'privileges'
            ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          <Crown className="w-4 h-4" />
          <span>{isVietnamese ? 'Đặc quyền hội viên' : 'Member Privileges'}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: THÔNG TIN CÁ NHÂN                                  */}
      {/* ========================================================= */}
      {activeTab === 'personal' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                {isEditing
                  ? (isVietnamese ? 'Chỉnh sửa thông tin tài khoản' : 'Edit Account Details')
                  : (isVietnamese ? 'Hồ sơ tài khoản chi tiết' : 'Account Details')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isEditing
                  ? (isVietnamese ? 'Cập nhật họ tên, số điện thoại hoặc email nhận hóa đơn' : 'Update your full name, phone number or receipt email')
                  : (isVietnamese ? 'Các thông tin định danh dùng để nhận diện và xác thực giặt ủi' : 'Identifier information used for your laundry orders')}
              </p>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Chỉnh sửa' : 'Edit'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={savingProfile}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  {isVietnamese ? 'Hủy bỏ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-500/30 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{savingProfile ? (isVietnamese ? 'Đang lưu...' : 'Saving...') : (isVietnamese ? 'Lưu thay đổi' : 'Save')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Form chỉnh sửa hoặc Lưới hiển thị chi tiết */}
          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Họ và tên */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isVietnamese ? 'Họ và tên' : 'Full Name'} *</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleFormChange}
                  placeholder={isVietnamese ? 'Ví dụ: Nguyễn Văn A' : 'John Doe'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition"
                />
              </div>

              {/* Tên đăng nhập (Khóa không sửa) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isVietnamese ? 'Tên đăng nhập (Cố định)' : 'Username (Read-only)'}</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.username || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 text-slate-400 dark:text-slate-500 text-sm font-mono cursor-not-allowed"
                />
              </div>

              {/* Số điện thoại */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isVietnamese ? 'Số điện thoại liên hệ' : 'Phone Number'}</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleFormChange}
                  placeholder="0901234567"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isVietnamese ? 'Địa chỉ Email' : 'Email Address'}</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="example@laundrochain.vn"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition"
                />
              </div>

              {/* Ngôn ngữ hiển thị */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isVietnamese ? 'Ngôn ngữ giao diện' : 'Preferred Language'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, preferredLang: 'vi' }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${form.preferredLang === 'vi'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <span>🇻🇳 Tiếng Việt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, preferredLang: 'en' }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${form.preferredLang === 'en'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    <span>🇬🇧 English</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {/* Họ và tên */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                      {isVietnamese ? 'Họ và tên' : 'Full Name'}
                    </span>
                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {user?.fullName || user?.username}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tên đăng nhập */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <AtSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                      {isVietnamese ? 'Tên đăng nhập' : 'Username'}
                    </span>
                    <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      @{user?.username}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(user?.username, 'username')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  title="Sao chép tên đăng nhập"
                >
                  {copiedKey === 'username' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Số điện thoại */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                      {isVietnamese ? 'Số điện thoại' : 'Phone Number'}
                    </span>
                    <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {user?.phoneNumber || user?.phone || (
                        <span className="text-slate-400 italic font-sans text-xs">
                          {isVietnamese ? 'Chưa cập nhật' : 'Not set'}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                {(user?.phoneNumber || user?.phone) && (
                  <button
                    type="button"
                    onClick={() => handleCopy(user?.phoneNumber || user?.phone, 'phone')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    title="Sao chép số điện thoại"
                  >
                    {copiedKey === 'phone' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                      {isVietnamese ? 'Hòm thư Email' : 'Email Address'}
                    </span>
                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate block">
                      {user?.email || (
                        <span className="text-slate-400 italic text-xs">
                          {isVietnamese ? 'Chưa cập nhật' : 'Not set'}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                {user?.email && (
                  <button
                    type="button"
                    onClick={() => handleCopy(user?.email, 'email')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
                    title="Sao chép email"
                  >
                    {copiedKey === 'email' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Mã định danh hội viên */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                      {isVietnamese ? 'Mã thẻ thành viên' : 'Membership Code'}
                    </span>
                    <span className="font-mono font-bold text-sm sm:text-base text-blue-600 dark:text-blue-400">
                      #{memberCode}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(memberCode, 'memberCode')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  title="Sao chép mã thẻ"
                >
                  {copiedKey === 'memberCode' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Ngày tham gia hệ thống */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                      {isVietnamese ? 'Ngày gia nhập' : 'Member Since'}
                    </span>
                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {formatDate(user?.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: BẢO MẬT & ĐỔI MẬT KHẨU                            */}
      {/* ========================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>{isVietnamese ? 'Thay đổi mật khẩu đăng nhập' : 'Change Password'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isVietnamese
                  ? 'Nên sử dụng mật khẩu mạnh kết hợp chữ hoa, chữ số và ký tự đặc biệt để bảo vệ tài khoản ví'
                  : 'Use a strong password combining uppercase, numbers and symbols to protect your account'}
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              {/* Mật khẩu hiện tại */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isVietnamese ? 'Mật khẩu hiện tại' : 'Current Password'} *</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    required
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isVietnamese ? 'Mật khẩu mới' : 'New Password'} *</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    required
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Thanh đo độ mạnh mật khẩu */}
                {passwordForm.newPassword && (
                  <div className="space-y-1 pt-1 animate-in fade-in">
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passStrength.color}`}
                        style={{ width: `${passStrength.percent}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-bold ${passStrength.textColor}`}>
                      {passStrength.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isVietnamese ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'} *</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    name="confirmNewPassword"
                    value={passwordForm.confirmNewPassword}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    required
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword && (
                  <p className="text-[11px] text-rose-500 font-medium">
                    {isVietnamese ? 'Mật khẩu xác nhận chưa khớp!' : 'Passwords do not match!'}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {changingPass ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{isVietnamese ? 'Đang cập nhật mật khẩu...' : 'Updating password...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isVietnamese ? 'Cập nhật mật khẩu ngay' : 'Update Password Now'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tiêu chuẩn an toàn & Bảo vệ tài khoản */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {isVietnamese ? 'Mã hóa mật khẩu' : 'Password Hash'}
                </h4>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {isVietnamese ? 'Mã hóa tiêu chuẩn quốc tế Argon2 / BCrypt an toàn tuyệt đối' : 'Secured with high-standard password hashing algorithms'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {isVietnamese ? 'Đăng nhập QR Ki-ốt' : 'Kiosk QR Login'}
                </h4>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {isVietnamese ? 'Quét mã mở máy tại trạm giặt không lo lộ mật khẩu' : 'Instant QR authentication on washing kiosks without typing password'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {isVietnamese ? 'Bảo vệ số dư ví' : 'Wallet Security'}
                </h4>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {isVietnamese ? 'Mỗi giao dịch thanh toán đều lưu mã hash bất biến trên hệ thống' : 'Every top-up and deduction is logged with idempotent keys'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ĐẶC QUYỀN HỘI VIÊN & LỐI TẮT DỊCH VỤ                */}
      {/* ========================================================= */}
      {activeTab === 'privileges' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span>{isVietnamese ? 'Hạng thành viên & Quyền lợi độc quyền' : 'Membership Tier & Privileges'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isVietnamese
                    ? 'Bạn đang được hưởng mức chiết khấu và ưu tiên dịch vụ dành riêng cho hạng này'
                    : 'Exclusive discounts and laundry benefits available for your tier'}
                </p>
              </div>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${tierData.badge}`}>
                <TierIcon className="w-4 h-4" />
                <span>{tierData.name}</span>
              </span>
            </div>

            {/* Chi tiết quyền lợi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2">
                <span className="font-extrabold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{isVietnamese ? 'Chiết khấu dịch vụ giặt & sấy' : 'Laundry Discounts'}</span>
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {tierData.perks}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 space-y-2">
                <span className="font-extrabold text-xs text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                  <span>{isVietnamese ? 'Giữ máy & Ưu tiên đặt lịch' : 'Hold Priority'}</span>
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {isVietnamese
                    ? 'Tự động khóa máy giặt trong 15-20 phút sau khi tạo đơn để bạn thảnh thơi di chuyển tới trạm.'
                    : 'Automatic 15-20 minutes hold time after booking so you can arrive at ease.'}
                </p>
              </div>
            </div>

            {/* Lối tắt quản lý ví & thẻ số */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                to="/wallet"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-amber-300" />
                <span>{isVietnamese ? 'Mở Thẻ thành viên & Nạp ví' : 'Open Digital Card & Wallet'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/orders"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <History className="w-4 h-4" />
                <span>{isVietnamese ? 'Xem lịch sử đơn giặt' : 'View Order History'}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
