import { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import api from '../../services/api';

const ALL_MODULES = ['products', 'pos', 'inventory', 'orders', 'crm', 'delivery', 'reports', 'suppliers', 'settings', 'website'];

const STATUS_BADGE = {
  active:    'pk-badge--success',
  trial:     'pk-badge--info',
  expired:   'pk-badge--danger',
  cancelled: 'pk-badge--gray',
  suspended: 'pk-badge--warning',
};

const SHOP_TYPES = [
  { key: 'retail', label: 'Retail / Supermarket', description: 'General store, supermarket, stationery, gifts' },
  { key: 'fresh_perishable', label: 'Fresh / Perishable', description: 'Flower, fish, chicken, fruits & vegetables' },
  { key: 'restaurant', label: 'Restaurant / Café', description: 'Dine-in, takeaway, cloud kitchen' },
  { key: 'service', label: 'Service Business', description: 'Salon, repair shop, clinic, laundry' },
  { key: 'hybrid', label: 'Hybrid / Multi-category', description: 'Retail + delivery + mixed products' },
];

const DAYS_WARN = 30;
const MODULE_LABELS = {
  products: 'Products',
  pos: 'POS',
  inventory: 'Inventory',
  orders: 'Orders',
  crm: 'CRM',
  delivery: 'Delivery',
  reports: 'Reports',
  suppliers: 'Suppliers',
  settings: 'Settings',
  website: 'Website',
};

function formatPlanPrice(plan, cycle) {
  if (!plan) return '—';
  if (cycle === 'trial' || plan.name === 'Free Trial') return 'Free';
  const amount = plan.amount_paid;
  return `Rs. ${Number(amount).toLocaleString()}`;
}

function getUpgradeCandidates(plans, tenant) {
  const currentPlanId = tenant?.subscription?.plan_id;
  const currentPrice = Number(
    tenant?.subscription?.billing_cycle === 'yearly'
      ? tenant?.subscription?.amount_paid ?? 0
      : tenant?.subscription?.amount_paid ?? 0
  );

  return plans
    .filter((plan) => plan.is_active && plan.id !== currentPlanId)
    .sort((a, b) => Number(a.price_monthly) - Number(b.price_monthly))
    .filter((plan) => Number(plan.price_monthly) >= currentPrice || tenant?.subscription?.status !== 'active');
}

export default function AdminPage() {
  const [tab, setTab]         = useState('customers');
  const [stats, setStats]     = useState(null);
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans]     = useState([]);
  const [subs, setSubs]       = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State (Google Admin Standard)
  const [searchQuery, setSearchQuery]       = useState('');
  const [tenantFilter, setTenantFilter]     = useState('all');
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [initialDemoData, setInitialDemoData] = useState(null);

  const [showNewCustomer, setShowNewCustomer]   = useState(false);
  const [showNewPlan, setShowNewPlan]           = useState(false);
  const [showRenew, setShowRenew]               = useState(false);
  const [showEditPlan, setShowEditPlan]         = useState(false);
  const [showWebsite, setShowWebsite]           = useState(false);
  const [showBranches, setShowBranches]         = useState(false);
  const [selectedTenant, setSelectedTenant]     = useState(null);
  const [selectedPlan, setSelectedPlan]         = useState(null);
  const [branchesTenant, setBranchesTenant]     = useState(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/tenants'),
      api.get('/admin/plans'),
      api.get('/admin/subscriptions'),
      api.get('/demo/requests'),
    ]).then(([s, t, p, sub, dr]) => {
      setStats(s.data); setTenants(t.data); setPlans(p.data); setSubs(sub.data);
      setDemoRequests(dr.data?.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  // Filtered lists for real-time Google-style command search
  const filteredTenants = useMemo(() => {
    let list = tenants;
    if (tenantFilter === 'active') list = list.filter(t => t.subscription?.status === 'active');
    else if (tenantFilter === 'trial') list = list.filter(t => t.subscription?.status === 'trial');
    else if (tenantFilter === 'expiring') list = list.filter(t => (t.subscription?.days_left ?? 999) <= DAYS_WARN && t.subscription?.status === 'active');
    else if (tenantFilter === 'expired') list = list.filter(t => t.subscription?.status === 'expired');

    if (verticalFilter !== 'all') {
      list = list.filter(t => (t.shop_profile?.business_type || 'retail') === verticalFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.shop_name || '').toLowerCase().includes(q) ||
        (t.phone || '').includes(q) ||
        (t.subscription?.plan_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [tenants, tenantFilter, verticalFilter, searchQuery]);

  const filteredSubs = useMemo(() => {
    if (!searchQuery.trim()) return subs;
    const q = searchQuery.toLowerCase();
    return subs.filter(s =>
      (s.user_name || '').toLowerCase().includes(q) ||
      (s.shop_name || '').toLowerCase().includes(q) ||
      (s.user_email || '').toLowerCase().includes(q) ||
      (s.plan_name || '').toLowerCase().includes(q)
    );
  }, [subs, searchQuery]);

  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return plans;
    const q = searchQuery.toLowerCase();
    return plans.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.modules || []).some(m => m.toLowerCase().includes(q))
    );
  }, [plans, searchQuery]);

  if (loading && !stats) return (
    <div className="pk-loading">
      <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
      <span>Loading Google Admin Control Plane…</span>
    </div>
  );

  const kpis = stats ? [
    { label: 'Total Customers',  value: stats.total_customers, icon: 'bi-people-fill',       tint: '#dbeafe', color: '#2563eb' },
    { label: 'Active Subs',      value: stats.active_subs,     icon: 'bi-check-circle-fill', tint: '#dcfce7', color: '#16a34a' },
    { label: 'Expiring (30d)',   value: stats.expiring_soon,   icon: 'bi-clock-history',     tint: '#fef9c3', color: '#d97706' },
    { label: 'Expired',          value: stats.expired_subs,    icon: 'bi-x-circle-fill',     tint: '#fee2e2', color: '#dc2626' },
  ] : [];

  const newDemoCount = demoRequests.filter(r => r.status === 'new').length;

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ── GOOGLE ADMIN TOP CONSOLE HEADER & SEARCH ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#38bdf8', display: 'grid', placeItems: 'center', fontSize: '1.15rem' }}>
              <i className="bi bi-shield-check" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.35rem', color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Platform Superadmin Console
                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#ede9fe', color: '#6d28d9', padding: '0.15rem 0.55rem', borderRadius: '6px', border: '1px solid #ddd6fe' }}>
                  Google SaaS Standard
                </span>
              </h4>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Multi-tenant cloud orchestration, pricing tiers, recurring ARR/MRR metrics, and automated provisioning.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="pk-btn pk-btn--primary"
            onClick={() => { setInitialDemoData(null); setShowNewCustomer(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, borderRadius: '8px' }}
          >
            <i className="bi bi-shop" /> Create Shop
          </button>
          <button
            type="button"
            className="pk-btn pk-btn--outline"
            onClick={() => { setSelectedPlan(null); setShowNewPlan(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, borderRadius: '8px' }}
          >
            <i className="bi bi-plus-circle" /> New Plan
          </button>
        </div>
      </div>

      {/* ── GOOGLE ADMIN COMMAND FILTER SEARCH BAR ── */}
      <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <i className="bi bi-search" style={{ color: '#94a3b8', fontSize: '1.05rem' }} />
        <input
          type="text"
          placeholder="Search tenants, shop names, customer emails, phone numbers, plans, or subscription status..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.86rem', color: '#0f172a' }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            <i className="bi bi-x-circle-fill" />
          </button>
        )}
      </div>

      {/* ── HERO METRIC SERVICE TILES (Google Admin Dashboard Cards) ── */}
      {stats && (
        <div className="pk-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Card 1: Shops & Tenants */}
          <div className="google-admin-hero-card" style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#dbeafe', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: '1.25rem' }}>
                <i className="bi bi-buildings-fill" />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                {stats.active_subs} Active
              </span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {stats.total_customers}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginTop: '0.25rem' }}>Total Shops Registered</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
              {stats.expiring_soon} expiring in 30 days · {stats.expired_subs} expired
            </div>
          </div>

          {/* Card 2: ARR / MRR Recurring Revenue */}
          <div className="google-admin-hero-card" style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', fontSize: '1.25rem' }}>
                <i className="bi bi-graph-up-arrow" />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                ARR Healthy
              </span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.1 }}>
              Rs. {Number(stats.arr).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginTop: '0.25rem' }}>Annual Recurring Revenue</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
              Monthly Run-Rate: <strong>Rs. {Number(stats.mrr).toLocaleString()}</strong>
            </div>
          </div>

          {/* Card 3: Licensing & Plans */}
          <div className="google-admin-hero-card" style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: '1.25rem' }}>
                <i className="bi bi-box-seam-fill" />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7c3aed', background: '#ede9fe', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                SaaS Tiers
              </span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {plans.length}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginTop: '0.25rem' }}>Active Product Plans</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
              Full feature matrix &amp; module licensing
            </div>
          </div>

          {/* Card 4: Inbound Demo Leads */}
          <div className="google-admin-hero-card" style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', fontSize: '1.25rem' }}>
                <i className="bi bi-send-fill" />
              </div>
              {newDemoCount > 0 ? (
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', background: '#dc2626', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                  {newDemoCount} New Inquiries
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                  Up to Date
                </span>
              )}
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {demoRequests.length}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginTop: '0.25rem' }}>Inbound Sales Leads</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
              1-click provision demo leads to live shops
            </div>
          </div>
        </div>
      )}

      {/* ── GOOGLE-STYLE TABS ── */}
      <div className="pk-tabs admin-tabs" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
        {[
          { key: 'customers',     label: 'Customers',     icon: 'bi-people', count: filteredTenants.length },
          { key: 'subscriptions', label: 'Subscriptions', icon: 'bi-calendar2-check', count: filteredSubs.length },
          { key: 'plans',         label: 'Plans',         icon: 'bi-box', count: filteredPlans.length },
          { key: 'demo',          label: 'Demo Requests', icon: 'bi-send', count: demoRequests.length, badge: newDemoCount },
        ].map((t) => (
          <button
            key={t.key}
            className={`pk-tab ${tab === t.key ? 'pk-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.65rem 1.15rem', fontSize: '0.82rem', fontWeight: 700,
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? '2.5px solid #0284c7' : '2.5px solid transparent',
              color: tab === t.key ? '#0284c7' : '#64748b',
            }}
          >
            <i className={`bi ${t.icon}`} />
            <span>{t.label}</span>
            <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: tab === t.key ? '#e0f2fe' : '#f1f5f9', color: tab === t.key ? '#0284c7' : '#64748b', fontWeight: 800 }}>
              {t.count}
            </span>
            {t.badge > 0 && (
              <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 800, borderRadius: '999px', padding: '0.1rem 0.45rem' }}>
                {t.badge} new
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: CUSTOMERS / TENANTS TAB ── */}
      {tab === 'customers' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          {/* Sub-Filters Toolbar */}
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#fafafa' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: '0.35rem' }}>Status:</span>
              {[
                { k: 'all', label: 'All Shops' },
                { k: 'active', label: 'Active' },
                { k: 'trial', label: 'Free Trial' },
                { k: 'expiring', label: 'Expiring (30d)' },
                { k: 'expired', label: 'Expired' },
              ].map(f => (
                <button
                  key={f.k}
                  onClick={() => setTenantFilter(f.k)}
                  style={{
                    padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                    border: '1px solid', cursor: 'pointer',
                    borderColor: tenantFilter === f.k ? '#0284c7' : '#e2e8f0',
                    background: tenantFilter === f.k ? '#0284c7' : '#fff',
                    color: tenantFilter === f.k ? '#fff' : '#475569',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Vertical:</span>
              <select
                value={verticalFilter}
                onChange={e => setVerticalFilter(e.target.value)}
                style={{ padding: '0.25rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 600, background: '#fff' }}
              >
                <option value="all">All Verticals</option>
                <option value="retail">Retail &amp; Supermarket</option>
                <option value="fresh_perishable">Fresh &amp; Floral</option>
                <option value="restaurant">Restaurant &amp; Café</option>
                <option value="hybrid">Multi-category Store</option>
              </select>
            </div>
          </div>

          {/* Tenants Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="pk-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 1.25rem' }}>Customer</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Shop &amp; Vertical</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Subscription Plan</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Renewal / Days</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Modules</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Storefront</th>
                  <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((t) => {
                  const sub       = t.subscription;
                  const daysLeft  = sub?.days_left ?? null;
                  const isWarning = daysLeft !== null && daysLeft <= DAYS_WARN && sub?.status === 'active';
                  const bType     = t.shop_profile?.business_type || 'retail';
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: isWarning ? '#fffbeb' : undefined }}>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{t.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.email}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{t.shop_name || '—'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '0.1rem 0.45rem', borderRadius: '4px', textTransform: 'capitalize' }}>
                            {bType.replace('_', ' ')}
                          </span>
                          {t.phone && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.phone}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {sub ? (
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>{sub.plan_name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {sub.modules?.length || 0} modules · {formatPlanPrice(sub, sub.billing_cycle)} / {sub.billing_cycle}
                            </div>
                          </div>
                        ) : <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>No active plan</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {sub ? (
                          <span className={`pk-badge ${STATUS_BADGE[sub.status] || 'pk-badge--gray'}`} style={{ textTransform: 'capitalize', fontWeight: 700 }}>
                            {sub.status}
                          </span>
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 600 }}>{sub?.end_date || '—'}</div>
                        {daysLeft !== null && (
                          <span style={{ fontWeight: 800, fontSize: '0.75rem', color: daysLeft <= 7 ? '#dc2626' : daysLeft <= DAYS_WARN ? '#d97706' : '#16a34a' }}>
                            {daysLeft}d left
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '200px' }}>
                          {(sub?.modules || []).map((m) => (
                            <span key={m} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
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
                            <a
                              href={`/store/${t.website_slug || t.shop_name || 'store'}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#0284c7', fontSize: '0.9rem' }}
                              title="Open live storefront"
                            >
                              <i className="bi bi-box-arrow-up-right" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#16a34a', borderColor: '#86efac' }} title="Renew / Change Plan"
                            onClick={() => { setSelectedTenant(t); setShowRenew(true); }}>
                            <i className="bi bi-rocket-takeoff" />
                          </button>
                          <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#7c3aed', borderColor: '#c4b5fd' }} title="Manage Branches"
                            onClick={() => { setBranchesTenant(t); setShowBranches(true); }}>
                            <i className="bi bi-diagram-3" />
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
                {filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <i className="bi bi-shop" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }} />
                      No shops found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: SUBSCRIPTIONS & ARR HUB ── */}
      {tab === 'subscriptions' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
              Active Subscription Ledger ({filteredSubs.length} total)
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="pk-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 1.25rem' }}>Tenant Customer</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Plan Tier</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Cycle</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Recurring Amount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Start Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Renewal Due</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Days Left</th>
                  <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((s) => {
                  const isWarning = s.days_left <= DAYS_WARN && s.status === 'active';
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: isWarning ? '#fffbeb' : undefined }}>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{s.user_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.shop_name || s.user_email}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>{s.plan_name}</td>
                      <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize', fontSize: '0.8rem' }}>{s.billing_cycle}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#16a34a' }}>Rs. {Number(s.amount_paid).toLocaleString()}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>{s.start_date}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{s.end_date}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontWeight: 800, color: s.days_left <= 7 ? '#dc2626' : s.days_left <= DAYS_WARN ? '#d97706' : '#16a34a' }}>
                          {s.days_left}d
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <span className={`pk-badge ${STATUS_BADGE[s.status] || 'pk-badge--gray'}`}>{s.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {filteredSubs.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>No subscriptions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: PRODUCT PLANS & LICENSING (Google Workspace Style) ── */}
      {tab === 'plans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h5 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Licensing Tiers &amp; Capabilities</h5>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Manage pricing tiers, staff limits, and active module allocations.
              </p>
            </div>
            <button
              className="pk-btn pk-btn--primary"
              onClick={() => { setSelectedPlan(null); setShowNewPlan(true); }}
              style={{ fontWeight: 700 }}
            >
              <i className="bi bi-plus-lg" /> Create New Plan
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {filteredPlans.map((plan) => {
              const isPro = plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('enterprise');
              return (
                <div
                  key={plan.id}
                  className="google-plan-card"
                  style={{
                    background: '#fff', borderRadius: '16px', border: `1.5px solid ${isPro ? '#0284c7' : '#e2e8f0'}`,
                    padding: '1.5rem', display: 'flex', flexDirection: 'column',
                    position: 'relative', boxShadow: isPro ? '0 8px 24px rgba(2,132,199,0.1)' : '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  {isPro && (
                    <span style={{ position: 'absolute', top: '-11px', right: '1.25rem', background: '#0284c7', color: '#fff', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.15rem 0.55rem', borderRadius: '999px', letterSpacing: '0.04em' }}>
                      Popular Choice
                    </span>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h5 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>{plan.name}</h5>
                    {!plan.is_active && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                        Inactive
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.78rem', color: '#64748b', minHeight: '38px', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                    {plan.description || 'Full platform capabilities for growing enterprises.'}
                  </p>

                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                      <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                        Rs. {Number(plan.price_monthly).toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/ month</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700, marginTop: '0.2rem' }}>
                      Rs. {Number(plan.price_yearly).toLocaleString()} / year (Save on Annual)
                    </div>
                  </div>

                  <div style={{ flex: 1, marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                      Included Modules:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {(plan.modules || []).map((m) => (
                        <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#334155' }}>
                          <i className="bi bi-check-circle-fill" style={{ color: '#16a34a', fontSize: '0.85rem' }} />
                          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', marginBottom: '1rem' }}>
                    <i className="bi bi-person-badge me-1" />Max Staff Users: <strong>{plan.max_users || 1}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="pk-btn pk-btn--outline"
                      style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}
                      onClick={() => { setSelectedPlan(plan); setShowEditPlan(true); }}
                    >
                      <i className="bi bi-pencil" /> Edit
                    </button>
                    <button
                      className="pk-btn pk-btn--outline"
                      style={{ color: '#dc2626', borderColor: '#fecaca', padding: '0.4rem 0.75rem' }}
                      onClick={async () => {
                        if (!confirm(`Delete plan "${plan.name}"?`)) return;
                        try { await api.delete(`/admin/plans/${plan.id}`); fetchAll(); }
                        catch (e) { alert(e?.response?.data?.message || 'Cannot delete.'); }
                      }}
                    >
                      <i className="bi bi-trash3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: DEMO REQUESTS & 1-CLICK PROVISIONING ── */}
      {tab === 'demo' && (
        <DemoRequestsPanel
          requests={demoRequests}
          onRefresh={fetchAll}
          onConvert={(lead) => {
            setInitialDemoData(lead);
            setShowNewCustomer(true);
          }}
        />
      )}

      {/* ── MODALS ── */}
      {showNewCustomer && (
        <CustomerModal
          plans={plans}
          initialData={initialDemoData}
          onClose={() => { setShowNewCustomer(false); setInitialDemoData(null); }}
          onSaved={() => { setShowNewCustomer(false); setInitialDemoData(null); fetchAll(); }}
        />
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
      {showBranches && branchesTenant && (
        <TenantBranchesModal
          tenant={branchesTenant}
          plans={plans}
          onClose={() => { setShowBranches(false); setBranchesTenant(null); }}
        />
      )}
    </div>
  );
}

// ── CustomerModal — creates a new main shop (with subscription) ──
function CustomerModal({ plans, initialData = null, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    password: '',
    shop_name: initialData?.business_name || '',
    phone: initialData?.phone || '',
    business_type: 'retail',
    plan_id: '',
    billing_cycle: 'yearly',
    start_date: new Date().toISOString().slice(0, 10),
    notes: initialData ? `Lead #${initialData.id}: ${initialData.message || 'Demo request conversion'}` : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const [created, setCreated] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const selectedPlan = plans.find((p) => String(p.id) === String(form.plan_id));
  const isTrialPlan = selectedPlan?.name === 'Free Trial';
  const effectiveCycle = isTrialPlan ? 'trial' : form.billing_cycle;
  const price = selectedPlan
    ? (effectiveCycle === 'yearly' ? selectedPlan.price_yearly : effectiveCycle === 'monthly' ? selectedPlan.price_monthly : 0)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      await api.post('/admin/tenants', {
        ...form,
        role: 'admin',
        billing_cycle: effectiveCycle,
      });
      setCreated({
        email: form.email,
        password: form.password,
        shop_name: form.shop_name || form.name,
        plan: selectedPlan?.name,
        modules: selectedPlan?.modules || [],
      });
    } catch (err) {
      const errs = err?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' ') : 'Failed to create shop.');
    } finally { setSaving(false); }
  };

  if (created) {
    return (
      <PkModal title="Shop created" onClose={() => onSaved()}>
        <div className="pk-modal__body">
          <p style={{ marginBottom: '1rem' }}>Give these login details to the shop owner. They can use only the modules in their plan.</p>
          <div style={{ background: '#f4f4f5', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', fontSize: '0.88rem' }}>
            <div><strong>Shop:</strong> {created.shop_name}</div>
            <div><strong>Email:</strong> {created.email}</div>
            <div><strong>Password:</strong> {created.password}</div>
            <div><strong>Plan:</strong> {created.plan}</div>
            <div><strong>Modules:</strong> {created.modules.join(', ') || '—'}</div>
          </div>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--dark" onClick={() => onSaved()}>Done</button>
        </div>
      </PkModal>
    );
  }

  return (
    <PkModal title="Create New Shop" onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '1rem' }}>{error}</div>}
          <div className="pk-form-row">
            <div className="pk-field"><label>Owner name *</label><input className="pk-input" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
            <div className="pk-field"><label>Login email *</label><input type="email" className="pk-input" autoComplete="username" value={form.email} onChange={(e) => set('email', e.target.value)} required /></div>
            <div className="pk-field"><label>Login password *</label><input type="password" className="pk-input" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} /></div>
            <div className="pk-field"><label>Shop name</label><input className="pk-input" autoComplete="organization" value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} /></div>
            <div className="pk-field"><label>Phone</label><input className="pk-input" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          </div>

          <div style={{ borderTop: '1.5px solid var(--border)', margin: '1rem 0 0.5rem', paddingTop: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business type</div>
          <div className="pk-field" style={{ marginBottom: '0.75rem' }}>
            <select className="pk-input" value={form.business_type} onChange={(e) => set('business_type', e.target.value)} required>
              {SHOP_TYPES.map((type) => (
                <option key={type.key} value={type.key}>{type.label} — {type.description}</option>
              ))}
            </select>
          </div>

          <div style={{ borderTop: '1.5px solid var(--border)', margin: '1rem 0 0.5rem', paddingTop: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subscription plan</div>
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
              <select className="pk-input" value={effectiveCycle} onChange={(e) => set('billing_cycle', e.target.value)} disabled={isTrialPlan}>
                {isTrialPlan ? (
                  <option value="trial">7-day Trial</option>
                ) : (
                  <>
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                  </>
                )}
              </select>
            </div>
            <div className="pk-field"><label>Start Date *</label><input type="date" className="pk-input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required /></div>
          </div>
          {price !== null && (
            <div style={{ background: '#dbeafe', border: '1.5px solid #93c5fd', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', fontSize: '0.82rem', color: '#1d4ed8', marginTop: '0.5rem' }}>
              Amount: <strong>Rs. {Number(price).toLocaleString()}</strong> / {effectiveCycle}
              {isTrialPlan && <span style={{ marginLeft: '1rem' }}>Trial length: 7 days</span>}
              {selectedPlan && <span style={{ marginLeft: '1rem' }}>Modules: {(selectedPlan.modules || []).join(', ')}</span>}
            </div>
          )}
          <div className="pk-field" style={{ marginTop: '0.75rem' }}><label>Notes</label><textarea className="pk-input pk-textarea" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-shop" />}
            Create Shop
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── TenantBranchesModal — superadmin manages branches + branch users ─────────
function TenantBranchesModal({ tenant, plans, onClose }) {
  const [branches, setBranches]     = useState([]);
  const [loading,  setLoading]      = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [expanded, setExpanded]     = useState(null); // branch id whose users are open

  const fetchBranches = () => {
    setLoading(true);
    api.get(`/branches?user_id=${tenant.id}`)
      .then(({ data }) => setBranches(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBranches(); }, []);

  const handleDelete = async (b) => {
    if (!confirm(`Delete branch "${b.name}"?`)) return;
    await api.delete(`/branches/${b.id}`);
    fetchBranches();
  };

  return (
    <PkModal title={`Branches — ${tenant.shop_name || tenant.name}`} onClose={onClose} wide>
      <div className="pk-modal__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.83rem', color: 'var(--text-2)' }}>
            {branches.length} branch{branches.length !== 1 ? 'es' : ''}
          </span>
          <button className="pk-btn pk-btn--sm pk-btn--rose" onClick={() => { setEditBranch(null); setShowForm(true); }}>
            <i className="bi bi-plus-lg" />Add Branch
          </button>
        </div>

        {loading ? (
          <div className="pk-loading" style={{ padding: '1.5rem' }}>
            <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.25rem', height: '1.25rem' }} />
            <span>Loading…</span>
          </div>
        ) : branches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
            <i className="bi bi-diagram-3" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }} />
            No branches yet. Add one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {branches.map(b => (
              <div key={b.id} style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {/* Branch header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--surface-2)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: '#ffe4ef', color: 'var(--pookal-rose)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <i className="bi bi-shop" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{b.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                      {b.manager_name && <span><i className="bi bi-person me-1" />{b.manager_name} · </span>}
                      {b.phone && <span><i className="bi bi-telephone me-1" />{b.phone}</span>}
                    </div>
                  </div>
                  <span className={`pk-badge ${b.is_active ? 'pk-badge--success' : 'pk-badge--gray'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
                  <button className="pk-btn pk-btn--sm pk-btn--outline" title="Branch logins" onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                    <i className={`bi bi-people-fill`} /> Logins {expanded === b.id ? '▲' : '▼'}
                  </button>
                  <button className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => { setEditBranch(b); setShowForm(true); }}>
                    <i className="bi bi-pencil" />
                  </button>
                  <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDelete(b)}>
                    <i className="bi bi-trash3" />
                  </button>
                </div>

                {/* Expandable branch users section */}
                {expanded === b.id && (
                  <BranchUsersSection branch={b} />
                )}
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <BranchForm
            tenantId={tenant.id}
            branch={editBranch}
            plans={plans}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); fetchBranches(); }}
          />
        )}
      </div>
      <div className="pk-modal__foot">
        <button className="pk-btn pk-btn--ghost" onClick={onClose}>Close</button>
      </div>
    </PkModal>
  );
}

// ── Branch users — locked login accounts for a specific branch ────────────────
function BranchUsersSection({ branch }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', phone: '', password: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchUsers = () => {
    setLoading(true);
    api.get(`/admin/branches/${branch.id}/users`)
      .then(({ data }) => setUsers(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [branch.id]);

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post(`/admin/branches/${branch.id}/users`, form);
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', password: '' });
      fetchUsers();
    } catch (err) {
      setError(Object.values(err?.response?.data?.errors || {}).flat().join(' ') || 'Failed to create.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Remove login "${u.name}" from this branch?`)) return;
    await api.delete(`/admin/branches/${branch.id}/users/${u.id}`);
    fetchUsers();
  };

  return (
    <div style={{ padding: '0.85rem 1rem', background: '#fafafa', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>
          <i className="bi bi-lock me-1" />Branch Login Accounts
        </span>
        <button className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => setShowAdd(v => !v)}>
          <i className="bi bi-person-plus" /> Add Login
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.75rem' }}>
          {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', fontSize: '0.78rem', marginBottom: '0.5rem' }}>{error}</div>}
          <div className="pk-form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="pk-field"><label>Name *</label><input className="pk-input" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
            <div className="pk-field"><label>Email *</label><input className="pk-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
            <div className="pk-field"><label>Phone</label><input className="pk-input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="pk-field"><label>Password *</label><input className="pk-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} /></div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button type="button" className="pk-btn pk-btn--ghost pk-btn--sm" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="pk-btn pk-btn--rose pk-btn--sm" disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
              Create Login
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', padding: '0.5rem 0' }}>Loading…</div>
      ) : users.length === 0 ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', padding: '0.4rem 0' }}>
          No branch logins yet. Add one so staff can log in directly to this branch.
        </div>
      ) : (
        <table className="pk-table" style={{ fontSize: '0.82rem' }}>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td style={{ color: 'var(--text-2)' }}>{u.email}</td>
                <td style={{ color: 'var(--text-2)' }}>{u.phone || '—'}</td>
                <td>
                  <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDelete(u)}>
                    <i className="bi bi-trash3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BranchForm({ tenantId, branch, plans = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    name:         branch?.name         || '',
    address:      branch?.address      || '',
    phone:        branch?.phone        || '',
    manager_name: branch?.manager_name || '',
    plan_id:      branch?.plan_id      || '',
    is_active:    branch?.is_active    ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, plan_id: form.plan_id || null };
      if (branch) await api.patch(`/branches/${branch.id}`, payload);
      else        await api.post('/branches', { ...payload, user_id: tenantId });
      onSaved();
    } catch (err) {
      setError(Object.values(err?.response?.data?.errors || {}).flat().join(' ') || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const selectedPlan = plans.find(p => String(p.id) === String(form.plan_id));

  return (
    <div style={{ marginTop: '1rem', background: '#f8f8f8', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
        {branch ? `Edit — ${branch.name}` : 'New Branch'}
      </div>
      {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-sm)', padding: '0.5rem', fontSize: '0.8rem', color: '#dc2626', marginBottom: '0.5rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="pk-form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="pk-field"><label>Branch Name *</label><input className="pk-input" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
          <div className="pk-field"><label>Manager Name</label><input className="pk-input" value={form.manager_name} onChange={e => set('manager_name', e.target.value)} /></div>
          <div className="pk-field"><label>Phone</label><input className="pk-input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div className="pk-field">
            <label>Status</label>
            <select className="pk-input" value={form.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>
        <div className="pk-field"><label>Address</label><textarea className="pk-input pk-textarea" rows={2} value={form.address} onChange={e => set('address', e.target.value)} /></div>

        {/* Branch plan — controls which modules branch login users can access */}
        <div className="pk-field" style={{ marginTop: '0.5rem' }}>
          <label>Branch Plan <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: '0.75rem' }}>(controls module access for branch login users)</span></label>
          <select className="pk-input" value={form.plan_id} onChange={e => set('plan_id', e.target.value)}>
            <option value="">— Inherit parent shop plan —</option>
            {plans.filter(p => p.is_active).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedPlan && (
            <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {(selectedPlan.modules || []).map(m => (
                <span key={m} className="pk-badge pk-badge--info" style={{ fontSize: '0.7rem' }}>{m}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button type="button" className="pk-btn pk-btn--ghost pk-btn--sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--rose pk-btn--sm" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
            {branch ? 'Save' : 'Add Branch'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── RenewModal ──
function RenewModal({ tenant, plans, onClose, onSaved }) {
  const [form, setForm] = useState({
    plan_id:       tenant.subscription?.plan_id || '',
    billing_cycle: tenant.subscription?.billing_cycle === 'trial' ? 'monthly' : (tenant.subscription?.billing_cycle || 'yearly'),
    start_date:    new Date().toISOString().slice(0, 10),
    notes:         '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const selectedPlan = plans.find((p) => String(p.id) === String(form.plan_id));
  const isTrialPlan = selectedPlan?.name === 'Free Trial';
  const effectiveCycle = isTrialPlan ? 'trial' : form.billing_cycle;
  const currentPlan = plans.find((p) => String(p.id) === String(tenant.subscription?.plan_id));
  const upgradeCandidates = getUpgradeCandidates(plans, tenant);
  const price = selectedPlan
    ? (effectiveCycle === 'yearly' ? selectedPlan.price_yearly : effectiveCycle === 'monthly' ? selectedPlan.price_monthly : 0)
    : null;
  const endDate = form.start_date ? (() => {
    const d = new Date(form.start_date);
    if (effectiveCycle === 'trial') d.setDate(d.getDate() + 7);
    else if (effectiveCycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  })() : '—';

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try { await api.post(`/admin/tenants/${tenant.id}/renew`, { ...form, billing_cycle: effectiveCycle }); onSaved(); }
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
          {currentPlan && (
            <div className="admin-upgrade-current">
              <div>
                <div className="admin-upgrade-current__eyebrow">Current plan details</div>
                <div className="admin-upgrade-current__title">{currentPlan.name}</div>
                <div className="admin-upgrade-current__meta">
                  {formatPlanPrice(currentPlan, tenant.subscription?.billing_cycle)} / {tenant.subscription?.billing_cycle || 'cycle'} · Max users {currentPlan.max_users}
                </div>
              </div>
              <div className="admin-upgrade-current__modules">
                {(currentPlan.modules || []).map((module) => (
                  <span key={module} className="pk-badge pk-badge--gray">{MODULE_LABELS[module] || module}</span>
                ))}
              </div>
            </div>
          )}
          {upgradeCandidates.length > 0 && (
            <div className="admin-upgrade-grid">
              {upgradeCandidates.slice(0, 3).map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={`admin-upgrade-card ${String(form.plan_id) === String(plan.id) ? 'admin-upgrade-card--active' : ''}`}
                  onClick={() => set('plan_id', String(plan.id))}
                >
                  <div className="admin-upgrade-card__top">
                    <div className="admin-upgrade-card__name">{plan.name}</div>
                    <span className="pk-badge pk-badge--success">{plan.modules?.length || 0} modules</span>
                  </div>
                  <div className="admin-upgrade-card__price">
                    {formatPlanPrice(plan, effectiveCycle === 'trial' ? 'monthly' : effectiveCycle)}
                    <span>{effectiveCycle === 'yearly' ? '/ year' : effectiveCycle === 'monthly' ? '/ month' : ''}</span>
                  </div>
                  <div className="admin-upgrade-card__modules">
                    {(plan.modules || []).slice(0, 5).map((module) => (
                      <span key={module}>{MODULE_LABELS[module] || module}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
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
              <select className="pk-input" value={effectiveCycle} onChange={(e) => set('billing_cycle', e.target.value)} disabled={isTrialPlan}>
                {isTrialPlan ? (
                  <option value="trial">7-day Trial</option>
                ) : (
                  <>
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                  </>
                )}
              </select>
            </div>
            <div className="pk-field"><label>Start Date *</label><input type="date" className="pk-input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required /></div>
            <div className="pk-field"><label>New End Date</label><input type="text" className="pk-input" value={endDate} readOnly style={{ background: '#f4f4f5' }} /></div>
          </div>
          {price !== null && (
            <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', fontSize: '0.82rem', color: '#15803d', marginTop: '0.5rem' }}>
              Amount: <strong>Rs. {Number(price).toLocaleString()}</strong> / {effectiveCycle}
              {isTrialPlan && <span style={{ marginLeft: '1rem' }}>Trial length: 7 days</span>}
              {selectedPlan && <span style={{ marginLeft: '1rem' }}>Modules: {(selectedPlan.modules || []).join(', ')}</span>}
            </div>
          )}
          {selectedPlan && (
            <div className="admin-upgrade-compare">
              <div className="admin-upgrade-compare__col">
                <div className="admin-upgrade-compare__label">Current</div>
                <div className="admin-upgrade-compare__plan">{tenant.subscription?.plan_name || 'None'}</div>
                <div className="admin-upgrade-compare__list">
                  {((currentPlan?.modules) || []).map((module) => (
                    <div key={module}><i className="bi bi-check2" /> {MODULE_LABELS[module] || module}</div>
                  ))}
                </div>
              </div>
              <div className="admin-upgrade-compare__col admin-upgrade-compare__col--next">
                <div className="admin-upgrade-compare__label">Selected upgrade</div>
                <div className="admin-upgrade-compare__plan">{selectedPlan.name}</div>
                <div className="admin-upgrade-compare__list">
                  {(selectedPlan.modules || []).map((module) => (
                    <div key={module}><i className="bi bi-stars" /> {MODULE_LABELS[module] || module}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="pk-field" style={{ marginTop: '0.75rem' }}><label>Notes</label><textarea className="pk-input pk-textarea" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--rose" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-arrow-repeat" />}
            Upgrade Subscription
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

// ── Demo Requests Panel ────────────────────────────────────────────────────────
const DEMO_STATUS_COLORS = {
  new:       { bg: '#dbeafe', color: '#1d4ed8', label: 'New'       },
  contacted: { bg: '#fef9c3', color: '#854d0e', label: 'Contacted' },
  converted: { bg: '#dcfce7', color: '#166534', label: 'Converted' },
  declined:  { bg: '#f3f4f6', color: '#6b7280', label: 'Declined'  },
};

function DemoRequestsPanel({ requests, onRefresh, onConvert }) {
  const [updating, setUpdating] = useState(null);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.patch(`/demo/requests/${id}`, { status });
      onRefresh();
    } finally { setUpdating(null); }
  };

  const newCount = requests.filter(r => r.status === 'new').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
          {requests.length} total · <strong style={{ color: 'var(--pookal-rose)' }}>{newCount} new</strong>
        </span>
      </div>
      {requests.length === 0 ? (
        <div className="pk-empty">
          <i className="bi bi-send" />
          <h6>No demo requests yet</h6>
          <p>When prospects submit a demo request from the login page, they'll appear here.</p>
        </div>
      ) : (
        <div className="pk-card">
          <table className="pk-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Business</th>
                <th>Contact</th>
                <th>City</th>
                <th>Message</th>
                <th>Received</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => {
                const s = DEMO_STATUS_COLORS[r.status] || DEMO_STATUS_COLORS.new;
                return (
                  <tr key={r.id} style={{ background: r.status === 'new' ? 'rgba(219,234,254,0.18)' : undefined }}>
                    <td style={{ fontWeight: 600 }}>
                      {r.status === 'new' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pookal-rose)', display: 'inline-block', marginRight: '0.4rem', verticalAlign: 'middle' }} />}
                      {r.name}
                    </td>
                    <td>{r.business_name}</td>
                    <td style={{ fontSize: '0.78rem' }}>
                      <div style={{ color: 'var(--text-2)' }}>{r.email}</div>
                      {r.phone && <div style={{ color: 'var(--text-2)' }}>{r.phone}</div>}
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>{r.city || '—'}</td>
                    <td style={{ maxWidth: 220, fontSize: '0.78rem', color: 'var(--text-2)' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {r.message || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td>
                      <select
                        value={r.status}
                        disabled={updating === r.id}
                        onChange={e => updateStatus(r.id, e.target.value)}
                        style={{
                          background: s.bg, color: s.color, border: 'none',
                          borderRadius: 'var(--radius-xs)', padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', outline: 'none',
                        }}
                      >
                        {Object.entries(DEMO_STATUS_COLORS).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="pk-btn pk-btn--xs pk-btn--dark"
                        onClick={() => onConvert?.(r)}
                        title="Convert lead into active tenant shop"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                      >
                        <i className="bi bi-person-plus-fill" /> Provision Shop
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
