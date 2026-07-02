import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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

const CAT_ICONS = {
  'All': '✨', 'Roses': '🌹', 'Rose': '🌹', 'Bouquets': '💐',
  'Bouquet': '💐', 'Seasonal': '🌸', 'Exotic': '🌺', 'White': '🤍',
  'Orchids': '🌷', 'Orchid': '🌷', 'Sunflowers': '🌻', 'Sunflower': '🌻',
  'Lilies': '🌸', 'Lily': '🌸', 'Mixed': '💐',
};
const catIcon = (c) => CAT_ICONS[c] || '🌼';

function scoreProduct(product) {
  const stockScore = Math.min(product.stock || 0, 25) * 2;
  const freshnessScore = product.freshness_days ? Math.max(0, 12 - product.freshness_days) * 5 : 10;
  const priceScore = product.price <= 999 ? 18 : product.price <= 1499 ? 12 : 6;
  const bouquetScore = /bouquet|arrangement|basket/i.test(product.category || '') ? 16 : 0;

  return stockScore + freshnessScore + priceScore + bouquetScore;
}

function productEta(product) {
  if ((product.stock || 0) >= 12) return '45-60 min';
  if ((product.stock || 0) >= 6) return '90 min';
  return 'Today';
}

function productMood(product) {
  const haystack = `${product.name || ''} ${product.category || ''}`.toLowerCase();
  if (/rose|red|love|romance/.test(haystack)) return 'Romantic';
  if (/orchid|premium|lux|exotic/.test(haystack)) return 'Premium';
  if (/sunflower|bright|yellow|gerbera/.test(haystack)) return 'Cheerful';
  if (/white|lily|pastel/.test(haystack)) return 'Elegant';
  return 'Best Seller';
}

export default function StorefrontPage() {
  const { slug } = useParams();
  const [store, setStore]       = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [scrolled, setScrolled] = useState(false);

  const [cart, setCart]                 = useState([]);
  const [showCart, setShowCart]         = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [geo, setGeo] = useState({ status: 'idle', latitude: '', longitude: '' });

  const productsRef = useRef(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api.get(`/storefront/${slug}`)
      .then(({ data }) => { setStore(data.store); setProducts(data.products); })
      .catch(() => setError('This storefront is unavailable right now.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const serviceAreas = store?.delivery_areas || [];
  const areaCovered = useMemo(() => {
    const area = deliveryArea.trim().toLowerCase();
    if (!area || serviceAreas.length === 0) return null;
    return serviceAreas.some((item) => {
      const normalized = item.toLowerCase();
      return area.includes(normalized) || normalized.includes(area);
    });
  }, [deliveryArea, serviceAreas]);

  const categories = useMemo(
    () => ['All', ...new Set(products.map(p => p.category).filter(Boolean))],
    [products],
  );

  const filtered = useMemo(() => {
    let next = activeCategory === 'All' ? products : products.filter((product) => product.category === activeCategory);

    const term = deferredQuery.trim().toLowerCase();
    if (term) {
      next = next.filter((product) => (`${product.name || ''} ${product.category || ''}`).toLowerCase().includes(term));
    }

    const sorted = [...next];
    if (sortBy === 'price-low') sorted.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === 'price-high') sorted.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === 'fast-delivery') sorted.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    else sorted.sort((a, b) => scoreProduct(b) - scoreProduct(a));

    return sorted;
  }, [products, activeCategory, deferredQuery, sortBy]);

  const smartShelves = useMemo(() => {
    const inStock = products.filter((product) => product.stock > 0);
    const ranked = [...inStock].sort((a, b) => scoreProduct(b) - scoreProduct(a));
    const premium = [...inStock].sort((a, b) => Number(b.price) - Number(a.price));
    const quick = [...inStock].sort((a, b) => {
      const aScore = (a.stock || 0) + (a.freshness_days ? Math.max(0, 8 - a.freshness_days) : 4);
      const bScore = (b.stock || 0) + (b.freshness_days ? Math.max(0, 8 - b.freshness_days) : 4);
      return bScore - aScore;
    });

    return [
      {
        key: 'smart',
        title: 'Most Likely To Convert',
        subtitle: 'Our ranking boosts giftable, well-stocked, fast-fulfilment flowers first.',
        badge: 'Smart order',
        items: ranked.slice(0, 4),
      },
      {
        key: 'express',
        title: 'Fast Delivery Picks',
        subtitle: 'High-availability flowers that are easiest to prepare and dispatch quickly.',
        badge: 'Express',
        items: quick.slice(0, 4),
      },
      {
        key: 'premium',
        title: 'Premium Gifting',
        subtitle: 'Higher-value arrangements for birthdays, anniversaries, and big moments.',
        badge: 'Signature',
        items: premium.slice(0, 4),
      },
    ].filter((section) => section.items.length > 0);
  }, [products]);

  const categoryRail = categories.filter((item) => item !== 'All').slice(0, 8);
  const promoShelves = smartShelves.slice(0, 2);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.qty * i.price, 0), [cart]);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const freeDeliveryLeft = Math.max(0, 500 - cartTotal);
  const crossSell = useMemo(() => {
    if (cart.length === 0) return smartShelves[1]?.items?.slice(0, 3) ?? [];

    const cartIds = new Set(cart.map((item) => item.product_id));
    const sameCategory = products.filter((product) =>
      !cartIds.has(product.id) && cart.some((item) => product.category === item.category)
    );

    const fallback = products.filter((product) => !cartIds.has(product.id));
    return [...sameCategory, ...fallback]
      .sort((a, b) => scoreProduct(b) - scoreProduct(a))
      .slice(0, 3);
  }, [cart, products, smartShelves]);

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        product_id: product.id, name: product.name, price: product.price,
        image_url: product.image_url, qty: 1, stock: product.stock, category: product.category,
      }];
    });
  }

  function updateCartQty(product_id, qty) {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product_id !== product_id));
    else setCart(prev => prev.map(i => i.product_id === product_id ? { ...i, qty: Math.min(qty, i.stock) } : i));
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setGeo({ status: 'unsupported', latitude: '', longitude: '' });
      return;
    }

    setGeo({ status: 'loading', latitude: '', longitude: '' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          status: 'ready',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setGeo({ status: 'error', latitude: '', longitude: '' }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (loading) return (
    <div className="sf-splash">
      <div className="sf-splash__bloom"><i className="bi bi-flower3" /></div>
      <p>Loading storefront…</p>
    </div>
  );

  if (error || !store) return (
    <div className="sf-error-screen">
      <i className="bi bi-flower1" />
      <h4>Storefront Unavailable</h4>
      <p>{error || 'This store link is no longer active.'}</p>
    </div>
  );

  return (
    <div
      className="sf-page"
      style={{ '--sf-primary': store.primary_color || '#7d294a', '--sf-secondary': store.secondary_color || '#25543a' }}
    >
      {/* ── Topbar ── */}
      <nav className={`sf-topbar ${scrolled ? 'sf-topbar--scrolled' : ''}`}>
        <div className="sf-topbar__inner">
          <div className="sf-topbar__brand">
            <div className="sf-topbar__logo"><i className="bi bi-flower3" /></div>
            <span>{store.name}</span>
          </div>
          <div className="sf-topbar__search">
            <i className="bi bi-search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bouquets, roses, orchids, garlands..."
            />
          </div>
          <div className="sf-topbar__actions">
            {store.phone && (
              <a href={`tel:${store.phone}`} className="sf-topbar__link">
                <i className="bi bi-telephone" /><span className="d-none d-sm-inline">{store.phone}</span>
              </a>
            )}
            <button className="sf-cart-trigger" onClick={() => setShowCart(true)}>
              <i className="bi bi-bag" />
              {cartCount > 0 && <span className="sf-cart-badge">{cartCount}</span>}
              <span className="d-none d-sm-inline">Bag</span>
            </button>
          </div>
        </div>
      </nav>

      {categoryRail.length > 0 && (
        <section className="sf-category-rail-wrap">
          <div className="sf-category-rail">
            {categoryRail.map((cat) => (
              <button
                key={cat}
                className={`sf-category-tile ${activeCategory === cat ? 'sf-category-tile--active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat);
                  productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <div className="sf-category-tile__icon">{catIcon(cat)}</div>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <header className="sf-launchpad">
        <div className="sf-launchpad__inner">
          <div className="sf-launchpad__hero">
            <div className="sf-launchpad__eyebrow">Fresh flowers in minutes</div>
            <h1>{store.banner_title || store.name}</h1>
            {store.banner_subtitle && <p>{store.banner_subtitle}</p>}
            <div className="sf-launchpad__chips">
              <span><i className="bi bi-lightning-charge-fill" />Same-day delivery</span>
              <span><i className="bi bi-shield-check" />Freshness guaranteed</span>
              <span><i className="bi bi-gift" />Gift wrapping</span>
            </div>
            <div className="sf-launchpad__actions">
              <button
                className="sf-btn-hero"
                onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Shop Now <i className="bi bi-arrow-right" />
              </button>
              {store.email && (
                <a href={`mailto:${store.email}`} className="sf-btn-hero-ghost">
                  <i className="bi bi-envelope" /> Contact Us
                </a>
              )}
            </div>
          </div>

          <div className="sf-launchpad__promos">
            {promoShelves.map((shelf, index) => (
              <button
                key={shelf.key}
                className={`sf-launch-card sf-launch-card--${index + 1}`}
                onClick={() => {
                  setSortBy(shelf.key === 'express' ? 'fast-delivery' : 'recommended');
                  productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <div className="sf-launch-card__badge">{shelf.badge}</div>
                <h3>{shelf.title}</h3>
                <p>{shelf.subtitle}</p>
                <div className="sf-launch-card__items">
                  {shelf.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="sf-launch-card__item">
                      <div className="sf-launch-card__media">
                        {item.image_url ? <img src={item.image_url} alt="" /> : <span>💐</span>}
                      </div>
                      <div>
                        <strong>{item.name}</strong>
                        <span>Rs. {Number(item.price).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Products ── */}
      <main className="sf-products" ref={productsRef}>
        <div className="sf-products__inner">
          <section className="sf-location-card">
            <div>
              <div className="sf-location-card__title">Delivery location</div>
              <div className="sf-location-card__sub">{store.location_prompt || 'Enter your area to confirm delivery coverage.'}</div>
            </div>
            <div className="sf-location-card__controls">
              <input
                className="sf-location-card__input"
                value={deliveryArea}
                onChange={(event) => setDeliveryArea(event.target.value)}
                placeholder="Enter your area or locality"
              />
              <button type="button" className="sf-location-card__button" onClick={captureLocation}>
                <i className="bi bi-crosshair" /> Use my location
              </button>
            </div>
            {serviceAreas.length > 0 && (
              <div className="sf-location-card__areas">Delivering in: {serviceAreas.join(', ')}</div>
            )}
            {areaCovered !== null && (
              <div className={`sf-location-card__status ${areaCovered ? 'sf-location-card__status--ok' : 'sf-location-card__status--warn'}`}>
                {areaCovered ? 'Delivery is available in this area.' : 'This area is outside the listed delivery zones.'}
              </div>
            )}
            {geo.status === 'ready' && (
              <div className="sf-location-card__gps">
                GPS captured: {Number(geo.latitude).toFixed(5)}, {Number(geo.longitude).toFixed(5)}
              </div>
            )}
          </section>

          <section className="sf-discovery">
            <div className="sf-discovery__title">
              <h3>All products</h3>
              <span>{filtered.length} items available</span>
            </div>
            <div className="sf-discovery__right">
              <div className="sf-sort">
                <i className="bi bi-sliders2" />
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="recommended">Recommended</option>
                  <option value="fast-delivery">Fast Delivery</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </section>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="sf-empty">
              <div className="sf-empty__icon">🌱</div>
              <h5>No flowers in this category yet</h5>
              <p>Fresh stock arrives daily — check back soon.</p>
            </div>
          ) : (
            <div className="sf-grid">
              {filtered.map(product => {
                const inCart     = cart.find(i => i.product_id === product.id);
                const outOfStock = product.stock <= 0;
                const lowStock   = !outOfStock && product.stock <= 5;
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    inCart={inCart}
                    outOfStock={outOfStock}
                    lowStock={lowStock}
                    onAdd={() => addToCart(product)}
                    onUpdateQty={(qty) => updateCartQty(product.id, qty)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Floating cart bar ── */}
      {cartCount > 0 && !showCart && !showCheckout && (
        <div className="sf-float-bar">
          <div className="sf-float-bar__left">
            <div className="sf-float-bar__count">{cartCount}</div>
            <span>{cartCount} item{cartCount > 1 ? 's' : ''} in your bag</span>
          </div>
          <div className="sf-float-bar__right">
            <span className="sf-float-bar__total">Rs. {cartTotal.toLocaleString()}</span>
            <button className="sf-float-bar__btn" onClick={() => setShowCart(true)}>
              View Bag <i className="bi bi-arrow-right" />
            </button>
          </div>
        </div>
      )}

      {showCart && (
        <CartDrawer
          cart={cart}
          cartTotal={cartTotal}
          freeDeliveryLeft={freeDeliveryLeft}
          recommendations={crossSell}
          onUpdateQty={updateCartQty}
          onAddRecommendation={addToCart}
          onClose={() => setShowCart(false)}
          onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          cartTotal={cartTotal}
          slug={slug}
          store={store}
          deliveryArea={deliveryArea}
          geo={geo}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => { setCart([]); setShowCheckout(false); }}
        />
      )}

      {/* ── Footer ── */}
      <footer className="sf-footer">
        <div className="sf-footer__inner">
          <div className="sf-footer__brand">
            <div className="sf-footer__logo"><i className="bi bi-flower3" /></div>
            <div>
              <div className="sf-footer__name">{store.name}</div>
              <div className="sf-footer__tagline">Fresh flowers, delivered with love</div>
            </div>
          </div>
          <div className="sf-footer__contact">
            {store.phone && <a href={`tel:${store.phone}`}><i className="bi bi-telephone-fill" />{store.phone}</a>}
            {store.email && <a href={`mailto:${store.email}`}><i className="bi bi-envelope-fill" />{store.email}</a>}
          </div>
          <div className="sf-footer__powered">
            Powered by <strong>Pookal</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, inCart, outOfStock, lowStock, onAdd, onUpdateQty, compact = false }) {
  const [imgErr, setImgErr] = useState(false);
  const mood = productMood(product);
  const eta = productEta(product);

  return (
    <article className={`sf-card ${outOfStock ? 'sf-card--oos' : ''} ${compact ? 'sf-card--compact' : ''}`}>
      {lowStock && <div className="sf-card__ribbon">Only {product.stock} left</div>}

      <div className="sf-card__media">
        {product.image_url && !imgErr ? (
          <img src={product.image_url} alt={product.name} className="sf-card__img" onError={() => setImgErr(true)} />
        ) : (
          <div className="sf-card__placeholder">🌸</div>
        )}
        {outOfStock && <div className="sf-card__oos-overlay">Out of Stock</div>}
        {!outOfStock && (
          <div className="sf-card__same-day">
            <i className="bi bi-lightning-charge-fill" /> Same Day
          </div>
        )}
      </div>

      <div className="sf-card__body">
        {product.category && <div className="sf-card__cat">{product.category}</div>}
        <h3 className="sf-card__name">{product.name}</h3>
        <div className="sf-card__meta">
          <span>{mood}</span>
          <span>{eta}</span>
        </div>
        {product.description && <p className="sf-card__desc">{product.description}</p>}

        <div className="sf-card__footer">
          <div className="sf-card__price">
            <span className="sf-card__price-rs">Rs.</span>
            <span className="sf-card__price-val">{Number(product.price).toLocaleString()}</span>
          </div>

          {outOfStock ? (
            <button className="sf-card__add sf-card__add--oos" disabled>Unavailable</button>
          ) : inCart ? (
            <div className="sf-card__stepper">
              <button onClick={() => onUpdateQty(inCart.qty - 1)}><i className="bi bi-dash" /></button>
              <span>{inCart.qty}</span>
              <button onClick={onAdd} disabled={inCart.qty >= product.stock}><i className="bi bi-plus" /></button>
            </div>
          ) : (
            <button className="sf-card__add" onClick={onAdd}>
              <i className="bi bi-bag-plus" /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────
function CartDrawer({ cart, cartTotal, freeDeliveryLeft, recommendations, onUpdateQty, onAddRecommendation, onClose, onCheckout }) {
  const cartCount  = cart.reduce((s, i) => s + i.qty, 0);
  const delivery   = cartTotal >= 500 ? 0 : 50;
  const orderTotal = cartTotal + delivery;

  return (
    <>
      <div className="sf-overlay" onClick={onClose} />
      <aside className="sf-drawer">
        <div className="sf-drawer__header">
          <div className="sf-drawer__title">
            <i className="bi bi-bag" />
            <span>Your Bag</span>
            {cartCount > 0 && <span className="sf-drawer__count">{cartCount}</span>}
          </div>
          <button className="sf-drawer__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <div className="sf-drawer__body">
          {cart.length === 0 ? (
            <div className="sf-drawer__empty">
              <div className="sf-drawer__empty-icon">🛍️</div>
              <h6>Your bag is empty</h6>
              <p>Add some beautiful flowers to get started.</p>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.product_id} className="sf-cart-item">
                  <div className="sf-cart-item__media">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} />
                      : <span>🌸</span>}
                  </div>
                  <div className="sf-cart-item__info">
                    <div className="sf-cart-item__name">{item.name}</div>
                    <div className="sf-cart-item__price">Rs. {Number(item.price).toLocaleString()} each</div>
                  </div>
                  <div className="sf-cart-item__controls">
                    <div className="sf-cart-item__stepper">
                      <button onClick={() => onUpdateQty(item.product_id, item.qty - 1)}><i className="bi bi-dash" /></button>
                      <span>{item.qty}</span>
                      <button
                        onClick={() => onUpdateQty(item.product_id, item.qty + 1)}
                        disabled={item.qty >= item.stock}
                      ><i className="bi bi-plus" /></button>
                    </div>
                    <div className="sf-cart-item__subtotal">Rs. {(item.qty * item.price).toLocaleString()}</div>
                  </div>
                </div>
              ))}

              <div className="sf-cart-summary">
                <div className="sf-cart-summary__row">
                  <span>Subtotal</span><span>Rs. {cartTotal.toLocaleString()}</span>
                </div>
                <div className="sf-cart-summary__row">
                  <span><i className="bi bi-truck me-1" />Delivery</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{delivery === 0 ? 'Free' : `Rs. ${delivery}`}</span>
                </div>
                <div className="sf-cart-summary__progress">
                  {freeDeliveryLeft === 0
                    ? 'Free delivery unlocked for this order.'
                    : `Add Rs. ${freeDeliveryLeft.toLocaleString()} more to unlock free delivery.`}
                </div>
              </div>
              {recommendations?.length > 0 && (
                <div className="sf-cart-cross">
                  <div className="sf-cart-cross__title">Smart add-ons</div>
                  <div className="sf-cart-cross__list">
                    {recommendations.map((product) => (
                      <button key={product.id} className="sf-cart-cross__item" onClick={() => onAddRecommendation(product)}>
                        <div>
                          <strong>{product.name}</strong>
                          <span>{product.category || 'Floral pick'} · Rs. {Number(product.price).toLocaleString()}</span>
                        </div>
                        <i className="bi bi-plus-circle" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="sf-drawer__footer">
            <div className="sf-drawer__total">
              <span>Total</span>
              <span>Rs. {orderTotal.toLocaleString()}</span>
            </div>
            <button className="sf-btn-checkout" onClick={onCheckout}>
              Proceed to Checkout <i className="bi bi-arrow-right" />
            </button>
            <p className="sf-drawer__hint"><i className="bi bi-shield-check me-1" />Secure checkout · Free returns</p>
          </div>
        )}
      </aside>
    </>
  );
}

// ─── Checkout Modal ───────────────────────────────────────────────────────────
function CheckoutModal({ cart, cartTotal, slug, store, deliveryArea, geo, onClose, onSuccess }) {
  const [form, setForm] = useState({
    recipient_name: '', recipient_phone: '', recipient_address: '',
    delivery_area: deliveryArea || '',
    delivery_date: TODAY, delivery_time_slot: TIME_SLOTS[0], gift_message: '',
  });
  const [step, setStep]         = useState('form');
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [orderNum, setOrderNum] = useState('');

  const set          = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const delivery     = cartTotal >= 500 ? 0 : 50;
  const orderTotal   = cartTotal + delivery;

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true); setApiError(''); setErrors({});
    try {
      const { data } = await api.post(`/storefront/${slug}/order`, {
        ...form,
        customer_latitude: geo.latitude || null,
        customer_longitude: geo.longitude || null,
        location_source: geo.status === 'ready' ? 'browser' : 'manual',
        items: cart.map(i => ({ product_id: i.product_id, qty: i.qty })),
      });
      setOrderNum(data.order_number || '');
      setStep('success');
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors) {
        setErrors(serverErrors);
        if (serverErrors.stock) setApiError(serverErrors.stock.join(', '));
      } else {
        setApiError(err?.response?.data?.message || 'Could not place order. Please try again.');
      }
    } finally { setSaving(false); }
  };

  return (
    <div
      className="sf-modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && step !== 'success') onClose(); }}
    >
      <div className="sf-modal">
        {step === 'success' ? (
          <div className="sf-success">
            <div className="sf-success__flowers">🌹 🌸 💐 🌺</div>
            <div className="sf-success__icon"><i className="bi bi-check-lg" /></div>
            <h3>Order Placed!</h3>
            {orderNum && <div className="sf-success__order">Order #{orderNum}</div>}
            <p>Thank you! Your flowers are being prepared. The florist will confirm your delivery shortly.</p>
            <button className="sf-btn-primary-solid" onClick={onSuccess}>Continue Shopping</button>
          </div>
        ) : (
          <>
            <div className="sf-modal__header">
              <div className="sf-modal__title"><i className="bi bi-bag-check" />Complete Your Order</div>
              <button className="sf-modal__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
            </div>

            <div className="sf-modal__content">
              {/* Left: order summary */}
              <div className="sf-modal__left">
                <div className="sf-checkout-summary__title">Order Summary</div>
                {cart.map(item => (
                  <div key={item.product_id} className="sf-checkout-item">
                    <div className="sf-checkout-item__media">
                      {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span>🌸</span>}
                    </div>
                    <div className="sf-checkout-item__info">
                      <div className="sf-checkout-item__name">{item.name}</div>
                      <div className="sf-checkout-item__qty">× {item.qty}</div>
                    </div>
                    <div className="sf-checkout-item__total">Rs. {(item.qty * item.price).toLocaleString()}</div>
                  </div>
                ))}
                <div className="sf-checkout-totals">
                  <div className="sf-checkout-totals__row">
                    <span>Subtotal</span><span>Rs. {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="sf-checkout-totals__row">
                    <span>Delivery</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{delivery === 0 ? 'Free' : `Rs. ${delivery}`}</span>
                  </div>
                  <div className="sf-checkout-totals__row sf-checkout-totals__row--total">
                    <span>Total</span><span>Rs. {orderTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Right: form */}
              <div className="sf-modal__right">
                {apiError && (
                  <div className="sf-modal__error">
                    <i className="bi bi-exclamation-circle" />{apiError}
                  </div>
                )}

                <div className="sf-form-section">
                  <div className="sf-form-section__title"><i className="bi bi-person" />Recipient Details</div>
                  <div className="sf-form-row">
                    <div className="sf-field">
                      <label>Full Name *</label>
                      <input
                        className={`sf-input ${errors.recipient_name ? 'sf-input--error' : ''}`}
                        value={form.recipient_name}
                        onChange={e => set('recipient_name', e.target.value)}
                        placeholder="Who receives the flowers?"
                        required
                      />
                    </div>
                    <div className="sf-field">
                      <label>Phone *</label>
                      <input
                        className={`sf-input ${errors.recipient_phone ? 'sf-input--error' : ''}`}
                        value={form.recipient_phone}
                        onChange={e => set('recipient_phone', e.target.value)}
                        placeholder="+91 98765 43210"
                        required
                      />
                    </div>
                  </div>
                  <div className="sf-field">
                    <label>Delivery Area</label>
                    <input
                      className="sf-input"
                      value={form.delivery_area}
                      onChange={e => set('delivery_area', e.target.value)}
                      placeholder={store?.location_prompt || 'Enter your area'}
                    />
                  </div>
                  <div className="sf-field">
                    <label>Delivery Address *</label>
                    <textarea
                      className={`sf-input sf-textarea ${errors.recipient_address ? 'sf-input--error' : ''}`}
                      rows={2}
                      value={form.recipient_address}
                      onChange={e => set('recipient_address', e.target.value)}
                      placeholder="Full address with landmark"
                      required
                    />
                  </div>
                </div>

                <div className="sf-form-section">
                  <div className="sf-form-section__title"><i className="bi bi-calendar3" />Delivery Schedule</div>
                  <div className="sf-form-row">
                    <div className="sf-field">
                      <label>Delivery Date *</label>
                      <input
                        type="date"
                        className="sf-input"
                        min={TODAY}
                        value={form.delivery_date}
                        onChange={e => set('delivery_date', e.target.value)}
                        required
                      />
                    </div>
                    <div className="sf-field">
                      <label>Time Slot *</label>
                      <select
                        className="sf-input"
                        value={form.delivery_time_slot}
                        onChange={e => set('delivery_time_slot', e.target.value)}
                      >
                        {TIME_SLOTS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="sf-form-section">
                  <div className="sf-form-section__title">
                    <i className="bi bi-gift" />Gift Message
                    <span className="sf-optional">optional</span>
                  </div>
                  <div className="sf-field">
                    <textarea
                      className="sf-input sf-textarea"
                      rows={2}
                      placeholder="e.g. Happy Birthday! Wishing you a wonderful day…"
                      value={form.gift_message}
                      onChange={e => set('gift_message', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sf-modal__footer">
              <button type="button" className="sf-modal__back" onClick={onClose}>
                <i className="bi bi-arrow-left" /> Back
              </button>
              <button className="sf-modal__place" onClick={handleSubmit} disabled={saving}>
                {saving
                  ? <span className="spinner-border spinner-border-sm" />
                  : <i className="bi bi-bag-check" />}
                Place Order · Rs. {orderTotal.toLocaleString()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
