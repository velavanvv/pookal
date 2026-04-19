import { useState, useEffect } from 'react';
import api from '../../services/api';

const FIELDS = [
  { key: 'shop_name',       label: 'Shop Name',        type: 'text',   section: 'Shop Identity'   },
  { key: 'shop_tagline',    label: 'Tagline',           type: 'text',   section: 'Shop Identity'   },
  { key: 'shop_phone',      label: 'Phone',             type: 'text',   section: 'Shop Identity'   },
  { key: 'shop_email',      label: 'Email',             type: 'email',  section: 'Shop Identity'   },
  { key: 'shop_address',    label: 'Address',           type: 'textarea',section: 'Shop Identity'  },
  { key: 'gstin',           label: 'GSTIN',             type: 'text',   section: 'Tax & Billing'   },
  { key: 'tax_rate',        label: 'Default Tax Rate (%)',type: 'number',section: 'Tax & Billing'  },
  { key: 'currency',        label: 'Currency Code',     type: 'text',   section: 'Tax & Billing'   },
  { key: 'currency_symbol', label: 'Currency Symbol',   type: 'text',   section: 'Tax & Billing'   },
  { key: 'receipt_footer',  label: 'Receipt Footer',    type: 'textarea',section: 'Receipt'        },
];

const SECTIONS = [...new Set(FIELDS.map((f) => f.section))];

export default function SettingsPage() {
  const [values,  setValues]  = useState({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => setValues(data))
      .catch(() => setError('Could not load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, val) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post('/settings', values);
      setValues(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" />
      </div>
    );
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0">Platform Settings</h4>
          <small className="text-muted">Configure your shop profile, tax settings, and receipt template.</small>
        </div>
        {saved && (
          <div className="alert alert-success py-2 px-3 mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill" /> Settings saved!
          </div>
        )}
        {error && (
          <div className="alert alert-danger py-2 px-3 mb-0">{error}</div>
        )}
      </div>

      <form onSubmit={handleSave}>
        {SECTIONS.map((section) => (
          <div key={section} className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0 fw-semibold">
                <i className={`bi me-2 ${
                  section === 'Shop Identity' ? 'bi-shop' :
                  section === 'Tax & Billing' ? 'bi-receipt-cutoff' :
                  'bi-printer'
                }`} />
                {section}
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {FIELDS.filter((f) => f.section === section).map((field) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'col-12' : 'col-md-6'}>
                    <label className="form-label fw-medium small">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        className="form-control"
                        rows={3}
                        value={values[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                      />
                    ) : (
                      <input
                        type={field.type}
                        className="form-control"
                        value={values[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        step={field.type === 'number' ? '0.01' : undefined}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Receipt Preview */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom">
            <h6 className="mb-0 fw-semibold">
              <i className="bi bi-eye me-2" />Receipt Preview
            </h6>
          </div>
          <div className="card-body d-flex justify-content-center">
            <div className="receipt-preview">
              <div className="receipt-preview__header">
                <strong>{values.shop_name || 'Shop Name'}</strong>
                <div className="small text-muted">{values.shop_tagline || ''}</div>
                <div className="small">{values.shop_address || ''}</div>
                <div className="small">{values.shop_phone || ''}</div>
                {values.gstin && <div className="small">GSTIN: {values.gstin}</div>}
              </div>
              <div className="receipt-preview__divider">- - - - - - - - - - - - -</div>
              <div className="small text-muted text-center">Order #ORD-1001</div>
              <table className="w-100 small mt-1">
                <tbody>
                  <tr><td>Red Rose Bouquet × 2</td><td className="text-end">Rs. 1,598</td></tr>
                  <tr><td>Jasmine String × 1</td><td className="text-end">Rs. 149</td></tr>
                </tbody>
              </table>
              <div className="receipt-preview__divider">- - - - - - - - - - - - -</div>
              <div className="d-flex justify-content-between small"><span>Subtotal</span><span>Rs. 1,747</span></div>
              <div className="d-flex justify-content-between small"><span>GST ({values.tax_rate || 5}%)</span><span>Rs. 87</span></div>
              <div className="d-flex justify-content-between fw-bold"><span>Total</span><span>Rs. 1,834</span></div>
              <div className="receipt-preview__divider">- - - - - - - - - - - - -</div>
              <div className="small text-center text-muted">{values.receipt_footer || 'Thank you!'}</div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 pb-4">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => window.location.reload()}
          >
            Reset
          </button>
          <button type="submit" className="btn btn-dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            Save Settings
          </button>
        </div>
      </form>
    </>
  );
}
