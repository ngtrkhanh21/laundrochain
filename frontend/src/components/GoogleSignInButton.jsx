import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function GoogleSignInButton({ mode = 'login' }) {
  const { loginWithGoogle, loading } = useAuth();
  const { isVietnamese } = useLanguage();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Xử lý khi đăng nhập Google thật thành công (nhận credential là Google ID Token JWT thật)
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError(isVietnamese ? 'Không nhận được Google Token.' : 'No Google credential received.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await loginWithGoogle(credentialResponse.credential);
      if (res.success) {
        setSuccess(
          isVietnamese
            ? 'Đăng nhập Google thành công! Đang chuyển hướng...'
            : 'Google sign-in successful! Redirecting...'
        );
        setTimeout(() => navigate('/dashboard'), 800);
      } else {
        setError(res.error || (isVietnamese ? 'Xác thực Google thất bại.' : 'Google auth failed.'));
      }
    } catch (err) {
      setError(err.message || (isVietnamese ? 'Lỗi kết nối máy chủ.' : 'Network error.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setError(
      isVietnamese
        ? 'Đăng nhập Google thất bại hoặc bạn đã đóng cửa sổ chọn tài khoản.'
        : 'Google sign-in failed or window closed.'
    );
  };

  // Nút phụ Google Demo 1-Click dự phòng
  const handleDemoClick = async () => {
    setSubmitting(true);
    setError('');
    const demoToken = 'mock-google-id-token-' + Date.now();
    try {
      const res = await loginWithGoogle(demoToken);
      if (res.success) {
        setSuccess(isVietnamese ? 'Đăng nhập Google Demo thành công!' : 'Demo sign-in successful!');
        setTimeout(() => navigate('/dashboard'), 600);
      } else {
        setError(res.error || 'Đăng nhập thất bại.');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Thông báo lỗi / thành công */}
      {error && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 12px',
            borderRadius: 10,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '0.8rem',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 12px',
            borderRadius: 10,
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            fontSize: '0.8rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* Nút Google thật từ @react-oauth/google - Mở trực tiếp Popup chọn Gmail */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          opacity: submitting ? 0.6 : 1,
          pointerEvents: submitting ? 'none' : 'auto',
        }}
      >
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="outline"
          size="large"
          text={mode === 'register' ? 'signup_with' : 'signin_with'}
          shape="rectangular"
          width="400"
          locale={isVietnamese ? 'vi' : 'en'}
        />
      </div>

      {/* Nút phụ nhỏ Google Demo 1-Click ở góc dưới dự phòng */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 2 }}>
        <button
          type="button"
          onClick={handleDemoClick}
          disabled={submitting || loading}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted, #64748b)',
            fontSize: '0.74rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'all 0.15s ease',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted, #64748b)';
          }}
          title={isVietnamese ? 'Dự phòng test khi không có mạng hoặc chưa cấu hình OAuth' : 'Fast test without network'}
        >
          <Zap size={11} color="#f59e0b" />
          <span>{isVietnamese ? 'Google Demo 1-Click (Dự phòng test)' : 'Google Demo 1-Click (Fallback)'}</span>
        </button>
      </div>
    </div>
  );
}
