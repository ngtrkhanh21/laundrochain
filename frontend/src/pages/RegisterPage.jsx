import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { WashingMachine, Eye, EyeOff, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();

  const [form, setForm] = useState({
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
    if (!form.fullName.trim()) return 'Vui lòng nhập họ tên';
    if (form.fullName.trim().length < 2) return 'Họ tên phải có ít nhất 2 ký tự';
    if (!form.email) return 'Vui lòng nhập email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email không hợp lệ';
    if (form.phoneNumber && !/^(0|\+84)[3-9][0-9]{8}$/.test(form.phoneNumber))
      return 'Số điện thoại không hợp lệ (VD: 0901234567)';
    if (!form.password) return 'Vui lòng nhập mật khẩu';
    if (form.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    if (form.password !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp';
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
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      ...(form.phoneNumber && { phoneNumber: form.phoneNumber }),
    };

    const result = await register(payload);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } else {
      setError(result.error);
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
            Đăng ký thành công! 🎉
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Đang chuyển về trang đăng nhập...
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
            Tạo tài khoản
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Tham gia LaundroChain ngay hôm nay
          </p>
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
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Họ và tên *</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="form-input"
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email *</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="example@email.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="phoneNumber">
              Số điện thoại{' '}
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(không bắt buộc)</span>
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              className="form-input"
              placeholder="0901234567"
              value={form.phoneNumber}
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Mật khẩu *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Tối thiểu 6 ký tự"
                value={form.password}
                onChange={handleChange}
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', display: 'flex', padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Xác nhận mật khẩu *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className="form-input"
                placeholder="Nhập lại mật khẩu"
                value={form.confirmPassword}
                onChange={handleChange}
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', display: 'flex', padding: 4,
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
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: 'var(--color-brand-400)', fontWeight: 600, textDecoration: 'none' }}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
