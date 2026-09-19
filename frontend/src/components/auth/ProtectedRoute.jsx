import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import AccountStatusPage from '../../features/auth/AccountStatusPage';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { token, user, booting } = useAuth();

  if (booting) {
    return (
      <div className="auth-screen">
        <div className="auth-card text-center">
          <div className="spinner-border text-success" role="status" />
          <p className="mt-3 mb-0">Loading your shop workspace...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Superadmin bypasses subscription checks
  if (user?.role !== 'superadmin') {
    const subStatus = user?.subscription?.status;
    if (subStatus === 'suspended') {
      return <AccountStatusPage status="suspended" />;
    }
    if (subStatus === 'expired') {
      return <AccountStatusPage status="expired" />;
    }
  }

  return children;
}
