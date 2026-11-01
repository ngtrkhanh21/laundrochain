import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import GoogleSignInButton from '../components/GoogleSignInButton';
import {
  WashingMachine,
  Eye,
  EyeOff,
  LogIn,
  Zap,
  Shield,
  DollarSign,
  Building2,
  Wrench,
  User,
  AlertCircle,
} from 'lucide-react';

// Tài khoản mẫu 5 roles để demo nhanh
const QUICK_LOGIN_ACCOUNTS = [
  {
    username: 'admin_demo',
    password: 'Admin123!',
    label: 'Demo User',
    role: 'MEMBER',
    icon: User,
    color: '#3b82f6',
  },
  {
    username: 'admin',
    password: 'Admin123!',
    label: 'Admin',
    role: 'ADMIN',
    icon: Shield,
    color: '#a855f7',
  },
  {
    username: 'pricing',
    password: 'Admin123!',
    label: 'Pricing Mgr',
    role: 'PRICING_MANAGER',
    icon: DollarSign,
    color: '#f59e0b',
  },
  {
    username: 'sitemgr',
    password: 'Admin123!',
    label: 'Site Mgr',
    role: 'SITE_MANAGER',
    icon: Building2,
    color: '#10b981',
  },
  {
    username: 'tech',
    password: 'Admin123!',
    label: 'Technician',
    role: 'TECHNICIAN',
    icon: Wrench,
    color: '#06b6d4',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, loading } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [quickLoading, setQuickLoading] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username || !form.password) {
      setError(t('auth.fillEmailAndPassword', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu'));
      return;
    }

    const result = await login(form.username.trim(), form.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const handleQuickLogin = async (account) => {
    setQuickLoading(account.role);
    setError('');

    let result = await login(account.username, account.password, account.role);

    // Nếu chưa tồn tại tài khoản trên Backend mới, tự động đăng ký rồi đăng nhập
    if (!result.success) {
      const regRes = await register({
        username: account.username,
        password: account.password,
        confirmPassword: account.password,
      });
      if (regRes.success) {
        result = await login(account.username, account.password, account.role);
      }
    }

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(
        result.error ||
          t('auth.quickLoginFailed', 'Đăng nhập nhanh thất bại. Hãy chắc chắn Backend đang hoạt động.'),
      );
    }
    setQuickLoading(null);
  };

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
      {/* Background blobs */}
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />

      {/* Top right language switcher */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 10 }}>
        <LanguageSwitcher align="right" />
      </div>

      <div
        className="glass-card animate-fade-in"
        style={{ width: '100%', maxWidth: 480, padding: '40px 40px 36px', position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              marginBottom: 16,
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
            }}
          >
            <WashingMachine size={32} color="white" />
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
            className="gradient-text"
          >
            LaundroChain
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            {t('common.appTagline', 'Hệ thống quản trị chuỗi tiệm giặt thông minh')}
          </p>
        </div>

        {/* Quick Login Buttons */}
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: 14,
            padding: '16px',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              color: 'var(--color-text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Zap size={12} />
            {t('auth.quickDemoTitle', 'DEMO NHANH — BẤM 1 CLICK')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {QUICK_LOGIN_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const isLoading = quickLoading === acc.role;
              return (
                <button
                  key={acc.role}
                  onClick={() => handleQuickLogin(acc)}
                  disabled={loading || quickLoading !== null}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 6px',
                    borderRadius: 10,
                    border: `1.5px solid ${acc.color}30`,
                    background: `${acc.color}10`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: loading || (quickLoading !== null && !isLoading) ? 0.5 : 1,
                  }}
                  title={`${t('auth.quickLoginTooltip', 'Đăng nhập nhanh:')} ${t(
                    'roles.' + acc.role,
                    acc.label,
                  )} (${acc.username})`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${acc.color}22`;
                    e.currentTarget.style.borderColor = acc.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${acc.color}10`;
                    e.currentTarget.style.borderColor = `${acc.color}30`;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {isLoading ? (
                    <div
                      className="loading-spinner"
                      style={{ borderTopColor: acc.color, borderColor: `${acc.color}40` }}
                    />
                  ) : (
                    <Icon size={18} color={acc.color} />
                  )}
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: acc.color,
                      lineHeight: 1.2,
                      textAlign: 'center',
                    }}
                  >
                    {acc.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Google Sign In */}
        <div style={{ marginBottom: 18 }}>
          <GoogleSignInButton mode="login" />
        </div>

        {/* Divider */}
        <div className="divider-text">{t('auth.manualLoginText', 'hoặc đăng nhập thủ công')}</div>

        {/* Error alert */}
        {error && (
          <div
            className="alert alert-error animate-fade-in"
            style={{
              marginBottom: 18,
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label
              className="form-label"
              htmlFor="username"
              style={error ? { color: '#dc2626', fontWeight: 600 } : {}}
            >
              {t('auth.usernameLabel', 'Tên đăng nhập')}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className={`form-input ${error ? 'input-error' : ''}`}
              placeholder={t('auth.usernamePlaceholder', 'Nhập tên đăng nhập...')}
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label
              className="form-label"
              htmlFor="password"
              style={error ? { color: '#dc2626', fontWeight: 600 } : {}}
            >
              {t('auth.passwordLabel', 'Mật khẩu')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${error ? 'input-error' : ''}`}
                placeholder={t('auth.passwordPlaceholder', 'Nhập mật khẩu...')}
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
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

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? <div className="loading-spinner" /> : <LogIn size={18} />}
            {loading ? t('auth.loggingIn', 'Đang đăng nhập...') : t('auth.loginBtn', 'Đăng nhập')}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          {t('auth.noAccountPrompt', 'Chưa có tài khoản?')}{' '}
          <Link
            to="/register"
            style={{ color: 'var(--color-brand-400)', fontWeight: 600, textDecoration: 'none' }}
          >
            {t('auth.registerNow', 'Đăng ký ngay')}
          </Link>
        </p>
      </div>
    </div>
  );
}
