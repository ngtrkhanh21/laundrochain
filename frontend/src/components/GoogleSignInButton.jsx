import { useState, useRef, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function GoogleSignInButton({ mode = 'login' }) {
  const { loginWithGoogle } = useAuth();
  const { isVietnamese } = useLanguage();
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const [btnWidth, setBtnWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      return Math.min(Math.max(w - 72, 200), 320);
    }
    return 280;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tự động tính toán kích thước nút Google theo đúng chiều rộng màn hình thiết bị (chống tràn 100%)
  useEffect(() => {
    const calcWidth = () => {
      if (containerRef.current) {
        const clientW = containerRef.current.clientWidth;
        if (clientW > 0) {
          // Google Identity Services giới hạn width trong khoảng [200, 400]
          // Trừ bớt 8px padding để nút không bao giờ chạm viền khung
          const target = Math.min(Math.max(Math.floor(clientW - 8), 200), 340);
          setBtnWidth(target);
          return;
        }
      }
      const target = Math.min(Math.max(window.innerWidth - 72, 200), 320);
      setBtnWidth(target);
    };

    calcWidth();

    let observer;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => calcWidth());
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', calcWidth);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', calcWidth);
    };
  }, []);

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
        ? 'Đăng nhập Google thất bại hoặc bạn đã đóng cửa sổ đăng nhập.'
        : 'Google sign-in failed or window closed.'
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
      {/* Thông báo lỗi / thành công */}
      {error && (
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
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
            boxSizing: 'border-box',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span style={{ wordBreak: 'break-word' }}>{error}</span>
        </div>
      )}
      {success && (
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
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
            boxSizing: 'border-box',
          }}
        >
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* Nút Google thật từ @react-oauth/google - Tự động co giãn theo width màn hình */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: submitting ? 0.6 : 1,
          pointerEvents: submitting ? 'none' : 'auto',
          overflow: 'hidden',
          minHeight: 46,
        }}
      >
        <GoogleLogin
          key={`gis-btn-${btnWidth}`}
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="outline"
          size="large"
          text={mode === 'register' ? 'signup_with' : 'signin_with'}
          shape="pill"
          width={String(btnWidth)}
          locale={isVietnamese ? 'vi' : 'en'}
        />
      </div>
    </div>
  );
}
