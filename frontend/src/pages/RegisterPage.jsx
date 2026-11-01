import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi } from '../api/authApi';
import LanguageSwitcher from '../components/LanguageSwitcher';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { WashingMachine, Eye, EyeOff, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, login, loading } = useAuth();
  const { t, isVietnamese } = useLanguage();

  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const validate = () => {
    const cleanUsername = form.username.trim();
    if (!cleanUsername) return 'Vui lòng nhập tên đăng nhập';
    if (cleanUsername.length < 3) return 'Tên đăng nhập phải có ít nhất 3 ký tự';
    if (/\s/.test(cleanUsername)) return 'Tên đăng nhập không được chứa khoảng trắng';

    const cleanEmail = form.email.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return t('auth.validationEmailInvalid', 'Email không hợp lệ (VD: user@example.com)');
    }

    const cleanPhone = form.phoneNumber.trim().replace(/\s+/g, '');
    if (cleanPhone && !/^(0|\+84)[0-9]{9,10}$/.test(cleanPhone)) {
      return t('auth.validationPhoneInvalid', 'Số điện thoại không hợp lệ (VD: 0901234567)');
    }

    if (!form.password) return t('auth.validationPasswordRequired', 'Vui lòng nhập mật khẩu');
    if (form.password.length < 6) return t('auth.validationPasswordMin', 'Mật khẩu phải có ít nhất 6 ký tự');
    if (/\s/.test(form.password)) return 'Mật khẩu không được chứa khoảng trắng';
    if (form.password !== form.confirmPassword) return t('auth.validationPasswordMismatch', 'Mật khẩu xác nhận không khớp');
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      username: form.username.trim(),
      fullName: form.fullName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phoneNumber.trim().replace(/\s+/g, '') || undefined,
      password: form.password,
      confirmPassword: form.confirmPassword,
    };

    const result = await register(payload);
    if (result.success) {
      // Tự động đăng nhập ngay sau khi đăng ký để người dùng vào thẳng Dashboard
      try {
        await login(payload.username, payload.password);
        if (payload.fullName || payload.email || payload.phone) {
          try {
            await authApi.updateMe({
              fullName: payload.fullName || payload.username,
              email: payload.email,
              phone: payload.phone,
              language: 'vi',
            });
          } catch (updateErr) {
            console.warn('Update profile after registration:', updateErr);
          }
        }
      } catch (loginErr) {
        console.warn('Auto login after registration:', loginErr);
      }

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } else {
      setError(result.error || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="glass-card animate-fade-in" style={{ textAlign: 'center', padding: 48, maxWidth: 400 }}>
          <CheckCircle2 size={64} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
            {t('auth.regSuccessTitle', 'Đăng ký thành công! 🎉')}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Đang chuyển hướng vào hệ thống...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />

      {/* Top right language switcher */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 10 }}>
        <LanguageSwitcher align="right" />
      </div>

      <div
        className="glass-card animate-fade-in"
        style={{ width: '100%', maxWidth: 480, padding: '40px', position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              marginBottom: 14,
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
            }}
          >
            <WashingMachine size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }} className="gradient-text">
            {t('auth.registerTitle', 'Tạo tài khoản')}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            {t('auth.regSubtitle', 'Tham gia LaundroChain ngay hôm nay')}
          </p>
        </div>

        {/* Google Sign In */}
        <div style={{ marginBottom: 18 }}>
          <GoogleSignInButton mode="register" />
        </div>

        {/* Divider */}
        <div className="divider-text" style={{ marginBottom: 18 }}>
          {isVietnamese ? 'hoặc đăng ký bằng tài khoản' : 'or register with username'}
        </div>

        {/* Error */}
        {error && (
          <div
            className="alert alert-error animate-fade-in"
            style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: '#fef2f2',
              border: '1.5px solid #fca5a5',
              color: '#b91c1c',
              fontSize: '0.875rem',
              fontWeight: 500,
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)',
            }}
          >
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              {t('auth.usernameLabel', 'Tên đăng nhập')} *
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input"
              placeholder="VD: user_demo (tối thiểu 3 ký tự, không dấu cách)"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">
              {t('auth.fullNameLabel', 'Họ và tên')} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(tùy chọn)</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="form-input"
              placeholder={t('auth.fullNamePlaceholder', 'Nguyễn Văn A')}
              value={form.fullName}
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              {t('auth.emailLabel', 'Email')} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(tùy chọn)</span>
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className="form-input"
              placeholder={t('auth.emailPlaceholder', 'example@email.com')}
              value={form.email}
              onChange={handleChange}
            />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="phoneNumber">
              {t('auth.phoneLabel', 'Số điện thoại')}{' '}
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                {t('auth.optional', '(không bắt buộc)')}
              </span>
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              className="form-input"
              placeholder={t('auth.phonePlaceholder', '0901234567')}
              value={form.phoneNumber}
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              {t('auth.passwordLabel', 'Mật khẩu')} *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={t('auth.passwordMinLength', 'Tối thiểu 6 ký tự')}
                value={form.password}
                onChange={handleChange}
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              {t('auth.confirmPasswordLabel', 'Xác nhận mật khẩu')} *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className="form-input"
                placeholder={t('auth.confirmPasswordPlaceholder', 'Nhập lại mật khẩu...')}
                value={form.confirmPassword}
                onChange={handleChange}
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  padding: 4,
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? <div className="loading-spinner" /> : <UserPlus size={18} />}
            {loading ? t('auth.registering', 'Đang tạo tài khoản...') : t('auth.registerBtn', 'Tạo tài khoản')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          {t('auth.haveAccountPrompt', 'Đã có tài khoản?')}{' '}
          <Link to="/login" style={{ color: 'var(--color-brand-400)', fontWeight: 600, textDecoration: 'none' }}>
            {t('auth.loginNow', 'Đăng nhập ngay')}
          </Link>
        </p>
      </div>
    </div>
  );
}
