import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

/**
 * Only superadmin can access this route.
 * Anyone else is redirected to /dashboard.
 */
export default function SuperAdminRoute({ children }) {
  const { user } = useAuth();

  if (user && user.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
