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

  // ── helpers ────────────────────────────────────────────────────────────────
  const stockOf = (productId) =>
    products.find((p) => p.id === productId)?.stock ?? 0;

  const cartQtyOf = (productId) =>
    cart.find((c) => c.product_id === productId)?.qty ?? 0;

  const availableToAdd = (product) =>
    (product.stock ?? 0) - cartQtyOf(product.id);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  // ── cart actions ───────────────────────────────────────────────────────────
  const addToCart = (product) => {
    if (availableToAdd(product) <= 0) return; // hard stop

    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product_id === product.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name:       product.name,
          sku:        product.sku,
          unit_price: product.price,
          stock:      product.stock ?? 0,
          qty:        1,
        },
      ];
    });
  };

  const updateQty = (product_id, delta) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product_id !== product_id) return c;
          const maxStock = stockOf(product_id);
          const newQty   = c.qty + delta;
          if (newQty > maxStock) return c;   // clamp at stock
          return { ...c, qty: newQty };
        })
        .filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (product_id) =>
    setCart((prev) => prev.filter((c) => c.product_id !== product_id));

  // ── totals ─────────────────────────────────────────────────────────────────
  const subtotal    = cart.reduce((s, c) => s + c.qty * c.unit_price, 0);
  const taxRate     = parseFloat(shopSettings.tax_rate || 5);
  const tax         = Math.round(subtotal * (taxRate / 100));
  const grandTotal  = subtotal + tax;
  const symbol      = shopSettings.currency_symbol || 'Rs.';

  // ── customer lookup ────────────────────────────────────────────────────────
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

  // ── checkout ───────────────────────────────────────────────────────────────
  const handleCharge = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        customer_id: customer?.id || null,
        channel:     'store',
        items:       cart.map((c) => ({
          product_id: c.product_id,
          qty:        c.qty,
          unit_price: c.unit_price,
        })),
      });
      setLastOrder({
        order_number: data.order?.order_number || 'ORD-???',
        items:        [...cart],
        subtotal,
        tax,
        grandTotal,
        taxRate,
        customer,
        timestamp:    new Date().toLocaleString('en-IN'),
      });
      setCart([]);
      setCustomer(null);
      setCustomerPhone('');
      // Refresh stock counts after successful sale
      loadProducts();
    } catch (err) {
      const stockErrors = err?.response?.data?.errors?.stock;
      if (stockErrors) {
        alert('Stock issue:\n' + stockErrors.join('\n'));
      } else {
        alert('Order failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── print receipt ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: monospace; font-size:12px; margin:0; padding:16px; }
            table { width:100%; border-collapse:collapse; }
            td { padding:2px 0; }
            .text-end { text-align:right; }
            .divider { border-top:1px dashed #999; margin:6px 0; }
            .center { text-align:center; }
            .bold { font-weight:bold; }
          </style>
        </head>
        <body onload="window.print();window.close();">${printContent}</body>
      </html>
    `);
    win.document.close();
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="row g-3" style={{ minHeight: 'calc(100vh - 160px)' }}>

      {/* ── Left: product grid ──────────────────────────────────────────── */}
      <div className="col-lg-8">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-3">
              <h5 className="mb-0">Products</h5>
              <input
                className="form-control ms-auto"
                style={{ maxWidth: 280 }}
                placeholder="Search by name or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" />
              </div>
            ) : (
              <div className="pos-product-grid">
                {filtered.map((p) => {
                  const stock     = p.stock ?? 0;
                  const inCart    = cartQtyOf(p.id);
                  const canAdd    = stock - inCart > 0;
                  const outOfStock= stock <= 0;

                  return (
                    <button
                      key={p.id}
                      className={`pos-product-card ${outOfStock ? 'pos-product-card--oos' : !canAdd ? 'pos-product-card--maxed' : ''}`}
                      onClick={() => addToCart(p)}
                      disabled={outOfStock}
                      title={outOfStock ? 'Out of stock' : !canAdd ? 'Max stock in cart' : ''}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="pos-product-card__img"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="pos-product-card__img-placeholder">
                          <i className="bi bi-flower1" />
                        </div>
                      )}
                      <span className="pos-product-card__cat">{p.category}</span>
                      <strong>{p.name}</strong>
                      <span className="pos-product-card__price">
                        {symbol} {Number(p.price).toLocaleString()}
                      </span>

                      {/* Stock badge */}
                      <div className="d-flex align-items-center gap-1 flex-wrap">
                        {outOfStock ? (
                          <span className="badge text-bg-danger small">Out of stock</span>
                        ) : stock <= (p.reorder_level || 5) ? (
                          <span className="badge text-bg-warning small">Low: {stock} left</span>
                        ) : (
                          <span className="badge text-bg-light border text-muted small">Stock: {stock}</span>
                        )}
                        {inCart > 0 && (
                          <span className="badge text-bg-dark small">In cart: {inCart}</span>
                        )}
                        {p.track_freshness && (
                          <span className="badge text-bg-success-subtle text-success border border-success-subtle small">
                            {p.freshness_days}d fresh
                          </span>
                        )}
                      </div>
                      <small className="text-muted">{p.sku}</small>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-muted">No products match your search.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: cart ─────────────────────────────────────────────────── */}
      <div className="col-lg-4">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body d-flex flex-column">
            <h5 className="mb-3">Cart</h5>

            {/* Customer lookup */}
            <div className="input-group mb-2">
              <input
                className="form-control"
                placeholder="Customer phone…"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
              <button className="btn btn-outline-secondary" onClick={handleLookup}>
                <i className="bi bi-search" />
              </button>
            </div>
            {customer && (
              <div className="alert alert-success py-2 mb-3 d-flex align-items-center justify-content-between">
                <span><i className="bi bi-person-check me-2" />{customer.name}</span>
                <button className="btn-close" style={{ fontSize: '0.65rem' }} onClick={() => setCustomer(null)} />
              </div>
            )}

            {/* Cart items */}
            <div className="flex-grow-1" style={{ overflowY: 'auto', maxHeight: 380 }}>
              {cart.length === 0 ? (
                <p className="text-muted text-center py-4">Tap products to add them.</p>
              ) : (
                cart.map((item) => {
                  const maxStock  = stockOf(item.product_id);
                  const atMax     = item.qty >= maxStock;

                  return (
                    <div key={item.product_id} className="cart-item">
                      <div className="flex-grow-1">
                        <div className="fw-semibold small">{item.name}</div>
                        <div className="text-muted small">
                          {symbol} {Number(item.unit_price).toLocaleString()} × {item.qty}
                        </div>
                        {atMax && (
                          <div className="text-warning small">
                            <i className="bi bi-exclamation-triangle me-1" />Max stock ({maxStock})
                          </div>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => updateQty(item.product_id, -1)}
                        >−</button>
                        <span className="px-1">{item.qty}</span>
                        <button
                          className={`btn btn-sm ${atMax ? 'btn-secondary' : 'btn-outline-secondary'}`}
                          onClick={() => updateQty(item.product_id, 1)}
                          disabled={atMax}
                          title={atMax ? `Only ${maxStock} in stock` : ''}
                        >+</button>
                        <button
                          className="btn btn-sm btn-outline-danger ms-1"
                          onClick={() => removeFromCart(item.product_id)}
                        ><i className="bi bi-trash3" /></button>
                      </div>
                      <div className="text-end fw-semibold ms-2" style={{ minWidth: 68 }}>
                        {symbol} {(item.qty * item.unit_price).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Totals */}
            {cart.length > 0 && (
              <div className="border-top pt-3 mt-2">
                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>Subtotal</span><span>{symbol} {subtotal.toLocaleString()}</span>
                </div>
                <div className="d-flex justify-content-between small text-muted mb-2">
                  <span>GST ({taxRate}%)</span><span>{symbol} {tax.toLocaleString()}</span>
                </div>
                <div className="d-flex justify-content-between fw-bold mb-3">
                  <span>Total</span>
                  <span style={{ color: 'var(--pookal-rose)' }}>
                    {symbol} {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button
              className="btn btn-dark btn-lg"
              disabled={cart.length === 0 || submitting}
              onClick={handleCharge}
            >
              {submitting
                ? <span className="spinner-border spinner-border-sm" />
                : `Charge  ${symbol} ${grandTotal.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Receipt Modal ────────────────────────────────────────────────── */}
      {lastOrder && (
        <div
          className="modal fade show d-block"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setLastOrder(null); }}
        >
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h6 className="modal-title">
                  <i className="bi bi-receipt me-2 text-success" />Order Placed Successfully
                </h6>
                <button className="btn-close" onClick={() => setLastOrder(null)} />
              </div>
              <div className="modal-body">
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
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setLastOrder(null)}>Close</button>
                <button className="btn btn-dark btn-sm" onClick={handlePrint}>
                  <i className="bi bi-printer me-1" />Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
