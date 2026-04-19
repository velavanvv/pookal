import { Link } from 'react-router-dom';

const OUTER_COUNT = 8;
const MID_COUNT   = 6;
const INNER_COUNT = 5;

function PetalRing({ count, cls }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`afs-arm`}
          style={{ '--a': `${(i / count) * 360}deg` }}
        >
          <div className={`afs-petal ${cls}`} />
        </div>
      ))}
    </>
  );
}

export default function AuthForm({
  title,
  subtitle,
  submitLabel,
  fields,
  values,
  errors,
  onChange,
  onSubmit,
  footer
}) {
  return (
    <div className="auth-screen">
      <div className="auth-stage">

        {/* ── Flower scene ──────────────────────────────────────────────── */}
        <div className="auth-flower-scene" aria-hidden="true">
          <div className="afs-backdrop" />

          <div className="afs-stem" />
          <div className="afs-leaf afs-leaf--l" />
          <div className="afs-leaf afs-leaf--r" />

          <div className="afs-flower">
            {/* outer ring — 8 petals, slow clockwise */}
            <div className="afs-ring afs-ring--outer">
              <PetalRing count={OUTER_COUNT} cls="afs-petal--lg" />
            </div>

            {/* mid ring — 6 petals, counter-clockwise */}
            <div className="afs-ring afs-ring--mid">
              <PetalRing count={MID_COUNT} cls="afs-petal--md" />
            </div>

            {/* inner ring — 5 petals, medium clockwise */}
            <div className="afs-ring afs-ring--inner">
              <PetalRing count={INNER_COUNT} cls="afs-petal--sm" />
            </div>

            {/* stamen */}
            <div className="afs-center" />
          </div>

          {/* drifting petals */}
          <div className="afs-drift afs-drift--1" />
          <div className="afs-drift afs-drift--2" />
          <div className="afs-drift afs-drift--3" />
        </div>

        {/* ── Auth card ─────────────────────────────────────────────────── */}
        <div className="auth-card">
          <div className="auth-card__glow" aria-hidden="true" />
          <div className="auth-card__content">
            <div className="auth-copy mb-4">
              <span className="auth-eyebrow">Pookal access</span>
              <h1 className="auth-title">{title}</h1>
              <p className="auth-subtitle mb-0">{subtitle}</p>
            </div>

            <div className="auth-highlights">
              <div className="auth-highlight">
                <strong>POS + Inventory</strong>
                <span>Counter sales, stock movement, and low-stock visibility in one flow.</span>
              </div>
              <div className="auth-highlight">
                <strong>Delivery + CRM</strong>
                <span>Track orders, repeat customers, and seasonal campaigns with one login.</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="auth-form">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="form-label auth-form__label">{field.label}</label>
                  <input
                    className={`form-control auth-input ${errors[field.name] ? 'is-invalid' : ''}`}
                    name={field.name}
                    type={field.type}
                    value={values[field.name]}
                    onChange={onChange}
                    placeholder={field.placeholder}
                  />
                  {errors[field.name] ? (
                    <div className="invalid-feedback">{errors[field.name]}</div>
                  ) : null}
                </div>
              ))}

              <button className="btn auth-submit" type="submit">
                <span>{submitLabel}</span>
                <i className="bi bi-arrow-up-right-circle" />
              </button>
            </form>

            <div className="mt-4 small auth-footer">{footer}</div>
            <div className="mt-3">
              <Link to="/dashboard" className="auth-backlink">
                Return to workspace
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
