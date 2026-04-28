import { useState } from 'react';
import api from '../../services/api';

const FIELDS = [
  { name: 'name',          label: 'Your Name',        type: 'text',  placeholder: 'Rajan Florist',        required: true  },
  { name: 'business_name', label: 'Business Name',    type: 'text',  placeholder: 'Pookal Flowers',       required: true  },
  { name: 'email',         label: 'Email Address',    type: 'email', placeholder: 'rajan@flowers.in',     required: true  },
  { name: 'phone',         label: 'Phone / WhatsApp', type: 'tel',   placeholder: '+91 98765 43210',      required: false },
  { name: 'city',          label: 'City',             type: 'text',  placeholder: 'Chennai',              required: false },
  { name: 'message',       label: 'Anything to share?', type: 'textarea', placeholder: 'We run 2 outlets and want to manage orders and delivery…', required: false },
];

export default function DemoRequestModal({ onClose }) {
  const [form, setForm] = useState({ name: '', business_name: '', email: '', phone: '', city: '', message: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api.post('/demo/request', form);
      setDone(true);
    } catch (err) {
      setErrors(
        Object.values(err?.response?.data?.errors || {}).flat().reduce((acc, msg, i) => {
          const key = Object.keys(err?.response?.data?.errors || {})[i];
          return { ...acc, [key]: msg };
        }, {}) || { general: err?.response?.data?.message || 'Failed to submit.' }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pk-modal-bd" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pk-modal" style={{ maxWidth: 480 }}>
        <div className="pk-modal__head">
          <div>
            <span className="pk-modal__title">Request a Demo</span>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '0.15rem' }}>
              We'll reach out within 24 hours to schedule a personalised walkthrough.
            </div>
          </div>
          <button className="pk-modal__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        {done ? (
          <div className="pk-modal__body" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌸</div>
            <h5 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Request received!</h5>
            <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Our team will contact you at <strong>{form.email}</strong> or on WhatsApp shortly.
            </p>
            <button className="pk-btn pk-btn--rose" onClick={onClose}>
              <i className="bi bi-check-lg" /> Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="pk-modal__body">
              {errors.general && (
                <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.6rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '0.75rem' }}>
                  {errors.general}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {FIELDS.map(f => (
                  <div key={f.name} className="pk-field" style={f.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                    <label>{f.label}{f.required && <span style={{ color: 'var(--pookal-rose)' }}> *</span>}</label>
                    {f.type === 'textarea' ? (
                      <textarea
                        className={`pk-input ${errors[f.name] ? 'is-invalid' : ''}`}
                        value={form[f.name]}
                        onChange={e => set(f.name, e.target.value)}
                        placeholder={f.placeholder}
                        rows={3}
                        style={{ resize: 'vertical' }}
                      />
                    ) : (
                      <input
                        type={f.type}
                        className={`pk-input ${errors[f.name] ? 'is-invalid' : ''}`}
                        value={form[f.name]}
                        onChange={e => set(f.name, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required}
                      />
                    )}
                    {errors[f.name] && <span style={{ fontSize: '0.76rem', color: '#dc2626' }}>{errors[f.name]}</span>}
                  </div>
                ))}
              </div>

              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', fontSize: '0.78rem', color: '#15803d', marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <i className="bi bi-shield-check" />
                No credit card required · Free personalised demo · Setup in 15 minutes
              </div>
            </div>

            <div className="pk-modal__foot">
              <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="pk-btn pk-btn--rose" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-send" />}
                {saving ? 'Sending…' : 'Request Demo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
