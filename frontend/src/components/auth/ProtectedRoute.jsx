import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { token, booting } = useAuth();

  if (booting) {
    return (
      <div className="auth-screen">
        <div className="auth-card text-center">
          <div className="spinner-border text-success" role="status" />
          <p className="mt-3 mb-0">Loading your florist workspace...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
