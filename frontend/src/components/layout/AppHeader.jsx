import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useBranch } from '../../features/branches/BranchContext';
import { useI18n } from '../../features/auth/I18nContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import VoiceButton from '../common/VoiceButton';

export default function AppHeader({ onToggleSidebar }) {
  const { user, businessType, logout } = useAuth();
  const { activeBranch, switchBranch } = useBranch();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = user?.role === 'superadmin' || location.pathname.startsWith('/admin');

  const [showWaffle, setShowWaffle] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const waffleRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Close waffle on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (waffleRef.current && !waffleRef.current.contains(e.target)) {
        setShowWaffle(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    navigate(`/products?q=${encodeURIComponent(globalSearch.trim())}`);
  };

  const verticalLabels = {
    retail: 'Retail & Supermarket',
    fresh_perishable: 'Fresh Floral & Perishable',
    restaurant: 'Restaurant & Café',
    service: 'Service Business',
    hybrid: 'Multi-category Store',
  };

  // ── DEDICATED SUPERADMIN PLATFORM CONTROL PLANE HEADER ──
  if (isSuperAdmin) {
    return (
      <header
        style={{
          height: '60px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          position: 'sticky',
          top: 0,
          zIndex: 900,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Left: Sidebar Toggle + UBP Platform Control Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              fontSize: '1.3rem',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Toggle Navigation Menu"
          >
            <i className="bi bi-list" />
          </button>

          <Link
            to="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: '#38bdf8',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              <i className="bi bi-shield-lock-fill" style={{ fontSize: '1.1rem' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                Universal Business Platform
                <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#ede9fe', color: '#6d28d9', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid #ddd6fe', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Superadmin
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                <span>Platform Control Plane · Multi-Tenant Management</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center: System Status & Multi-Tenant Cloud Indicator */}
        <div style={{ flex: 1, maxWidth: '520px', margin: '0 1.5rem' }} className="d-none d-md-block">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '9999px',
              padding: '0.4rem 1.1rem',
              fontSize: '0.78rem',
              color: '#475569',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="bi bi-cloud-check-fill" style={{ color: '#0284c7' }} />
              <span>Scope: <strong style={{ color: '#0f172a' }}>Global Multi-Tenant</strong></span>
            </div>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)' }} />
              <span style={{ color: '#16a34a', fontWeight: 700 }}>System Live</span>
            </div>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="bi bi-shield-check" style={{ color: '#6366f1' }} />
              <span style={{ color: '#6366f1', fontWeight: 600 }}>Security Enforced</span>
            </div>
          </div>
        </div>

        {/* Right: Superadmin User Badge & Sign Out Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.75rem',
                fontWeight: 800,
              }}
            >
              PA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                {user?.name || 'Platform Admin'}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'superadmin@pookal.com'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              background: '#fff',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title="Sign Out of Superadmin Console"
          >
            <i className="bi bi-box-arrow-right" />
            <span className="d-none d-sm-inline">Sign Out</span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header
      style={{
        height: '60px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 900,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* ── LEFT: BURGER & UBP BRAND ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            color: '#475569',
            fontSize: '1.3rem',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Toggle Navigation Menu"
        >
          <i className="bi bi-list" />
        </button>

        <Link
          to="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: '#38bdf8',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: '0.9rem',
              letterSpacing: '-0.02em',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            UBP
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
              Universal Business Platform
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
              {user?.shop_name || 'Shop Enterprise'} · <span style={{ color: '#0284c7' }}>{verticalLabels[businessType] || 'All Verticals'}</span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── CENTER: GOOGLE-STYLE GLOBAL SEARCH WITH MIC ── */}
      <div style={{ flex: 1, maxWidth: '480px', margin: '0 1.5rem' }} className="d-none d-md-block">
        <form onSubmit={handleGlobalSearch} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: '0.9rem', color: '#94a3b8', fontSize: '0.85rem' }} />
          <input
            type="text"
            className="pk-input"
            style={{
              width: '100%',
              paddingLeft: '2.4rem',
              paddingRight: '2.5rem',
              height: '38px',
              borderRadius: '9999px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              fontSize: '0.82rem',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            placeholder="Search products, SKU, barcodes, orders, customers… (Ctrl + K)"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
          <div style={{ position: 'absolute', right: '0.4rem' }}>
            <VoiceButton small onResult={(text) => setGlobalSearch(text)} />
          </div>
        </form>
      </div>

      {/* ── RIGHT: GOOGLE APPS SWITCHER (WAFFLE), STORE CHIP, LANGUAGE, USER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Launch Storefront Chip */}
        <Link
          to={user?.database?.storefront_slug ? `/store/${user.database.storefront_slug}` : "/store"}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.8rem',
            borderRadius: '9999px',
            background: 'rgba(190, 24, 93, 0.08)',
            color: '#be185d',
            border: '1px solid rgba(190, 24, 93, 0.2)',
            fontSize: '0.78rem',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'all 0.15s',
          }}
          title="Open Public E-Commerce Storefront in New Tab"
        >
          <i className="bi bi-globe2" />
          <span className="d-none d-sm-inline">Online Store</span>
          <i className="bi bi-arrow-up-right" style={{ fontSize: '0.7rem' }} />
        </Link>

        {/* Google-Style 9-Dots Waffle Menu */}
        <div style={{ position: 'relative' }} ref={waffleRef}>
          <button
            type="button"
            onClick={() => setShowWaffle((v) => !v)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: showWaffle ? '#e2e8f0' : 'none',
              border: 'none',
              color: '#475569',
              fontSize: '1.15rem',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
            title="Google App Launcher (Switch Applications)"
          >
            <i className="bi bi-grid-3x3-gap-fill" />
          </button>

          {showWaffle && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '300px',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 0 0 1px #e2e8f0',
                padding: '1rem',
                zIndex: 1000,
                animation: 'fadeIn 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                UBP Ecosystem Apps
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <Link
                  to="/pos"
                  onClick={() => setShowWaffle(false)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: '#0f172a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                    <i className="bi bi-receipt" />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>POS Register</span>
                </Link>

                <Link
                  to={user?.database?.storefront_slug ? `/store/${user.database.storefront_slug}` : "/store"}
                  target="_blank"
                  onClick={() => setShowWaffle(false)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: '#166534',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                    <i className="bi bi-globe2" />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Storefront</span>
                </Link>

                <Link
                  to="/inventory"
                  onClick={() => setShowWaffle(false)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: '#0f172a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                    <i className="bi bi-boxes" />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Inventory</span>
                </Link>

                <Link
                  to="/reports"
                  onClick={() => setShowWaffle(false)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: '#0f172a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                    <i className="bi bi-graph-up-arrow" />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Analytics</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher variant="topbar" />

        {/* Branch Context Indicator */}
        {activeBranch && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#f1f5f9',
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <i className="bi bi-building" />
            {activeBranch.name}
          </span>
        )}
      </div>
    </header>
  );
}
