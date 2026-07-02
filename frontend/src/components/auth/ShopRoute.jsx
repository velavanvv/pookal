import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

/**
 * Shop routes are blocked for superadmin.
 * Superadmin is always redirected to /admin.
 */
export default function ShopRoute({ children, requiredModule = null }) {
  const { user } = useAuth();

  if (user?.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  if (requiredModule) {
    const modules = user?.subscription?.modules ?? null;

    if (modules !== null && !modules.includes(requiredModule)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
