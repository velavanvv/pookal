import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useI18n } from './I18nContext';
import api from '../../services/api';

/**
 * AccountStatusPage
 *
 * Shown when the user's subscription is 'suspended' or 'expired'.
 * - Suspended: show info + contact admin message (no self-serve payment)
 * - Expired: show available plans + simulated payment flow
 *   (real gateway to be integrated later; currently logs a renewal request)
 */
export default function AccountStatusPage({ status }) {
  const { user, logout, refreshUser } = useAuth();
  const { t, locale } = useI18n();
  const [plans, setPlans] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [cycle, setCycle] = useState('monthly');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState(null);

  const isSuspended = status === 'suspended';
  const isExpired   = status === 'expired';

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const { data } = await api.get('/plans/public');
      setPlans(data.filter(p => p.is_active && p.name !== 'Free Trial'));
    } catch {
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleShowPlans = () => {
    if (!plans) loadPlans();
  };

  const handlePay = async () => {
    if (!selectedPlan) return;
    setPaying(true);
    setError(null);
    try {
      /**
       * TODO: Replace this block with actual payment gateway integration.
       * For now we POST a "renewal request" to the backend which queues it
       * for manual processing by the superadmin.
       */
      await api.post('/subscription/renewal-request', {
        plan_id: selectedPlan.id,
        billing_cycle: cycle,
      });
      setPaid(true);
      // Refresh user data so subscription status updates
      setTimeout(async () => {
        await refreshUser();
      }, 2000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  if (paid) {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg,#22c55e,#16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', fontSize: '2rem', color: '#fff',
          }}>
            <i className="bi bi-check-lg" />
          </div>
          <h3 style={{ fontWeight: 800, marginBottom: '0.5rem', color: '#16a34a' }}>
            {t('paymentSuccess').split('!')[0]}!
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Your renewal request has been submitted. Our team will activate your plan shortly.
          </p>
          <div style={{
            background: '#f0fdf4', border: '1.5px solid #bbf7d0',
            borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '1.5rem',
            fontSize: '0.85rem', color: '#166534',
          }}>
            <i className="bi bi-info-circle me-2" />
            Payment gateway integration is in progress. A platform admin will confirm your renewal within 24 hours.
          </div>
          <button
            className="pk-btn pk-btn--primary"
            style={{ width: '100%' }}
            onClick={() => window.location.reload()}
          >
            <i className="bi bi-arrow-clockwise me-2" />
            Reload App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen" style={{ background: 'linear-gradient(135deg, #1a0a1e 0%, #2d1b33 50%, #1a0a1e 100%)' }}>
      <div className="auth-card" style={{ maxWidth: 560, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: isSuspended
              ? 'linear-gradient(135deg,#f59e0b,#d97706)'
              : 'linear-gradient(135deg,#ef4444,#dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', fontSize: '2rem', color: '#fff',
            boxShadow: isSuspended ? '0 0 0 8px rgba(245,158,11,0.15)' : '0 0 0 8px rgba(239,68,68,0.15)',
          }}>
            <i className={`bi ${isSuspended ? 'bi-pause-circle-fill' : 'bi-x-circle-fill'}`} />
          </div>

          <h2 style={{ fontWeight: 800, color: '#111', marginBottom: '0.5rem' }}>
            {isSuspended ? t('accountSuspended') : t('subscriptionExpired')}
          </h2>

          <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {isSuspended ? t('suspendedMsg') : t('expiredMsg')}
          </p>
        </div>

        {/* Shop info card */}
        <div style={{
          background: '#f9fafb', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: '1rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--pookal-rose)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1rem', flexShrink: 0,
          }}>
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111' }}>
              {user?.shop_name || user?.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{user?.email}</div>
          </div>
          <div style={{
            padding: '0.25rem 0.75rem', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 700,
            background: isSuspended ? '#fef3c7' : '#fee2e2',
            color: isSuspended ? '#92400e' : '#991b1b',
            border: `1.5px solid ${isSuspended ? '#fcd34d' : '#fca5a5'}`,
          }}>
            {status.toUpperCase()}
          </div>
        </div>

        {/* Suspended: just show contact admin */}
        {isSuspended && (
          <div style={{
            background: '#fffbeb', border: '1.5px solid #fcd34d',
            borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem',
            fontSize: '0.875rem', color: '#78350f',
          }}>
            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
              <i className="bi bi-shield-exclamation me-2" />
              {t('accountSuspended')}
            </div>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Account suspensions are managed by the platform administrator.
              Please contact them directly via phone or email to resolve the issue.
            </p>
          </div>
        )}

        {/* Expired: show plan picker */}
        {isExpired && !plans && (
          <button
            className="pk-btn pk-btn--primary"
            style={{ width: '100%', marginBottom: '1rem', padding: '0.875rem' }}
            onClick={handleShowPlans}
            disabled={loadingPlans}
          >
            {loadingPlans ? (
              <><span className="spinner-border spinner-border-sm me-2" />{t('loading')}</>
            ) : (
              <><i className="bi bi-credit-card me-2" />{t('renewPlan')}</>
            )}
          </button>
        )}

        {isExpired && plans && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem' }}>
              <i className="bi bi-grid-1x2 me-2" />{t('selectPlan')}
            </div>

            {/* Billing cycle toggle */}
            <div style={{
              display: 'flex', gap: '0.5rem', marginBottom: '1rem',
              background: '#f3f4f6', borderRadius: 10, padding: 4,
            }}>
              {['monthly', 'yearly'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  style={{
                    flex: 1, padding: '0.45rem', borderRadius: 8,
                    border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                    background: cycle === c ? '#fff' : 'transparent',
                    color: cycle === c ? 'var(--pookal-rose)' : '#6b7280',
                    boxShadow: cycle === c ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {c === 'monthly' ? t('billingMonthly') : t('billingYearly')}
                  {c === 'yearly' && <span style={{ marginLeft: '0.35rem', color: '#16a34a', fontSize: '0.72rem' }}>Save 20%</span>}
                </button>
              ))}
            </div>

            {/* Plan cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {plans.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '1.5rem', fontSize: '0.85rem' }}>
                  No plans available. Contact admin.
                </div>
              )}
              {plans.map(plan => {
                const price = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                const isSelected = selectedPlan?.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    style={{
                      padding: '1rem 1.25rem',
                      border: `2px solid ${isSelected ? 'var(--pookal-rose)' : '#e5e7eb'}`,
                      borderRadius: 12, cursor: 'pointer',
                      background: isSelected ? 'rgba(190,24,93,0.04)' : '#fff',
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: isSelected ? 'var(--pookal-rose)' : '#f3f4f6',
                      color: isSelected ? '#fff' : '#6b7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
                      transition: 'all 0.15s',
                    }}>
                      {isSelected ? <i className="bi bi-check-lg" /> : <i className="bi bi-gem" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#111', marginBottom: '0.15rem' }}>{plan.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {(plan.modules || []).join(', ') || 'All modules'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isSelected ? 'var(--pookal-rose)' : '#111' }}>
                        ₹{Number(price).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                        /{cycle === 'yearly' ? 'yr' : 'mo'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{
                background: '#fee2e2', border: '1.5px solid #fca5a5',
                borderRadius: 8, padding: '0.625rem 0.875rem',
                fontSize: '0.82rem', color: '#dc2626', marginTop: '0.75rem',
              }}>
                <i className="bi bi-exclamation-circle me-2" />{error}
              </div>
            )}

            <button
              className="pk-btn pk-btn--primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', opacity: selectedPlan ? 1 : 0.5 }}
              onClick={handlePay}
              disabled={!selectedPlan || paying}
            >
              {paying ? (
                <><span className="spinner-border spinner-border-sm me-2" />Processing…</>
              ) : (
                <><i className="bi bi-credit-card me-2" />
                  {t('payNow')} {selectedPlan ? `— ₹${Number(cycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly).toLocaleString()}` : ''}
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            type="button"
            className="pk-btn pk-btn--outline"
            style={{ flex: 1 }}
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right me-2" />{t('signOut')}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
          Need help? Contact your platform administrator.
        </div>
      </div>
    </div>
  );
}
