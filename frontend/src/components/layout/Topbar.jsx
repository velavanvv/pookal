import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export default function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar card border-0 shadow-sm">
      <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <p className="text-uppercase text-muted small mb-1">Operations center</p>
          <h2 className="h4 mb-0">Retail florist architecture starter</h2>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge text-bg-success">{user?.email || 'Live sync ready'}</span>
          <button className="btn btn-outline-dark" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
