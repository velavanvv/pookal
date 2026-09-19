import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

/**
 * Shop routes are blocked for superadmin.
 * Superadmin is always redirected to /admin.
 */
export default function ShopRoute({ children, requiredModule = null, requiredCapability = null }) {
  const { user, hasCapability } = useAuth();

  if (user?.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  const check = requiredCapability || requiredModule;
  if (check) {
    if (!hasCapability(check)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
