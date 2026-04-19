import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

const TIME_SLOTS = [
  '9:00 AM – 11:00 AM',
  '11:00 AM – 1:00 PM',
  '1:00 PM – 3:00 PM',
  '3:00 PM – 5:00 PM',
  '5:00 PM – 7:00 PM',
  '7:00 PM – 9:00 PM',
  'Midnight (11 PM – 12 AM)',
];

const TODAY = new Date().toISOString().slice(0, 10);

export default function StorefrontPage() {
  const { slug } = useParams();
  const [store, setStore]       = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // cart
  const [cart, setCart]               = useState([]);
  const [showCart, setShowCart]       = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // filter
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    api.get(`/storefront/${slug}`)
      .then(({ data }) => {
        setStore(data.store);
        setProducts(data.products);
      })
      .catch(() => setError('This storefront is unavailable right now.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const categories = useMemo(
    () => ['All', ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products],
  );

  const filtered = useMemo(
    () => activeCategory === 'All' ? products : products.filter((p) => p.category === activeCategory),
    [products, activeCategory],
  );

  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + i.qty * i.price, 0),
    [cart],
  );

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, image_url: product.image_url, qty: 1, stock: product.stock }];
    });
  }

  function updateCartQty(product_id, qty) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product_id !== product_id));
    } else {
      setCart((prev) => prev.map((i) => i.product_id === product_id ? { ...i, qty: Math.min(qty, i.stock) } : i));
    }
  }

  if (loading) {
    return (
      <div className="storefront-loading">
        <div className="spinner-border text-success" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-muted">Loading storefront…</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="container py-5 text-center">
        <i className="bi bi-flower1 display-1 text-muted" />
        <h4 className="mt-3">Storefront Unavailable</h4>
        <p className="text-muted">{error || 'This store link is no longer active.'}</p>
      </div>
    );
  }

  return (
    <div className="sf-page" style={{ '--sf-primary': store.primary_color, '--sf-secondary': store.secondary_color }}>

      {/* ── Sticky top bar ───────────────────────────────────────────────── */}
      <nav className="sf-topbar">
        <div className="sf-topbar__brand">
          <i className="bi bi-flower3 me-2" />
          <span>{store.name}</span>
        </div>
        <button className="sf-cart-btn" onClick={() => setShowCart(true)}>
          <i className="bi bi-bag" />
          {cartCount > 0 && <span className="sf-cart-badge">{cartCount}</span>}
          <span className="ms-2 d-none d-sm-inline">Cart</span>
        </button>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="sf-hero">
        <div className="sf-hero__inner container">
          <div className="sf-hero__chips mb-3">
            <span><i className="bi bi-clock me-1" />Same-day delivery available</span>
            <span><i className="bi bi-patch-check me-1" />Live inventory</span>
            <span><i className="bi bi-gift me-1" />Gift message included</span>
          </div>
          <h1 className="sf-hero__title">{store.banner_title}</h1>
          <p className="sf-hero__sub">{store.banner_subtitle}</p>
          <div className="sf-hero__contact">
            {store.phone && <a href={`tel:${store.phone}`}><i className="bi bi-telephone" /> {store.phone}</a>}
            {store.email && <a href={`mailto:${store.email}`}><i className="bi bi-envelope" /> {store.email}</a>}
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="container sf-main">

        {/* Category tabs */}
        <div className="sf-cat-row">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`sf-cat-pill ${activeCategory === cat ? 'sf-cat-pill--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Store intro */}
        {store.intro && (
          <div className="sf-intro mb-4">{store.intro}</div>
        )}

        {/* Product grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-flower1 display-4 d-block mb-2" />
            No products in this category yet.
          </div>
        ) : (
          <div className="sf-grid">
            {filtered.map((product) => {
              const inCart   = cart.find((i) => i.product_id === product.id);
              const maxed    = inCart && inCart.qty >= product.stock;
              const outOfStock = product.stock <= 0;

              return (
                <article key={product.id} className={`sf-card ${outOfStock ? 'sf-card--oos' : ''}`}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="sf-card__img" />
                  ) : (
                    <div className="sf-card__placeholder"><i className="bi bi-flower1" /></div>
                  )}

                  <div className="sf-card__body">
                    <div className="sf-card__meta">
                      <span className="sf-card__cat">{product.category}</span>
                      {outOfStock ? (
                        <span className="badge text-bg-secondary">Out of stock</span>
                      ) : product.stock <= 5 ? (
                        <span className="badge text-bg-warning text-dark">Only {product.stock} left</span>
                      ) : (
                        <span className="sf-delivery-badge"><i className="bi bi-lightning-charge-fill me-1" />Same Day</span>
                      )}
                    </div>

                    <h3 className="sf-card__name">{product.name}</h3>
                    <div className="sf-card__price">Rs. {Number(product.price).toLocaleString()}</div>

                    {outOfStock ? (
                      <button className="sf-card__btn" disabled>Unavailable</button>
                    ) : inCart ? (
                      <div className="sf-card__qty-row">
                        <button className="sf-qty-btn" onClick={() => updateCartQty(product.id, inCart.qty - 1)}>
                          <i className="bi bi-dash" />
                        </button>
                        <span className="sf-qty-val">{inCart.qty}</span>
                        <button className="sf-qty-btn" onClick={() => addToCart(product)} disabled={maxed}>
                          <i className="bi bi-plus" />
                        </button>
                      </div>
                    ) : (
                      <button className="sf-card__btn" onClick={() => { addToCart(product); }}>
                        <i className="bi bi-bag-plus me-1" />Add to cart
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Sticky checkout bar (when cart has items) ────────────────────── */}
      {cartCount > 0 && !showCart && !showCheckout && (
        <div className="sf-checkout-bar">
          <span>{cartCount} item{cartCount > 1 ? 's' : ''} · Rs. {cartTotal.toLocaleString()}</span>
          <button className="sf-checkout-bar__btn" onClick={() => setShowCart(true)}>
            View Cart <i className="bi bi-arrow-right ms-1" />
          </button>
        </div>
      )}

      {/* ── Cart drawer ──────────────────────────────────────────────────── */}
      {showCart && (
        <CartDrawer
          cart={cart}
          cartTotal={cartTotal}
          onUpdateQty={updateCartQty}
          onClose={() => setShowCart(false)}
          onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
        />
      )}

      {/* ── Checkout modal ───────────────────────────────────────────────── */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          cartTotal={cartTotal}
          slug={slug}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setCart([]);
            setShowCheckout(false);
          }}
        />
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="sf-footer">
        <div className="container text-center">
          <p className="mb-1">{store.name}</p>
          <p className="small text-muted mb-0">Powered by <strong>Pookal</strong> · Live inventory storefront</p>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cart Drawer
// ─────────────────────────────────────────────────────────────────────────────
function CartDrawer({ cart, cartTotal, onUpdateQty, onClose, onCheckout }) {
  return (
    <>
      <div className="sf-overlay" onClick={onClose} />
      <aside className="sf-drawer">
        <div className="sf-drawer__header">
          <h5 className="mb-0"><i className="bi bi-bag me-2" />Your Cart</h5>
          <button className="btn-close" onClick={onClose} />
        </div>
        <div className="sf-drawer__body">
          {cart.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-bag display-4 d-block mb-2" />
              Your cart is empty
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className="sf-cart-item">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="sf-cart-item__img" />
                ) : (
                  <div className="sf-cart-item__placeholder"><i className="bi bi-flower1" /></div>
                )}
                <div className="sf-cart-item__info">
                  <div className="fw-semibold">{item.name}</div>
                  <div className="text-muted small">Rs. {Number(item.price).toLocaleString()} each</div>
                </div>
                <div className="sf-cart-item__qty">
                  <button className="sf-qty-btn sm" onClick={() => onUpdateQty(item.product_id, item.qty - 1)}>
                    <i className="bi bi-dash" />
                  </button>
                  <span>{item.qty}</span>
                  <button className="sf-qty-btn sm" onClick={() => onUpdateQty(item.product_id, item.qty + 1)} disabled={item.qty >= item.stock}>
                    <i className="bi bi-plus" />
                  </button>
                </div>
                <div className="sf-cart-item__total">Rs. {(item.qty * item.price).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
        <div className="sf-drawer__footer">
          <div className="d-flex justify-content-between mb-3">
            <span className="fw-semibold">Subtotal</span>
            <span className="fw-bold fs-5">Rs. {cartTotal.toLocaleString()}</span>
          </div>
          <button
            className="btn btn-dark w-100"
            disabled={cart.length === 0}
            onClick={onCheckout}
          >
            Proceed to Checkout <i className="bi bi-arrow-right ms-1" />
          </button>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkout Modal
// ─────────────────────────────────────────────────────────────────────────────
function CheckoutModal({ cart, cartTotal, slug, onClose, onSuccess }) {
  const [form, setForm] = useState({
    recipient_name:     '',
    recipient_phone:    '',
    recipient_address:  '',
    delivery_date:      TODAY,
    delivery_time_slot: TIME_SLOTS[0],
    gift_message:       '',
  });
  const [step, setStep]       = useState('form'); // form | success
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setApiError('');
    setErrors({});

    try {
      const payload = {
        ...form,
        items: cart.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      };
      await api.post(`/storefront/${slug}/order`, payload);
      setStep('success');
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors) {
        setErrors(serverErrors);
        const stockErrs = serverErrors.stock;
        if (stockErrs) setApiError(stockErrs.join(', '));
      } else {
        setApiError(err?.response?.data?.message || 'Could not place order. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sf-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sf-modal">
        <div className="sf-modal__header">
          <h5 className="mb-0">
            {step === 'success' ? <><i className="bi bi-check-circle-fill text-success me-2" />Order Placed!</> : 'Complete Your Order'}
          </h5>
          <button className="btn-close" onClick={step === 'success' ? onSuccess : onClose} />
        </div>

        {step === 'success' ? (
          <div className="sf-modal__body text-center py-4">
            <i className="bi bi-flower3 display-2 text-success d-block mb-3" />
            <h4>Thank you!</h4>
            <p className="text-muted">Your order has been received. The florist will confirm your delivery shortly.</p>
            <button className="btn btn-dark mt-2" onClick={onSuccess}>Continue Shopping</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="sf-modal__body">
              {apiError && <div className="alert alert-danger py-2 small">{apiError}</div>}

              {/* Order summary */}
              <div className="sf-checkout-summary mb-4">
                <div className="fw-semibold small text-uppercase text-muted mb-2">Order Summary</div>
                {cart.map((item) => (
                  <div key={item.product_id} className="d-flex justify-content-between small py-1 border-bottom">
                    <span>{item.name} × {item.qty}</span>
                    <span>Rs. {(item.qty * item.price).toLocaleString()}</span>
                  </div>
                ))}
                <div className="d-flex justify-content-between fw-bold mt-2">
                  <span>Total</span>
                  <span>Rs. {cartTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Recipient */}
              <div className="fw-semibold small text-uppercase text-muted mb-2">Delivery Details</div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Recipient Name *</label>
                  <input
                    className={`form-control ${errors.recipient_name ? 'is-invalid' : ''}`}
                    value={form.recipient_name}
                    onChange={(e) => set('recipient_name', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone *</label>
                  <input
                    className={`form-control ${errors.recipient_phone ? 'is-invalid' : ''}`}
                    value={form.recipient_phone}
                    onChange={(e) => set('recipient_phone', e.target.value)}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Delivery Address *</label>
                  <textarea
                    className={`form-control ${errors.recipient_address ? 'is-invalid' : ''}`}
                    rows={2}
                    value={form.recipient_address}
                    onChange={(e) => set('recipient_address', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Delivery Date *</label>
                  <input
                    type="date"
                    className={`form-control ${errors.delivery_date ? 'is-invalid' : ''}`}
                    min={TODAY}
                    value={form.delivery_date}
                    onChange={(e) => set('delivery_date', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Time Slot *</label>
                  <select
                    className="form-select"
                    value={form.delivery_time_slot}
                    onChange={(e) => set('delivery_time_slot', e.target.value)}
                  >
                    {TIME_SLOTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Gift Message <span className="text-muted small">(optional)</span></label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="e.g. Happy Birthday! Wishing you a wonderful day…"
                    value={form.gift_message}
                    onChange={(e) => set('gift_message', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="sf-modal__footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Back</button>
              <button type="submit" className="btn btn-dark" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-bag-check me-1" />}
                Place Order · Rs. {cartTotal.toLocaleString()}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
