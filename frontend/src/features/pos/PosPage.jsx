import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../auth/I18nContext';
import { speakText } from '../../hooks/useVoice';
import VoiceButton from '../../components/common/VoiceButton';

export default function PosPage() {
  const { user, businessType, posMode, hasCapability } = useAuth();
  const { locale, t } = useI18n();
  const location = useLocation();

  const [products,      setProducts]      = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [selectedCat,   setSelectedCat]   = useState('All');
  const [search,        setSearch]        = useState('');
  const [barcodeInput,  setBarcodeInput]  = useState('');
  const [cart,          setCart]          = useState([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer,      setCustomer]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [lastOrder,     setLastOrder]     = useState(null);
  const [shopSettings,  setShopSettings]  = useState({});
  const [mobileTab,     setMobileTab]     = useState('products'); // 'products' | 'cart'

  // Vertical & Restaurant State
  const [orderType,     setOrderType]     = useState(businessType === 'restaurant' ? 'dine_in' : 'in_store');
  const [tables,        setTables]        = useState([]);
  const [selectedTable, setSelectedTable] = useState(location.state?.tableId || '');
  const [discountAmount,setDiscountAmount]= useState(0);

  // Modals
  const [weightModalItem, setWeightModalItem] = useState(null);
  const [weightInput,     setWeightInput]     = useState('1.000');
  const [modifierModalItem, setModifierModalItem] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [itemNotes,         setItemNotes]         = useState('');

  // Payment Modal
  const [showPayModal,    setShowPayModal]    = useState(false);
  const [payMethod,       setPayMethod]       = useState('cash'); // 'cash' | 'upi' | 'card' | 'split'
  const [cashTendered,    setCashTendered]    = useState('');
  const [splitCash,       setSplitCash]       = useState('');
  const [splitUpi,        setSplitUpi]        = useState('');
  const [splitCard,       setSplitCard]       = useState('');

  const barcodeInputRef = useRef(null);
  const receiptRef = useRef(null);

  const loadProducts = () =>
    api.get('/catalog/products?per_page=150').then(({ data }) => {
      const list = data.data || data;
      setProducts(list);
      const cats = ['All', ...new Set(list.map(p => p.category).filter(Boolean))];
      setCategories(cats);
    });

  const loadTables = () => {
    if (hasCapability('restaurant') || businessType === 'restaurant') {
      api.get('/restaurant/tables').then(({ data }) => {
        setTables(data.data || []);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    Promise.all([
      loadProducts(),
      api.get('/settings'),
    ]).then(([, settingsRes]) => {
      setShopSettings(settingsRes.data);
      loadTables();
    }).finally(() => setLoading(false));
  }, [businessType]);

  // Handle Barcode Scan / Enter
  const handleBarcodeSubmit = (e) => {
    e?.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const matched = products.find(p =>
      (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase() === code.toLowerCase())
    );

    if (matched) {
      triggerAddToCart(matched);
      setBarcodeInput('');
    } else {
      alert(`No product found with barcode / SKU: ${code}`);
    }
  };

  const stockOf   = (id) => products.find((p) => p.id === id)?.stock ?? 0;
  const cartQtyOf = (id) => cart.filter((c) => c.product_id === id).reduce((s, c) => s + c.qty, 0);
  const canAdd    = (p)  => (p.stock ?? 0) - cartQtyOf(p.id) > 0;

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCat === 'All' || p.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  const triggerAddToCart = (product) => {
    if (!canAdd(product)) return;

    // If product has modifiers, open modifier modal
    if (product.modifiers && product.modifiers.length > 0) {
      setModifierModalItem(product);
      setSelectedModifiers([]);
      setItemNotes('');
      return;
    }

    // If product is weight-based, open weight keypad modal
    if (product.pricing_mode === 'weight' || product.unit === 'kg' || product.unit === 'g') {
      setWeightModalItem(product);
      setWeightInput('1.000');
      return;
    }

    // Direct standard item add
    addToCartDirect(product, 1, null, [], '');
  };

  const addToCartDirect = (product, qty, weight, modifiersList, notes) => {
    const extraPrice = modifiersList.reduce((acc, m) => acc + (m.price_delta || 0), 0);
    const unitPrice = Number(product.price) + extraPrice;
    const cartItemId = `${product.id}-${modifiersList.map(m => m.name).join('_')}-${notes || ''}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.cartItemId === cartItemId);
      if (existing && !weight) {
        return prev.map((c) => c.cartItemId === cartItemId ? { ...c, qty: c.qty + qty } : c);
      }
      return [
        ...prev,
        {
          cartItemId,
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          pricing_mode: product.pricing_mode || 'fixed',
          unit: product.unit || 'piece',
          weight: weight || null,
          unit_price: unitPrice,
          modifiers: modifiersList.map(m => m.name),
          notes: notes || '',
          stock: product.stock ?? 0,
          qty: qty,
        },
      ];
    });
  };

  const confirmWeightAdd = () => {
    if (!weightModalItem) return;
    const w = parseFloat(weightInput) || 1;
    addToCartDirect(weightModalItem, w, w, [], '');
    setWeightModalItem(null);
  };

  const confirmModifierAdd = () => {
    if (!modifierModalItem) return;
    addToCartDirect(modifierModalItem, 1, null, selectedModifiers, itemNotes);
    setModifierModalItem(null);
  };

  const updateQty = (cartItemId, delta) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.cartItemId !== cartItemId) return c;
        const newQty = c.qty + delta;
        if (newQty > stockOf(c.product_id)) return c;
        return { ...c, qty: newQty };
      }).filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (cartItemId) => setCart((prev) => prev.filter((c) => c.cartItemId !== cartItemId));

  const rawSubtotal = cart.reduce((s, c) => s + c.qty * c.unit_price, 0);
  const discount    = Math.min(rawSubtotal, Math.max(0, parseFloat(discountAmount) || 0));
  const subtotal    = Math.max(0, rawSubtotal - discount);
  const taxRate     = parseFloat(shopSettings.tax_rate || 5);
  const tax         = Math.round(subtotal * (taxRate / 100));
  const grandTotal  = subtotal + tax;
  const symbol      = shopSettings.currency_symbol || 'Rs.';
  const cartCount   = cart.reduce((s, c) => s + c.qty, 0);

  const handleLookup = async () => {
    if (!customerPhone.trim()) return;
    try {
      const { data } = await api.get(`/crm/customers?phone=${customerPhone}`);
      const list = data.data || data;
      setCustomer(list.length > 0 ? list[0] : { name: 'Walk-in customer', phone: customerPhone });
    } catch {
      setCustomer({ name: 'Walk-in customer', phone: customerPhone });
    }
  };

  const handleCreateOrder = async (isDraftKot = false) => {
    if (cart.length === 0) return;
    setSubmitting(true);

    let paymentPayload = null;
    if (payMethod === 'split') {
      paymentPayload = [
        { method: 'cash', amount: parseFloat(splitCash) || 0 },
        { method: 'upi',  amount: parseFloat(splitUpi) || 0 },
        { method: 'card', amount: parseFloat(splitCard) || 0 },
      ].filter(p => p.amount > 0);
    } else {
      paymentPayload = [{ method: payMethod, amount: grandTotal }];
    }

    try {
      const { data } = await api.post('/orders', {
        customer_id: customer?.id || null,
        channel: 'store',
        order_type: orderType,
        table_id: (orderType === 'dine_in' && selectedTable) ? parseInt(selectedTable) : null,
        payment_method: isDraftKot ? 'unpaid' : payMethod,
        payments: isDraftKot ? null : paymentPayload,
        discount_total: discount,
        create_kot: isDraftKot || orderType === 'dine_in',
        metadata: {
          table_name: tables.find(t => String(t.id) === String(selectedTable))?.name || null,
          cashier: user?.name || 'Staff',
        },
        items: cart.map((c) => ({
          product_id: c.product_id,
          qty: c.qty,
          weight: c.weight || null,
          unit_price: c.unit_price,
          modifiers: c.modifiers || [],
          notes: c.notes || null,
        })),
      });

      setLastOrder({
        order_number: data.order?.order_number || 'ORD-???',
        items: [...cart],
        subtotal: rawSubtotal,
        discount,
        tax,
        grandTotal,
        taxRate,
        customer,
        orderType,
        tableName: tables.find(t => String(t.id) === String(selectedTable))?.name || null,
        paymentMethod: isDraftKot ? 'Unpaid / KOT Sent' : payMethod,
        timestamp: new Date().toLocaleString('en-IN'),
      });

      setCart([]);
      setCustomer(null);
      setCustomerPhone('');
      setDiscountAmount(0);
      setShowPayModal(false);
      setMobileTab('products');
      loadProducts();
      loadTables();
      speakText(t('orderSuccess'), locale);
    } catch (err) {
      const stockErrors = err?.response?.data?.errors?.stock;
      if (stockErrors) alert('Stock issue:\n' + stockErrors.join('\n'));
      else alert(err.response?.data?.message || 'Order failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`<html><head><title>Receipt</title><style>
      body{font-family:monospace;font-size:12px;margin:0;padding:16px;}
      table{width:100%;border-collapse:collapse;}td{padding:2px 0;}
      .text-end{text-align:right;}.divider{border-top:1px dashed #999;margin:6px 0;}
      .center{text-align:center;}.bold{font-weight:bold;}
    </style></head><body onload="window.print();window.close();">${printContent}</body></html>`);
    win.document.close();
  };

  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - grandTotal);
  const splitTotal = (parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) + (parseFloat(splitCard) || 0);
  const splitRemaining = Math.max(0, grandTotal - splitTotal);

  return (
    <div>
      {/* ── TOP ACTION & BARCODE STRIP ── */}
      <div className="pk-card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Order type pill switcher */}
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`pk-btn ${orderType === 'in_store' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
              onClick={() => setOrderType('in_store')}
            >
              <i className="bi bi-cart3 me-1" /> Retail Sale
            </button>
            {(hasCapability('restaurant') || businessType === 'restaurant') && (
              <button
                type="button"
                className={`pk-btn ${orderType === 'dine_in' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
                onClick={() => setOrderType('dine_in')}
              >
                <i className="bi bi-cup-hot me-1" /> Dine-in Table
              </button>
            )}
            <button
              type="button"
              className={`pk-btn ${orderType === 'takeaway' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
              onClick={() => setOrderType('takeaway')}
            >
              <i className="bi bi-bag me-1" /> Takeaway
            </button>
            <button
              type="button"
              className={`pk-btn ${orderType === 'delivery' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
              onClick={() => setOrderType('delivery')}
            >
              <i className="bi bi-truck me-1" /> Delivery
            </button>
          </div>

          {/* Table selector for dine-in */}
          {orderType === 'dine_in' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-2)' }}>Table:</span>
              <select
                value={selectedTable}
                onChange={e => setSelectedTable(e.target.value)}
                className="form-select form-select-sm"
                style={{ width: '130px', fontWeight: 600 }}
              >
                <option value="">-- Choose --</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Barcode scanner listener input */}
          <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
            <div className="pk-search" style={{ width: '220px' }}>
              <i className="bi bi-upc-scan" />
              <input
                ref={barcodeInputRef}
                className="pk-input"
                style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.82rem' }}
                placeholder="Scan / Type Barcode (Enter)…"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
              />
            </div>
          </form>
        </div>
      </div>

      {/* ── MOBILE TABS TOGGLE ── */}
      <div className="d-flex d-md-none gap-2 mb-3">
        <button
          className={`pk-btn flex-fill ${mobileTab === 'products' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
          onClick={() => setMobileTab('products')}
        >
          <i className="bi bi-grid me-1" /> Products ({products.length})
        </button>
        <button
          className={`pk-btn flex-fill ${mobileTab === 'cart' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
          onClick={() => setMobileTab('cart')}
        >
          <i className="bi bi-cart3 me-1" /> Cart ({cart.length}) · {symbol} {grandTotal}
        </button>
      </div>

      {/* ── MAIN POS SPLIT VIEW (LEFT: PRODUCTS, RIGHT: BILLING CART) ── */}
      <div className="pos-layout">
        {/* LEFT: PRODUCTS & CATEGORIES PANEL */}
        <div className={`pk-card pos-panel ${mobileTab === 'cart' ? 'd-none d-md-flex' : ''}`}>
          <div className="pk-card__head" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="pk-card__title">
                {businessType === 'restaurant' ? t('menuItems') : t('catalog')}
              </div>
              <div className="pk-search" style={{ width: 220, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <i className="bi bi-search" />
                <input
                  className="pk-input"
                  style={{ width: '100%', paddingLeft: '2.25rem' }}
                  placeholder={t('searchNameSku')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <VoiceButton small onResult={(text) => setSearch(text)} />
              </div>
            </div>

            {/* Category Pill Filters */}
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`pk-btn pk-btn--sm ${selectedCat === cat ? 'pk-btn--primary' : 'pk-btn--outline'}`}
                  style={{ whiteSpace: 'nowrap', borderRadius: '9999px', fontSize: '0.75rem', padding: '0.2rem 0.75rem' }}
                  onClick={() => setSelectedCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pk-card__body" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {loading ? (
              <div className="pk-loading">
                <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
                <span>{t('loading')}</span>
              </div>
            ) : (
              <div className="pos-product-grid">
                {filtered.map((p) => {
                  const stock      = p.stock ?? 0;
                  const inCart     = cartQtyOf(p.id);
                  const outOfStock = stock <= 0;
                  const atMax      = !outOfStock && stock - inCart <= 0;
                  const isWeight   = p.pricing_mode === 'weight';
                  const hasMods    = p.modifiers && p.modifiers.length > 0;

                  return (
                    <button
                      key={p.id}
                      className={`pos-product-card ${outOfStock ? 'pos-product-card--oos' : atMax ? 'pos-product-card--maxed' : ''}`}
                      onClick={() => triggerAddToCart(p)}
                      disabled={outOfStock}
                      style={{ position: 'relative' }}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="pos-product-card__img" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="pos-product-card__img-placeholder">
                          <i className={isWeight ? 'bi-scale' : hasMods ? 'bi-sliders' : 'bi-box-seam'} />
                        </div>
                      )}
                      <span className="pos-product-card__cat">{p.category}</span>
                      <strong style={{ fontSize: '0.88rem', lineHeight: 1.25 }}>{p.name}</strong>
                      <span className="pos-product-card__price">
                        {symbol} {Number(p.price).toLocaleString()}
                        {isWeight && <span style={{ fontSize: '0.7rem', color: '#6b7280' }}> /{p.unit || 'kg'}</span>}
                      </span>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                        {outOfStock ? (
                          <span className="pk-badge pk-badge--danger">Out of stock</span>
                        ) : stock <= (p.reorder_level || 5) ? (
                          <span className="pk-badge pk-badge--warning">Low: {stock}</span>
                        ) : (
                          <span className="pk-badge pk-badge--gray">{stock} in stock</span>
                        )}
                        {inCart > 0 && <span className="pk-badge" style={{ background: '#18181b', color: '#fff' }}>Cart: {inCart}</span>}
                        {hasMods && <span className="pk-badge pk-badge--info">Options</span>}
                        {(p.track_expiry || p.track_freshness) && (
                          <span className="pk-badge pk-badge--success">{p.shelf_life_days || 3}d shelf</span>
                        )}
                      </div>
                      <small style={{ color: 'var(--text-3)', fontFamily: 'monospace', fontSize: '0.68rem', marginTop: 'auto' }}>
                        {p.barcode || p.sku}
                      </small>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="pk-empty" style={{ gridColumn: '1 / -1' }}>
                    <i className="bi bi-search" /><p>No matching products found.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CART & CHECKOUT BILLING REGISTER */}
        <div className={`pk-card pos-panel ${mobileTab === 'products' ? 'd-none d-md-flex' : ''}`} style={{ position: 'sticky', top: '75px' }}>
          <div className="pk-card__head">
            <div className="pk-card__title">{t('checkout')} {t('cart')}</div>
            {cart.length > 0 && (
              <span className="pk-badge pk-badge--rose" style={{ marginLeft: 'auto' }}>{cartCount} {t('products')}</span>
            )}
          </div>

          <div className="pk-card__body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Customer lookup */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <div className="pk-search" style={{ flex: 1 }}>
                <i className="bi bi-telephone" />
                <input
                  className="pk-input"
                  style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.82rem' }}
                  placeholder="Customer phone lookup…"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                />
              </div>
              <button type="button" className="pk-btn pk-btn--outline" onClick={handleLookup}>
                <i className="bi bi-search" />
              </button>
            </div>

            {customer && (
              <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span><i className="bi bi-person-check me-2" style={{ color: '#16a34a' }} />{customer.name}</span>
                <button onClick={() => setCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.75rem' }}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            )}

            {/* Cart items list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', maxHeight: '320px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-3)' }}>
                  <i className="bi bi-cart3" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }} />
                  {t('emptyCart')}
                </div>
              ) : (
                cart.map((item) => {
                  const maxStock = stockOf(item.product_id);
                  const atMax    = item.qty >= maxStock;

                  return (
                    <div key={item.cartItemId} className="pos-cart-item" style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-2)' }}>
                          {symbol} {Number(item.unit_price).toLocaleString()} × {item.qty} {item.weight ? item.unit : ''}
                        </div>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div style={{ fontSize: '0.7rem', color: '#d97706' }}>
                            + {item.modifiers.join(', ')}
                          </div>
                        )}
                        {item.notes && (
                          <div style={{ fontSize: '0.7rem', color: '#6b7280', fontStyle: 'italic' }}>
                            Note: {item.notes}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ padding: '0.15rem 0.45rem' }} onClick={() => updateQty(item.cartItemId, -1)}>−</button>
                        <span style={{ width: 28, textAlign: 'center', fontWeight: 700, fontSize: '0.82rem' }}>{item.qty}</span>
                        <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ padding: '0.15rem 0.45rem' }} onClick={() => updateQty(item.cartItemId, 1)} disabled={atMax}>+</button>
                        <button className="pk-btn pk-btn--sm text-danger" style={{ padding: '0.15rem 0.45rem', border: '1px solid #fee2e2', background: '#fff' }} onClick={() => removeFromCart(item.cartItemId)}>
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Discount & Totals */}
            <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Discount (Rs.):</span>
                <input
                  type="number"
                  min="0"
                  max={rawSubtotal}
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  style={{ width: '80px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', textAlign: 'right', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '0.25rem' }}>
                <span>{t('subtotal')}</span>
                <span>{symbol} {subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '0.25rem' }}>
                <span>{t('tax')} ({taxRate}%)</span>
                <span>{symbol} {tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--pookal-rose)', borderTop: '1.5px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.35rem' }}>
                <span>{t('grandTotal')}</span>
                <span>{symbol} {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              {(orderType === 'dine_in' || hasCapability('restaurant')) && (
                <button
                  type="button"
                  className="pk-btn pk-btn--outline flex-fill"
                  disabled={cart.length === 0 || submitting}
                  onClick={() => handleCreateOrder(true)}
                  title={t('sendKot')}
                >
                  <i className="bi bi-fire me-1" /> {t('sendKot')}
                </button>
              )}
              <button
                type="button"
                className="pk-btn pk-btn--primary flex-fill"
                style={{ fontSize: '0.95rem', padding: '0.65rem 1rem' }}
                disabled={cart.length === 0 || submitting}
                onClick={() => setShowPayModal(true)}
              >
                <i className="bi bi-wallet2 me-1" /> {t('payAndSettle')} ({symbol} {grandTotal})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── WEIGHT MODAL (FRESH PERISHABLE / BULK) ── */}
      {weightModalItem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '360px' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontSize: '1rem', fontWeight: 700 }}>
                  <i className="bi bi-scale me-1 text-primary" /> Enter Weight ({weightModalItem.name})
                </h5>
                <button type="button" className="btn-close" onClick={() => setWeightModalItem(null)} />
              </div>
              <div className="modal-body text-center">
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Rate: {symbol} {weightModalItem.price} / {weightModalItem.unit || 'kg'}
                </div>
                <div className="input-group input-group-lg mb-3">
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    className="form-control text-center fw-bold"
                    style={{ fontSize: '1.5rem' }}
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    autoFocus
                  />
                  <span className="input-group-text">{weightModalItem.unit || 'kg'}</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--pookal-rose)' }}>
                  Total: {symbol} {(parseFloat(weightInput || 0) * weightModalItem.price).toFixed(2)}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="pk-btn pk-btn--outline" onClick={() => setWeightModalItem(null)}>Cancel</button>
                <button type="button" className="pk-btn pk-btn--primary" onClick={confirmWeightAdd}>Add to Cart</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODIFIER SELECTION MODAL (RESTAURANT / CUSTOM GIFT) ── */}
      {modifierModalItem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontSize: '1rem', fontWeight: 700 }}>
                  Customize {modifierModalItem.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setModifierModalItem(null)} />
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label fw-bold" style={{ fontSize: '0.85rem' }}>Available Add-ons &amp; Modifiers</label>
                  {modifierModalItem.modifiers.map(m => {
                    const isChecked = selectedModifiers.some(sm => sm.name === m.name);
                    return (
                      <div key={m.id} className="form-check mb-2" style={{ background: '#f8fafc', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '6px' }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`mod-${m.id}`}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedModifiers([...selectedModifiers, m]);
                            else setSelectedModifiers(selectedModifiers.filter(sm => sm.name !== m.name));
                          }}
                        />
                        <label className="form-check-label d-flex justify-content-between pe-2" htmlFor={`mod-${m.id}`}>
                          <span>{m.name} {m.options?.length > 0 && `(${m.options.join(', ')})`}</span>
                          <strong style={{ color: 'var(--pookal-rose)' }}>+ {symbol} {m.price_delta}</strong>
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="mb-2">
                  <label className="form-label fw-bold" style={{ fontSize: '0.85rem' }}>Special Prep / Notes</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Extra spicy, less ice, gift ribbon"
                    value={itemNotes}
                    onChange={e => setItemNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="pk-btn pk-btn--outline" onClick={() => setModifierModalItem(null)}>Cancel</button>
                <button type="button" className="pk-btn pk-btn--primary" onClick={confirmModifierAdd}>Add Item</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MULTI-PAYMENT & SETTLEMENT MODAL ── */}
      {showPayModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  <i className="bi bi-wallet2 me-2 text-primary" /> Settle Payment
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowPayModal(false)} />
              </div>
              <div className="modal-body">
                {/* Total amount banner */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', padding: '0.75rem', textAlign: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Amount to Pay</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--pookal-rose)' }}>{symbol} {grandTotal.toFixed(2)}</div>
                </div>

                {/* Method selector */}
                <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>Choose Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '1rem' }}>
                  {[
                    { id: 'cash',  icon: 'bi-cash-stack',   label: 'Cash' },
                    { id: 'upi',   icon: 'bi-qr-code',      label: 'UPI QR' },
                    { id: 'card',  icon: 'bi-credit-card',  label: 'Card' },
                    { id: 'split', icon: 'bi-pie-chart',    label: 'Split' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`pk-btn ${payMethod === m.id ? 'pk-btn--primary' : 'pk-btn--outline'}`}
                      style={{ flexDirection: 'column', gap: '0.2rem', padding: '0.5rem 0.25rem', fontSize: '0.75rem' }}
                      onClick={() => setPayMethod(m.id)}
                    >
                      <i className={`bi ${m.icon}`} style={{ fontSize: '1.1rem' }} />
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Cash Method calculator */}
                {payMethod === 'cash' && (
                  <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e5e7eb' }}>
                    <label className="form-label fw-bold" style={{ fontSize: '0.8rem' }}>Cash Tendered (Rs.)</label>
                    <input
                      type="number"
                      className="form-control mb-2"
                      placeholder={`e.g. ${grandTotal}`}
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: changeDue > 0 ? '#16a34a' : '#6b7280' }}>
                      <span>Change Due:</span>
                      <span>{symbol} {changeDue.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* UPI QR preview */}
                {payMethod === 'upi' && (
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <i className="bi bi-qr-code-scan" style={{ fontSize: '3rem', color: '#2563eb', display: 'block', marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Scan with GPay / PhonePe / Paytm</p>
                    <small style={{ color: '#6b7280' }}>Verify payment notification on merchant device</small>
                  </div>
                )}

                {/* Split Payment Form */}
                {payMethod === 'split' && (
                  <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e5e7eb' }}>
                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Cash (Rs.)</label>
                      <input type="number" className="form-control form-control-sm" value={splitCash} onChange={e => setSplitCash(e.target.value)} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>UPI (Rs.)</label>
                      <input type="number" className="form-control form-control-sm" value={splitUpi} onChange={e => setSplitUpi(e.target.value)} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Card (Rs.)</label>
                      <input type="number" className="form-control form-control-sm" value={splitCard} onChange={e => setSplitCard(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: splitRemaining === 0 ? '#16a34a' : '#dc2626', marginTop: '0.5rem' }}>
                      <span>Remaining Balance:</span>
                      <span>{symbol} {splitRemaining.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="pk-btn pk-btn--outline" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="pk-btn pk-btn--primary"
                  disabled={submitting || (payMethod === 'split' && splitRemaining > 0.05)}
                  onClick={() => handleCreateOrder(false)}
                >
                  <i className="bi bi-check-circle me-1" /> Complete Sale ({symbol} {grandTotal.toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ORDER SUCCESS MODAL & RECEIPT ── */}
      {lastOrder && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-success"><i className="bi bi-check-circle-fill me-2" />Sale Completed</h5>
                <button type="button" className="btn-close" onClick={() => setLastOrder(null)} />
              </div>
              <div className="modal-body">
                {/* Print Receipt Container */}
                <div ref={receiptRef} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '1rem', fontFamily: 'monospace', fontSize: '11px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{shopSettings.shop_name || 'SHOP BILLING'}</div>
                    {shopSettings.shop_address && <div>{shopSettings.shop_address}</div>}
                    {shopSettings.shop_phone && <div>Ph: {shopSettings.shop_phone}</div>}
                    {shopSettings.gstin && <div>GSTIN: {shopSettings.gstin}</div>}
                  </div>
                  <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', margin: '6px 0' }}>
                    <div>Bill No: <strong>{lastOrder.order_number}</strong></div>
                    <div>Date: {lastOrder.timestamp}</div>
                    {lastOrder.tableName && <div>Table: <strong>{lastOrder.tableName}</strong></div>}
                    {lastOrder.customer?.name && <div>Customer: {lastOrder.customer.name}</div>}
                    <div>Type: {lastOrder.orderType?.toUpperCase()} · Paid via: {lastOrder.paymentMethod?.toUpperCase()}</div>
                  </div>
                  <table style={{ width: '100%', margin: '6px 0' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px dashed #999', textAlign: 'left' }}>
                        <th>Item</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastOrder.items.map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            {it.name}
                            {it.modifiers && it.modifiers.length > 0 && <div style={{ fontSize: '9px', color: '#555' }}>+{it.modifiers.join(', ')}</div>}
                          </td>
                          <td style={{ textAlign: 'center' }}>{it.qty}</td>
                          <td style={{ textAlign: 'right' }}>{(it.qty * it.unit_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ borderTop: '1px dashed #000', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span>{symbol} {lastOrder.subtotal.toFixed(2)}</span>
                    </div>
                    {lastOrder.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Discount:</span>
                        <span>- {symbol} {lastOrder.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>GST ({lastOrder.taxRate}%):</span>
                      <span>{symbol} {lastOrder.tax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', marginTop: '4px', paddingTop: '2px' }}>
                      <span>TOTAL:</span>
                      <span>{symbol} {lastOrder.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px' }}>
                    {shopSettings.receipt_footer || 'Thank you! Visit again.'}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="pk-btn pk-btn--primary" onClick={handlePrint}>
                  <i className="bi bi-printer me-1" /> Print Thermal Receipt
                </button>
                <button type="button" className="pk-btn pk-btn--outline" onClick={() => setLastOrder(null)}>
                  New Sale (Esc)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
