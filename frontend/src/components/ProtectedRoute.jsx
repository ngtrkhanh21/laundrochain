import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute: Chỉ cho vào nếu đã đăng nhập.
 * Nếu chưa → chuyển về /login.
 */
export function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-bg-primary)',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Đang kiểm tra phiên đăng nhập...
        </p>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

/**
 * PublicRoute: Chỉ cho vào nếu CHƯA đăng nhập.
 * Nếu đã đăng nhập → chuyển về dashboard.
 */
export function PublicRoute() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) return null;

  return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
