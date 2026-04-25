import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { navigation } from '../../data/navigation';
import { useAuth } from '../../features/auth/AuthContext';
import { useBranch } from '../../features/branches/BranchContext';
import api from '../../services/api';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { activeBranch, switchBranch } = useBranch();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'superadmin';
  const isOwner      = !isSuperAdmin && !user?.parent_user_id;
  const modules      = user?.subscription?.modules ?? null; // null = no restriction

  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!isSuperAdmin) {
      api.get('/branches').then(({ data }) => setBranches(data || [])).catch(() => {});
    }
  }, [isSuperAdmin]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isVisible = (item) => {
    if (item.adminOnly && !isOwner) return false;
    if (item.module && modules !== null && !modules.includes(item.module)) return false;
    return true;
  };

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const activeBranches = branches.filter(b => b.is_active);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-brand__logo">
          <i className="bi bi-flower3" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="sb-brand__name">Pookal</div>
          <div className="sb-brand__sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isSuperAdmin ? 'Platform Admin' : (user?.shop_name || 'Florist Suite')}
          </div>
        </div>
      </div>

      {/* Branch context switcher — only for shop users with branches */}
      {!isSuperAdmin && activeBranches.length > 0 && (
        <div style={{ padding: '0 0.75rem 0.5rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
            Branch View
          </div>
          <select
            value={activeBranch?.id || ''}
            onChange={(e) => {
              const found = activeBranches.find(b => String(b.id) === e.target.value);
              switchBranch(found || null);
            }}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '0.78rem', padding: '0.35rem 0.6rem',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="" style={{ background: '#18181b', color: '#fff' }}>All branches</option>
            {activeBranches.map(b => (
              <option key={b.id} value={b.id} style={{ background: '#18181b', color: '#fff' }}>{b.name}</option>
            ))}
          </select>
          {activeBranch && (
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem', textAlign: 'center' }}>
              Viewing: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{activeBranch.name}</strong>
            </div>
          )}
        </div>
      )}

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
          navigation.filter(isVisible).map(item => (
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
