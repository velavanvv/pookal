import { useState, useEffect } from 'react';
import api from '../../services/api';

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
  const [values,  setValues]  = useState({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => setValues(data))
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

  if (loading) return (
    <div className="pk-loading">
      <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
      <span>Loading settings…</span>
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
          <h4 className="pg-title">Platform Settings</h4>
          <p className="pg-sub">Shop profile, tax configuration, and receipt template</p>
        </div>
        <button className="pk-btn pk-btn--rose" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-cloud-arrow-up" />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

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
                    <tr><td>Red Rose Bouquet × 2</td><td className="text-end">Rs. 1,598</td></tr>
                    <tr><td>Jasmine String × 1</td><td className="text-end">Rs. 149</td></tr>
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
          </div>
        </div>
      </form>
    </div>
  );
}
