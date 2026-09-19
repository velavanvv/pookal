import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import TamilVoiceAgent from '../../components/voice/TamilVoiceAgent';

const POOJA_SLOTS = [
  '6:00 AM – 8:00 AM (Morning Pooja Delivery)',
  '8:00 AM – 10:00 AM',
  '5:00 PM – 7:00 PM (Evening Pooja Delivery)',
];

export default function PookalStorefront() {
  const [lang, setLang] = useState('en'); // Enforced English mode
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart & Checkout State
  const [cart, setCart] = useState([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [voiceDrawerOpen, setVoiceDrawerOpen] = useState(false);

  // Checkout Form
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    delivery_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    delivery_slot: '6:00 AM – 8:00 AM (Morning Pooja Delivery)',
    payment_method: 'upi',
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Voice Agent Hook (வேலா - Vela)
  const voiceAgent = useVoiceAgent({
    onCartUpdated: (updatedItems) => {
      if (Array.isArray(updatedItems)) {
        setCart(updatedItems);
        setShowCartDrawer(true);
      }
    },
    onOrderPlaced: (orderData) => {
      setLastOrder(orderData);
      setCart([]);
      setShowCartDrawer(false);
      setShowCheckoutModal(false);
      setShowSuccessModal(true);
    },
    onNavigateCategory: (cat) => {
      setActiveCategory(cat);
    },
  });

  // Fetch Catalog
  useEffect(() => {
    api.get('/flowers')
      .then(({ data }) => {
        setProducts(data.products || []);
        setCategories(data.categories || []);
      })
      .catch((err) => {
        console.warn('Fallback catalog load', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        activeCategory === 'All' ||
        p.category?.toLowerCase() === activeCategory?.toLowerCase() ||
        (activeCategory === 'Daily Pooja' && (p.category === 'Loose Flower' || p.category === 'Combo')) ||
        (activeCategory === 'Garland' && p.category === 'Garland');

      const matchSearch =
        !searchQuery ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tamil_name?.includes(searchQuery);

      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // Cart Helpers
  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.product_id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, qty: item.qty + qty, line_total: (item.qty + qty) * item.price }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          tamil_name: product.tamil_name || product.name,
          price: product.price,
          unit: product.unit,
          tamil_unit: product.tamil_unit || product.unit,
          qty,
          line_total: product.price * qty,
          image_url: product.image_url,
        },
      ];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0
              ? { ...item, qty: newQty, line_total: newQty * item.price }
              : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.line_total, 0);
  const cartTax = Math.round(cartSubtotal * 0.05);
  const cartGrandTotal = cartSubtotal + cartTax;

  // Submit Order via REST
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmittingOrder(true);

    try {
      const { data } = await api.post('/voice/tools/order', {
        recipient_name: checkoutForm.name,
        recipient_phone: checkoutForm.phone,
        recipient_address: checkoutForm.address,
        delivery_date: checkoutForm.delivery_date,
        delivery_time_slot: checkoutForm.delivery_slot,
        payment_method: checkoutForm.payment_method,
        items: cart,
      });

      setLastOrder(data);
      setCart([]);
      setShowCheckoutModal(false);
      setShowCartDrawer(false);
      setShowSuccessModal(true);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to place order.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fdfbf7', color: '#18181b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── TOP NOTICE BAR (MORNING POOJA DELIVERY) ── */}
      <div
        style={{
          background: 'linear-gradient(90deg, #831843 0%, #9d174d 50%, #831843 100%)',
          color: '#ffffff',
          padding: '0.45rem 1rem',
          textAlign: 'center',
          fontSize: '0.82rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        <span>🌅 {lang === 'ta' ? 'அதிகாலை 6:00 AM – 8:00 AM பிரத்யேக பூஜை நேர டெலிவரி உத்தரவாதம்!' : 'Guaranteed Fresh Morning Pooja Delivery (6:00 AM – 8:00 AM)!'}</span>
      </div>

      {/* ── NAVIGATION HEADER ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #f1f5f9',
          padding: '0.75rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #be185d, #831843)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: '1.4rem',
                boxShadow: '0 4px 12px rgba(190, 24, 93, 0.25)',
              }}
            >
              🌸
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#831843', letterSpacing: '-0.02em', lineHeight: 1 }}>
                பூக்கள் (Pookal)
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>
                {lang === 'ta' ? 'பாரம்பரிய மலர் அங்காடி' : 'Fresh Flower Market'}
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div style={{ flex: 1, maxWidth: '420px', position: 'relative' }} className="d-none d-md-block">
            <i className="bi bi-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              className="pk-input"
              style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: '9999px', background: '#f8fafc', border: '1.5px solid #e2e8f0', fontSize: '0.85rem' }}
              placeholder={lang === 'ta' ? 'மல்லிகை, ரோஜா மாலை, சாமந்தி தேடுக…' : 'Search Jasmine, Garland, Marigold…'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Universal Billing / Shop ERP Link */}
            <a
              href="/dashboard"
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '9999px',
                background: '#ffffff',
                border: '1.5px solid #831843',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#831843',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              title="Open Universal Business Platform ERP & POS Register"
            >
              <i className="bi bi-shop" />
              <span>Universal Business / POS</span>
            </a>

            {/* Cart Button */}
            <button
              onClick={() => setShowCartDrawer(true)}
              style={{
                background: 'linear-gradient(135deg, #831843, #be185d)',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.5rem 1.15rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(190, 24, 93, 0.25)',
              }}
            >
              <i className="bi bi-basket2-fill" />
              <span>{lang === 'ta' ? 'கார்ட்' : 'Cart'} ({cartCount})</span>
              {cartSubtotal > 0 && <span style={{ opacity: 0.9 }}>· ₹{cartSubtotal}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fff1f2 50%, #fef3c7 100%)',
          padding: '2.5rem 1.5rem',
          borderBottom: '1px solid #fce7f3',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                background: 'rgba(190, 24, 93, 0.1)',
                color: '#be185d',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              <span>🌿 100% பிரஷ் மலர்கள்</span> · <span>அதிகாலை அறுவடை</span>
            </div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#831843', lineHeight: 1.15, marginBottom: '0.75rem' }}>
              {lang === 'ta' ? 'மதுரை மல்லிகை & பன்னீர் ரோஜா மாலைகள்' : 'Fresh Madurai Jasmine & Traditional Rose Garlands'}
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {lang === 'ta'
                ? 'தினசரி பூஜை மற்றும் விசேஷங்களுக்கான நறுமண மலர்கள் உங்கள் இல்லத்திற்கே அதிகாலை 6:00 AM மணிக்குள் டெலிவரி செய்யப்படுகிறது.'
                : 'Fresh fragrant traditional flowers delivered straight to your home every morning at 6:00 AM for daily pooja and special occasions.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setVoiceDrawerOpen(true); voiceAgent.startListening(); }}
                style={{
                  background: 'linear-gradient(135deg, #831843, #be185d)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem 1.4rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(190, 24, 93, 0.3)',
                }}
              >
                <i className="bi bi-mic-fill" />
                <span>🎙️ வேலாவுடன் பேச (Voice Order)</span>
              </button>
              <a
                href="#catalog"
                style={{
                  background: '#ffffff',
                  color: '#831843',
                  border: '1.5px solid #fbcfe8',
                  borderRadius: '12px',
                  padding: '0.75rem 1.4rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>🌸 {lang === 'ta' ? 'மலர்கள் பட்டியல்' : 'Browse Flowers'}</span>
              </a>
            </div>
          </div>

          {/* Hero Feature Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #fce7f3', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>🪔</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#831843' }}>தினசரி பூஜை பேக்</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>மல்லிகை, சாமந்தி & துளசி காம்போ</div>
            </div>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #fce7f3', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>🌅</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#831843' }}>காலை 6:00 AM</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>சூரிய உதயத்திற்கு முன் டெலிவரி</div>
            </div>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #fce7f3', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>🌺</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#831843' }}>கைவினை மாலைகள்</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>சுத்தமான பன்னீர் ரோஜா மாலை</div>
            </div>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #fce7f3', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>🎙️</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#831843' }}>தமிழ் வாய்ஸ் AI</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>வேலா மூலம் குரலில் ஆர்டர்</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CATALOG CONTAINER ── */}
      <main id="catalog" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          {categories.map((c) => {
            const isSelected = activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '9999px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? '1.5px solid #be185d' : '1.5px solid #e2e8f0',
                  background: isSelected ? 'linear-gradient(135deg, #831843, #be185d)' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  boxShadow: isSelected ? '0 4px 12px rgba(190, 24, 93, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ marginRight: '0.35rem' }}>{c.icon}</span>
                {lang === 'ta' ? c.tamil_name : c.name}
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="spinner-border" style={{ color: '#be185d', width: '2rem', height: '2rem' }} />
            <div style={{ marginTop: '0.75rem', fontWeight: 600, color: '#6b7280' }}>மலர்கள் பட்டியலை ஏற்றுகிறது…</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {filteredProducts.map((p) => {
              const inCartItem = cart.find((item) => item.product_id === p.id);
              const qtyInCart = inCartItem?.qty || 0;

              return (
                <div
                  key={p.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(190, 24, 93, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
                  }}
                >
                  {/* Product Image */}
                  <div style={{ position: 'relative', height: '180px', background: '#fdf2f8', overflow: 'hidden' }}>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: '3.5rem' }}>
                        🌸
                      </div>
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        left: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)',
                        color: '#15803d',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      🌿 {lang === 'ta' ? 'இன்று பறித்தது' : 'Fresh Today'}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#be185d', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      {p.category}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#18181b', margin: '0 0 0.25rem', lineHeight: 1.25 }}>
                      {lang === 'ta' ? (p.tamil_name || p.name) : p.name}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                      {lang === 'ta' ? p.name : p.tamil_name}
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #f8fafc' }}>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#831843' }}>
                          ₹{p.price}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                          / {lang === 'ta' ? (p.tamil_unit || p.unit) : p.unit}
                        </div>
                      </div>

                      {/* Add Button / Stepper */}
                      {qtyInCart === 0 ? (
                        <button
                          onClick={() => addToCart(p, 1)}
                          style={{
                            background: 'linear-gradient(135deg, #831843, #be185d)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0.5rem 0.9rem',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 4px 10px rgba(190, 24, 93, 0.2)',
                          }}
                        >
                          <i className="bi bi-plus-lg" />
                          <span>{lang === 'ta' ? 'சேர்' : 'Add'}</span>
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#fdf2f8', padding: '0.2rem', borderRadius: '10px' }}>
                          <button
                            onClick={() => updateCartQty(p.id, -1)}
                            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#fff', color: '#831843', fontWeight: 800, cursor: 'pointer' }}
                          >
                            −
                          </button>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', width: 24, textAlign: 'center', color: '#831843' }}>
                            {qtyInCart}
                          </span>
                          <button
                            onClick={() => updateCartQty(p.id, 1)}
                            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#831843', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── REAL-TIME CART DRAWER ── */}
      {showCartDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setShowCartDrawer(false)}
        >
          <div
            style={{
              width: '400px',
              maxWidth: '90vw',
              height: '100%',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cart Header */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fdf2f8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="bi bi-bag-heart-fill" style={{ fontSize: '1.3rem', color: '#be185d' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#831843' }}>
                  {lang === 'ta' ? 'உங்கள் மலர் கூடை' : 'Your Flower Cart'} ({cartCount})
                </h3>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#6b7280', cursor: 'pointer' }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: '#9ca3af' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🌸</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#4b5563' }}>கூடை காலியாக உள்ளது</div>
                  <div style={{ fontSize: '0.8rem' }}>பூக்களை சேர்த்து ஆர்டர் செய்யவும்</div>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#18181b' }}>
                        {lang === 'ta' ? item.tamil_name : item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        ₹{item.price} × {item.qty} {lang === 'ta' ? item.tamil_unit : item.unit}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#831843' }}>
                        ₹{item.line_total}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <button
                        onClick={() => updateCartQty(item.product_id, -1)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                      >
                        −
                      </button>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', width: 20, textAlign: 'center' }}>
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.product_id, 1)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#be185d', color: '#fff', cursor: 'pointer' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer Checkout */}
            {cart.length > 0 && (
              <div style={{ padding: '1.25rem', borderTop: '1px solid #f1f5f9', background: '#fdfbf7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.35rem' }}>
                  <span>உட்தொகை (Subtotal)</span>
                  <span>₹{cartSubtotal}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  <span>ஜிஎஸ்டி / வரி (5%)</span>
                  <span>₹{cartTax}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 900, color: '#831843', borderTop: '1px dashed #e2e8f0', paddingTop: '0.5rem', marginBottom: '1rem' }}>
                  <span>மொத்த தொகை (Total)</span>
                  <span>₹{cartGrandTotal}</span>
                </div>
                <button
                  onClick={() => { setShowCartDrawer(false); setShowCheckoutModal(true); }}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #831843, #be185d)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(190, 24, 93, 0.3)',
                  }}
                >
                  🛍️ {lang === 'ta' ? 'ஆர்டர் செய்ய தொடரவும்' : 'Proceed to Checkout'} (₹{cartGrandTotal})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKOUT MODAL (WITH MORNING DELIVERY SLOTS) ── */}
      {showCheckoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '480px',
              maxWidth: '100%',
              background: '#fff',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #831843, #be185d)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  {lang === 'ta' ? 'டெலிவரி விவரங்கள்' : 'Delivery Details'}
                </h3>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>காலை 6:00 AM பிரத்யேக பூஜை நேர டெலிவரி</div>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePlaceOrder} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>
                  {lang === 'ta' ? 'உங்கள் பெயர்' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  className="pk-input"
                  style={{ width: '100%' }}
                  placeholder="எ.கா: சரவணன் குமார்"
                  value={checkoutForm.name}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>
                    {lang === 'ta' ? 'தொலைபேசி எண்' : 'Phone Number'} *
                  </label>
                  <input
                    type="tel"
                    required
                    className="pk-input"
                    style={{ width: '100%' }}
                    placeholder="9876543210"
                    value={checkoutForm.phone}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>
                    {lang === 'ta' ? 'டெலிவரி தேதி' : 'Delivery Date'} *
                  </label>
                  <input
                    type="date"
                    required
                    className="pk-input"
                    style={{ width: '100%' }}
                    value={checkoutForm.delivery_date}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, delivery_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Delivery Slot Selection */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>
                  {lang === 'ta' ? 'பூஜை டெலிவரி நேரம் (Slot)' : 'Morning Delivery Slot'} *
                </label>
                <select
                  className="pk-input"
                  style={{ width: '100%', fontWeight: 700, color: '#831843' }}
                  value={checkoutForm.delivery_slot}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, delivery_slot: e.target.value })}
                >
                  {POOJA_SLOTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>
                  {lang === 'ta' ? 'டெலிவரி முகவரி' : 'Delivery Address'} *
                </label>
                <textarea
                  required
                  rows={2}
                  className="pk-input"
                  style={{ width: '100%', resize: 'none' }}
                  placeholder="வீட்டு எண், தெரு, பகுதி (எ.கா: 12, மாட வீதி, மயிலாப்பூர், சென்னை)"
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>
                  {lang === 'ta' ? 'பணம் செலுத்தும் முறை' : 'Payment Method'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label
                    style={{
                      border: checkoutForm.payment_method === 'upi' ? '2px solid #be185d' : '1px solid #e2e8f0',
                      background: checkoutForm.payment_method === 'upi' ? '#fdf2f8' : '#fff',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="pay"
                      checked={checkoutForm.payment_method === 'upi'}
                      onChange={() => setCheckoutForm({ ...checkoutForm, payment_method: 'upi' })}
                    />
                    <span>📲 UPI / GPay / PhonePe</span>
                  </label>
                  <label
                    style={{
                      border: checkoutForm.payment_method === 'cod' ? '2px solid #be185d' : '1px solid #e2e8f0',
                      background: checkoutForm.payment_method === 'cod' ? '#fdf2f8' : '#fff',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="pay"
                      checked={checkoutForm.payment_method === 'cod'}
                      onChange={() => setCheckoutForm({ ...checkoutForm, payment_method: 'cod' })}
                    />
                    <span>💵 நேரடி பணம் (Cash)</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingOrder}
                style={{
                  marginTop: '0.5rem',
                  background: 'linear-gradient(135deg, #831843, #be185d)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(190, 24, 93, 0.3)',
                }}
              >
                {submittingOrder ? 'பதிவாகிறது…' : `✨ ஆர்டரை உறுதிப்படுத்து (₹${cartGrandTotal})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ORDER SUCCESS CONFIRMATION MODAL ── */}
      {showSuccessModal && lastOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '440px',
              maxWidth: '100%',
              background: '#fff',
              borderRadius: '24px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'grid',
                placeItems: 'center',
                fontSize: '2rem',
                margin: '0 auto 1rem',
              }}
            >
              <i className="bi bi-check-lg" />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#831843', margin: '0 0 0.5rem' }}>
              ஆர்டர் வெற்றிகரமாக பதிவாகியது!
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              உங்கள் மலர் ஆர்டர் எண் <strong style={{ color: '#be185d' }}>{lastOrder.order_number}</strong>.
              <br />
              <strong>{lastOrder.delivery_slot || '6:00 AM – 8:00 AM'}</strong> மணிக்குள் உங்கள் இல்லத்திற்கு வழங்கப்படும்.
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', textAlign: 'left', fontSize: '0.82rem', marginBottom: '1.5rem', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6b7280' }}>மொத்த தொகை:</span>
                <strong style={{ color: '#831843' }}>₹{lastOrder.grand_total}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>டெலிவரி தேதி:</span>
                <span>{lastOrder.delivery_date}</span>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #831843, #be185d)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              சரி, நன்றி (Done)
            </button>
          </div>
        </div>
      )}

      {/* ── NATIVE TAMIL VOICE AGENT (வேலா - VELA) ── */}
      <TamilVoiceAgent
        voiceAgent={voiceAgent}
        isOpen={voiceDrawerOpen}
        onClose={() => setVoiceDrawerOpen(false)}
        onOpen={() => setVoiceDrawerOpen(true)}
      />
    </div>
  );
}
