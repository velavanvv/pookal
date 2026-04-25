import { useState, useEffect } from 'react';
import api from '../../services/api';

function stockStatus(stock, reorder) {
  if (stock <= 0)       return ['Critical', 'pk-badge--danger'];
  if (stock <= reorder) return ['Low',      'pk-badge--warning'];
  return                       ['OK',       'pk-badge--success'];
}

function freshnessLabel(days) {
  if (!days) return null;
  if (days <= 1) return ['1 day',    'pk-badge--danger'];
  if (days <= 3) return [`${days}d`, 'pk-badge--warning'];
  return               [`${days}d`, 'pk-badge--success'];
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

  const fetchItems = () =>
    api.get('/inventory/items').then(({ data }) => setItems(data)).finally(() => setLoading(false));

  useEffect(() => {
    fetchItems();
    api.get('/catalog/products?per_page=100').then(({ data }) => setProducts(data.data || data));
  }, []);

  const handleReceive = async e => {
    e.preventDefault(); setReceiveLoading(true);
    try {
      await api.post('/inventory/receive', {
        product_id: parseInt(receiveForm.product_id),
        qty: parseInt(receiveForm.qty), notes: receiveForm.notes,
      });
      setShowReceive(false); setReceiveForm({ product_id: '', qty: '', notes: '' }); fetchItems();
    } catch { alert('Failed to record receipt.'); }
    finally { setReceiveLoading(false); }
  };

  const handleAdjust = async e => {
    e.preventDefault(); setAdjustLoading(true);
    try {
      await api.post('/inventory/adjust', {
        product_id: adjustItem.id, qty_change: parseInt(adjustForm.qty_change), reason: adjustForm.reason,
      });
      setShowAdjust(false); setAdjustForm({ qty_change: '', reason: '' }); fetchItems();
    } catch { alert('Failed to save adjustment.'); }
    finally { setAdjustLoading(false); }
  };

  const openProductEdit = item => {
    setProductItem(item);
    setProductForm({ image_url: item.image_url || '', freshness_days: item.freshness_days || 3, reorder_level: item.reorder_level || 0, price: item.price || 0 });
    setShowProduct(true);
  };

  const handleProductSave = async e => {
    e.preventDefault(); setProductLoading(true);
    try {
      await api.patch(`/catalog/products/${productItem.id}`, {
        image_url: productForm.image_url || null,
        freshness_days: parseInt(productForm.freshness_days),
        reorder_level: parseInt(productForm.reorder_level),
        price: parseFloat(productForm.price),
      });
      setShowProduct(false); fetchItems();
      api.get('/catalog/products?per_page=100').then(({ data }) => setProducts(data.data || data));
    } catch { alert('Failed to update product.'); }
    finally { setProductLoading(false); }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Inventory</h4>
          <p className="pg-sub">{items.length} products tracked</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="pk-search">
            <i className="bi bi-search" />
            <input
              className="pk-input"
              style={{ width: 220, paddingLeft: '2.25rem' }}
              placeholder="Search name, SKU, category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="pk-btn pk-btn--rose" onClick={() => setShowReceive(true)}>
            <i className="bi bi-plus-lg" /> Receive Stock
          </button>
        </div>
      </div>

      <div className="pk-card">
        {loading ? (
          <div className="pk-loading">
            <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
            <span>Loading inventory…</span>
          </div>
        ) : (
          <table className="pk-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}></th>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Stock</th>
                <th>Reorder</th>
                <th>Status</th>
                <th>Freshness</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const [label, cls] = stockStatus(item.stock, item.reorder_level);
                const fresh = item.track_freshness ? freshnessLabel(item.freshness_days) : null;
                return (
                  <tr key={item.id || item.sku}>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: '#f4f4f5', display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
                          <i className="bi bi-flower1" />
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: '0.78rem', fontFamily: 'monospace' }}>{item.sku}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.category}</td>
                    <td style={{ color: 'var(--text-2)' }}>{item.unit}</td>
                    <td style={{ fontWeight: 700 }}>{item.stock}</td>
                    <td style={{ color: 'var(--text-2)' }}>{item.reorder_level}</td>
                    <td><span className={`pk-badge ${cls}`}>{label}</span></td>
                    <td>
                      {fresh ? (
                        <span className={`pk-badge ${fresh[1]}`}>
                          <i className="bi bi-clock" />{fresh[0]}
                        </span>
                      ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => { setAdjustItem(item); setShowAdjust(true); }}>
                          Adjust
                        </button>
                        <button className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => openProductEdit(item)}>
                          <i className="bi bi-pencil" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr className="pk-table__empty"><td colSpan={10}>No inventory items found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Receive Stock Modal */}
      {showReceive && (
        <div className="pk-modal-bd">
          <div className="pk-modal">
            <div className="pk-modal__head">
              <span className="pk-modal__title">Receive Stock</span>
              <button className="pk-modal__close" onClick={() => setShowReceive(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={handleReceive}>
              <div className="pk-modal__body">
                <div className="pk-field">
                  <label>Product</label>
                  <select className="pk-input" value={receiveForm.product_id} onChange={e => setReceiveForm(f => ({ ...f, product_id: e.target.value }))} required>
                    <option value="">Select product…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <div className="pk-field">
                  <label>Quantity</label>
                  <input type="number" className="pk-input" min="1" value={receiveForm.qty} onChange={e => setReceiveForm(f => ({ ...f, qty: e.target.value }))} required />
                </div>
                <div className="pk-field">
                  <label>Notes (optional)</label>
                  <input type="text" className="pk-input" value={receiveForm.notes} onChange={e => setReceiveForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="pk-modal__foot">
                <button type="button" className="pk-btn pk-btn--ghost" onClick={() => setShowReceive(false)}>Cancel</button>
                <button type="submit" className="pk-btn pk-btn--rose" disabled={receiveLoading}>
                  {receiveLoading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
                  Record Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjust && adjustItem && (
        <div className="pk-modal-bd">
          <div className="pk-modal">
            <div className="pk-modal__head">
              <span className="pk-modal__title">Adjust — {adjustItem.name}</span>
              <button className="pk-modal__close" onClick={() => setShowAdjust(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={handleAdjust}>
              <div className="pk-modal__body">
                <div className="pk-field">
                  <label>Quantity change <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(negative to deduct)</span></label>
                  <input type="number" className="pk-input" value={adjustForm.qty_change} onChange={e => setAdjustForm(f => ({ ...f, qty_change: e.target.value }))} placeholder="e.g. -5 for wastage, +10 for found stock" required />
                </div>
                <div className="pk-field">
                  <label>Reason</label>
                  <input type="text" className="pk-input" value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} placeholder="Wastage, counting error, etc." />
                </div>
              </div>
              <div className="pk-modal__foot">
                <button type="button" className="pk-btn pk-btn--ghost" onClick={() => setShowAdjust(false)}>Cancel</button>
                <button type="submit" className="pk-btn pk-btn--rose" disabled={adjustLoading}>
                  {adjustLoading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showProduct && productItem && (
        <div className="pk-modal-bd">
          <div className="pk-modal">
            <div className="pk-modal__head">
              <span className="pk-modal__title">Edit — {productItem.name}</span>
              <button className="pk-modal__close" onClick={() => setShowProduct(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <form onSubmit={handleProductSave}>
              <div className="pk-modal__body">
                <div className="pk-field">
                  <label>Image URL</label>
                  <input type="url" className="pk-input" value={productForm.image_url} onChange={e => setProductForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://example.com/flower.jpg" />
                  {productForm.image_url && (
                    <img src={productForm.image_url} alt="Preview" style={{ marginTop: '0.5rem', borderRadius: 'var(--radius-sm)', maxHeight: 100, objectFit: 'cover', width: '100%' }} onError={e => { e.target.style.display = 'none'; }} />
                  )}
                </div>
                {productItem.track_freshness && (
                  <div className="pk-field">
                    <label>Freshness (days)</label>
                    <input type="number" className="pk-input" min="1" max="365" value={productForm.freshness_days} onChange={e => setProductForm(f => ({ ...f, freshness_days: e.target.value }))} />
                  </div>
                )}
                <div className="pk-form-row">
                  <div className="pk-field">
                    <label>Price (Rs.)</label>
                    <input type="number" className="pk-input" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="pk-field">
                    <label>Reorder Level</label>
                    <input type="number" className="pk-input" min="0" value={productForm.reorder_level} onChange={e => setProductForm(f => ({ ...f, reorder_level: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="pk-modal__foot">
                <button type="button" className="pk-btn pk-btn--ghost" onClick={() => setShowProduct(false)}>Cancel</button>
                <button type="submit" className="pk-btn pk-btn--rose" disabled={productLoading}>
                  {productLoading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
