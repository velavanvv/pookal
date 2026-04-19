import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import api from '../../services/api';

const ALL_MODULES = ['pos', 'inventory', 'orders', 'crm', 'delivery', 'reports', 'settings', 'website'];

const STATUS_COLOR = {
  active:    'success',
  trial:     'info',
  expired:   'danger',
  cancelled: 'secondary',
  suspended: 'warning',
};

const DAYS_WARN = 30; // highlight renewals within 30 days

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = 'dark' }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body d-flex align-items-center gap-3">
          <div className={`admin-stat-icon bg-${color} bg-opacity-10 text-${color}`}>
            <i className={`bi ${icon} fs-5`} />
          </div>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="fw-bold fs-5">{value}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab]           = useState('customers');
  const [stats, setStats]       = useState(null);
  const [tenants, setTenants]   = useState([]);
  const [plans, setPlans]       = useState([]);
  const [subs, setSubs]         = useState([]);
  const [loading, setLoading]   = useState(true);

  // modals
  const [showNewCustomer, setShowNewCustomer]   = useState(false);
  const [showNewPlan, setShowNewPlan]           = useState(false);
  const [showRenew, setShowRenew]               = useState(false);
  const [showEditPlan, setShowEditPlan]         = useState(false);
  const [showWebsite, setShowWebsite]           = useState(false);
  const [selectedTenant, setSelectedTenant]     = useState(null);
  const [selectedPlan, setSelectedPlan]         = useState(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/tenants'),
      api.get('/admin/plans'),
      api.get('/admin/subscriptions'),
    ]).then(([s, t, p, sub]) => {
      setStats(s.data);
      setTenants(t.data);
      setPlans(p.data);
      setSubs(sub.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading && !stats) {
    return <div className="text-center py-5"><div className="spinner-border text-success" /></div>;
  }

  return (
    <>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0">Platform Admin</h4>
          <small className="text-muted">Manage customers, plans, and subscriptions</small>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchAll}>
          <i className="bi bi-arrow-clockwise me-1" />Refresh
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="row g-3 mb-4">
          <StatCard icon="bi-people-fill"      label="Total Customers"  value={stats.total_customers} color="primary" />
          <StatCard icon="bi-check-circle-fill" label="Active Subs"     value={stats.active_subs}     color="success" />
          <StatCard icon="bi-clock-history"    label="Expiring (30d)"   value={stats.expiring_soon}   color="warning" />
          <StatCard icon="bi-x-circle-fill"    label="Expired"          value={stats.expired_subs}    color="danger"  />
        </div>
      )}

      {/* Revenue strip */}
      {stats && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body py-3">
            <div className="row text-center g-0">
              <div className="col border-end">
                <div className="text-muted small">Monthly Revenue (MRR)</div>
                <div className="fw-bold fs-5 text-success">Rs. {Number(stats.mrr).toLocaleString()}</div>
              </div>
              <div className="col">
                <div className="text-muted small">Yearly Revenue (ARR)</div>
                <div className="fw-bold fs-5 text-primary">Rs. {Number(stats.arr).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {[
          { key: 'customers',     label: 'Customers',     icon: 'bi-people'      },
          { key: 'subscriptions', label: 'Subscriptions', icon: 'bi-calendar2-check' },
          { key: 'plans',         label: 'Plans',         icon: 'bi-box'         },
        ].map((t) => (
          <li key={t.key} className="nav-item">
            <button
              className={`nav-link d-flex align-items-center gap-2 ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <i className={`bi ${t.icon}`} />{t.label}
            </button>
          </li>
        ))}
      </ul>

      {/* ── CUSTOMERS TAB ─────────────────────────────────────────────────── */}
      {tab === 'customers' && (
        <>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-dark" onClick={() => setShowNewCustomer(true)}>
              <i className="bi bi-person-plus me-2" />Add Customer
            </button>
          </div>
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead className="table-light">
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
                    const sub        = t.subscription;
                    const daysLeft   = sub?.days_left ?? null;
                    const isWarning  = daysLeft !== null && daysLeft <= DAYS_WARN && sub?.status === 'active';
                    return (
                      <tr key={t.id} className={isWarning ? 'table-warning' : ''}>
                        <td>
                          <div className="fw-semibold">{t.name}</div>
                          <div className="text-muted small">{t.email}</div>
                        </td>
                        <td>
                          <div>{t.shop_name || '—'}</div>
                          {t.phone && <div className="text-muted small">{t.phone}</div>}
                        </td>
                        <td>{sub?.plan_name || <span className="text-muted">No plan</span>}</td>
                        <td>
                          {sub ? (
                            <span className={`badge text-bg-${STATUS_COLOR[sub.status] || 'secondary'}`}>
                              {sub.status}
                            </span>
                          ) : <span className="text-muted small">—</span>}
                        </td>
                        <td className="small">{sub?.end_date || '—'}</td>
                        <td>
                          {daysLeft !== null ? (
                            <span className={`fw-bold ${daysLeft <= 7 ? 'text-danger' : daysLeft <= DAYS_WARN ? 'text-warning' : 'text-success'}`}>
                              {daysLeft}d
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {(sub?.modules || []).map((m) => (
                              <span key={m} className="badge text-bg-light border small">{m}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="form-check form-switch m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={Boolean(t.website_enabled)}
                                title={t.website_enabled ? 'Disable website' : 'Enable website'}
                                onChange={async (e) => {
                                  await api.post(`/admin/tenants/${t.id}/website-toggle`, { enabled: e.target.checked });
                                  fetchAll();
                                }}
                              />
                            </div>
                            {t.website_enabled && (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                title="View storefront URL & QR"
                                onClick={() => { setSelectedTenant(t); setShowWebsite(true); }}
                              >
                                <i className="bi bi-globe2" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-success"
                              title="Renew / Change Plan"
                              onClick={() => { setSelectedTenant(t); setShowRenew(true); }}
                            >
                              <i className="bi bi-arrow-repeat" />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-warning"
                              title="Suspend"
                              onClick={async () => {
                                if (!confirm(`Suspend ${t.name}?`)) return;
                                await api.post(`/admin/tenants/${t.id}/suspend`);
                                fetchAll();
                              }}
                            >
                              <i className="bi bi-pause-circle" />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Delete customer"
                              onClick={async () => {
                                if (!confirm(`Delete ${t.name}? This cannot be undone.`)) return;
                                await api.delete(`/admin/tenants/${t.id}`);
                                fetchAll();
                              }}
                            >
                              <i className="bi bi-trash3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">No customers yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SUBSCRIPTIONS TAB ─────────────────────────────────────────────── */}
      {tab === 'subscriptions' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <table className="table table-hover mb-0">
              <thead className="table-light">
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
                    <tr key={s.id} className={isWarning ? 'table-warning' : ''}>
                      <td>
                        <div className="fw-semibold">{s.user_name}</div>
                        <div className="text-muted small">{s.shop_name || s.user_email}</div>
                      </td>
                      <td>{s.plan_name}</td>
                      <td className="text-capitalize">{s.billing_cycle}</td>
                      <td>Rs. {Number(s.amount_paid).toLocaleString()}</td>
                      <td className="small">{s.start_date}</td>
                      <td className="small fw-semibold">{s.end_date}</td>
                      <td>
                        <span className={`fw-bold ${s.days_left <= 7 ? 'text-danger' : s.days_left <= DAYS_WARN ? 'text-warning' : 'text-success'}`}>
                          {s.days_left}d
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-bg-${STATUS_COLOR[s.status] || 'secondary'}`}>{s.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {subs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">No subscriptions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PLANS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'plans' && (
        <>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-dark" onClick={() => { setSelectedPlan(null); setShowNewPlan(true); }}>
              <i className="bi bi-plus-lg me-2" />New Plan
            </button>
          </div>
          <div className="row g-4">
            {plans.map((plan) => (
              <div key={plan.id} className="col-md-6 col-xl-3">
                <div className={`card border-0 shadow-sm h-100 ${!plan.is_active ? 'opacity-50' : ''}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-bold mb-0">{plan.name}</h6>
                      {!plan.is_active && <span className="badge text-bg-secondary">Inactive</span>}
                    </div>
                    <p className="text-muted small mb-3">{plan.description}</p>
                    <div className="mb-1 small">
                      <span className="text-muted">Monthly: </span>
                      <strong>Rs. {Number(plan.price_monthly).toLocaleString()}</strong>
                    </div>
                    <div className="mb-3 small">
                      <span className="text-muted">Yearly: </span>
                      <strong>Rs. {Number(plan.price_yearly).toLocaleString()}</strong>
                    </div>
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {(plan.modules || []).map((m) => (
                        <span key={m} className="badge text-bg-success-subtle text-success border border-success-subtle small">{m}</span>
                      ))}
                    </div>
                    <div className="text-muted small mb-3">Max users: {plan.max_users}</div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary flex-fill"
                        onClick={() => { setSelectedPlan(plan); setShowEditPlan(true); }}
                      >
                        <i className="bi bi-pencil me-1" />Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={async () => {
                          if (!confirm(`Delete plan "${plan.name}"?`)) return;
                          try {
                            await api.delete(`/admin/plans/${plan.id}`);
                            fetchAll();
                          } catch (e) {
                            alert(e?.response?.data?.message || 'Cannot delete.');
                          }
                        }}
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Add Customer */}
      {showNewCustomer && (
        <CustomerModal
          plans={plans}
          onClose={() => setShowNewCustomer(false)}
          onSaved={() => { setShowNewCustomer(false); fetchAll(); }}
        />
      )}

      {/* Renew / Change Plan */}
      {showRenew && selectedTenant && (
        <RenewModal
          tenant={selectedTenant}
          plans={plans}
          onClose={() => { setShowRenew(false); setSelectedTenant(null); }}
          onSaved={() => { setShowRenew(false); setSelectedTenant(null); fetchAll(); }}
        />
      )}

      {/* New / Edit Plan */}
      {(showNewPlan || showEditPlan) && (
        <PlanModal
          plan={selectedPlan}
          onClose={() => { setShowNewPlan(false); setShowEditPlan(false); setSelectedPlan(null); }}
          onSaved={() => { setShowNewPlan(false); setShowEditPlan(false); setSelectedPlan(null); fetchAll(); }}
        />
      )}

      {/* Website URL & QR */}
      {showWebsite && selectedTenant && (
        <WebsiteModal
          tenant={selectedTenant}
          onClose={() => { setShowWebsite(false); setSelectedTenant(null); }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomerModal — create new customer + assign plan
// ─────────────────────────────────────────────────────────────────────────────
function CustomerModal({ plans, onClose, onSaved }) {
  const [form, setForm]       = useState({
    name: '', email: '', password: '', shop_name: '', phone: '',
    role: 'admin', plan_id: '', billing_cycle: 'yearly',
    start_date: new Date().toISOString().slice(0, 10), notes: '',
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/admin/tenants', form);
      onSaved();
    } catch (err) {
      const errs = err?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' ') : 'Failed to create customer.');
    } finally {
      setSaving(false);
    }
  };

  const selectedPlan = plans.find((p) => String(p.id) === String(form.plan_id));
  const price = selectedPlan
    ? (form.billing_cycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly)
    : null;

  return (
    <Modal title="Add New Customer" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Full Name *</label>
              <input className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email *</label>
              <input type="email" className="form-control" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Password *</label>
              <input type="password" className="form-control" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Shop Name</label>
              <input className="form-control" value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>

            <div className="col-12"><hr className="my-1" /><small className="text-muted fw-semibold">Subscription</small></div>

            <div className="col-md-4">
              <label className="form-label">Plan *</label>
              <select className="form-select" value={form.plan_id} onChange={(e) => set('plan_id', e.target.value)} required>
                <option value="">Select plan…</option>
                {plans.filter((p) => p.is_active).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Billing Cycle *</label>
              <select className="form-select" value={form.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value)}>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-control" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
            </div>
            {price !== null && (
              <div className="col-12">
                <div className="alert alert-info py-2 small mb-0">
                  Amount: <strong>Rs. {Number(price).toLocaleString()}</strong> / {form.billing_cycle}
                  {selectedPlan && (
                    <span className="ms-3">Modules: {(selectedPlan.modules || []).join(', ')}</span>
                  )}
                </div>
              </div>
            )}
            <div className="col-12">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            Create Customer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RenewModal — renew or change plan for existing tenant
// ─────────────────────────────────────────────────────────────────────────────
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
  const price = selectedPlan
    ? (form.billing_cycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly)
    : null;

  const endDate = form.start_date
    ? (() => {
        const d = new Date(form.start_date);
        if (form.billing_cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
        else d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 10);
      })()
    : '—';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/admin/tenants/${tenant.id}/renew`, form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to renew.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Renew — ${tenant.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}

          <div className="alert alert-light border small mb-3 py-2">
            Current plan: <strong>{tenant.subscription?.plan_name || 'None'}</strong> ·
            Expires: <strong>{tenant.subscription?.end_date || 'N/A'}</strong> ·
            Status: <span className={`badge text-bg-${STATUS_COLOR[tenant.subscription?.status] || 'secondary'}`}>{tenant.subscription?.status || '—'}</span>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">New Plan *</label>
              <select className="form-select" value={form.plan_id} onChange={(e) => set('plan_id', e.target.value)} required>
                <option value="">Select plan…</option>
                {plans.filter((p) => p.is_active).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Billing Cycle *</label>
              <select className="form-select" value={form.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value)}>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Start Date *</label>
              <input type="date" className="form-control" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">New End Date</label>
              <input type="text" className="form-control" value={endDate} readOnly />
            </div>
            {price !== null && (
              <div className="col-12">
                <div className="alert alert-success py-2 small mb-0">
                  Amount: <strong>Rs. {Number(price).toLocaleString()}</strong> / {form.billing_cycle}
                  {selectedPlan && <span className="ms-3">Modules: {(selectedPlan.modules || []).join(', ')}</span>}
                </div>
              </div>
            )}
            <div className="col-12">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-arrow-repeat me-1" />}
            Renew Subscription
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlanModal — create or edit a plan
// ─────────────────────────────────────────────────────────────────────────────
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

  const toggleModule = (m) => {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(m) ? f.modules.filter((x) => x !== m) : [...f.modules, m],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (plan) {
        await api.patch(`/admin/plans/${plan.id}`, form);
      } else {
        await api.post('/admin/plans', form);
      }
      onSaved();
    } catch (err) {
      const errs = err?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' ') : 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={plan ? `Edit Plan — ${plan.name}` : 'New Plan'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Plan Name *</label>
              <input className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="col-12">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Monthly Price (Rs.) *</label>
              <input type="number" className="form-control" min="0" value={form.price_monthly} onChange={(e) => set('price_monthly', e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Yearly Price (Rs.) *</label>
              <input type="number" className="form-control" min="0" value={form.price_yearly} onChange={(e) => set('price_yearly', e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Max Users</label>
              <input type="number" className="form-control" min="1" value={form.max_users} onChange={(e) => set('max_users', e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label">Modules *</label>
              <div className="d-flex flex-wrap gap-2 mt-1">
                {ALL_MODULES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn btn-sm ${form.modules.includes(m) ? 'btn-success' : 'btn-outline-secondary'}`}
                    onClick={() => toggleModule(m)}
                  >
                    <i className={`bi bi-${form.modules.includes(m) ? 'check-circle' : 'circle'} me-1`} />
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set('is_active', e.target.checked)}
                />
                <label className="form-check-label">Active (visible to new customers)</label>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            {plan ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WebsiteModal — show storefront URL + QR for a tenant
// ─────────────────────────────────────────────────────────────────────────────
function WebsiteModal({ tenant, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    QRCode.toDataURL(tenant.website_url, { width: 240, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [tenant.website_url]);

  const copy = async () => {
    await navigator.clipboard.writeText(tenant.website_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal title={`Storefront — ${tenant.shop_name || tenant.name}`} onClose={onClose}>
      <div className="modal-body text-center">
        <p className="text-muted small mb-3">
          Share this URL or QR code with <strong>{tenant.name}</strong> so their customers can browse live inventory.
        </p>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR code" className="rounded-4 border mb-3" style={{ width: 200 }} />
        ) : (
          <div className="py-4"><div className="spinner-border spinner-border-sm text-success" /></div>
        )}
        <div className="input-group mb-2">
          <input className="form-control form-control-sm" value={tenant.website_url} readOnly />
          <button className="btn btn-outline-secondary btn-sm" onClick={copy}>
            {copied ? <i className="bi bi-check-lg text-success" /> : <i className="bi bi-copy" />}
          </button>
        </div>
        <a href={tenant.website_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-dark w-100 mt-1">
          <i className="bi bi-box-arrow-up-right me-1" />Open storefront
        </a>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Modal wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, size = '' }) {
  return (
    <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size ? `modal-${size}` : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
