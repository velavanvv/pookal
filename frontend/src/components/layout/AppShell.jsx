import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useBranch } from '../../features/branches/BranchContext';
import { useAuth } from '../../features/auth/AuthContext';

export default function AppShell() {
  const { user } = useAuth();
  const { activeBranch, switchBranch } = useBranch();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin            = user?.role === 'admin';
  const isBranchUser       = !!user?.locked_branch;
  const canUseBranchSwitch = isAdmin && !isBranchUser;
  const branchInContext    = isBranchUser ? user.locked_branch : (canUseBranchSwitch ? activeBranch : null);
  const canSwitch          = canUseBranchSwitch && !!activeBranch;

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sb-overlay" onClick={() => setSidebarOpen(false)} />}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-shell__body">
        {/* Mobile top bar — hamburger + brand */}
        <div className="app-topbar">
          <button className="app-topbar__burger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <i className="bi bi-list" />
          </button>
          <div className="app-topbar__brand">
            <i className="bi bi-flower3" />
            <span>Pookal</span>
          </div>
          {branchInContext && (
            <span className="app-topbar__branch">
              <i className={`bi ${isBranchUser ? 'bi-lock-fill' : 'bi-building'}`} />
              {branchInContext.name}
            </span>
          )}
        </div>

        {/* Branch context banner */}
        {branchInContext && (
          <div style={{
            background: 'linear-gradient(90deg,#7d294a 0%,#a83060 100%)',
            color: '#fff', padding: '0.45rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            fontSize: '0.8rem', flexShrink: 0,
          }}>
            <i className={`bi ${isBranchUser ? 'bi-lock-fill' : 'bi-shop'}`} style={{ fontSize: '0.85rem' }} />
            <span style={{ fontWeight: 600 }}>{isBranchUser ? 'Branch Login' : 'Branch View'}:</span>
            <span style={{ opacity: 0.9 }}>{branchInContext.name}</span>
            <span style={{ opacity: 0.5, fontSize: '0.72rem', fontFamily: 'monospace' }}>({branchInContext.code})</span>
            <span style={{ flex: 1 }} />
            {!isBranchUser && <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>All data shows this branch only</span>}
            {canSwitch && (
              <button onClick={() => switchBranch(null)} style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', borderRadius: '4px', padding: '0.2rem 0.6rem',
                fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                <i className="bi bi-x-lg" /> Back to Main Shop
              </button>
            )}
          </div>
        )}

        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
