import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { useI18n } from '../auth/I18nContext';
import VoiceButton from '../../components/common/VoiceButton';

const EMPTY_FORM = {
  name: '',
  sku: '',
  barcode: '',
  category: '',
  price: '',
  pricing_mode: 'fixed',
  unit: 'piece',
  reorder_level: '',
  initial_stock: '',
  image_url: '',
  tax_category: '5',
  track_expiry: false,
  shelf_life_days: '',
  track_freshness: false,
  freshness_days: '',
};

const TEMPLATE_COLUMNS = ['name', 'sku', 'barcode', 'category', 'price', 'pricing_mode', 'unit', 'reorder_level', 'initial_stock', 'track_expiry', 'shelf_life_days', 'image_url'];

export default function ProductsPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [importRows, setImportRows] = useState([]);
  const [importName, setImportName] = useState('');

  const loadProducts = () =>
    api.get('/catalog/products?per_page=250')
      .then(({ data }) => setProducts(data.data || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) =>
      [product.name, product.sku, product.barcode, product.category, product.unit]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [products, search]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await api.post('/catalog/products', {
        name: form.name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode?.trim() || null,
        category: form.category.trim(),
        price: Number(form.price),
        pricing_mode: form.pricing_mode || 'fixed',
        unit: form.unit.trim() || null,
        reorder_level: form.reorder_level === '' ? 0 : Number(form.reorder_level),
        initial_stock: form.initial_stock === '' ? 0 : Number(form.initial_stock),
        image_url: form.image_url.trim() || null,
        tax_category: form.tax_category || 'standard',
        track_expiry: form.track_expiry || form.track_freshness,
        shelf_life_days: (form.track_expiry || form.track_freshness) && (form.shelf_life_days || form.freshness_days) !== '' ? Number(form.shelf_life_days || form.freshness_days) : null,
        track_freshness: form.track_expiry || form.track_freshness,
        freshness_days: (form.track_expiry || form.track_freshness) && (form.shelf_life_days || form.freshness_days) !== '' ? Number(form.shelf_life_days || form.freshness_days) : null,
      });

      setForm(EMPTY_FORM);
      loadProducts();
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to create product.');
    } finally {
      setSaving(false);
    }
  };

  const normalizeRow = (row) => {
    const normalized = Object.fromEntries(
      Object.entries(row || {}).map(([key, value]) => [
        String(key).trim().toLowerCase().replace(/\s+/g, '_'),
        typeof value === 'string' ? value.trim() : value,
      ])
    );

    if (!normalized.name || !normalized.sku || !normalized.category || normalized.price === undefined || normalized.price === '') {
      return null;
    }

    return {
      name: String(normalized.name),
      sku: String(normalized.sku),
      barcode: normalized.barcode ? String(normalized.barcode) : null,
      category: String(normalized.category),
      price: Number(normalized.price),
      pricing_mode: normalized.pricing_mode ? String(normalized.pricing_mode) : 'fixed',
      unit: normalized.unit ? String(normalized.unit) : 'piece',
      reorder_level: normalized.reorder_level === undefined || normalized.reorder_level === '' ? 0 : Number(normalized.reorder_level),
      initial_stock: normalized.initial_stock === undefined || normalized.initial_stock === '' ? 0 : Number(normalized.initial_stock),
      track_expiry: ['1', 'true', 'yes', 'y'].includes(String(normalized.track_expiry ?? normalized.track_freshness ?? '').toLowerCase()),
      shelf_life_days: (normalized.shelf_life_days ?? normalized.freshness_days) === undefined || (normalized.shelf_life_days ?? normalized.freshness_days) === '' ? null : Number(normalized.shelf_life_days ?? normalized.freshness_days),
      track_freshness: ['1', 'true', 'yes', 'y'].includes(String(normalized.track_expiry ?? normalized.track_freshness ?? '').toLowerCase()),
      freshness_days: (normalized.shelf_life_days ?? normalized.freshness_days) === undefined || (normalized.shelf_life_days ?? normalized.freshness_days) === '' ? null : Number(normalized.shelf_life_days ?? normalized.freshness_days),
      image_url: normalized.image_url ? String(normalized.image_url) : null,
    };
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        .map(normalizeRow)
        .filter(Boolean);

      if (rows.length === 0) {
        alert(`No valid rows found. Required columns: ${TEMPLATE_COLUMNS.join(', ')}`);
        return;
      }

      setImportRows(rows);
      setImportName(file.name);
    } catch {
      alert('Unable to read that file. Use CSV or Excel (.xlsx).');
    }
  };

  const handleImportSubmit = async () => {
    if (importRows.length === 0) return;

    setImporting(true);
    try {
      const { data } = await api.post('/catalog/products/import', { rows: importRows });
      alert(data.message || 'Products imported.');
      setImportRows([]);
      setImportName('');
      loadProducts();
    } catch (error) {
      alert(error?.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">{t('products')}</h4>
          <p className="pg-sub">{t('productCatalog')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a className="pk-btn pk-btn--outline" href="/product-import-template.csv" download>
            <i className="bi bi-filetype-csv" /> CSV Template
          </a>
          <a className="pk-btn pk-btn--outline" href="/product-import-template.xlsx" download>
            <i className="bi bi-file-earmark-excel" /> Excel Template
          </a>
        </div>
      </div>

      <div className="products-layout">
        <div className="pk-card">
          <div className="pk-card__head">
            <div>
              <div className="pk-card__title">Manual Add</div>
              <div className="pk-card__sub">Create one product with opening stock.</div>
            </div>
          </div>
          <form onSubmit={handleManualSubmit}>
            <div className="pk-card__body">
              <div className="pk-form-row">
                <div className="pk-field"><label>Name *</label><input className="pk-input" value={form.name} onChange={(e) => setField('name', e.target.value)} required /></div>
                <div className="pk-field"><label>SKU *</label><input className="pk-input" value={form.sku} onChange={(e) => setField('sku', e.target.value)} required /></div>
                <div className="pk-field"><label>Barcode / EAN</label><input className="pk-input" value={form.barcode} onChange={(e) => setField('barcode', e.target.value)} placeholder="Scanned barcode…" /></div>
                <div className="pk-field"><label>Category *</label><input className="pk-input" value={form.category} onChange={(e) => setField('category', e.target.value)} required /></div>
                <div className="pk-field">
                  <label>Pricing Mode</label>
                  <select className="pk-input" value={form.pricing_mode} onChange={(e) => setField('pricing_mode', e.target.value)}>
                    <option value="fixed">Fixed Price</option>
                    <option value="weight">Weight Based (Per Kg/g)</option>
                    <option value="service">Service Rate</option>
                  </select>
                </div>
                <div className="pk-field"><label>Unit</label><input className="pk-input" value={form.unit} onChange={(e) => setField('unit', e.target.value)} placeholder="piece, kg, plate…" /></div>
                <div className="pk-field"><label>Price *</label><input type="number" min="0" step="0.01" className="pk-input" value={form.price} onChange={(e) => setField('price', e.target.value)} required /></div>
                <div className="pk-field"><label>Opening Stock</label><input type="number" min="0" className="pk-input" value={form.initial_stock} onChange={(e) => setField('initial_stock', e.target.value)} /></div>
                <div className="pk-field"><label>Reorder Level</label><input type="number" min="0" className="pk-input" value={form.reorder_level} onChange={(e) => setField('reorder_level', e.target.value)} /></div>
                <div className="pk-field"><label>Image URL</label><input className="pk-input" value={form.image_url} onChange={(e) => setField('image_url', e.target.value)} placeholder="https://…" /></div>
              </div>

              <label className="products-toggle">
                <input type="checkbox" checked={form.track_expiry || form.track_freshness} onChange={(e) => { setField('track_expiry', e.target.checked); setField('track_freshness', e.target.checked); }} />
                <span>Track expiry / shelf life for perishable items</span>
              </label>

              {(form.track_expiry || form.track_freshness) && (
                <div className="pk-field" style={{ marginTop: '0.75rem' }}>
                  <label>Shelf life (days)</label>
                  <input type="number" min="1" max="365" className="pk-input" value={form.shelf_life_days || form.freshness_days} onChange={(e) => { setField('shelf_life_days', e.target.value); setField('freshness_days', e.target.value); }} required />
                </div>
              )}
            </div>
            <div className="pk-card__foot">
              <button type="submit" className="pk-btn pk-btn--dark" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-plus-circle" />}
                Create Product
              </button>
            </div>
          </form>
        </div>

        <div className="pk-card">
          <div className="pk-card__head">
            <div>
              <div className="pk-card__title">Excel / CSV Import</div>
              <div className="pk-card__sub">Upload many products at once using the reference file.</div>
            </div>
          </div>
          <div className="pk-card__body">
            <label className="products-upload">
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFile} />
              <i className="bi bi-cloud-arrow-up" />
              <strong>Choose CSV or Excel file</strong>
              <span>Use the template columns: {TEMPLATE_COLUMNS.join(', ')}</span>
            </label>

            {importRows.length > 0 && (
              <div className="products-import-preview">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{importName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{importRows.length} valid rows ready to import</div>
                  </div>
                  <button type="button" className="pk-btn pk-btn--rose" disabled={importing} onClick={handleImportSubmit}>
                    {importing ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-upload" />}
                    Import Products
                  </button>
                </div>

                <div className="products-preview-table">
                  <table className="pk-table">
                    <thead>
                      <tr>
                        <th>SKU / Barcode</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Pricing</th>
                        <th>Price</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 6).map((row) => (
                        <tr key={row.sku}>
                          <td>{row.sku}</td>
                          <td>{row.name}</td>
                          <td>{row.category}</td>
                          <td><span className="pk-badge pk-badge--info">{row.pricing_mode || 'fixed'}</span></td>
                          <td>Rs. {Number(row.price).toLocaleString()}</td>
                          <td>{row.initial_stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importRows.length > 6 && (
                    <div style={{ paddingTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-2)' }}>
                      Showing first 6 rows only.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pk-card" style={{ marginTop: '1.25rem' }}>
        <div className="pk-card__head">
          <div className="pk-card__title">{t('productCatalog')}</div>
          <div className="pk-search" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <i className="bi bi-search" />
            <input
              className="pk-input"
              style={{ width: 220, paddingLeft: '2.25rem' }}
              placeholder={t('searchProducts')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <VoiceButton small onResult={(text) => setSearch(text)} />
          </div>
        </div>
        <div className="pk-card__body">
          {loading ? (
            <div className="pk-loading">
              <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
              <span>Loading products…</span>
            </div>
          ) : (
            <table className="pk-table">
              <thead>
                <tr>
                  <th>{t('sku')} / {t('barcode')}</th>
                  <th>{t('productName')}</th>
                  <th>{t('category')}</th>
                  <th>{t('pricingMode')}</th>
                  <th>{t('price')}</th>
                  <th>{t('stock')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-2)' }}>
                      <div>{product.sku}</div>
                      {product.barcode && <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>BC: {product.barcode}</div>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{product.name}</td>
                    <td>{product.category}</td>
                    <td>
                      <span className="pk-badge pk-badge--info" style={{ fontSize: '0.72rem' }}>
                        {product.pricing_mode === 'weight' ? 'Weight-based' : 'Fixed'}
                      </span>
                    </td>
                    <td>Rs. {Number(product.price).toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>/{product.unit || 'unit'}</span></td>
                    <td>{product.stock ?? 0}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr className="pk-table__empty"><td colSpan={6}>No products found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
