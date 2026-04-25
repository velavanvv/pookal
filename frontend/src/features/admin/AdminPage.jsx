import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import api from '../../services/api';

const ALL_MODULES = ['pos', 'inventory', 'orders', 'crm', 'delivery', 'reports', 'settings', 'website'];

const STATUS_BADGE = {
  active:    'pk-badge--success',
  trial:     'pk-badge--info',
  expired:   'pk-badge--danger',
  cancelled: 'pk-badge--gray',
  suspended: 'pk-badge--warning',
};

const DAYS_WARN = 30;

export default function AdminPage() {
  const [tab, setTab]         = useState('customers');
  const [stats, setStats]     = useState(null);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans]     = useState([]);
  const [subs, setSubs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewPlan, setShowNewPlan]         = useState(false);
  const [showRenew, setShowRenew]             = useState(false);
  const [showEditPlan, setShowEditPlan]       = useState(false);
  const [showWebsite, setShowWebsite]         = useState(false);
  const [selectedTenant, setSelectedTenant]   = useState(null);
  const [selectedPlan, setSelectedPlan]       = useState(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/tenants'),
      api.get('/admin/plans'),
      api.get('/admin/subscriptions'),
    ]).then(([s, t, p, sub]) => {
      setStats(s.data); setTenants(t.data); setPlans(p.data); setSubs(sub.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading && !stats) return (
    <div className="pk-loading">
      <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
      <span>Loading admin…</span>
    </div>
  );

  const kpis = stats ? [
    { label: 'Total Customers',  value: stats.total_customers, icon: 'bi-people-fill',       tint: '#dbeafe', color: '#2563eb' },
    { label: 'Active Subs',      value: stats.active_subs,     icon: 'bi-check-circle-fill', tint: '#dcfce7', color: '#16a34a' },
    { label: 'Expiring (30d)',   value: stats.expiring_soon,   icon: 'bi-clock-history',     tint: '#fef9c3', color: '#d97706' },
    { label: 'Expired',          value: stats.expired_subs,    icon: 'bi-x-circle-fill',     tint: '#fee2e2', color: '#dc2626' },
  ] : [];

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Platform Admin</h4>
          <p className="pg-sub">Manage customers, plans, and subscriptions</p>
        </div>
        <button className="pk-btn pk-btn--outline" onClick={fetchAll}>
          <i className="bi bi-arrow-clockwise" />Refresh
        </button>
      </div>

      {/* KPI strip */}
      {stats && (
        <div className="pk-kpi-row">
          {kpis.map((k) => (
            <div key={k.label} className="pk-kpi">
              <div className="pk-kpi__icon" style={{ background: k.tint, color: k.color }}>
                <i className={`bi ${k.icon}`} />
              </div>
              <div>
                <div className="pk-kpi__val">{k.value}</div>
                <div className="pk-kpi__lbl">{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue strip */}
      {stats && (
        <div className="pk-card" style={{ marginBottom: '1.25rem' }}>
          <div className="pk-card__body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
              <div style={{ borderRight: '1.5px solid var(--border)', paddingRight: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '0.25rem' }}>Monthly Revenue (MRR)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>Rs. {Number(stats.mrr).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: '0.25rem' }}>Yearly Revenue (ARR)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>Rs. {Number(stats.arr).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="pk-tabs">
        {[
          { key: 'customers',     label: 'Customers',     icon: 'bi-people'          },
          { key: 'subscriptions', label: 'Subscriptions', icon: 'bi-calendar2-check' },
          { key: 'plans',         label: 'Plans',         icon: 'bi-box'             },
        ].map((t) => (
          <button key={t.key} className={`pk-tab ${tab === t.key ? 'pk-tab--active' : ''}`} onClick={() => setTab(t.key)}>
            <i className={`bi ${t.icon}`} style={{ marginRight: '0.4rem' }} />{t.label}
          </button>
        ))}
      </div>

      {/* ── CUSTOMERS TAB ── */}
      {tab === 'customers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="pk-btn pk-btn--dark" onClick={() => setShowNewCustomer(true)}>
              <i className="bi bi-person-plus" />Add Customer
            </button>
          </div>
          <div className="pk-card">
            <table className="pk-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Shop</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Days Left</th>
                  <th>Modules</th>
                  <th>Website</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const sub       = t.subscription;
                  const daysLeft  = sub?.days_left ?? null;
                  const isWarning = daysLeft !== null && daysLeft <= DAYS_WARN && sub?.status === 'active';
                  return (
                    <tr key={t.id} style={isWarning ? { background: '#fef9c3' } : {}}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{t.email}</div>
                      </td>
                      <td>
                        <div>{t.shop_name || '—'}</div>
                        {t.phone && <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{t.phone}</div>}
                      </td>
                      <td>{sub?.plan_name || <span style={{ color: 'var(--text-3)' }}>No plan</span>}</td>
                      <td>
                        {sub ? (
                          <span className={`pk-badge ${STATUS_BADGE[sub.status] || 'pk-badge--gray'}`}>{sub.status}</span>
                        ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{sub?.end_date || '—'}</td>
                      <td>
                        {daysLeft !== null ? (
                          <span style={{ fontWeight: 700, color: daysLeft <= 7 ? '#dc2626' : daysLeft <= DAYS_WARN ? '#d97706' : '#16a34a' }}>
                            {daysLeft}d
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {(sub?.modules || []).map((m) => (
                            <span key={m} className="pk-badge pk-badge--gray" style={{ fontSize: '0.68rem' }}>{m}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label className="admin-toggle">
                            <input
                              type="checkbox"
                              checked={Boolean(t.website_enabled)}
                              onChange={async (e) => {
                                await api.post(`/admin/tenants/${t.id}/website-toggle`, { enabled: e.target.checked });
                                fetchAll();
                              }}
                            />
                            <span className="admin-toggle__track" />
                          </label>
                          {t.website_enabled && (
                            <button className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => { setSelectedTenant(t); setShowWebsite(true); }}>
                              <i className="bi bi-globe2" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#16a34a', borderColor: '#86efac' }} title="Renew / Change Plan"
                            onClick={() => { setSelectedTenant(t); setShowRenew(true); }}>
                            <i className="bi bi-arrow-repeat" />
                          </button>
                          <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#d97706', borderColor: '#fcd34d' }} title="Suspend"
                            onClick={async () => {
                              if (!confirm(`Suspend ${t.name}?`)) return;
                              await api.post(`/admin/tenants/${t.id}/suspend`);
                              fetchAll();
                            }}>
                            <i className="bi bi-pause-circle" />
                          </button>
                          <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} title="Delete"
                            onClick={async () => {
                              if (!confirm(`Delete ${t.name}? This cannot be undone.`)) return;
                              await api.delete(`/admin/tenants/${t.id}`);
                              fetchAll();
                            }}>
                            <i className="bi bi-trash3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tenants.length === 0 && (
                  <tr className="pk-table__empty"><td colSpan={9}>No customers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTIONS TAB ── */}
      {tab === 'subscriptions' && (
        <div className="pk-card">
          <table className="pk-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Cycle</th>
                <th>Amount Paid</th>
                <th>Start</th>
                <th>End / Renewal</th>
                <th>Days Left</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const isWarning = s.days_left <= DAYS_WARN && s.status === 'active';
                return (
                  <tr key={s.id} style={isWarning ? { background: '#fef9c3' } : {}}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.user_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{s.shop_name || s.user_email}</div>
                    </td>
                    <td>{s.plan_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.billing_cycle}</td>
                    <td>Rs. {Number(s.amount_paid).toLocaleString()}</td>
                    <td style={{ fontSize: '0.82rem' }}>{s.start_date}</td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{s.end_date}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: s.days_left <= 7 ? '#dc2626' : s.days_left <= DAYS_WARN ? '#d97706' : '#16a34a' }}>
                        {s.days_left}d
                      </span>
                    </td>
                    <td><span className={`pk-badge ${STATUS_BADGE[s.status] || 'pk-badge--gray'}`}>{s.status}</span></td>
                  </tr>
                );
              })}
              {subs.length === 0 && (
                <tr className="pk-table__empty"><td colSpan={8}>No subscriptions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PLANS TAB ── */}
      {tab === 'plans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="pk-btn pk-btn--dark" onClick={() => { setSelectedPlan(null); setShowNewPlan(true); }}>
              <i className="bi bi-plus-lg" />New Plan
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {plans.map((plan) => (
              <div key={plan.id} className="pk-card" style={{ opacity: plan.is_active ? 1 : 0.5 }}>
                <div className="pk-card__head">
                  <div style={{ fontWeight: 700 }}>{plan.name}</div>
                  {!plan.is_active && <span className="pk-badge pk-badge--gray" style={{ marginLeft: 'auto' }}>Inactive</span>}
                </div>
                <div className="pk-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', margin: 0 }}>{plan.description}</p>
                  <div style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-2)' }}>Monthly: </span>
                    <strong>Rs. {Number(plan.price_monthly).toLocaleString()}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-2)' }}>Yearly: </span>
                    <strong>Rs. {Number(plan.price_yearly).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {(plan.modules || []).map((m) => (
                      <span key={m} className="pk-badge pk-badge--success" style={{ fontSize: '0.7rem' }}>{m}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Max users: {plan.max_users}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button className="pk-btn pk-btn--outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setSelectedPlan(plan); setShowEditPlan(true); }}>
                      <i className="bi bi-pencil" />Edit
                    </button>
                    <button className="pk-btn pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      onClick={async () => {
                        if (!confirm(`Delete plan "${plan.name}"?`)) return;
                        try { await api.delete(`/admin/plans/${plan.id}`); fetchAll(); }
                        catch (e) { alert(e?.response?.data?.message || 'Cannot delete.'); }
                      }}>
                      <i className="bi bi-trash3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="pk-empty" style={{ gridColumn: '1 / -1' }}>
                <i className="bi bi-box" />
                <p>No plans yet. Create one to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {showNewCustomer && (
        <CustomerModal plans={plans} tenants={tenants} onClose={() => setShowNewCustomer(false)} onSaved={() => { setShowNewCustomer(false); fetchAll(); }} />
      )}
      {showRenew && selectedTenant && (
        <RenewModal tenant={selectedTenant} plans={plans}
          onClose={() => { setShowRenew(false); setSelectedTenant(null); }}
          onSaved={() => { setShowRenew(false); setSelectedTenant(null); fetchAll(); }} />
      )}
      {(showNewPlan || showEditPlan) && (
        <PlanModal plan={selectedPlan}
          onClose={() => { setShowNewPlan(false); setShowEditPlan(false); setSelectedPlan(null); }}
          onSaved={() => { setShowNewPlan(false); setShowEditPlan(false); setSelectedPlan(null); fetchAll(); }} />
      )}
      {showWebsite && selectedTenant && (
        <WebsiteModal tenant={selectedTenant} onClose={() => { setShowWebsite(false); setSelectedTenant(null); }} />
      )}
    </div>
  );
}

// ── CustomerModal ──
function CustomerModal({ plans, tenants, onClose, onSaved }) {
  const [type, setType] = useState('new_shop'); // 'new_shop' | 'staff'
  const [form, setForm] = useState({
    name: '', email: '', password: '', shop_name: '', phone: '',
    role: 'admin', plan_id: '', billing_cycle: 'yearly',
    start_date: new Date().toISOString().slice(0, 10), notes: '',
    parent_user_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      await api.post('/admin/tenants', { ...form, type }); onSaved();
    } catch (err) {
      const errs = err?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' ') : 'Failed to create customer.');
    } finally { setSaving(false); }
  };

  const selectedPlan = plans.find((p) => String(p.id) === String(form.plan_id));
  const price = selectedPlan ? (form.billing_cycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly) : null;
  const shopOwners = (tenants || []).filter((t) => !t.parent_user_id && t.role !== 'superadmin');

  return (
    <PkModal title="Add New Customer" onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', background: '#f4f4f5', borderRadius: 'var(--radius-md)', padding: '0.25rem', marginBottom: '1.25rem' }}>
            {[['new_shop', 'bi-shop', 'New Shop'], ['staff', 'bi-person-plus', 'Add Staff to Existing Shop']].map(([val, icon, label]) => (
              <button key={val} type="button" onClick={() => setType(val)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', borderRadius: 'calc(var(--radius-md) - 2px)', border: 'none', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', transition: 'all var(--transition)',
                  background: type === val ? '#fff' : 'transparent',
                  color: type === val ? 'var(--text-1)' : 'var(--text-2)',
                  boxShadow: type === val ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                }}>
                <i className={`bi ${icon}`} /> {label}
              </button>
            ))}
          </div>

          {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '1rem' }}>{error}</div>}

          {type === 'staff' ? (
            <>
              <div className="pk-field" style={{ marginBottom: '0.75rem' }}>
                <label>Existing Shop *</label>
                <select className="pk-input" value={form.parent_user_id} onChange={(e) => set('parent_user_id', e.target.value)} required>
                  <option value="">Select shop…</option>
                  {shopOwners.map((t) => <option key={t.id} value={t.id}>{t.shop_name || t.name} ({t.email})</option>)}
                </select>
              </div>
              <div style={{ background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', fontSize: '0.82rem', color: '#92400e', marginBottom: '1rem' }}>
                Staff members share the same data as the shop owner. No new subscription is created.
              </div>
              <div className="pk-form-row">
                <div className="pk-field"><label>Full Name *</label><input className="pk-input" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
                <div className="pk-field"><label>Email *</label><input type="email" className="pk-input" value={form.email} onChange={(e) => set('email', e.target.value)} required /></div>
                <div className="pk-field"><label>Password *</label><input type="password" className="pk-input" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} /></div>
                <div className="pk-field"><label>Phone</label><input className="pk-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
              </div>
            </>
          ) : (
            <>
              <div className="pk-form-row">
                <div className="pk-field"><label>Full Name *</label><input className="pk-input" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
                <div className="pk-field"><label>Email *</label><input type="email" className="pk-input" value={form.email} onChange={(e) => set('email', e.target.value)} required /></div>
                <div className="pk-field"><label>Password *</label><input type="password" className="pk-input" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} /></div>
                <div className="pk-field">
                  <label>Role</label>
                  <select className="pk-input" value={form.role} onChange={(e) => set('role', e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div className="pk-field"><label>Shop Name</label><input className="pk-input" value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} /></div>
                <div className="pk-field"><label>Phone</label><input className="pk-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
              </div>
              <div style={{ borderTop: '1.5px solid var(--border)', margin: '1rem 0 0.5rem', paddingTop: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subscription</div>
              <div className="pk-form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="pk-field">
                  <label>Plan *</label>
                  <select className="pk-input" value={form.plan_id} onChange={(e) => set('plan_id', e.target.value)} required>
                    <option value="">Select plan…</option>
                    {plans.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="pk-field">
                  <label>Billing Cycle *</label>
                  <select className="pk-input" value={form.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value)}>
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="pk-field"><label>Start Date *</label><input type="date" className="pk-input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required /></div>
              </div>
              {price !== null && (
                <div style={{ background: '#dbeafe', border: '1.5px solid #93c5fd', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', fontSize: '0.82rem', color: '#1d4ed8', marginTop: '0.5rem' }}>
                  Amount: <strong>Rs. {Number(price).toLocaleString()}</strong> / {form.billing_cycle}
                  {selectedPlan && <span style={{ marginLeft: '1rem' }}>Modules: {(selectedPlan.modules || []).join(', ')}</span>}
                </div>
              )}
              <div className="pk-field" style={{ marginTop: '0.75rem' }}><label>Notes</label><textarea className="pk-input pk-textarea" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
            </>
          )}
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <i className={`bi ${type === 'staff' ? 'bi-person-check' : 'bi-shop'}`} />}
            {type === 'staff' ? 'Add Staff Member' : 'Create Shop'}
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── RenewModal ──
function RenewModal({ tenant, plans, onClose, onSaved }) {
  const [form, setForm] = useState({
    plan_id:       tenant.subscription?.plan_id || '',
    billing_cycle: tenant.subscription?.billing_cycle || 'yearly',
    start_date:    new Date().toISOString().slice(0, 10),
    notes:         '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const selectedPlan = plans.find((p) => String(p.id) === String(form.plan_id));
  const price = selectedPlan ? (form.billing_cycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly) : null;
  const endDate = form.start_date ? (() => {
    const d = new Date(form.start_date);
    if (form.billing_cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  })() : '—';

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try { await api.post(`/admin/tenants/${tenant.id}/renew`, form); onSaved(); }
    catch (err) { setError(err?.response?.data?.message || 'Failed to renew.'); }
    finally { setSaving(false); }
  };

  return (
    <PkModal title={`Renew — ${tenant.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '1rem' }}>{error}</div>}
          <div style={{ background: '#f4f4f5', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
            Current plan: <strong>{tenant.subscription?.plan_name || 'None'}</strong> ·
            Expires: <strong>{tenant.subscription?.end_date || 'N/A'}</strong> ·
            Status: <span className={`pk-badge ${STATUS_BADGE[tenant.subscription?.status] || 'pk-badge--gray'}`}>{tenant.subscription?.status || '—'}</span>
          </div>
          <div className="pk-form-row">
            <div className="pk-field">
              <label>New Plan *</label>
              <select className="pk-input" value={form.plan_id} onChange={(e) => set('plan_id', e.target.value)} required>
                <option value="">Select plan…</option>
                {plans.filter((p) => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="pk-field">
              <label>Billing Cycle *</label>
              <select className="pk-input" value={form.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value)}>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="pk-field"><label>Start Date *</label><input type="date" className="pk-input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required /></div>
            <div className="pk-field"><label>New End Date</label><input type="text" className="pk-input" value={endDate} readOnly style={{ background: '#f4f4f5' }} /></div>
          </div>
          {price !== null && (
            <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', fontSize: '0.82rem', color: '#15803d', marginTop: '0.5rem' }}>
              Amount: <strong>Rs. {Number(price).toLocaleString()}</strong> / {form.billing_cycle}
              {selectedPlan && <span style={{ marginLeft: '1rem' }}>Modules: {(selectedPlan.modules || []).join(', ')}</span>}
            </div>
          )}
          <div className="pk-field" style={{ marginTop: '0.75rem' }}><label>Notes</label><textarea className="pk-input pk-textarea" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--rose" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-arrow-repeat" />}
            Renew Subscription
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── PlanModal ──
function PlanModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:          plan?.name          || '',
    description:   plan?.description   || '',
    price_monthly: plan?.price_monthly || '',
    price_yearly:  plan?.price_yearly  || '',
    modules:       plan?.modules       || [],
    max_users:     plan?.max_users     || 1,
    is_active:     plan?.is_active     ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleModule = (m) => setForm((f) => ({
    ...f, modules: f.modules.includes(m) ? f.modules.filter((x) => x !== m) : [...f.modules, m],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (plan) await api.patch(`/admin/plans/${plan.id}`, form);
      else await api.post('/admin/plans', form);
      onSaved();
    } catch (err) {
      const errs = err?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' ') : 'Failed to save plan.');
    } finally { setSaving(false); }
  };

  return (
    <PkModal title={plan ? `Edit Plan — ${plan.name}` : 'New Plan'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '1rem' }}>{error}</div>}
          <div className="pk-field"><label>Plan Name *</label><input className="pk-input" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
          <div className="pk-field"><label>Description</label><textarea className="pk-input pk-textarea" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="pk-form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="pk-field"><label>Monthly Price (Rs.) *</label><input type="number" className="pk-input" min="0" value={form.price_monthly} onChange={(e) => set('price_monthly', e.target.value)} required /></div>
            <div className="pk-field"><label>Yearly Price (Rs.) *</label><input type="number" className="pk-input" min="0" value={form.price_yearly} onChange={(e) => set('price_yearly', e.target.value)} required /></div>
            <div className="pk-field"><label>Max Users</label><input type="number" className="pk-input" min="1" value={form.max_users} onChange={(e) => set('max_users', e.target.value)} /></div>
          </div>
          <div className="pk-field">
            <label>Modules *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {ALL_MODULES.map((m) => (
                <button key={m} type="button"
                  className={`pk-btn pk-btn--sm ${form.modules.includes(m) ? 'pk-btn--rose' : 'pk-btn--outline'}`}
                  onClick={() => toggleModule(m)}
                  style={{ textTransform: 'capitalize' }}>
                  <i className={`bi bi-${form.modules.includes(m) ? 'check-circle' : 'circle'}`} />
                  {m}
                </button>
              ))}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.5rem' }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            Active (visible to new customers)
          </label>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : null}
            {plan ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── WebsiteModal ──
function WebsiteModal({ tenant, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    QRCode.toDataURL(tenant.website_url, { width: 240, margin: 1 })
      .then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [tenant.website_url]);

  const copy = async () => {
    await navigator.clipboard.writeText(tenant.website_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PkModal title={`Storefront — ${tenant.shop_name || tenant.name}`} onClose={onClose}>
      <div className="pk-modal__body" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
          Share this URL or QR code with <strong>{tenant.name}</strong> so their customers can browse live inventory.
        </p>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR code" style={{ width: 200, borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', marginBottom: '1rem' }} />
        ) : (
          <div style={{ padding: '2rem' }}><div className="spinner-border spinner-border-sm" style={{ color: 'var(--pookal-rose)' }} /></div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input className="pk-input" value={tenant.website_url} readOnly style={{ flex: 1 }} />
          <button className="pk-btn pk-btn--outline" onClick={copy}>
            {copied ? <i className="bi bi-check-lg" style={{ color: '#16a34a' }} /> : <i className="bi bi-copy" />}
          </button>
        </div>
        <a href={tenant.website_url} target="_blank" rel="noreferrer" className="pk-btn pk-btn--outline" style={{ width: '100%', justifyContent: 'center' }}>
          <i className="bi bi-box-arrow-up-right" />Open storefront
        </a>
      </div>
      <div className="pk-modal__foot">
        <button className="pk-btn pk-btn--ghost" onClick={onClose}>Close</button>
      </div>
    </PkModal>
  );
}

// ── Shared Modal wrapper ──
function PkModal({ title, onClose, children, wide = false }) {
  return (
    <div className="pk-modal-bd" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pk-modal" style={wide ? { maxWidth: 680 } : {}}>
        <div className="pk-modal__head">
          <span className="pk-modal__title">{title}</span>
          <button className="pk-modal__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
