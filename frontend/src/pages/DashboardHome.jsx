import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardHome() {
  const { user } = useAuth();
  const primaryRole = (user?.activeRole || user?.roles?.[0] || (user?.isGuest ? 'MEMBER' : 'ADMIN')).toUpperCase();

  switch (primaryRole) {
    case 'ADMIN':
      return <Navigate to="/dashboard/users" replace />;
    case 'PRICING_MANAGER':
      return <Navigate to="/dashboard/pricing-rules" replace />;
    case 'SITE_MANAGER':
    case 'SITEMANAGER':
    case 'STORE_MANAGER':
      return <Navigate to="/dashboard/new-order" replace />;
    case 'TECHNICIAN':
      return <Navigate to="/dashboard/repairs" replace />;
    case 'MEMBER':
    default:
      return <Navigate to="/dashboard/new-order" replace />;
  }
}
