import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

/**
 * Shop routes are blocked for superadmin.
 * Superadmin is always redirected to /admin.
 */
export default function ShopRoute({ children }) {
  const { user } = useAuth();

  if (user?.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
