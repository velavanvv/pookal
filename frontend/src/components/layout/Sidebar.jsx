import { NavLink } from 'react-router-dom';
import { navigation } from '../../data/navigation';
import { useAuth } from '../../features/auth/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <aside className="sidebar d-flex flex-column">
      {/* Brand */}
      <div className="sidebar__brand">
        <span className="sidebar__badge">
          {isSuperAdmin ? <i className="bi bi-shield-lock" style={{ fontSize: '1.1rem' }} /> : 'P'}
        </span>
        <div>
          <h1 className="sidebar__title">Pookal</h1>
          <p className="sidebar__subtitle">
            {isSuperAdmin ? 'Platform Admin' : 'Florist commerce suite'}
          </p>
        </div>
      </div>

      {/* User block */}
      <div className="sidebar__user">
        <strong>{user?.name || '—'}</strong>
        <span>{user?.email}</span>
        {isSuperAdmin && (
          <span className="badge mt-1 text-bg-warning text-dark" style={{ fontSize: '0.7rem' }}>
            Super Admin
          </span>
        )}
        {!isSuperAdmin && user?.subscription && (
          <span className={`badge mt-1 text-bg-${
            user.subscription.status === 'active' ? 'success' :
            user.subscription.status === 'trial'  ? 'info'    : 'warning'
          }`} style={{ fontSize: '0.7rem' }}>
            {user.subscription.plan_name} · {user.subscription.days_left}d left
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="nav flex-column gap-2 flex-grow-1">
        {isSuperAdmin ? (
          /* ── Superadmin sees only admin links ── */
          <>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `sidebar__link sidebar__link--admin ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <i className="bi bi-people-fill" />
              <span>Customers</span>
            </NavLink>
          </>
        ) : (
          /* ── Regular users see shop nav ── */
          navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))
        )}
      </nav>

      {/* Sign out */}
      <button
        className="sidebar__link text-start border-0 bg-transparent w-100"
        style={{ color: 'rgba(255,255,255,0.6)' }}
        onClick={logout}
      >
        <i className="bi bi-box-arrow-left" />
        <span>Sign out</span>
      </button>
    </aside>
  );
}
