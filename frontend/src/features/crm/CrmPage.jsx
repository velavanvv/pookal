import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../auth/AuthContext';

const SEGMENT_META = {
  vip:     { color: '#b45309', bg: '#fef3c7', label: 'VIP Platinum' },
  regular: { color: '#374151', bg: '#f3f4f6', label: 'Regular' },
  event:   { color: '#1d4ed8', bg: '#dbeafe', label: 'Bulk / Event'   },
};

const CHANNEL_META = {
  whatsapp: { icon: 'bi-whatsapp',  color: '#25d366', label: 'WhatsApp' },
  sms:      { icon: 'bi-phone',     color: '#6366f1', label: 'SMS'      },
  email:    { icon: 'bi-envelope',  color: '#0ea5e9', label: 'Email'    },
};

function getLoyaltyTier(points = 0) {
  if (points >= 1000) return { name: 'Platinum VIP', icon: 'bi-gem', color: '#7c3aed', bg: '#ede9fe' };
  if (points >= 500)  return { name: 'Gold', icon: 'bi-star-fill', color: '#d97706', bg: '#fef3c7' };
  if (points >= 200)  return { name: 'Silver', icon: 'bi-award-fill', color: '#0284c7', bg: '#e0f2fe' };
  return { name: 'Bronze', icon: 'bi-shield-check', color: '#64748b', bg: '#f1f5f9' };
}

function avatarColor(name = '') {
  const colors = ['#0284c7', '#16a34a', '#7c3aed', '#ea580c', '#0f766e', '#be185d', '#4338ca'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function Avatar({ name = '', size = 42 }) {
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'C';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarColor(name), color: '#fff',
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
      letterSpacing: '0.02em',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    }}>
      {initials}
    </div>
  );
}

export default function CrmPage() {
  const { user } = useAuth();
  const [tab, setTab]             = useState('customers'); // 'customers' | 'campaigns' | 'loyalty'
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [segment, setSegment]     = useState('all');
  const [showAdd, setShowAdd]     = useState(false);

  // Selected customer for quick points / khata action
  const [activeCustomerModal, setActiveCustomerModal] = useState(null);
  const [pointsDelta, setPointsDelta] = useState('');
  const [savingPoints, setSavingPoints] = useState(false);
  const [toast, setToast] = useState(null);

  // Active campaign customized in preview
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [customMsg, setCustomMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchCustomers = () => {
    setLoading(true);
    api.get('/crm/customers')
      .then(({ data }) => setCustomers(data.data || data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
    api.get('/crm/campaigns')
      .then(({ data }) => {
        const list = data || [];
        setCampaigns(list);
        if (list.length > 0) {
          setSelectedCampaign(list[0]);
          setCustomMsg(list[0].template || '');
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const storeUrl = useMemo(() => {
    const slug = user?.database?.storefront_slug || 'store';
    return `${window.location.origin}/store/${slug}`;
  }, [user]);

  const shopName = user?.shop_name || 'Universal Store';

  const filtered = useMemo(() => {
    let list = customers;
    if (segment !== 'all') {
      if (segment === 'khata') {
        list = list.filter(c => (c.outstanding_balance || 0) > 0);
      } else {
        list = list.filter(c => c.segment === segment);
      }
    }
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

  const handleAdjustPoints = async (customer, delta) => {
    setSavingPoints(true);
    try {
      const { data } = await api.post(`/crm/customers/${customer.id}/points`, { points: delta });
      setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, loyalty_points: data.loyalty_points } : c));
      showToast(`Updated loyalty points for ${customer.name}`);
      setActiveCustomerModal(null);
      setPointsDelta('');
    } catch {
      showToast('Failed to update points', 'error');
    } finally {
      setSavingPoints(false);
    }
  };

  const handleSendWhatsAppReminder = (customer) => {
    const phone = (customer.phone || '').replace(/[^\d]/g, '');
    const due = customer.outstanding_balance || 500;
    const msg = `Hello *${customer.name}*,\nGreetings from *${shopName}*! 🧾\nThis is a gentle reminder regarding your outstanding bill of *Rs. ${due}*.\nKindly clear the payment via UPI or at our shop counter at your convenience.\nThank you for choosing us! 🙏`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const renderFormattedTemplate = (tpl, cust = null) => {
    return tpl
      .replace(/{shop_name}/g, shopName)
      .replace(/{store_url}/g, storeUrl)
      .replace(/{name}/g, cust?.name || 'Customer')
      .replace(/{due_amount}/g, '500')
      .replace(/{points}/g, '250');
  };

  return (
    <div className="crm-page" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff',
          padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <i className={`bi ${toast.type === 'error' ? 'bi-exclamation-circle' : 'bi-check-circle'}`} />
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="pg-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h4 className="pg-title" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="bi bi-people-fill" style={{ color: '#0284c7' }} />
            CRM &amp; Growth Engine
          </h4>
          <p className="pg-sub" style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            Accelerate repeat sales with customer loyalty points, WhatsApp marketing blasts, and credit khata management.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="pk-btn pk-btn--primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <i className="bi bi-person-plus-fill" /> Add Customer
          </button>
        </div>
      </div>

      {/* ── KPI Metric Strip (Google Material 3 Elevation) ── */}
      <div className="pk-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="pk-kpi" style={{ background: '#fff', padding: '1.15rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'grid', placeItems: 'center', fontSize: '1.3rem' }}>
            <i className="bi bi-people-fill" />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{customers.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Contacts</div>
          </div>
        </div>

        <div className="pk-kpi" style={{ background: '#fff', padding: '1.15rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'grid', placeItems: 'center', fontSize: '1.3rem' }}>
            <i className="bi bi-star-fill" />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{vipCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>VIP Customers</div>
          </div>
        </div>

        <div className="pk-kpi" style={{ background: '#fff', padding: '1.15rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: '1.3rem' }}>
            <i className="bi bi-gift-fill" />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{totalLoyalty.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Active Points Balance</div>
          </div>
        </div>

        <div className="pk-kpi" style={{ background: '#fff', padding: '1.15rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', fontSize: '1.3rem' }}>
            <i className="bi bi-whatsapp" />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.1 }}>1-Click</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>WhatsApp Broadcast Ready</div>
          </div>
        </div>
      </div>

      {/* ── Main Navigation Tabs ── */}
      <div className="pk-tabs" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
        {[
          { key: 'customers', label: 'Customers & Khata Ledger', icon: 'bi-people', count: customers.length },
          { key: 'campaigns', label: 'WhatsApp Marketing & Flash Sales', icon: 'bi-megaphone', badge: 'Revenue' },
          { key: 'loyalty',   label: 'Loyalty Rewards Program', icon: 'bi-award', count: totalLoyalty },
        ].map(t => (
          <button
            key={t.key}
            className={`pk-tab ${tab === t.key ? 'pk-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.65rem 1.15rem', fontSize: '0.82rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '0.45rem', border: 'none',
              background: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? '2.5px solid #0284c7' : '2.5px solid transparent',
              color: tab === t.key ? '#0284c7' : '#64748b',
            }}
          >
            <i className={`bi ${t.icon}`} />
            {t.label}
            {t.count !== undefined && (
              <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: tab === t.key ? '#e0f2fe' : '#f1f5f9', color: tab === t.key ? '#0284c7' : '#64748b', fontWeight: 800 }}>
                {t.count}
              </span>
            )}
            {t.badge && (
              <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: '#dcfce7', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: CUSTOMERS & KHATA LEDGER ── */}
      {tab === 'customers' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          {/* Search & Filter Toolbar */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '420px' }}>
              <i className="bi bi-search" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search customers by name, phone, or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '0.45rem 0.85rem 0.45rem 2.35rem',
                  borderRadius: '9999px', border: '1px solid #cbd5e1', fontSize: '0.82rem',
                  background: '#f8fafc'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { k: 'all', label: 'All Contacts' },
                { k: 'vip', label: 'VIP' },
                { k: 'regular', label: 'Regular' },
                { k: 'event', label: 'Bulk / Event' },
              ].map(f => (
                <button
                  key={f.k}
                  onClick={() => setSegment(f.k)}
                  style={{
                    padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700,
                    border: '1px solid', cursor: 'pointer',
                    borderColor: segment === f.k ? '#0284c7' : '#e2e8f0',
                    background: segment === f.k ? '#0284c7' : '#fff',
                    color: segment === f.k ? '#fff' : '#475569',
                    transition: 'all 0.15s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Table */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <div className="spinner-border spinner-border-sm text-primary me-2" />
              Loading customer registry...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <i className="bi bi-people" style={{ fontSize: '2.5rem', color: '#cbd5e1', display: 'block', marginBottom: '0.5rem' }} />
              <h6 style={{ fontWeight: 700, color: '#1e293b' }}>No customers found</h6>
              <p style={{ fontSize: '0.82rem' }}>Add contacts or place POS orders to automatically build your customer database.</p>
              <button className="pk-btn pk-btn--primary" onClick={() => setShowAdd(true)} style={{ marginTop: '0.5rem' }}>
                <i className="bi bi-person-plus" /> Add Customer
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="pk-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Customer</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Contact</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Tier &amp; Segment</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Loyalty Points</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Direct Reach</th>
                    <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const tier = getLoyaltyTier(c.loyalty_points || 0);
                    const seg = SEGMENT_META[c.segment] || SEGMENT_META.regular;
                    const phoneClean = (c.phone || '').replace(/[^\d]/g, '');
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Avatar name={c.name} size={38} />
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{c.name}</div>
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Added {new Date(c.created_at || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                          <div style={{ color: '#0f172a', fontWeight: 600 }}>{c.phone || '—'}</div>
                          {c.email && <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{c.email}</div>}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: seg.bg, color: seg.color, padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                              {seg.label}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: tier.color, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <i className={`bi ${tier.icon}`} /> {tier.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#7c3aed' }}>
                              {c.loyalty_points || 0}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>pts</span>
                          </div>
                          <button
                            onClick={() => setActiveCustomerModal(c)}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#0284c7', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            + Add / Redeem
                          </button>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {phoneClean ? (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <a
                                href={`https://wa.me/${phoneClean}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                  padding: '0.25rem 0.6rem', borderRadius: '6px',
                                  background: '#dcfce7', color: '#16a34a', fontSize: '0.72rem',
                                  fontWeight: 700, textDecoration: 'none'
                                }}
                                title="Chat on WhatsApp"
                              >
                                <i className="bi bi-whatsapp" /> WhatsApp
                              </a>
                              <button
                                onClick={() => handleSendWhatsAppReminder(c)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                  padding: '0.25rem 0.6rem', borderRadius: '6px',
                                  background: '#fef3c7', color: '#b45309', fontSize: '0.72rem',
                                  fontWeight: 700, border: 'none', cursor: 'pointer'
                                }}
                                title="Send payment reminder for outstanding Khata"
                              >
                                <i className="bi bi-receipt" /> Khata Due
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No phone</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => setActiveCustomerModal(c)}
                            style={{
                              padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                              background: '#fff', color: '#0f172a', fontSize: '0.75rem', fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Manage
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
      )}

      {/* ── TAB 2: WHATSAPP MARKETING & FLASH SALES ── */}
      {tab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left: Template Selector */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
            <h6 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="bi bi-chat-heart" style={{ color: '#25d366' }} />
              High-Converting Templates
            </h6>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              Select a revenue-generating campaign template to customize and blast to your customers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {campaigns.map(c => {
                const isSelected = selectedCampaign?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedCampaign(c); setCustomMsg(c.template || ''); }}
                    style={{
                      padding: '0.85rem', borderRadius: '12px',
                      border: `1.5px solid ${isSelected ? '#25d366' : '#e2e8f0'}`,
                      background: isSelected ? 'rgba(37, 211, 102, 0.04)' : '#fff',
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{c.name}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '0.1rem 0.45rem', borderRadius: '999px' }}>
                        WhatsApp
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.template?.slice(0, 70)}...
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Interactive Message Customizer & Live Phone Preview */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h6 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Customize Campaign Message
                </h6>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Target: <strong>{customers.length} registered customers</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(renderFormattedTemplate(customMsg));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={{
                    padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#fff', color: '#334155', fontSize: '0.78rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                  }}
                >
                  <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`} />
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = renderFormattedTemplate(customMsg);
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '8px', border: 'none',
                    background: '#25d366', color: '#fff', fontSize: '0.78rem', fontWeight: 800,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    boxShadow: '0 2px 6px rgba(37,211,102,0.3)'
                  }}
                >
                  <i className="bi bi-whatsapp" /> Launch on WhatsApp
                </button>
              </div>
            </div>

            {/* Message Textarea */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', display: 'block' }}>
                Message Content (Variables: <code>&#123;shop_name&#125;</code>, <code>&#123;store_url&#125;</code>)
              </label>
              <textarea
                rows={6}
                value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                style={{
                  width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1',
                  padding: '0.75rem', fontSize: '0.85rem', fontFamily: 'monospace',
                  background: '#f8fafc', lineHeight: 1.5
                }}
              />
            </div>

            {/* Live WhatsApp Bubble Preview */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.45rem' }}>
                Live WhatsApp Message Preview:
              </div>
              <div style={{
                background: '#e5ddd5', borderRadius: '14px', padding: '1rem',
                border: '1px solid #d1d5db', position: 'relative'
              }}>
                <div style={{
                  background: '#ffffff', borderRadius: '10px 10px 10px 2px',
                  padding: '0.85rem 1rem', maxWidth: '480px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.12)', fontSize: '0.85rem',
                  lineHeight: 1.5, color: '#111827', whiteSpace: 'pre-line'
                }}>
                  {renderFormattedTemplate(customMsg)}
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', textAlign: 'right', marginTop: '0.4rem' }}>
                    10:30 AM <i className="bi bi-check2-all" style={{ color: '#53bdeb' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LOYALTY REWARDS PROGRAM ── */}
      {tab === 'loyalty' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '16px', background: '#ede9fe', color: '#7c3aed', margin: '0 auto 1rem', display: 'grid', placeItems: 'center', fontSize: '1.8rem' }}>
              <i className="bi bi-gift-fill" />
            </div>
            <h5 style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.3rem' }}>Customer Retention &amp; Loyalty Engine</h5>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Encourage recurring store orders and repeat footfall by rewarding customers with points on every transaction.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {[
              { tier: 'Bronze', pts: '0 – 199 pts', perk: 'Standard membership & digital receipts', color: '#64748b', bg: '#f1f5f9', icon: 'bi-shield-check' },
              { tier: 'Silver', pts: '200 – 499 pts', perk: '5% discount on billing & priority support', color: '#0284c7', bg: '#e0f2fe', icon: 'bi-award-fill' },
              { tier: 'Gold', pts: '500 – 999 pts', perk: '10% discount + early access to flash sales', color: '#d97706', bg: '#fef3c7', icon: 'bi-star-fill' },
              { tier: 'Platinum VIP', pts: '1,000+ pts', perk: 'Free delivery on all online orders + 15% discount', color: '#7c3aed', bg: '#ede9fe', icon: 'bi-gem' },
            ].map(t => (
              <div key={t.tier} style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: t.bg, color: t.color, display: 'grid', placeItems: 'center', fontSize: '1.1rem' }}>
                    <i className={`bi ${t.icon}`} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{t.tier}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{t.pts}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                  {t.perk}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL: MANAGE POINTS & KHATA ── */}
      {activeCustomerModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)',
          display: 'grid', placeItems: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Avatar name={activeCustomerModal.name} size={40} />
                <div>
                  <h6 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{activeCustomerModal.name}</h6>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Balance: <strong>{activeCustomerModal.loyalty_points || 0} pts</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCustomerModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                Points to Add or Deduct:
              </label>
              <input
                type="number"
                placeholder="e.g. 50 (or -50 to redeem)"
                value={pointsDelta}
                onChange={e => setPointsDelta(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem 0.85rem', borderRadius: '8px',
                  border: '1px solid #cbd5e1', fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="pk-btn pk-btn--outline"
                onClick={() => setActiveCustomerModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pk-btn pk-btn--primary"
                disabled={savingPoints || !pointsDelta}
                onClick={() => handleAdjustPoints(activeCustomerModal, parseInt(pointsDelta, 10))}
              >
                {savingPoints ? 'Saving...' : 'Apply Points'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD CUSTOMER ── */}
      {showAdd && (
        <AddCustomerDrawer
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchCustomers(); showToast('Customer created successfully'); }}
        />
      )}
    </div>
  );
}

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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)',
      display: 'grid', placeItems: 'center', padding: '1rem'
    }}>
      <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h6 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Add New Customer</h6>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {error && <div style={{ color: '#dc2626', background: '#fef2f2', padding: '0.5rem', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '0.75rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Full Name *</label>
            <input
              type="text" required placeholder="e.g. Ramesh Kumar"
              value={form.name} onChange={e => set('name', e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Phone (WhatsApp enabled)</label>
            <input
              type="tel" placeholder="+91 98765 43210"
              value={form.phone} onChange={e => set('phone', e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Email</label>
            <input
              type="email" placeholder="customer@example.com"
              value={form.email} onChange={e => set('email', e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Customer Segment</label>
            <select
              value={form.segment} onChange={e => set('segment', e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            >
              <option value="regular">Regular Buyer</option>
              <option value="vip">VIP Platinum</option>
              <option value="event">Bulk / Event Client</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="pk-btn pk-btn--outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="pk-btn pk-btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
