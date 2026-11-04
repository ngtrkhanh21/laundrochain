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
  const { isAuthenticated, initializing, user } = useAuth();

  if (initializing) return null;

  const targetPath = '/dashboard';
  return !isAuthenticated ? <Outlet /> : <Navigate to={targetPath} replace />;
}

/**
 * RoleRoute: Kiểm tra vai trò của user.
 * Nếu user không thuộc allowedRoles → chuyển về fallbackPath.
 */
export function RoleRoute({ allowedRoles = [], fallbackPath = '/dashboard' }) {
  const { user, isAuthenticated, initializing } = useAuth();

  if (initializing) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const userRoles = [
    (user?.activeRole || '').toUpperCase(),
    ...(Array.isArray(user?.roles) ? user.roles.map((r) => String(r).toUpperCase()) : []),
  ];

  const hasAccess = allowedRoles.some((role) => userRoles.includes(role.toUpperCase()));

  return hasAccess ? <Outlet /> : <Navigate to={fallbackPath} replace />;
}

