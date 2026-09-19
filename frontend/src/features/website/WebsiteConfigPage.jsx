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
  website_delivery_areas: '',
  website_location_prompt: '',
  website_share_url: '',
};

const THEMES = [
  { v: 'retail-blue',     label: 'Retail & Supermarket', primary: '#0284c7', secondary: '#0f172a', preview: ['#0284c7','#e0f2fe','#0f172a'] },
  { v: 'modern-slate',    label: 'Modern Minimalist',    primary: '#334155', secondary: '#6366f1', preview: ['#334155','#f1f5f9','#6366f1'] },
  { v: 'restaurant-amber', label: 'Restaurant & Dining',  primary: '#ea580c', secondary: '#78350f', preview: ['#ea580c','#ffedd5','#78350f'] },
  { v: 'emerald-fresh',   label: 'Grocery & Organic',    primary: '#059669', secondary: '#064e3b', preview: ['#059669','#dcfce7','#064e3b'] },
  { v: 'rose-luxury',     label: 'Fresh & Floral',       primary: '#be185d', secondary: '#15803d', preview: ['#be185d','#fce7f3','#15803d'] },
];

export default function WebsiteConfigPage() {
  const [form, setForm]         = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null); // { type: 'success'|'error', msg }
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied]     = useState(false);
  const [activeSection, setActiveSection] = useState('identity');

  useEffect(() => {
    api.get('/website-config')
      .then(({ data }) => setForm(f => ({ ...f, ...data })))
      .catch(() => showToast('error', 'Could not load website configuration.'))
      .finally(() => setLoading(false));
  }, []);

  const shareUrl = useMemo(
    () => form.website_share_url || `${window.location.origin}/store/${form.website_slug || 'your-shop'}`,
    [form.website_share_url, form.website_slug]
  );

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 240, margin: 2,
      color: { dark: form.website_primary_color || '#7d294a', light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [form.website_primary_color, shareUrl]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const { data } = await api.post('/website-config', { ...form, website_enabled: Boolean(form.website_enabled) });
      setForm(f => ({ ...f, ...data.config }));
      showToast('success', 'Website configuration saved.');
    } catch (err) {
      const errors = err.response?.data?.errors;
      showToast('error', errors ? Object.values(errors).flat().join(' ') : 'Could not save configuration.');
    } finally { setSaving(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl; a.download = `${form.website_slug || 'store'}-qr.png`; a.click();
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: '#888' }}>
      <div className="spinner-border" style={{ color: 'var(--pookal-rose)' }} />
      <span>Loading configuration…</span>
    </div>
  );

  const sections = [
    { key: 'identity',  label: 'Identity & Theme', icon: 'bi-shop' },
    { key: 'branding',  label: 'Branding',         icon: 'bi-palette' },
    { key: 'content',   label: 'Content',          icon: 'bi-text-left' },
    { key: 'commerce',  label: 'Orders & Money',    icon: 'bi-cash-coin' },
    { key: 'contact',   label: 'Contact & Delivery', icon: 'bi-geo-alt' },
  ];

  return (
    <div className="wc-page">
      {/* Toast */}
      {toast && (
        <div className={`wc-toast wc-toast--${toast.type}`}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} />
          {toast.msg}
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="wc-header">
        <div>
          <h4 className="wc-header__title">Website Config</h4>
          <p className="wc-header__sub">Set up and customise your public storefront</p>
        </div>
        <button className="wc-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-cloud-arrow-up" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* ── Enable toggle banner ─────────────────────────────────────── */}
      <div className={`wc-enable-banner ${form.website_enabled ? 'wc-enable-banner--on' : ''}`}>
        <div className="wc-enable-banner__left">
          <div className={`wc-status-dot ${form.website_enabled ? 'wc-status-dot--live' : ''}`} />
          <div>
            <div className="wc-enable-banner__title">
              {form.website_enabled ? 'Your storefront is live' : 'Storefront is disabled'}
            </div>
            <div className="wc-enable-banner__sub">
              {form.website_enabled
                ? 'Customers can browse and order from your public store URL.'
                : 'Enable to publish your public store page.'}
            </div>
          </div>
        </div>
        <label className="wc-toggle">
          <input
            type="checkbox"
            checked={Boolean(form.website_enabled)}
            onChange={e => setField('website_enabled', e.target.checked)}
          />
          <span className="wc-toggle__track">
            <span className="wc-toggle__thumb" />
          </span>
        </label>
      </div>

      <div className="wc-layout">
        {/* ── Left: config form ──────────────────────────────────────── */}
        <div className="wc-form-col">
          {/* Section nav */}
          <div className="wc-section-nav">
            {sections.map(s => (
              <button
                key={s.key}
                className={`wc-section-btn ${activeSection === s.key ? 'wc-section-btn--active' : ''}`}
                onClick={() => setActiveSection(s.key)}
              >
                <i className={`bi ${s.icon}`} />
                {s.label}
              </button>
            ))}
          </div>

          {/* ── Identity ── */}
          {activeSection === 'identity' && (
            <div className="wc-card">
              <div className="wc-card__head">
                <i className="bi bi-shop wc-card__icon" />
                <div>
                  <div className="wc-card__title">Store Identity</div>
                  <div className="wc-card__sub">Your storefront URL slug and theme preset</div>
                </div>
              </div>
              <div className="wc-card__body">
                <div className="wc-field">
                  <label>Storefront slug</label>
                  <div className="wc-input-with-prefix">
                    <span className="wc-input-prefix">/store/</span>
                    <input
                      className="wc-input"
                      value={form.website_slug || ''}
                      onChange={e => setField('website_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="your-shop-name"
                    />
                  </div>
                  <span className="wc-field-hint">Only lowercase letters, numbers and hyphens</span>
                </div>

                <div className="wc-field">
                  <label>Theme</label>
                  <div className="wc-theme-grid">
                    {THEMES.map(t => (
                      <button
                        key={t.v} type="button"
                        className={`wc-theme-card ${form.website_theme === t.v ? 'wc-theme-card--active' : ''}`}
                        onClick={() => {
                          setField('website_theme', t.v);
                          setField('website_primary_color', t.primary);
                          setField('website_secondary_color', t.secondary);
                        }}
                      >
                        <div className="wc-theme-swatches">
                          {t.preview.map((c, i) => <span key={i} style={{ background: c }} />)}
                        </div>
                        <span>{t.label}</span>
                        {form.website_theme === t.v && <i className="bi bi-check-circle-fill wc-theme-check" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Branding ── */}
          {activeSection === 'branding' && (
            <div className="wc-card">
              <div className="wc-card__head">
                <i className="bi bi-palette wc-card__icon" />
                <div>
                  <div className="wc-card__title">Brand Colors</div>
                  <div className="wc-card__sub">Custom colors override the theme preset</div>
                </div>
              </div>
              <div className="wc-card__body">
                <div className="wc-color-row">
                  {[
                    { key: 'website_primary_color',   label: 'Primary color'   },
                    { key: 'website_secondary_color',  label: 'Secondary color' },
                  ].map(({ key, label }) => (
                    <div key={key} className="wc-field">
                      <label>{label}</label>
                      <div className="wc-color-input">
                        <input
                          type="color"
                          value={form[key] || '#000000'}
                          onChange={e => setField(key, e.target.value)}
                          className="wc-color-swatch"
                        />
                        <input
                          className="wc-input wc-input--mono"
                          value={form[key] || ''}
                          onChange={e => setField(key, e.target.value)}
                          placeholder="#7d294a"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="wc-color-preview" style={{ background: `linear-gradient(135deg, ${form.website_primary_color}, ${form.website_secondary_color})` }}>
                  <span>Live color preview</span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem' }}>Button</span>
                </div>

                <div className="wc-divider" />

                <div className="wc-field-row">
                  <div className="wc-field">
                    <label>Setup fee (Rs.)</label>
                    <input type="number" min="0" className="wc-input" value={form.website_setup_fee || ''} onChange={e => setField('website_setup_fee', e.target.value)} />
                  </div>
                  <div className="wc-field">
                    <label>Monthly charge (Rs.)</label>
                    <input type="number" min="0" className="wc-input" value={form.website_subscription_amount || ''} onChange={e => setField('website_subscription_amount', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Content ── */}
          {activeSection === 'content' && (
            <div className="wc-card">
              <div className="wc-card__head">
                <i className="bi bi-text-left wc-card__icon" />
                <div>
                  <div className="wc-card__title">Store Content</div>
                  <div className="wc-card__sub">Hero banner and store description text</div>
                </div>
              </div>
              <div className="wc-card__body">
                <div className="wc-field">
                  <label>Hero title</label>
                  <input className="wc-input" value={form.website_banner_title || ''} onChange={e => setField('website_banner_title', e.target.value)} placeholder="e.g. Shop online from our store" />
                  <span className="wc-field-hint">{(form.website_banner_title || '').length} / 120 characters</span>
                </div>
                <div className="wc-field">
                  <label>Hero subtitle</label>
                  <textarea className="wc-input wc-textarea" rows={2} value={form.website_banner_subtitle || ''} onChange={e => setField('website_banner_subtitle', e.target.value)} placeholder="A short tagline shown below the title" />
                </div>
                <div className="wc-field">
                  <label>Store introduction</label>
                  <textarea className="wc-input wc-textarea" rows={4} value={form.website_intro || ''} onChange={e => setField('website_intro', e.target.value)} placeholder="Tell your customers about your shop, what makes you special…" />
                </div>
              </div>
            </div>
          )}

          {/* ── Commerce & Monetization ── */}
          {activeSection === 'commerce' && (
            <div className="wc-card">
              <div className="wc-card__head">
                <i className="bi bi-cash-coin wc-card__icon" />
                <div>
                  <div className="wc-card__title">Ordering &amp; Revenue Settings</div>
                  <div className="wc-card__sub">Direct WhatsApp orders, UPI payments, and delivery charges</div>
                </div>
              </div>
              <div className="wc-card__body">
                <div className="wc-field">
                  <label>WhatsApp Orders Phone Number</label>
                  <div className="wc-input-with-icon">
                    <i className="bi bi-whatsapp text-success" />
                    <input
                      className="wc-input"
                      value={form.website_whatsapp_phone || ''}
                      onChange={e => setField('website_whatsapp_phone', e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <span className="wc-field-hint">Customers can send structured order summaries directly to this WhatsApp number</span>
                </div>

                <div className="wc-field">
                  <label>Shop UPI ID (for instant QR code payments)</label>
                  <div className="wc-input-with-icon">
                    <i className="bi bi-qr-code" />
                    <input
                      className="wc-input"
                      value={form.website_upi_id || ''}
                      onChange={e => setField('website_upi_id', e.target.value)}
                      placeholder="merchant@okhdfcbank"
                    />
                  </div>
                  <span className="wc-field-hint">Generates automatic UPI payment QR codes on storefront checkout</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="wc-field">
                    <label>Free Delivery Threshold (Rs.)</label>
                    <input
                      type="number"
                      className="wc-input"
                      value={form.website_free_delivery_threshold || '499'}
                      onChange={e => setField('website_free_delivery_threshold', e.target.value)}
                      placeholder="499"
                    />
                    <span className="wc-field-hint">Orders above this amount get free delivery</span>
                  </div>

                  <div className="wc-field">
                    <label>Standard Delivery Fee (Rs.)</label>
                    <input
                      type="number"
                      className="wc-input"
                      value={form.website_delivery_fee || '40'}
                      onChange={e => setField('website_delivery_fee', e.target.value)}
                      placeholder="40"
                    />
                    <span className="wc-field-hint">Applied to orders below threshold</span>
                  </div>
                </div>

                <div className="wc-field">
                  <label>Storefront Promo Announcement Banner</label>
                  <input
                    className="wc-input"
                    value={form.website_promo_banner || ''}
                    onChange={e => setField('website_promo_banner', e.target.value)}
                    placeholder="🎉 Flat 10% OFF on all orders this weekend! Use code SAVE10"
                  />
                  <span className="wc-field-hint">Displayed prominently at the top of your public online storefront</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Contact ── */}
          {activeSection === 'contact' && (
            <div className="wc-card">
              <div className="wc-card__head">
                <i className="bi bi-telephone wc-card__icon" />
                <div>
                  <div className="wc-card__title">Contact Details</div>
                  <div className="wc-card__sub">Shown on the storefront for customer enquiries</div>
                </div>
              </div>
              <div className="wc-card__body">
                <div className="wc-field">
                  <label>Contact phone</label>
                  <div className="wc-input-with-icon">
                    <i className="bi bi-telephone" />
                    <input className="wc-input" value={form.website_contact_phone || ''} onChange={e => setField('website_contact_phone', e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="wc-field">
                  <label>Contact email</label>
                  <div className="wc-input-with-icon">
                    <i className="bi bi-envelope" />
                    <input type="email" className="wc-input" value={form.website_contact_email || ''} onChange={e => setField('website_contact_email', e.target.value)} placeholder="hello@yourshop.com" />
                  </div>
                </div>
                <div className="wc-field">
                  <label>Delivery areas</label>
                  <textarea
                    className="wc-input wc-textarea"
                    rows={3}
                    value={form.website_delivery_areas || ''}
                    onChange={e => setField('website_delivery_areas', e.target.value)}
                    placeholder="Anna Nagar, T Nagar, Velachery, Adyar"
                  />
                  <span className="wc-field-hint">Use commas to separate the areas your shop can deliver to.</span>
                </div>
                <div className="wc-field">
                  <label>Location prompt</label>
                  <input
                    className="wc-input"
                    value={form.website_location_prompt || ''}
                    onChange={e => setField('website_location_prompt', e.target.value)}
                    placeholder="Enter your area to confirm delivery coverage."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: share panel ────────────────────────────────────── */}
        <aside className="wc-share-col">
          <div className="wc-share-card">
            <div className="wc-share-card__head">
              <i className="bi bi-qr-code" style={{ fontSize: '1.1rem', color: 'var(--pookal-rose)' }} />
              <div className="wc-share-card__title">Share storefront</div>
            </div>

            <div className="wc-qr-wrapper">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code" className="wc-qr-img" />
              ) : (
                <div className="wc-qr-placeholder"><div className="spinner-border spinner-border-sm" /></div>
              )}
            </div>

            <div className="wc-url-row">
              <div className="wc-url-display">
                <i className="bi bi-link-45deg" />
                <span>{shareUrl}</span>
              </div>
              <button className="wc-copy-btn" onClick={copy}>
                {copied ? <><i className="bi bi-check-lg" /> Copied!</> : <><i className="bi bi-copy" /> Copy</>}
              </button>
            </div>

            <div className="wc-share-actions">
              <a href={shareUrl} target="_blank" rel="noreferrer" className="wc-action-btn">
                <i className="bi bi-box-arrow-up-right" /> Open store
              </a>
              {qrDataUrl && (
                <button className="wc-action-btn" onClick={downloadQr}>
                  <i className="bi bi-download" /> Download QR
                </button>
              )}
            </div>
          </div>

          <div className="wc-howto-card">
            <div className="wc-howto-title">How it works</div>
            {[
              { n: 1, text: 'Enable the storefront and choose a slug.' },
              { n: 2, text: 'Customise theme, colors and content.' },
              { n: 3, text: 'Share the URL or QR with your customers.' },
              { n: 4, text: 'Orders placed online appear in your CRM.' },
            ].map(step => (
              <div key={step.n} className="wc-step">
                <span className="wc-step__num">{step.n}</span>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
