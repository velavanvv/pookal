import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import api from '../../services/api';

const DEFAULTS = {
  website_enabled: false,
  website_slug: '',
  website_theme: 'rose-luxury',
  website_banner_title: '',
  website_banner_subtitle: '',
  website_intro: '',
  website_primary_color: '#7d294a',
  website_secondary_color: '#25543a',
  website_setup_fee: '2500',
  website_subscription_amount: '999',
  website_contact_phone: '',
  website_contact_email: '',
  website_share_url: '',
};

export default function WebsiteConfigPage() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    api.get('/website-config')
      .then(({ data }) => setForm((current) => ({ ...current, ...data })))
      .catch(() => setError('Could not load website configuration.'))
      .finally(() => setLoading(false));
  }, []);

  const shareUrl = useMemo(
    () => form.website_share_url || `${window.location.origin}/store/${form.website_slug || 'your-shop'}`,
    [form.website_share_url, form.website_slug]
  );

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: form.website_primary_color || '#7d294a',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [form.website_primary_color, shareUrl]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const { data } = await api.post('/website-config', {
        ...form,
        website_enabled: Boolean(form.website_enabled),
      });
      setForm((current) => ({ ...current, ...data.config }));
      setMessage('Website configuration saved successfully.');
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors ? Object.values(errors).flat().join(' ') : 'Could not save website configuration.');
    } finally {
      setSaving(false);
    }
  };

  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setMessage('Storefront link copied.');
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-success" /></div>;
  }

  return (
    <div className="row g-4">
      <div className="col-xl-8">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
              <div>
                <h4 className="mb-1">Website Config</h4>
                <p className="text-muted mb-0">
                  Enable a public flower website that syncs your CRM products, inventory, and pricing.
                </p>
              </div>
              <div className={`badge text-bg-${form.website_enabled ? 'success' : 'secondary'} fs-6`}>
                {form.website_enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            {message ? <div className="alert alert-success py-2">{message}</div> : null}
            {error ? <div className="alert alert-danger py-2">{error}</div> : null}

            <form onSubmit={handleSave} className="d-grid gap-4">
              <div className="website-config-toggle">
                <div>
                  <strong>Enable customer storefront</strong>
                  <div className="text-muted small">Show a public URL and QR page your florist can share with their buyers.</div>
                </div>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input website-switch"
                    type="checkbox"
                    checked={Boolean(form.website_enabled)}
                    onChange={(e) => setField('website_enabled', e.target.checked)}
                  />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Storefront slug</label>
                  <input
                    className="form-control"
                    value={form.website_slug || ''}
                    onChange={(e) => setField('website_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Theme preset</label>
                  <select className="form-select" value={form.website_theme || 'rose-luxury'} onChange={(e) => setField('website_theme', e.target.value)}>
                    <option value="rose-luxury">Rose Luxury</option>
                    <option value="gold-garden">Gold Garden</option>
                    <option value="green-botanical">Green Botanical</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Setup fee</label>
                  <input type="number" min="0" className="form-control" value={form.website_setup_fee || ''} onChange={(e) => setField('website_setup_fee', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Monthly website charge</label>
                  <input type="number" min="0" className="form-control" value={form.website_subscription_amount || ''} onChange={(e) => setField('website_subscription_amount', e.target.value)} />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Hero title</label>
                  <input className="form-control" value={form.website_banner_title || ''} onChange={(e) => setField('website_banner_title', e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Hero subtitle</label>
                  <textarea className="form-control" rows={2} value={form.website_banner_subtitle || ''} onChange={(e) => setField('website_banner_subtitle', e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Store intro</label>
                  <textarea className="form-control" rows={3} value={form.website_intro || ''} onChange={(e) => setField('website_intro', e.target.value)} />
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Primary color</label>
                  <input type="color" className="form-control form-control-color website-color-input" value={form.website_primary_color || '#7d294a'} onChange={(e) => setField('website_primary_color', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Secondary color</label>
                  <input type="color" className="form-control form-control-color website-color-input" value={form.website_secondary_color || '#25543a'} onChange={(e) => setField('website_secondary_color', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Contact phone</label>
                  <input className="form-control" value={form.website_contact_phone || ''} onChange={(e) => setField('website_contact_phone', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Contact email</label>
                  <input className="form-control" value={form.website_contact_email || ''} onChange={(e) => setField('website_contact_email', e.target.value)} />
                </div>
              </div>

              <div className="d-flex justify-content-end">
                <button className="btn btn-dark" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  Save Website Config
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="col-xl-4">
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h5 className="mb-3">Share storefront</h5>
            <div className="website-share-code mb-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Storefront QR code" className="img-fluid rounded-4" />
              ) : (
                <div className="website-share-code__fallback">
                  <div className="spinner-border spinner-border-sm text-success" />
                </div>
              )}
            </div>
            <label className="form-label small fw-semibold">Customer-facing URL</label>
            <div className="input-group mb-3">
              <input className="form-control" value={shareUrl} readOnly />
              <button className="btn btn-outline-secondary" type="button" onClick={copyShareUrl}>Copy</button>
            </div>
            <a href={shareUrl} target="_blank" rel="noreferrer" className="btn btn-outline-dark w-100">Open storefront</a>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h6 className="text-uppercase small text-muted mb-3">How it works</h6>
            <div className="website-steps">
              <div className="website-step"><span>1</span><p className="mb-0">Enable the storefront and save the slug.</p></div>
              <div className="website-step"><span>2</span><p className="mb-0">Share the URL or QR code with your customers.</p></div>
              <div className="website-step"><span>3</span><p className="mb-0">Customers browse live products pulled from your Pookal inventory.</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
