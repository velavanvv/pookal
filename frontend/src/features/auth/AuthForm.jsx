const OUTER_COUNT = 8;
const MID_COUNT   = 6;
const INNER_COUNT = 5;

export default function AuthForm({
  title,
  subtitle,
  submitLabel,
  fields,
  values,
  errors,
  onChange,
  onSubmit,
  footer,
  extra = null,
}) {
  return (
    <div className="auth-screen">
      <div className="auth-stage">

        {/* ── Auth card ─────────────────────────────────────────────────── */}
        <div className="auth-card">
          <div className="auth-card__glow" aria-hidden="true" />
          <div className="auth-card__content">
            <div className="auth-copy mb-4">
              <span className="auth-eyebrow">Universal Business Platform (UBP)</span>
              <h1 className="auth-title">{title}</h1>
              <p className="auth-subtitle mb-0">{subtitle}</p>
            </div>

            <div className="auth-highlights">
              <div className="auth-highlight">
                <strong>POS + Billing</strong>
                <span>Counter sales, receipts, and tax-ready invoices for any shop type.</span>
              </div>
              <div className="auth-highlight">
                <strong>Inventory + Reports</strong>
                <span>Track stock, customers, and daily sales from one dashboard.</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="auth-form">
              {extra}
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
          
          </div>
        </div>

      </div>
    </div>
  );
}
