import { useState, useEffect } from 'react';
import api from '../../services/api';

function stockStatus(stock, reorder) {
  if (stock <= 0)       return ['Critical', 'danger'];
  if (stock <= reorder) return ['Low',      'warning'];
  return                       ['OK',       'success'];
}

function freshnessLabel(days) {
  if (!days) return null;
  if (days <= 1) return ['1 day',  'danger'];
  if (days <= 3) return [`${days}d`, 'warning'];
  return               [`${days}d`, 'success'];
}

export default function InventoryPage() {
  const [items,    setItems]    = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  const [showReceive,    setShowReceive]    = useState(false);
  const [receiveForm,    setReceiveForm]    = useState({ product_id: '', qty: '', notes: '' });
  const [receiveLoading, setReceiveLoading] = useState(false);

  const [showAdjust,    setShowAdjust]    = useState(false);
  const [adjustItem,    setAdjustItem]    = useState(null);
  const [adjustForm,    setAdjustForm]    = useState({ qty_change: '', reason: '' });
  const [adjustLoading, setAdjustLoading] = useState(false);

  const [showProduct,    setShowProduct]    = useState(false);
  const [productItem,    setProductItem]    = useState(null);
  const [productForm,    setProductForm]    = useState({});
  const [productLoading, setProductLoading] = useState(false);

  const fetchItems = () => {
    api.get('/inventory/items').then(({ data }) => setItems(data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
    api.get('/catalog/products?per_page=100').then(({ data }) => setProducts(data.data || data));
  }, []);

  const handleReceive = async (e) => {
    e.preventDefault();
    setReceiveLoading(true);
    try {
      await api.post('/inventory/receive', {
        product_id: parseInt(receiveForm.product_id),
        qty:        parseInt(receiveForm.qty),
        notes:      receiveForm.notes,
      });
      setShowReceive(false);
      setReceiveForm({ product_id: '', qty: '', notes: '' });
      fetchItems();
    } catch {
      alert('Failed to record receipt.');
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    setAdjustLoading(true);
    try {
      await api.post('/inventory/adjust', {
        product_id: adjustItem.id,
        qty_change: parseInt(adjustForm.qty_change),
        reason:     adjustForm.reason,
      });
      setShowAdjust(false);
      setAdjustForm({ qty_change: '', reason: '' });
      fetchItems();
    } catch {
      alert('Failed to save adjustment.');
    } finally {
      setAdjustLoading(false);
    }
  };

  const openProductEdit = (item) => {
    setProductItem(item);
    setProductForm({
      image_url:      item.image_url      || '',
      freshness_days: item.freshness_days || 3,
      reorder_level:  item.reorder_level  || 0,
      price:          item.price          || 0,
    });
    setShowProduct(true);
  };

  const handleProductSave = async (e) => {
    e.preventDefault();
    setProductLoading(true);
    try {
      await api.patch(`/catalog/products/${productItem.id}`, {
        image_url:      productForm.image_url      || null,
        freshness_days: parseInt(productForm.freshness_days),
        reorder_level:  parseInt(productForm.reorder_level),
        price:          parseFloat(productForm.price),
      });
      setShowProduct(false);
      fetchItems();
      // refresh products list too
      api.get('/catalog/products?per_page=100').then(({ data }) => setProducts(data.data || data));
    } catch {
      alert('Failed to update product.');
    } finally {
      setProductLoading(false);
    }
  };

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Inventory</h4>
        <div className="d-flex gap-2">
          <input
            className="form-control"
            style={{ width: 220 }}
            placeholder="Search name, SKU, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-dark" onClick={() => setShowReceive(true)}>
            <i className="bi bi-plus-lg me-2" />Receive Stock
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" />
            </div>
          ) : (
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 48 }}></th>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Stock</th>
                  <th>Reorder At</th>
                  <th>Status</th>
                  <th>Freshness</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const [label, color] = stockStatus(item.stock, item.reorder_level);
                  const fresh = item.track_freshness ? freshnessLabel(item.freshness_days) : null;
                  return (
                    <tr key={item.id || item.sku}>
                      <td className="p-1 ps-2">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="bi bi-flower1 text-muted" style={{ fontSize: 16 }} />
                          </div>
                        )}
                      </td>
                      <td className="text-muted small align-middle">{item.sku}</td>
                      <td className="fw-semibold align-middle">{item.name}</td>
                      <td className="align-middle">{item.category}</td>
                      <td className="text-muted align-middle">{item.unit}</td>
                      <td className="fw-bold align-middle">{item.stock}</td>
                      <td className="text-muted align-middle">{item.reorder_level}</td>
                      <td className="align-middle">
                        <span className={`badge text-bg-${color}`}>{label}</span>
                      </td>
                      <td className="align-middle">
                        {fresh ? (
                          <span className={`badge text-bg-${fresh[1]}`}>
                            <i className="bi bi-clock me-1" />{fresh[0]}
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td className="align-middle">
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => { setAdjustItem(item); setShowAdjust(true); }}
                          >
                            Adjust
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            title="Edit product details"
                            onClick={() => openProductEdit(item)}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center text-muted py-4">
                      No inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Receive Stock Modal ───────────────────────────────────────── */}
      {showReceive && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Receive Stock</h5>
                <button className="btn-close" onClick={() => setShowReceive(false)} />
              </div>
              <form onSubmit={handleReceive}>
                <div className="modal-body d-grid gap-3">
                  <div>
                    <label className="form-label">Product</label>
                    <select
                      className="form-select"
                      value={receiveForm.product_id}
                      onChange={(e) => setReceiveForm((f) => ({ ...f, product_id: e.target.value }))}
                      required
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      value={receiveForm.qty}
                      onChange={(e) => setReceiveForm((f) => ({ ...f, qty: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Notes (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={receiveForm.notes}
                      onChange={(e) => setReceiveForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReceive(false)}>Cancel</button>
                  <button type="submit" className="btn btn-dark" disabled={receiveLoading}>
                    {receiveLoading ? <span className="spinner-border spinner-border-sm" /> : 'Record Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Modal ─────────────────────────────────────────────── */}
      {showAdjust && adjustItem && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adjust — {adjustItem.name}</h5>
                <button className="btn-close" onClick={() => setShowAdjust(false)} />
              </div>
              <form onSubmit={handleAdjust}>
                <div className="modal-body d-grid gap-3">
                  <div>
                    <label className="form-label">
                      Quantity change <span className="text-muted">(negative to deduct)</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={adjustForm.qty_change}
                      onChange={(e) => setAdjustForm((f) => ({ ...f, qty_change: e.target.value }))}
                      placeholder="e.g. -5 for wastage, +10 for found stock"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Reason</label>
                    <input
                      type="text"
                      className="form-control"
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                      placeholder="Wastage, counting error, etc."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdjust(false)}>Cancel</button>
                  <button type="submit" className="btn btn-dark" disabled={adjustLoading}>
                    {adjustLoading ? <span className="spinner-border spinner-border-sm" /> : 'Save Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Product Modal (image + freshness) ───────────────────── */}
      {showProduct && productItem && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit — {productItem.name}</h5>
                <button className="btn-close" onClick={() => setShowProduct(false)} />
              </div>
              <form onSubmit={handleProductSave}>
                <div className="modal-body d-grid gap-3">
                  <div>
                    <label className="form-label">Image URL</label>
                    <input
                      type="url"
                      className="form-control"
                      value={productForm.image_url}
                      onChange={(e) => setProductForm((f) => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://example.com/flower.jpg"
                    />
                    {productForm.image_url && (
                      <img
                        src={productForm.image_url}
                        alt="Preview"
                        className="mt-2 rounded"
                        style={{ maxHeight: 120, objectFit: 'cover', width: '100%' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                  {productItem.track_freshness && (
                    <div>
                      <label className="form-label">Freshness (days)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max="365"
                        value={productForm.freshness_days}
                        onChange={(e) => setProductForm((f) => ({ ...f, freshness_days: e.target.value }))}
                      />
                      <div className="form-text">How many days this product stays fresh after receiving.</div>
                    </div>
                  )}
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label">Price (Rs.)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Reorder Level</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={productForm.reorder_level}
                        onChange={(e) => setProductForm((f) => ({ ...f, reorder_level: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProduct(false)}>Cancel</button>
                  <button type="submit" className="btn btn-dark" disabled={productLoading}>
                    {productLoading ? <span className="spinner-border spinner-border-sm" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
