import { NavLink, useNavigate } from 'react-router-dom';
import { navigation } from '../../data/navigation';
import { useAuth } from '../../features/auth/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'superadmin';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-brand__logo">
          <i className="bi bi-flower3" />
        </div>
        <div>
          <div className="sb-brand__name">Pookal</div>
          <div className="sb-brand__sub">{isSuperAdmin ? 'Platform Admin' : 'Florist Suite'}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {isSuperAdmin ? (
          <NavLink
            to="/admin"
            className={({ isActive }) => `sb-link sb-link--admin ${isActive ? 'sb-link--active' : ''}`}
          >
            <i className="bi bi-shield-lock" />
            <span>Admin Panel</span>
          </NavLink>
        ) : (
          navigation.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sb-link ${isActive ? 'sb-link--active' : ''}`}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))
        )}
      </nav>

      {/* Subscription badge */}
      {!isSuperAdmin && user?.subscription && (
        <div style={{ padding: '0 0.75rem 0.5rem' }}>
          <div style={{
            background: user.subscription.status === 'active' ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)',
            color: user.subscription.status === 'active' ? '#4ade80' : '#fbbf24',
            borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.75rem',
            fontSize: '0.72rem', fontWeight: 600, textAlign: 'center',
          }}>
            {user.subscription.plan_name} · {user.subscription.days_left}d left
          </div>
        </div>
      )}

      {/* User */}
      <div className="sb-user">
        <div className="sb-user__avatar">{initials}</div>
        <div className="sb-user__info">
          <div className="sb-user__name">{user?.name || '—'}</div>
          <div className="sb-user__email">{user?.email}</div>
        </div>
        <button className="sb-user__out" onClick={handleLogout} title="Sign out">
          <i className="bi bi-box-arrow-right" />
        </button>
      </div>
    </aside>
  );
}
