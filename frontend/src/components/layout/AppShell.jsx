import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';
import { useBranch } from '../../features/branches/BranchContext';
import { useAuth } from '../../features/auth/AuthContext';
import { useFcm } from '../../hooks/useFcm';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useOrderAlerts } from '../../hooks/useOrderAlerts';
import OrderAlertBanner from '../common/OrderAlertBanner';
import GlobalVoiceAssistant from '../common/GlobalVoiceAssistant';

export default function AppShell() {
  const { user } = useAuth();
  const { activeBranch, switchBranch } = useBranch();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin            = user?.role === 'admin';
  const isSuperAdmin       = user?.role === 'superadmin';
  const isBranchUser       = !!user?.locked_branch;
  const canUseBranchSwitch = isAdmin && !isBranchUser;
  const branchInContext    = isBranchUser ? user.locked_branch : (canUseBranchSwitch ? activeBranch : null);
  const canSwitch          = canUseBranchSwitch && !!activeBranch;

  // Real-time Audio Ring & Visual Alert for Incoming Online Orders (Shop tenants only, not superadmin)
  const { activeAlert, dismissAlert } = useOrderAlerts({ enabled: !!user && !isSuperAdmin });

  const [orderToast, setOrderToast] = useState(null);
  const handleFcmMessage = useCallback((payload) => {
    const n = payload.notification ?? {};
    setOrderToast({ title: n.title, body: n.body });
    setTimeout(() => setOrderToast(null), 6000);
  }, []);
  useFcm(user, handleFcmMessage);

  const { show: showInstall, install: installPwa, dismiss: dismissInstall } = usePwaInstall();

  return (
    <div className="app-shell">
      {/* Real-time Online Order Ringing Alert Banner */}
      {activeAlert && (
        <OrderAlertBanner order={activeAlert} onDismiss={dismissAlert} />
      )}

      {/* PWA install banner */}
      {showInstall && (
        <div className="pwa-install-banner">
          <div className="pwa-install-banner__icon"><i className="bi bi-shop" /></div>
          <div className="pwa-install-banner__text">
            <div className="pwa-install-banner__title">Install UBP App</div>
            <div className="pwa-install-banner__sub">Add Universal Business Platform to your home screen</div>
          </div>
          <button className="pwa-install-banner__btn" onClick={installPwa}>Install</button>
          <button className="pwa-install-banner__dismiss" onClick={dismissInstall}><i className="bi bi-x-lg" /></button>
        </div>
      )}

      {/* FCM foreground notification toast */}
      {orderToast && (
        <div className="fcm-toast" onClick={() => setOrderToast(null)}>
          <div className="fcm-toast__icon"><i className="bi bi-bag-heart-fill" /></div>
          <div className="fcm-toast__content">
            <div className="fcm-toast__title">{orderToast.title}</div>
            <div className="fcm-toast__body">{orderToast.body}</div>
          </div>
          <button className="fcm-toast__close"><i className="bi bi-x-lg" /></button>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sb-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Grouped Google-Style Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-shell__body">
        {/* Google-Style Top App Bar with Waffle, Global Search & Context */}
        <AppHeader onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        {/* Branch context banner */}
        {branchInContext && (
          <div style={{
            background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
            color: '#fff', padding: '0.45rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            fontSize: '0.8rem', flexShrink: 0,
            borderBottom: '1px solid #334155',
          }}>
            <i className={`bi ${isBranchUser ? 'bi-lock-fill' : 'bi-building'}`} style={{ fontSize: '0.85rem', color: '#38bdf8' }} />
            <span style={{ fontWeight: 600 }}>{isBranchUser ? 'Branch Session' : 'Active Branch View'}:</span>
            <span style={{ color: '#bae6fd', fontWeight: 700 }}>{branchInContext.name}</span>
            <span style={{ opacity: 0.6, fontSize: '0.72rem', fontFamily: 'monospace' }}>({branchInContext.code})</span>
            <span style={{ flex: 1 }} />
            {!isBranchUser && <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>Displaying this branch's data only</span>}
            {canSwitch && (
              <button onClick={() => switchBranch(null)} style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', borderRadius: '6px', padding: '0.2rem 0.65rem',
                fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                <i className="bi bi-x-lg" /> All Branches
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
