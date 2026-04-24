import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';

const SEGMENT_META = {
  vip:     { color: '#b45309', bg: '#fef3c7', label: 'VIP'     },
  regular: { color: '#374151', bg: '#f3f4f6', label: 'Regular' },
  event:   { color: '#1d4ed8', bg: '#dbeafe', label: 'Event'   },
};

const CHANNEL_META = {
  whatsapp: { icon: 'bi-whatsapp',  color: '#25d366', label: 'WhatsApp' },
  sms:      { icon: 'bi-phone',     color: '#6366f1', label: 'SMS'      },
  email:    { icon: 'bi-envelope',  color: '#0ea5e9', label: 'Email'    },
};

function avatarColor(name = '') {
  const colors = ['#7d294a','#25543a','#1d4ed8','#b45309','#6366f1','#0ea5e9','#dc2626','#059669'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function Avatar({ name, size = 40 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarColor(name), color: '#fff',
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.36, fontWeight: 600, flexShrink: 0,
      letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  );
}

export default function CrmPage() {
  const [tab,       setTab]       = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [segment,   setSegment]   = useState('all');
  const [showAdd,   setShowAdd]   = useState(false);

  const fetchCustomers = () => {
    api.get('/crm/customers')
      .then(({ data }) => setCustomers(data.data || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
    api.get('/crm/campaigns').then(({ data }) => setCampaigns(data));
  }, []);

  const filtered = useMemo(() => {
    let list = customers;
    if (segment !== 'all') list = list.filter(c => c.segment === segment);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, search, segment]);

  const totalLoyalty = customers.reduce((s, c) => s + (c.loyalty_points || 0), 0);
  const vipCount     = customers.filter(c => c.segment === 'vip').length;

  const tabs = [
    { key: 'customers', label: 'Customers', icon: 'bi-people', count: customers.length },
    { key: 'campaigns', label: 'Campaigns', icon: 'bi-megaphone', count: campaigns.length },
  ];

  return (
    <div className="crm-page">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="crm-header">
        <div>
          <h4 className="crm-header__title">CRM &amp; Loyalty</h4>
          <p className="crm-header__sub">Manage customers, segments and outreach campaigns</p>
        </div>
        {tab === 'customers' && (
          <button className="crm-btn-primary" onClick={() => setShowAdd(true)}>
            <i className="bi bi-person-plus" />
            Add Customer
          </button>
        )}
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────────── */}
      <div className="crm-kpi-row">
        {[
          { label: 'Total Customers', value: customers.length, icon: 'bi-people-fill',    tint: '#ede9fe', iconColor: '#6366f1' },
          { label: 'VIP Members',     value: vipCount,          icon: 'bi-star-fill',      tint: '#fef9c3', iconColor: '#ca8a04' },
          { label: 'Campaigns',       value: campaigns.length,  icon: 'bi-megaphone-fill', tint: '#dcfce7', iconColor: '#16a34a' },
          { label: 'Loyalty Points',  value: totalLoyalty.toLocaleString(), icon: 'bi-gift-fill', tint: '#fee2e2', iconColor: '#dc2626' },
        ].map(({ label, value, icon, tint, iconColor }) => (
          <div key={label} className="crm-kpi">
            <div className="crm-kpi__icon" style={{ background: tint, color: iconColor }}>
              <i className={`bi ${icon}`} />
            </div>
            <div>
              <div className="crm-kpi__value">{value}</div>
              <div className="crm-kpi__label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="crm-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`crm-tab ${tab === t.key ? 'crm-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <i className={`bi ${t.icon}`} />
            {t.label}
            <span className={`crm-tab__count ${tab === t.key ? 'crm-tab__count--active' : ''}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── CUSTOMERS ──────────────────────────────────────────────────── */}
      {tab === 'customers' && (
        <>
          {/* Search + filter row */}
          <div className="crm-toolbar">
            <div className="crm-search">
              <i className="bi bi-search crm-search__icon" />
              <input
                className="crm-search__input"
                placeholder="Search by name, phone or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="crm-search__clear" onClick={() => setSearch('')}>
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
            <div className="crm-filter-pills">
              {['all', 'vip', 'regular', 'event'].map(s => (
                <button
                  key={s}
                  className={`crm-filter-pill ${segment === s ? 'crm-filter-pill--active' : ''}`}
                  onClick={() => setSegment(s)}
                >
                  {s === 'all' ? 'All' : SEGMENT_META[s]?.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="crm-loading">
              <div className="spinner-border" style={{ color: 'var(--pookal-rose)' }} />
              <span>Loading customers…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="crm-empty">
              <i className="bi bi-people" />
              <h6>{search || segment !== 'all' ? 'No results found' : 'No customers yet'}</h6>
              <p>{search || segment !== 'all' ? 'Try adjusting your search or filter.' : 'Add your first customer to get started.'}</p>
              {!search && segment === 'all' && (
                <button className="crm-btn-primary" onClick={() => setShowAdd(true)}>
                  <i className="bi bi-person-plus" /> Add Customer
                </button>
              )}
            </div>
          ) : (
            <div className="crm-customer-list">
              {filtered.map(c => {
                const seg  = SEGMENT_META[c.segment]  || SEGMENT_META.regular;
                const chan = CHANNEL_META[c.preferred_channel] || CHANNEL_META.whatsapp;
                return (
                  <div key={c.id} className="crm-customer-card">
                    <Avatar name={c.name} size={44} />
                    <div className="crm-customer-card__info">
                      <div className="crm-customer-card__name">{c.name}</div>
                      <div className="crm-customer-card__contact">
                        {c.phone && <span><i className="bi bi-telephone me-1" />{c.phone}</span>}
                        {c.email && <span><i className="bi bi-envelope me-1" />{c.email}</span>}
                      </div>
                    </div>
                    <div className="crm-customer-card__tags">
                      <span className="crm-pill" style={{ color: seg.color, background: seg.bg }}>{seg.label}</span>
                    </div>
                    <div className="crm-customer-card__loyalty">
                      <i className="bi bi-star-fill" style={{ color: '#f59e0b', fontSize: '0.75rem' }} />
                      <span>{c.loyalty_points}</span>
                    </div>
                    <div className="crm-customer-card__channel" style={{ color: chan.color }} title={chan.label}>
                      <i className={`bi ${chan.icon}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── CAMPAIGNS ──────────────────────────────────────────────────── */}
      {tab === 'campaigns' && (
        campaigns.length === 0 ? (
          <div className="crm-empty">
            <i className="bi bi-megaphone" />
            <h6>No campaigns yet</h6>
            <p>Create campaigns to reach your customers via WhatsApp, SMS or Email.</p>
          </div>
        ) : (
          <div className="crm-campaign-grid">
            {campaigns.map((c, i) => {
              const chan = CHANNEL_META[c.channel] || CHANNEL_META.email;
              const isLive = c.status === 'scheduled';
              return (
                <div key={i} className="crm-campaign-card">
                  <div className="crm-campaign-card__icon" style={{ background: chan.color + '18', color: chan.color }}>
                    <i className={`bi ${chan.icon}`} />
                  </div>
                  <div className="crm-campaign-card__body">
                    <div className="crm-campaign-card__name">{c.name}</div>
                    <div className="crm-campaign-card__meta">
                      <span className="crm-pill" style={{ color: chan.color, background: chan.color + '18' }}>{chan.label}</span>
                      <span className={`crm-pill ${isLive ? 'crm-pill--blue' : 'crm-pill--gray'}`}>{c.status}</span>
                    </div>
                  </div>
                  <div className="crm-campaign-card__arrow">
                    <i className="bi bi-chevron-right" />
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Add Customer drawer ─────────────────────────────────────────── */}
      {showAdd && <AddCustomerDrawer onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchCustomers(); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Customer — side drawer
// ─────────────────────────────────────────────────────────────────────────────
function AddCustomerDrawer({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', segment: 'regular', preferred_channel: 'whatsapp' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try { await api.post('/crm/customers', form); onSaved(); }
    catch { setError('Failed to save customer.'); setSaving(false); }
  };

  return (
    <>
      <div className="crm-drawer-overlay" onClick={onClose} />
      <aside className="crm-drawer">
        <div className="crm-drawer__header">
          <div>
            <div className="crm-drawer__title">Add Customer</div>
            <div className="crm-drawer__sub">Create a new CRM contact</div>
          </div>
          <button className="crm-drawer__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <form onSubmit={handleSubmit} className="crm-drawer__body">
          {error && <div className="crm-alert-error">{error}</div>}

          <div className="crm-field">
            <label>Full Name *</label>
            <input className="crm-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Meena Sharma" required />
          </div>
          <div className="crm-field">
            <label>Phone</label>
            <input className="crm-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="crm-field">
            <label>Email</label>
            <input type="email" className="crm-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="meena@example.com" />
          </div>

          <div className="crm-field">
            <label>Segment</label>
            <div className="crm-segment-grid">
              {[
                { v: 'regular', label: 'Regular', icon: 'bi-person',     desc: 'Standard customer'  },
                { v: 'vip',     label: 'VIP',     icon: 'bi-star',       desc: 'High-value buyer'   },
                { v: 'event',   label: 'Event',   icon: 'bi-calendar2',  desc: 'Event / wedding'    },
              ].map(opt => (
                <button
                  key={opt.v} type="button"
                  className={`crm-seg-option ${form.segment === opt.v ? 'crm-seg-option--active' : ''}`}
                  onClick={() => set('segment', opt.v)}
                >
                  <i className={`bi ${opt.icon}`} />
                  <span className="fw-semibold">{opt.label}</span>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="crm-field">
            <label>Preferred Channel</label>
            <div className="crm-channel-row">
              {Object.entries(CHANNEL_META).map(([v, meta]) => (
                <button
                  key={v} type="button"
                  className={`crm-channel-btn ${form.preferred_channel === v ? 'crm-channel-btn--active' : ''}`}
                  style={form.preferred_channel === v ? { borderColor: meta.color, background: meta.color + '12', color: meta.color } : {}}
                  onClick={() => set('preferred_channel', v)}
                >
                  <i className={`bi ${meta.icon}`} />
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div className="crm-drawer__footer">
            <button type="button" className="crm-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="crm-btn-primary" disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
              Save Customer
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
