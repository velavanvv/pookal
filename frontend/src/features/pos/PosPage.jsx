import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function PosPage() {
  const [products,     setProducts]     = useState([]);
  const [search,       setSearch]       = useState('');
  const [cart,         setCart]         = useState([]);
  const [customerPhone,setCustomerPhone]= useState('');
  const [customer,     setCustomer]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [lastOrder,    setLastOrder]    = useState(null);
  const [shopSettings, setShopSettings] = useState({});
  const receiptRef = useRef(null);

  const loadProducts = () =>
    api.get('/catalog/products?per_page=100').then(({ data }) =>
      setProducts(data.data || data)
    );

  useEffect(() => {
    Promise.all([
      loadProducts(),
      api.get('/settings'),
    ]).then(([, settingsRes]) => {
      setShopSettings(settingsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const stockOf    = (id)  => products.find((p) => p.id === id)?.stock ?? 0;
  const cartQtyOf  = (id)  => cart.find((c) => c.product_id === id)?.qty ?? 0;
  const canAdd     = (p)   => (p.stock ?? 0) - cartQtyOf(p.id) > 0;

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    if (!canAdd(product)) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) return prev.map((c) => c.product_id === product.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { product_id: product.id, name: product.name, sku: product.sku, unit_price: product.price, stock: product.stock ?? 0, qty: 1 }];
    });
  };

  const updateQty = (product_id, delta) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.product_id !== product_id) return c;
        const newQty = c.qty + delta;
        if (newQty > stockOf(product_id)) return c;
        return { ...c, qty: newQty };
      }).filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (product_id) => setCart((prev) => prev.filter((c) => c.product_id !== product_id));

  const subtotal   = cart.reduce((s, c) => s + c.qty * c.unit_price, 0);
  const taxRate    = parseFloat(shopSettings.tax_rate || 5);
  const tax        = Math.round(subtotal * (taxRate / 100));
  const grandTotal = subtotal + tax;
  const symbol     = shopSettings.currency_symbol || 'Rs.';

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

  const handleCharge = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        customer_id: customer?.id || null,
        channel:     'store',
        items:       cart.map((c) => ({ product_id: c.product_id, qty: c.qty, unit_price: c.unit_price })),
      });
      setLastOrder({
        order_number: data.order?.order_number || 'ORD-???',
        items:        [...cart],
        subtotal, tax, grandTotal, taxRate, customer,
        timestamp: new Date().toLocaleString('en-IN'),
      });
      setCart([]);
      setCustomer(null);
      setCustomerPhone('');
      loadProducts();
    } catch (err) {
      const stockErrors = err?.response?.data?.errors?.stock;
      if (stockErrors) alert('Stock issue:\n' + stockErrors.join('\n'));
      else alert('Order failed. Please try again.');
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', minHeight: 'calc(100vh - 80px)', alignItems: 'start' }}>

      {/* ── Left: product grid ── */}
      <div className="pk-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        <div className="pk-card__head">
          <div className="pk-card__title">Products</div>
          <div className="pk-search" style={{ marginLeft: 'auto' }}>
            <i className="bi bi-search" />
            <input
              className="pk-input"
              style={{ width: 240, paddingLeft: '2.25rem' }}
              placeholder="Search name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="pk-card__body" style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="pk-loading">
              <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
              <span>Loading products…</span>
            </div>
          ) : (
            <div className="pos-product-grid">
              {filtered.map((p) => {
                const stock      = p.stock ?? 0;
                const inCart     = cartQtyOf(p.id);
                const outOfStock = stock <= 0;
                const atMax      = !outOfStock && stock - inCart <= 0;

                return (
                  <button
                    key={p.id}
                    className={`pos-product-card ${outOfStock ? 'pos-product-card--oos' : atMax ? 'pos-product-card--maxed' : ''}`}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="pos-product-card__img" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="pos-product-card__img-placeholder"><i className="bi bi-flower1" /></div>
                    )}
                    <span className="pos-product-card__cat">{p.category}</span>
                    <strong>{p.name}</strong>
                    <span className="pos-product-card__price">{symbol} {Number(p.price).toLocaleString()}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                      {outOfStock ? (
                        <span className="pk-badge pk-badge--danger">Out of stock</span>
                      ) : stock <= (p.reorder_level || 5) ? (
                        <span className="pk-badge pk-badge--warning">Low: {stock}</span>
                      ) : (
                        <span className="pk-badge pk-badge--gray">Stock: {stock}</span>
                      )}
                      {inCart > 0 && <span className="pk-badge" style={{ background: '#18181b', color: '#fff' }}>In cart: {inCart}</span>}
                      {p.track_freshness && <span className="pk-badge pk-badge--success">{p.freshness_days}d fresh</span>}
                    </div>
                    <small style={{ color: 'var(--text-3)', fontFamily: 'monospace', fontSize: '0.72rem' }}>{p.sku}</small>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="pk-empty" style={{ gridColumn: '1 / -1' }}>
                  <i className="bi bi-search" />
                  <p>No products match.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: cart panel ── */}
      <div className="pk-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', position: 'sticky', top: '1rem' }}>
        <div className="pk-card__head">
          <div className="pk-card__title">Cart</div>
          {cart.length > 0 && (
            <span className="pk-badge pk-badge--rose" style={{ marginLeft: 'auto' }}>{cart.reduce((s, c) => s + c.qty, 0)} items</span>
          )}
        </div>
        <div className="pk-card__body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Customer lookup */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className="pk-search" style={{ flex: 1 }}>
              <i className="bi bi-person" />
              <input
                className="pk-input"
                style={{ width: '100%', paddingLeft: '2.25rem' }}
                placeholder="Customer phone…"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
            </div>
            <button className="pk-btn pk-btn--outline" onClick={handleLookup}>
              <i className="bi bi-search" />
            </button>
          </div>

          {customer && (
            <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span><i className="bi bi-person-check me-2" style={{ color: '#16a34a' }} />{customer.name}</span>
              <button onClick={() => setCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.75rem' }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
          )}

          {/* Cart items */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-3)' }}>
                <i className="bi bi-cart3" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }} />
                Tap products to add them
              </div>
            ) : (
              cart.map((item) => {
                const maxStock = stockOf(item.product_id);
                const atMax    = item.qty >= maxStock;
                return (
                  <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', background: '#fafafa', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{symbol} {Number(item.unit_price).toLocaleString()} × {item.qty}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => updateQty(item.product_id, -1)}>−</button>
                      <span style={{ width: 20, textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}>{item.qty}</span>
                      <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => updateQty(item.product_id, 1)} disabled={atMax}>+</button>
                      <button className="pk-btn pk-btn--sm" style={{ padding: '0.2rem 0.5rem', color: '#ef4444', border: '1.5px solid #fecaca', background: '#fff' }} onClick={() => removeFromCart(item.product_id)}>
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', minWidth: 64, textAlign: 'right' }}>
                      {symbol} {(item.qty * item.unit_price).toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Totals + Charge */}
        <div style={{ borderTop: '1.5px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {cart.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                <span>Subtotal</span><span>{symbol} {subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                <span>GST ({taxRate}%)</span><span>{symbol} {tax.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)', borderTop: '1.5px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span>Total</span>
                <span style={{ color: 'var(--pookal-rose)' }}>{symbol} {grandTotal.toLocaleString()}</span>
              </div>
            </>
          )}
          <button
            className="pk-btn pk-btn--dark"
            style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '0.75rem', marginTop: '0.25rem' }}
            disabled={cart.length === 0 || submitting}
            onClick={handleCharge}
          >
            {submitting
              ? <span className="spinner-border spinner-border-sm" />
              : cart.length === 0 ? 'Add products to charge' : `Charge  ${symbol} ${grandTotal.toLocaleString()}`}
          </button>
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {lastOrder && (
        <div className="pk-modal-bd" onClick={(e) => { if (e.target === e.currentTarget) setLastOrder(null); }}>
          <div className="pk-modal" style={{ maxWidth: 420 }}>
            <div className="pk-modal__head">
              <span className="pk-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="bi bi-receipt" style={{ color: '#16a34a' }} />
                Order Placed Successfully
              </span>
              <button className="pk-modal__close" onClick={() => setLastOrder(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="pk-modal__body">
              <div ref={receiptRef} className="receipt-print-area">
                <div className="center bold">{shopSettings.shop_name || 'Pookal Flowers'}</div>
                {shopSettings.shop_tagline && <div className="center" style={{ fontSize: '11px' }}>{shopSettings.shop_tagline}</div>}
                {shopSettings.shop_address && <div className="center" style={{ fontSize: '11px' }}>{shopSettings.shop_address}</div>}
                {shopSettings.shop_phone   && <div className="center" style={{ fontSize: '11px' }}>{shopSettings.shop_phone}</div>}
                {shopSettings.gstin        && <div className="center" style={{ fontSize: '11px' }}>GSTIN: {shopSettings.gstin}</div>}
                <div className="divider" />
                <div style={{ fontSize: '11px' }}>
                  <div>Order: <strong>{lastOrder.order_number}</strong></div>
                  <div>Date: {lastOrder.timestamp}</div>
                  {lastOrder.customer && <div>Customer: {lastOrder.customer.name}</div>}
                </div>
                <div className="divider" />
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <td><strong>Item</strong></td>
                      <td className="text-end"><strong>Qty</strong></td>
                      <td className="text-end"><strong>Amt</strong></td>
                    </tr>
                  </thead>
                  <tbody>
                    {lastOrder.items.map((item) => (
                      <tr key={item.product_id}>
                        <td style={{ paddingRight: 4 }}>{item.name}</td>
                        <td className="text-end">{item.qty}</td>
                        <td className="text-end">{symbol} {(item.qty * item.unit_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="divider" />
                <div style={{ fontSize: '11px' }}>
                  <div className="d-flex justify-content-between"><span>Subtotal</span><span>{symbol} {lastOrder.subtotal.toLocaleString()}</span></div>
                  <div className="d-flex justify-content-between"><span>GST ({lastOrder.taxRate}%)</span><span>{symbol} {lastOrder.tax.toLocaleString()}</span></div>
                  <div className="d-flex justify-content-between bold"><span>Total</span><span>{symbol} {lastOrder.grandTotal.toLocaleString()}</span></div>
                </div>
                <div className="divider" />
                <div className="center" style={{ fontSize: '11px' }}>{shopSettings.receipt_footer || 'Thank you for shopping with us!'}</div>
              </div>
            </div>
            <div className="pk-modal__foot">
              <button className="pk-btn pk-btn--ghost" onClick={() => setLastOrder(null)}>Close</button>
              <button className="pk-btn pk-btn--dark" onClick={handlePrint}>
                <i className="bi bi-printer" />Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
