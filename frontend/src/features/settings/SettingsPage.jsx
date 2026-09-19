import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useI18n } from '../auth/I18nContext';

const FIELDS = [
  { key: 'shop_name',       label: 'Shop Name',              type: 'text',    section: 'Shop Identity'  },
  { key: 'shop_tagline',    label: 'Tagline',                type: 'text',    section: 'Shop Identity'  },
  { key: 'shop_phone',      label: 'Phone',                  type: 'text',    section: 'Shop Identity'  },
  { key: 'shop_email',      label: 'Email',                  type: 'email',   section: 'Shop Identity'  },
  { key: 'shop_address',    label: 'Address',                type: 'textarea',section: 'Shop Identity'  },
  { key: 'gstin',           label: 'GSTIN',                  type: 'text',    section: 'Tax & Billing'  },
  { key: 'tax_rate',        label: 'Default Tax Rate (%)',   type: 'number',  section: 'Tax & Billing'  },
  { key: 'currency',        label: 'Currency Code',          type: 'text',    section: 'Tax & Billing'  },
  { key: 'currency_symbol', label: 'Currency Symbol',        type: 'text',    section: 'Tax & Billing'  },
  { key: 'receipt_footer',  label: 'Receipt Footer',         type: 'textarea',section: 'Receipt'        },
];

const SECTIONS = [...new Set(FIELDS.map(f => f.section))];

const SECTION_META = {
  'Shop Identity': { icon: 'bi-shop',          desc: 'Your shop name, contact, and address' },
  'Tax & Billing': { icon: 'bi-receipt-cutoff', desc: 'GSTIN, tax rates and currency settings' },
  'Receipt':       { icon: 'bi-printer',        desc: 'Customise the footer printed on receipts' },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'general'
  const { t } = useI18n();
  const [values,  setValues]  = useState({});
  const [profile, setProfile] = useState(null);
  const [allTypes, setAllTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      api.get('/settings/profile').catch(() => ({ data: { profile: null, available_types: [] } })),
    ])
      .then(([settingsRes, profileRes]) => {
        setValues(settingsRes.data);
        if (profileRes.data) {
          setProfile(profileRes.data.profile || {
            business_type: 'retail',
            capabilities: ['suppliers'],
            settings: {},
          });
          setAllTypes(profileRes.data.available_types || []);
        }
      })
      .catch(() => showToast('error', 'Could not load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChange = (key, val) => setValues(p => ({ ...p, [key]: val }));

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const { data } = await api.post('/settings', values);
      setValues(data.settings);
      showToast('success', 'Settings saved successfully.');
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/settings/profile', {
        business_type: profile.business_type,
        capabilities: profile.capabilities || [],
        settings: profile.settings || {},
      });
      setProfile(data.profile);
      showToast('success', 'Shop profile & capability modules updated. Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleCapability = (cap) => {
    const caps = profile?.capabilities || [];
    const updated = caps.includes(cap)
      ? caps.filter(c => c !== cap)
      : [...caps, cap];
    setProfile({ ...profile, capabilities: updated });
  };

  if (loading) return (
    <div className="pk-loading">
      <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
      <span>{t('loading')}</span>
    </div>
  );

  return (
    <div>
      {toast && (
        <div className={`pk-toast pk-toast--${toast.type}`}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} />
          {toast.msg}
        </div>
      )}

      <div className="pg-header">
        <div>
          <h4 className="pg-title">{t('settings')} &amp; {t('shopProfile')}</h4>
          <p className="pg-sub">{t('liveOperations')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color, #e5e7eb)', marginBottom: '1.5rem', paddingBottom: '0.25rem' }}>
        <button
          className={`pk-btn ${activeTab === 'profile' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
          onClick={() => setActiveTab('profile')}
        >
          <i className="bi bi-grid-1x2-fill me-1" /> {t('shopProfile')}
        </button>
        <button
          className={`pk-btn ${activeTab === 'general' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
          onClick={() => setActiveTab('general')}
        >
          <i className="bi bi-sliders me-1" /> {t('generalSettings')}
        </button>
      </div>

      {/* ── TAB 1: SHOP PROFILE & CAPABILITY MODULES ── */}
      {activeTab === 'profile' && profile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="pk-card">
            <div className="pk-card__head">
              <div>
                <div className="pk-card__title">
                  <i className="bi bi-shop me-2 text-primary" /> Select Business Vertical
                </div>
                <div className="pk-card__sub">
                  Configures default units, categories, POS workflow, and tax structures automatically.
                </div>
              </div>
            </div>
            <div className="pk-card__body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                {allTypes.map(tp => {
                  const isSelected = profile.business_type === tp.id;
                  const icons = {
                    retail: 'bi-cart3',
                    fresh_perishable: 'bi-droplet-half',
                    restaurant: 'bi-cup-hot',
                    service: 'bi-scissors',
                    hybrid: 'bi-shop',
                  };

                  return (
                    <div
                      key={tp.id}
                      onClick={() => setProfile({ ...profile, business_type: tp.id })}
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${isSelected ? 'var(--pookal-rose)' : '#e5e7eb'}`,
                        background: isSelected ? 'rgba(190, 24, 93, 0.04)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <i className={`bi ${icons[tp.id] || 'bi-shop'}`} style={{ fontSize: '1.5rem', color: isSelected ? 'var(--pookal-rose)' : '#6b7280' }} />
                        {isSelected && <span className="pk-badge pk-badge--rose">Active</span>}
                      </div>
                      <h6 style={{ fontWeight: 700, margin: '0 0 0.25rem' }}>{tp.label}</h6>
                      <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>
                        {tp.description || 'Pre-configured workflow for this vertical.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pk-card">
            <div className="pk-card__head">
              <div>
                <div className="pk-card__title">
                  <i className="bi bi-boxes me-2 text-primary" /> Capability Modules (Add-ons)
                </div>
                <div className="pk-card__sub">
                  Turn on/off specialized workflow capabilities across POS, tables, suppliers, and delivery.
                </div>
              </div>
            </div>
            <div className="pk-card__body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {[
                  { id: 'restaurant', label: 'Restaurant & Dining Tables', desc: 'Table floor plan, KOT kitchen tickets, and modifier groups.', icon: 'bi-cup-hot' },
                  { id: 'suppliers', label: 'Supplier & Farmer Intake', desc: 'Track deliveries, supplier ledger balances, and procurement.', icon: 'bi-truck-flatbed' },
                  { id: 'delivery', label: 'Delivery & Dispatch Board', desc: 'Assign delivery partners, slots, and route status.', icon: 'bi-truck' },
                  { id: 'website', label: 'Online Storefront & Website', desc: 'Customer self-service ordering catalog with slug.', icon: 'bi-globe2' },
                ].map(cap => {
                  const enabled = (profile.capabilities || []).includes(cap.id);
                  return (
                    <div
                      key={cap.id}
                      style={{
                        padding: '1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        background: enabled ? '#f0fdf4' : '#fafafa',
                      }}
                    >
                      <div className="form-check form-switch" style={{ marginTop: '0.2rem' }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`cap-${cap.id}`}
                          checked={enabled}
                          onChange={() => toggleCapability(cap.id)}
                        />
                      </div>
                      <div>
                        <label htmlFor={`cap-${cap.id}`} style={{ fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'block', margin: 0 }}>
                          <i className={`bi ${cap.icon} me-1`} /> {cap.label}
                        </label>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{cap.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pk-card__foot">
              <button
                type="button"
                className="pk-btn pk-btn--primary"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Saving...' : <><i className="bi bi-check-circle me-1" /> Save Shop Profile &amp; Reload</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: GENERAL SETTINGS & RECEIPT ── */}
      {activeTab === 'general' && (
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {SECTIONS.map(section => {
              const meta = SECTION_META[section];
              return (
                <div key={section} className="pk-card">
                  <div className="pk-card__head">
                    <div>
                      <div className="pk-card__title">
                        <i className={`bi ${meta.icon} me-2`} style={{ color: 'var(--pookal-rose)' }} />
                        {section}
                      </div>
                      <div className="pk-card__sub">{meta.desc}</div>
                    </div>
                  </div>
                  <div className="pk-card__body">
                    <div className="pk-form-row" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                      {FIELDS.filter(f => f.section === section).map(field => (
                        <div key={field.key} className={`pk-field ${field.type === 'textarea' ? 'settings-full' : ''}`}>
                          <label>{field.label}</label>
                          {field.type === 'textarea' ? (
                            <textarea
                              className="pk-input pk-textarea"
                              rows={3}
                              value={values[field.key] || ''}
                              onChange={e => handleChange(field.key, e.target.value)}
                            />
                          ) : (
                            <input
                              type={field.type}
                              className="pk-input"
                              value={values[field.key] || ''}
                              onChange={e => handleChange(field.key, e.target.value)}
                              step={field.type === 'number' ? '0.01' : undefined}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Receipt Preview */}
            <div className="pk-card">
              <div className="pk-card__head">
                <div>
                  <div className="pk-card__title"><i className="bi bi-eye me-2" style={{ color: 'var(--pookal-rose)' }} />Receipt Preview</div>
                  <div className="pk-card__sub">Live preview of your printed receipt</div>
                </div>
              </div>
              <div className="pk-card__body" style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="receipt-preview">
                  <div className="receipt-preview__header">
                    <strong>{values.shop_name || 'Shop Name'}</strong>
                    <div className="small text-muted">{values.shop_tagline || ''}</div>
                    <div className="small">{values.shop_address || ''}</div>
                    <div className="small">{values.shop_phone || ''}</div>
                    {values.gstin && <div className="small">GSTIN: {values.gstin}</div>}
                  </div>
                  <div className="receipt-preview__divider">- - - - - - - - - - - -</div>
                  <div className="small text-muted text-center">Order #ORD-1001</div>
                  <table className="w-100 small mt-1">
                    <tbody>
                      <tr><td>Item Sample × 2</td><td className="text-end">Rs. 1,598</td></tr>
                      <tr><td>Item Add-on × 1</td><td className="text-end">Rs. 149</td></tr>
                    </tbody>
                  </table>
                  <div className="receipt-preview__divider">- - - - - - - - - - - -</div>
                  <div className="d-flex justify-content-between small"><span>Subtotal</span><span>Rs. 1,747</span></div>
                  <div className="d-flex justify-content-between small"><span>GST ({values.tax_rate || 5}%)</span><span>Rs. 87</span></div>
                  <div className="d-flex justify-content-between fw-bold"><span>Total</span><span>Rs. 1,834</span></div>
                  <div className="receipt-preview__divider">- - - - - - - - - - - -</div>
                  <div className="small text-center text-muted">{values.receipt_footer || 'Thank you!'}</div>
                </div>
              </div>
              <div className="pk-card__foot">
                <button type="submit" className="pk-btn pk-btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : <><i className="bi bi-cloud-arrow-up me-1" /> Save General Settings</>}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
