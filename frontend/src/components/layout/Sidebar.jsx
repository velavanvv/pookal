import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { navigationGroups } from '../../data/navigation';
import { useAuth } from '../../features/auth/AuthContext';
import { useI18n } from '../../features/auth/I18nContext';
import { useBranch } from '../../features/branches/BranchContext';
import api from '../../services/api';

export default function Sidebar({ open, onClose }) {
  const { user, logout, hasCapability, businessType } = useAuth();
  const { t } = useI18n();
  const { activeBranch, switchBranch } = useBranch();
  const navigate = useNavigate();

  const isSuperAdmin  = user?.role === 'superadmin';
  const isAdmin       = user?.role === 'admin';
  const isOwner       = !isSuperAdmin && !user?.parent_user_id;
  const isBranchUser  = !!user?.locked_branch;
  const unreadDemos   = user?.unread_demo_requests ?? 0;

  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (isAdmin && !isBranchUser) {
      api.get('/branches').then(({ data }) => setBranches(data || [])).catch(() => {});
    } else {
      setBranches([]);
    }
  }, [isAdmin, isBranchUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleNavClick = () => {
    onClose?.();
  };

  const isItemVisible = (item) => {
    if (item.adminOnly && !isOwner) return false;
    const required = item.capability || item.module;
    if (required && !hasCapability(required)) return false;
    return true;
  };

  const typeIcons = {
    retail: 'bi-cart3',
    fresh_perishable: 'bi-droplet-half',
    restaurant: 'bi-cup-hot',
    service: 'bi-scissors',
    hybrid: 'bi-shop',
  };

  const currentTypeIcon = typeIcons[businessType] || 'bi-shop';
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      {/* ── BRAND HEADER ── */}
      <div className="sb-brand" style={{ padding: '1rem 1.15rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          className="sb-brand__logo"
          style={{
            width: 36,
            height: 36,
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.1rem',
          }}
        >
          <i className={`bi ${isSuperAdmin ? 'bi-shield-check' : currentTypeIcon}`} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="sb-brand__name" style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff', lineHeight: 1.2 }}>
            {isSuperAdmin ? 'UBP Admin Control' : (user?.shop_name || 'Universal Business')}
          </div>
          <div className="sb-brand__sub" style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isSuperAdmin ? 'Platform Management' : (user?.shop_profile?.label || 'Universal Business Platform')}
          </div>
        </div>
        <button className="sb-close" onClick={onClose} aria-label="Close menu">
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {/* ── GROUPED GOOGLE WORKSPACE STYLE NAVIGATION ── */}
      <nav className="sb-nav" style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
        {isSuperAdmin ? (
          <div style={{ padding: '0 0.5rem' }}>
            <NavLink
              to="/admin"
              onClick={handleNavClick}
              className={({ isActive }) => `sb-link sb-link--admin ${isActive ? 'sb-link--active' : ''}`}
            >
              <i className="bi bi-shield-lock" />
              <span>Admin Console</span>
              {unreadDemos > 0 && (
                <span className="sb-badge">{unreadDemos > 99 ? '99+' : unreadDemos}</span>
              )}
            </NavLink>
          </div>
        ) : (
          navigationGroups.map((group) => {
            const visibleItems = group.items.filter(isItemVisible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} style={{ marginBottom: '1.15rem' }}>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.4)',
                    padding: '0.25rem 0.85rem 0.35rem',
                  }}
                >
                  {t(group.i18nKey) || group.title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={handleNavClick}
                      className={({ isActive }) => `sb-link ${isActive ? 'sb-link--active' : ''}`}
                      style={{
                        borderRadius: '10px',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.82rem',
                      }}
                    >
                      <i className={`bi ${item.icon}`} style={{ fontSize: '0.95rem' }} />
                      <span>{t(item.i18nKey) || item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </nav>

      {/* ── FOOTER: SUBSCRIPTION STATUS & USER PROFILE ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '0.75rem', background: 'rgba(0,0,0,0.15)' }}>
        {!isSuperAdmin && user?.subscription && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div
              style={{
                background: user.subscription.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                color: user.subscription.status === 'active' ? '#4ade80' : '#fbbf24',
                borderRadius: '8px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{user.subscription.plan_name}</span>
              <span>{user.subscription.days_left}d left</span>
            </div>
          </div>
        )}

        <div className="sb-user" style={{ padding: '0.35rem 0.5rem' }}>
          <div className="sb-user__avatar" style={{ background: '#0284c7', color: '#fff', width: 32, height: 32, fontSize: '0.78rem' }}>
            {initials}
          </div>
          <div className="sb-user__info">
            <div className="sb-user__name" style={{ fontSize: '0.82rem' }}>{user?.name || 'Staff'}</div>
            <div className="sb-user__email" style={{ fontSize: '0.7rem' }}>{user?.email}</div>
          </div>
          <button className="sb-user__out" onClick={handleLogout} title="Sign out" style={{ color: '#f87171' }}>
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </div>
    </aside>
  );
}
