import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    email: 'admin@laundrochain.vn',
    password: '123456',
    label: 'Admin',
    role: 'ADMIN',
    icon: Shield,
    color: '#a855f7',
  },
  {
    email: 'pricing@laundrochain.vn',
    password: '123456',
    label: 'Pricing Mgr',
    role: 'PRICING_MANAGER',
    icon: DollarSign,
    color: '#f59e0b',
  },
  {
    email: 'sitemgr@laundrochain.vn',
    password: '123456',
    label: 'Site Mgr',
    role: 'SITE_MANAGER',
    icon: Building2,
    color: '#10b981',
  },
  {
    email: 'tech@laundrochain.vn',
    password: '123456',
    label: 'Technician',
    role: 'TECHNICIAN',
    icon: Wrench,
    color: '#06b6d4',
  },
  {
    email: 'member@gmail.com',
    password: '123456',
    label: 'Member',
    role: 'MEMBER',
    icon: User,
    color: '#3b82f6',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
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

    if (!form.email || !form.password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    const result = await login(form.email, form.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const handleQuickLogin = async (account) => {
    setQuickLoading(account.role);
    setError('');
    const result = await login(account.email, account.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Đăng nhập nhanh thất bại. Hãy chắc chắn Backend đang chạy và đã seed dữ liệu.');
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
            Hệ thống quản trị chuỗi tiệm giặt thông minh
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
            Demo nhanh — Bấm 1 click
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
                    opacity: (loading || (quickLoading !== null && !isLoading)) ? 0.5 : 1,
                  }}
                  title={`Đăng nhập nhanh: ${acc.email}`}
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
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: acc.color, lineHeight: 1.2, textAlign: 'center' }}>
                    {acc.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="divider-text">hoặc đăng nhập thủ công</div>

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
              htmlFor="email"
              style={error ? { color: '#dc2626', fontWeight: 600 } : {}}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-input ${error ? 'input-error' : ''}`}
              placeholder="example@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label
              className="form-label"
              htmlFor="password"
              style={error ? { color: '#dc2626', fontWeight: 600 } : {}}
            >
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${error ? 'input-error' : ''}`}
                placeholder="Nhập mật khẩu..."
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
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            style={{ color: 'var(--color-brand-400)', fontWeight: 600, textDecoration: 'none' }}
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
