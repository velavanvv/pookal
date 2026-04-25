import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const TODAY = new Date().toISOString().slice(0, 10);
const UNITS  = ['kg', 'bunch', 'stems', 'boxes', 'nos'];
const CYCLES = [{ v: 'weekly', l: 'Weekly' }, { v: 'biweekly', l: 'Twice a Month' }, { v: 'monthly', l: 'Monthly' }];
const BUYER_TYPES = ['company', 'market', 'hotel', 'retailer', 'other'];

const STATUS_BADGE = { pending: 'pk-badge--warning', paid: 'pk-badge--success', draft: 'pk-badge--gray', confirmed: 'pk-badge--info' };

export default function VendorPage() {
  const [tab, setTab]             = useState('farmers');
  const [stats, setStats]         = useState(null);
  const [farmers, setFarmers]     = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [payments, setPayments]   = useState([]);
  const [buyers, setBuyers]       = useState([]);
  const [sales, setSales]         = useState([]);
  const [loading, setLoading]     = useState(true);

  const [showFarmerModal, setShowFarmerModal]     = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal]   = useState(false);
  const [showBuyerModal, setShowBuyerModal]       = useState(false);
  const [showSaleModal, setShowSaleModal]         = useState(false);
  const [showPayModal, setShowPayModal]           = useState(false);
  const [editFarmer, setEditFarmer]               = useState(null);
  const [editBuyer, setEditBuyer]                 = useState(null);
  const [selectedPayment, setSelectedPayment]     = useState(null);

  const [deliveryDate, setDeliveryDate]     = useState(TODAY);
  const [deliveryFarmer, setDeliveryFarmer] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    const [s, f, d, p, b, sl] = await Promise.all([
      api.get('/vendor/stats'),
      api.get('/vendor/farmers'),
      api.get(`/vendor/deliveries?date=${deliveryDate}${deliveryFarmer ? `&farmer_id=${deliveryFarmer}` : ''}`),
      api.get('/vendor/payments'),
      api.get('/vendor/buyers'),
      api.get('/vendor/sales'),
    ]);
    setStats(s.data); setFarmers(f.data); setDeliveries(d.data);
    setPayments(p.data); setBuyers(b.data); setSales(sl.data);
    setLoading(false);
  };

  const refreshDeliveries = () =>
    api.get(`/vendor/deliveries?date=${deliveryDate}${deliveryFarmer ? `&farmer_id=${deliveryFarmer}` : ''}`)
      .then(({ data }) => setDeliveries(data));

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { refreshDeliveries(); }, [deliveryDate, deliveryFarmer]);

  const tabs = [
    { key: 'farmers',  icon: 'bi-person-badge',      label: 'Farmers'          },
    { key: 'intake',   icon: 'bi-box-arrow-in-down',  label: 'Daily Intake'     },
    { key: 'payments', icon: 'bi-wallet2',            label: 'Farmer Payments'  },
    { key: 'buyers',   icon: 'bi-building',           label: 'Bulk Buyers'      },
    { key: 'sales',    icon: 'bi-receipt-cutoff',     label: 'Bulk Sales'       },
  ];

  const kpis = stats ? [
    { label: 'Active Farmers',       value: stats.total_farmers,                                            icon: 'bi-person-badge', tint: '#dbeafe', color: '#2563eb' },
    { label: 'Monthly Intake (Rs)',  value: Number(stats.monthly_intake_value).toLocaleString(),             icon: 'bi-flower1',      tint: '#dcfce7', color: '#16a34a' },
    { label: 'Pending Payouts',      value: `Rs. ${Number(stats.pending_farmer_payments).toLocaleString()}`, icon: 'bi-wallet2',      tint: '#fef9c3', color: '#d97706' },
    { label: 'Monthly Bulk Sales',   value: `Rs. ${Number(stats.monthly_bulk_sales).toLocaleString()}`,      icon: 'bi-graph-up',     tint: '#ede9fe', color: '#7c3aed' },
  ] : [];

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Vendor Management</h4>
          <p className="pg-sub">Farmers · Daily intake · Payments · Bulk sales</p>
        </div>
        <button className="pk-btn pk-btn--outline" onClick={fetchAll}>
          <i className="bi bi-arrow-clockwise" />Refresh
        </button>
      </div>

      {stats && (
        <div className="pk-kpi-row">
          {kpis.map((k) => (
            <div key={k.label} className="pk-kpi">
              <div className="pk-kpi__icon" style={{ background: k.tint, color: k.color }}>
                <i className={`bi ${k.icon}`} />
              </div>
              <div>
                <div className="pk-kpi__val">{k.value}</div>
                <div className="pk-kpi__lbl">{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pk-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`pk-tab ${tab === t.key ? 'pk-tab--active' : ''}`} onClick={() => setTab(t.key)}>
            <i className={`bi ${t.icon}`} style={{ marginRight: '0.4rem' }} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'farmers'  && <FarmersTab  farmers={farmers}  onAdd={() => { setEditFarmer(null); setShowFarmerModal(true); }} onEdit={(f) => { setEditFarmer(f); setShowFarmerModal(true); }} onDelete={async (f) => { if (!confirm(`Delete farmer "${f.name}"?`)) return; await api.delete(`/vendor/farmers/${f.id}`); fetchAll(); }} onImport={fetchAll} />}
      {tab === 'intake'   && <IntakeTab   deliveries={deliveries} farmers={farmers} deliveryDate={deliveryDate} setDeliveryDate={setDeliveryDate} deliveryFarmer={deliveryFarmer} setDeliveryFarmer={setDeliveryFarmer} onAdd={() => setShowDeliveryModal(true)} onDelete={async (d) => { if (!confirm('Delete this delivery record?')) return; await api.delete(`/vendor/deliveries/${d.id}`); refreshDeliveries(); }} />}
      {tab === 'payments' && <PaymentsTab payments={payments} farmers={farmers} onGenerate={() => setShowPaymentModal(true)} onMarkPaid={(p) => { setSelectedPayment(p); setShowPayModal(true); }} />}
      {tab === 'buyers'   && <BuyersTab   buyers={buyers} onAdd={() => { setEditBuyer(null); setShowBuyerModal(true); }} onEdit={(b) => { setEditBuyer(b); setShowBuyerModal(true); }} onDelete={async (b) => { if (!confirm(`Delete buyer "${b.name}"?`)) return; await api.delete(`/vendor/buyers/${b.id}`); fetchAll(); }} />}
      {tab === 'sales'    && <SalesTab    sales={sales} onAdd={() => setShowSaleModal(true)} onStatusChange={async (s, status) => { await api.patch(`/vendor/sales/${s.id}/status`, { status }); fetchAll(); }} onDelete={async (s) => { if (!confirm(`Delete invoice ${s.invoice_number}?`)) return; await api.delete(`/vendor/sales/${s.id}`); fetchAll(); }} />}

      {showFarmerModal    && <FarmerModal farmer={editFarmer} onClose={() => setShowFarmerModal(false)} onSaved={() => { setShowFarmerModal(false); fetchAll(); }} />}
      {showDeliveryModal  && <DeliveryModal farmers={farmers} onClose={() => setShowDeliveryModal(false)} onSaved={() => { setShowDeliveryModal(false); refreshDeliveries(); }} />}
      {showPaymentModal   && <GeneratePaymentModal farmers={farmers} onClose={() => setShowPaymentModal(false)} onSaved={() => { setShowPaymentModal(false); fetchAll(); }} />}
      {showPayModal && selectedPayment && <MarkPaidModal payment={selectedPayment} onClose={() => { setShowPayModal(false); setSelectedPayment(null); }} onSaved={() => { setShowPayModal(false); setSelectedPayment(null); fetchAll(); }} />}
      {showBuyerModal     && <BuyerModal buyer={editBuyer} onClose={() => setShowBuyerModal(false)} onSaved={() => { setShowBuyerModal(false); fetchAll(); }} />}
      {showSaleModal      && <BulkSaleModal buyers={buyers} onClose={() => setShowSaleModal(false)} onSaved={() => { setShowSaleModal(false); fetchAll(); }} />}
    </div>
  );
}

// ── Farmers Tab ──
function FarmersTab({ farmers, onAdd, onEdit, onDelete, onImport }) {
  const fileRef = useRef();

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const mapped = rows.map((r) => ({
      name:           r['name'] || r['Name'] || r['Farmer Name'] || '',
      phone:          r['phone'] || r['Phone'] || r['Mobile'] || '',
      email:          r['email'] || r['Email'] || '',
      address:        r['address'] || r['Address'] || '',
      payment_cycle:  (r['payment_cycle'] || r['Payment Cycle'] || 'biweekly').toLowerCase(),
      bank_name:      r['bank_name'] || r['Bank'] || '',
      account_number: r['account_number'] || r['Account No'] || r['Account Number'] || '',
      ifsc_code:      r['ifsc_code'] || r['IFSC'] || '',
    }));
    try {
      const { data } = await api.post('/vendor/farmers/import', { rows: mapped });
      alert(data.message);
      onImport();
    } catch { alert('Import failed. Check column headers.'); }
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'phone', 'email', 'address', 'payment_cycle', 'bank_name', 'account_number', 'ifsc_code'],
      ['Ravi Kumar', '9876543210', 'ravi@farm.in', 'Hosur Road', 'biweekly', 'SBI', '123456789', 'SBIN0001234'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Farmers');
    XLSX.writeFile(wb, 'pookal_farmers_template.xlsx');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className="pk-btn pk-btn--outline" onClick={downloadTemplate}><i className="bi bi-download" />Template</button>
        <button className="pk-btn pk-btn--outline" style={{ color: '#16a34a', borderColor: '#86efac' }} onClick={() => fileRef.current.click()}>
          <i className="bi bi-file-earmark-excel" />Import Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelUpload} />
        <button className="pk-btn pk-btn--dark" onClick={onAdd}><i className="bi bi-person-plus" />Add Farmer</button>
      </div>
      <div className="pk-card">
        <table className="pk-table">
          <thead>
            <tr>
              <th>Farmer</th><th>Phone</th><th>Payment Cycle</th><th>Bank</th>
              <th>Deliveries</th><th>Total Paid</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {farmers.map((f) => (
              <tr key={f.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{f.email}</div>
                </td>
                <td>{f.phone || '—'}</td>
                <td><span className="pk-badge pk-badge--info">{CYCLES.find(c => c.v === f.payment_cycle)?.l || f.payment_cycle}</span></td>
                <td>
                  {f.bank_name ? (
                    <div>
                      <div style={{ fontSize: '0.82rem' }}>{f.bank_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{f.account_number}</div>
                    </div>
                  ) : '—'}
                </td>
                <td>{f.deliveries_count}</td>
                <td>Rs. {Number(f.total_paid || 0).toLocaleString()}</td>
                <td><span className={`pk-badge ${f.is_active ? 'pk-badge--success' : 'pk-badge--gray'}`}>{f.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => onEdit(f)}><i className="bi bi-pencil" /></button>
                    <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => onDelete(f)}><i className="bi bi-trash3" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {farmers.length === 0 && <tr className="pk-table__empty"><td colSpan={8}>No farmers yet. Add one or import from Excel.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Daily Intake Tab ──
function IntakeTab({ deliveries, farmers, deliveryDate, setDeliveryDate, deliveryFarmer, setDeliveryFarmer, onAdd, onDelete }) {
  const dailyTotal = deliveries.reduce((s, d) => s + Number(d.total_amount), 0);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1rem', marginBottom: '1rem' }}>
        <div className="pk-field" style={{ margin: 0 }}>
          <label>Date</label>
          <input type="date" className="pk-input" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
        <div className="pk-field" style={{ margin: 0 }}>
          <label>Farmer</label>
          <select className="pk-input" value={deliveryFarmer} onChange={(e) => setDeliveryFarmer(e.target.value)}>
            <option value="">All farmers</option>
            {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {deliveries.length > 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
              Total: <strong style={{ color: '#16a34a' }}>Rs. {dailyTotal.toLocaleString()}</strong>
            </span>
          )}
          <button className="pk-btn pk-btn--dark" onClick={onAdd}><i className="bi bi-plus-lg" />Record Delivery</button>
        </div>
      </div>
      <div className="pk-card">
        <table className="pk-table">
          <thead>
            <tr>
              <th>Farmer</th><th>Flower</th><th>Qty</th><th>Unit</th>
              <th>Rate / Unit</th><th>Total</th><th>Grade</th><th>Notes</th><th></th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.farmer_name}</td>
                <td>{d.flower_type}</td>
                <td>{d.quantity}</td>
                <td>{d.unit}</td>
                <td>Rs. {Number(d.rate_per_unit).toLocaleString()}</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>Rs. {Number(d.total_amount).toLocaleString()}</td>
                <td>
                  {d.quality_grade ? (
                    <span className={`pk-badge ${d.quality_grade === 'A' ? 'pk-badge--success' : d.quality_grade === 'B' ? 'pk-badge--info' : 'pk-badge--gray'}`}>
                      Grade {d.quality_grade}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{d.notes || '—'}</td>
                <td>
                  <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => onDelete(d)}>
                    <i className="bi bi-trash3" />
                  </button>
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && <tr className="pk-table__empty"><td colSpan={9}>No deliveries recorded for this date.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Farmer Payments Tab ──
function PaymentsTab({ payments, onGenerate, onMarkPaid }) {
  const pending = payments.filter((p) => p.status === 'pending');

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          {pending.length > 0 && (
            <span className="pk-badge pk-badge--warning" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
              {pending.length} pending · Rs. {pending.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
            </span>
          )}
        </div>
        <button className="pk-btn pk-btn--dark" onClick={onGenerate}><i className="bi bi-plus-lg" />Generate Payment</button>
      </div>
      <div className="pk-card">
        <table className="pk-table">
          <thead>
            <tr>
              <th>Farmer</th><th>Period</th><th>Amount</th><th>Status</th>
              <th>Paid On</th><th>Mode</th><th>Notes</th><th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={p.status === 'pending' ? { background: '#fef9c3' } : {}}>
                <td style={{ fontWeight: 600 }}>{p.farmer_name}</td>
                <td style={{ fontSize: '0.82rem' }}>{p.period_start} → {p.period_end}</td>
                <td style={{ fontWeight: 700 }}>Rs. {Number(p.amount).toLocaleString()}</td>
                <td><span className={`pk-badge ${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                <td style={{ fontSize: '0.82rem' }}>{p.payment_date || '—'}</td>
                <td style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{p.payment_mode || '—'}</td>
                <td style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{p.notes || '—'}</td>
                <td>
                  {p.status === 'pending' && (
                    <button className="pk-btn pk-btn--sm pk-btn--rose" onClick={() => onMarkPaid(p)}>
                      <i className="bi bi-check2" />Pay
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 && <tr className="pk-table__empty"><td colSpan={8}>No payments yet. Generate one from deliveries.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Bulk Buyers Tab ──
function BuyersTab({ buyers, onAdd, onEdit, onDelete }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="pk-btn pk-btn--dark" onClick={onAdd}><i className="bi bi-building-add" />Add Buyer</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {buyers.map((b) => (
          <div key={b.id} className="pk-card">
            <div className="pk-card__head">
              <div>
                <div style={{ fontWeight: 700 }}>{b.name}</div>
                <span className="pk-badge pk-badge--gray" style={{ marginTop: '0.25rem', textTransform: 'capitalize' }}>{b.type}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto' }}>
                <button className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => onEdit(b)}><i className="bi bi-pencil" /></button>
                <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => onDelete(b)}><i className="bi bi-trash3" /></button>
              </div>
            </div>
            <div className="pk-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {b.contact_person && <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}><i className="bi bi-person me-1" />{b.contact_person}</div>}
              {b.phone          && <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}><i className="bi bi-telephone me-1" />{b.phone}</div>}
              {b.email          && <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}><i className="bi bi-envelope me-1" />{b.email}</div>}
              {b.address        && <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}><i className="bi bi-geo-alt me-1" />{b.address}</div>}
            </div>
          </div>
        ))}
        {buyers.length === 0 && (
          <div className="pk-empty" style={{ gridColumn: '1 / -1' }}>
            <i className="bi bi-building" />
            <p>No bulk buyers yet. Add companies or markets you sell to.</p>
          </div>
        )}
      </div>
    </>
  );
}

// ── Bulk Sales Tab ──
function SalesTab({ sales, onAdd, onStatusChange, onDelete }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="pk-btn pk-btn--dark" onClick={onAdd}><i className="bi bi-plus-lg" />New Bulk Sale</button>
      </div>
      <div className="pk-card">
        <table className="pk-table">
          <thead>
            <tr>
              <th>Invoice</th><th>Buyer</th><th>Date</th><th>Items</th>
              <th>Subtotal</th><th>Discount</th><th>Total</th><th>Due</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>{s.invoice_number}</td>
                <td>
                  <div>{s.buyer_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', textTransform: 'capitalize' }}>{s.buyer_type}</div>
                </td>
                <td style={{ fontSize: '0.82rem' }}>{s.sale_date}</td>
                <td style={{ fontSize: '0.78rem' }}>
                  {(s.items || []).map((i, idx) => <div key={idx}>{i.flower_type} × {i.quantity} {i.unit}</div>)}
                </td>
                <td>Rs. {Number(s.subtotal).toLocaleString()}</td>
                <td>{s.discount > 0 ? `Rs. ${Number(s.discount).toLocaleString()}` : '—'}</td>
                <td style={{ fontWeight: 700, color: '#16a34a' }}>Rs. {Number(s.grand_total).toLocaleString()}</td>
                <td style={{ fontSize: '0.82rem' }}>{s.due_date || '—'}</td>
                <td><span className={`pk-badge ${STATUS_BADGE[s.status] || 'pk-badge--gray'}`}>{s.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {s.status === 'confirmed' && (
                      <button className="pk-btn pk-btn--sm pk-btn--rose" title="Mark Paid" onClick={() => onStatusChange(s, 'paid')}>
                        <i className="bi bi-check2" />
                      </button>
                    )}
                    <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => onDelete(s)}>
                      <i className="bi bi-trash3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sales.length === 0 && <tr className="pk-table__empty"><td colSpan={10}>No bulk sales recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── FarmerModal ──
function FarmerModal({ farmer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: farmer?.name || '', phone: farmer?.phone || '', email: farmer?.email || '',
    address: farmer?.address || '', payment_cycle: farmer?.payment_cycle || 'biweekly',
    bank_name: farmer?.bank_name || '', account_number: farmer?.account_number || '',
    ifsc_code: farmer?.ifsc_code || '', notes: farmer?.notes || '',
    is_active: farmer?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (farmer) await api.patch(`/vendor/farmers/${farmer.id}`, form);
      else await api.post('/vendor/farmers', form);
      onSaved();
    } catch (err) {
      setError(Object.values(err?.response?.data?.errors || {}).flat().join(' ') || 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <PkModal title={farmer ? `Edit — ${farmer.name}` : 'Add Farmer'} onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '0.75rem' }}>{error}</div>}
          <div className="pk-form-row">
            <div className="pk-field"><label>Name *</label><input className="pk-input" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
            <div className="pk-field"><label>Phone</label><input className="pk-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="pk-field"><label>Email</label><input className="pk-input" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="pk-field">
              <label>Payment Cycle</label>
              <select className="pk-input" value={form.payment_cycle} onChange={(e) => set('payment_cycle', e.target.value)}>
                {CYCLES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
          </div>
          <div className="pk-field"><label>Address</label><textarea className="pk-input pk-textarea" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
          <div style={{ borderTop: '1.5px solid var(--border)', margin: '1rem 0 0.5rem', paddingTop: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Details</div>
          <div className="pk-form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="pk-field"><label>Bank Name</label><input className="pk-input" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} /></div>
            <div className="pk-field"><label>Account No.</label><input className="pk-input" value={form.account_number} onChange={(e) => set('account_number', e.target.value)} /></div>
            <div className="pk-field"><label>IFSC Code</label><input className="pk-input" value={form.ifsc_code} onChange={(e) => set('ifsc_code', e.target.value)} /></div>
          </div>
          <div className="pk-field"><label>Notes</label><textarea className="pk-input pk-textarea" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          {farmer && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.5rem' }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
              Active
            </label>
          )}
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : null}
            {farmer ? 'Save Changes' : 'Add Farmer'}
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── DeliveryModal ──
function DeliveryModal({ farmers, onClose, onSaved }) {
  const [form, setForm] = useState({
    farmer_id: '', flower_type: '', quantity: '', unit: 'kg',
    rate_per_unit: '', delivery_date: TODAY, quality_grade: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const total = form.quantity && form.rate_per_unit ? (form.quantity * form.rate_per_unit).toFixed(2) : null;

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await api.post('/vendor/deliveries', form); onSaved(); }
    catch (err) { setError(Object.values(err?.response?.data?.errors || {}).flat().join(' ') || 'Failed.'); }
    finally { setSaving(false); }
  };

  return (
    <PkModal title="Record Delivery" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '0.75rem' }}>{error}</div>}
          <div className="pk-form-row">
            <div className="pk-field">
              <label>Farmer *</label>
              <select className="pk-input" value={form.farmer_id} onChange={(e) => set('farmer_id', e.target.value)} required>
                <option value="">Select farmer…</option>
                {farmers.filter((f) => f.is_active).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="pk-field"><label>Flower Type *</label><input className="pk-input" value={form.flower_type} onChange={(e) => set('flower_type', e.target.value)} required placeholder="e.g. Rose, Jasmine, Marigold" /></div>
          </div>
          <div className="pk-form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="pk-field"><label>Quantity *</label><input type="number" min="0.01" step="0.01" className="pk-input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></div>
            <div className="pk-field">
              <label>Unit *</label>
              <select className="pk-input" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="pk-field"><label>Rate / Unit (Rs.) *</label><input type="number" min="0" step="0.01" className="pk-input" value={form.rate_per_unit} onChange={(e) => set('rate_per_unit', e.target.value)} required /></div>
          </div>
          {total && (
            <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 'var(--radius-md)', padding: '0.625rem 0.875rem', fontSize: '0.85rem', color: '#15803d', marginBottom: '0.75rem' }}>
              Total: <strong>Rs. {Number(total).toLocaleString()}</strong>
            </div>
          )}
          <div className="pk-form-row">
            <div className="pk-field"><label>Delivery Date *</label><input type="date" className="pk-input" value={form.delivery_date} onChange={(e) => set('delivery_date', e.target.value)} required /></div>
            <div className="pk-field">
              <label>Quality Grade</label>
              <select className="pk-input" value={form.quality_grade} onChange={(e) => set('quality_grade', e.target.value)}>
                <option value="">Not graded</option>
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Basic)</option>
              </select>
            </div>
          </div>
          <div className="pk-field"><label>Notes</label><input className="pk-input" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : null}
            Record Delivery
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── GeneratePaymentModal ──
function GeneratePaymentModal({ farmers, onClose, onSaved }) {
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [form, setForm] = useState({ farmer_id: '', period_start: firstDay, period_end: TODAY, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const { data } = await api.post('/vendor/payments/generate', form);
      alert(`Payment generated: Rs. ${Number(data.payment.amount).toLocaleString()}`);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate payment.');
    } finally { setSaving(false); }
  };

  return (
    <PkModal title="Generate Farmer Payment" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '0.75rem' }}>{error}</div>}
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1rem' }}>Auto-calculates total from all deliveries in the selected period.</p>
          <div className="pk-field">
            <label>Farmer *</label>
            <select className="pk-input" value={form.farmer_id} onChange={(e) => set('farmer_id', e.target.value)} required>
              <option value="">Select farmer…</option>
              {farmers.map((f) => <option key={f.id} value={f.id}>{f.name} ({CYCLES.find(c => c.v === f.payment_cycle)?.l})</option>)}
            </select>
          </div>
          <div className="pk-form-row">
            <div className="pk-field"><label>Period Start *</label><input type="date" className="pk-input" value={form.period_start} onChange={(e) => set('period_start', e.target.value)} required /></div>
            <div className="pk-field"><label>Period End *</label><input type="date" className="pk-input" value={form.period_end} onChange={(e) => set('period_end', e.target.value)} required /></div>
          </div>
          <div className="pk-field"><label>Notes</label><textarea className="pk-input pk-textarea" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--rose" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-calculator" />}
            Calculate &amp; Generate
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── MarkPaidModal ──
function MarkPaidModal({ payment, onClose, onSaved }) {
  const [form, setForm] = useState({ payment_mode: 'cash', payment_date: TODAY });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    await api.patch(`/vendor/payments/${payment.id}/mark-paid`, form);
    setSaving(false);
    onSaved();
  };

  return (
    <PkModal title="Mark Payment as Paid" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          <div style={{ background: '#dbeafe', border: '1.5px solid #93c5fd', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '0.85rem', color: '#1d4ed8', marginBottom: '1rem' }}>
            Farmer: <strong>{payment.farmer_name}</strong> · Amount: <strong>Rs. {Number(payment.amount).toLocaleString()}</strong><br />
            Period: {payment.period_start} → {payment.period_end}
          </div>
          <div className="pk-form-row">
            <div className="pk-field">
              <label>Payment Mode *</label>
              <select className="pk-input" value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div className="pk-field"><label>Payment Date *</label><input type="date" className="pk-input" value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} required /></div>
          </div>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--rose" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check2" />}
            Confirm Payment
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── BuyerModal ──
function BuyerModal({ buyer, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: buyer?.name || '', contact_person: buyer?.contact_person || '',
    phone: buyer?.phone || '', email: buyer?.email || '',
    address: buyer?.address || '', type: buyer?.type || 'company', notes: buyer?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (buyer) await api.patch(`/vendor/buyers/${buyer.id}`, form);
      else await api.post('/vendor/buyers', form);
      onSaved();
    } catch (err) {
      setError(Object.values(err?.response?.data?.errors || {}).flat().join(' ') || 'Failed.');
    } finally { setSaving(false); }
  };

  return (
    <PkModal title={buyer ? `Edit — ${buyer.name}` : 'Add Bulk Buyer'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '0.75rem' }}>{error}</div>}
          <div className="pk-form-row">
            <div className="pk-field" style={{ gridColumn: '1 / -1' }}>
              <label>Company / Market Name *</label>
              <input className="pk-input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
          </div>
          <div className="pk-form-row">
            <div className="pk-field">
              <label>Type</label>
              <select className="pk-input" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {BUYER_TYPES.map((t) => <option key={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
              </select>
            </div>
            <div className="pk-field"><label>Contact Person</label><input className="pk-input" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} /></div>
            <div className="pk-field"><label>Phone</label><input className="pk-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="pk-field"><label>Email</label><input className="pk-input" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          </div>
          <div className="pk-field"><label>Address</label><textarea className="pk-input pk-textarea" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
          <div className="pk-field"><label>Notes</label><textarea className="pk-input pk-textarea" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : null}
            {buyer ? 'Save Changes' : 'Add Buyer'}
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── BulkSaleModal ──
function BulkSaleModal({ buyers, onClose, onSaved }) {
  const emptyItem = () => ({ flower_type: '', quantity: '', unit: 'kg', rate_per_unit: '' });
  const [form, setForm] = useState({ bulk_buyer_id: '', sale_date: TODAY, discount: '0', due_date: '', notes: '' });
  const [items, setItems]   = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem  = (idx, k, v) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  const addItem  = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const subtotal    = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate_per_unit) || 0), 0);
  const grandTotal  = subtotal - Number(form.discount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/vendor/sales', {
        ...form,
        items: items.map((i) => ({ ...i, quantity: Number(i.quantity), rate_per_unit: Number(i.rate_per_unit) })),
      });
      onSaved();
    } catch (err) {
      setError(Object.values(err?.response?.data?.errors || {}).flat().join(' ') || 'Failed.');
    } finally { setSaving(false); }
  };

  return (
    <PkModal title="New Bulk Sale" onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="pk-modal__body">
          {error && <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '0.75rem' }}>{error}</div>}
          <div className="pk-form-row">
            <div className="pk-field">
              <label>Buyer *</label>
              <select className="pk-input" value={form.bulk_buyer_id} onChange={(e) => setField('bulk_buyer_id', e.target.value)} required>
                <option value="">Select buyer…</option>
                {buyers.filter((b) => b.is_active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="pk-field"><label>Sale Date *</label><input type="date" className="pk-input" value={form.sale_date} onChange={(e) => setField('sale_date', e.target.value)} required /></div>
            <div className="pk-field"><label>Due Date</label><input type="date" className="pk-input" value={form.due_date} onChange={(e) => setField('due_date', e.target.value)} /></div>
            <div className="pk-field"><label>Discount (Rs.)</label><input type="number" min="0" className="pk-input" value={form.discount} onChange={(e) => setField('discount', e.target.value)} /></div>
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1rem 0 0.5rem' }}>Flower Items</div>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 2fr 2fr 1fr', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
              <input className="pk-input" placeholder="Flower type" value={item.flower_type} onChange={(e) => setItem(idx, 'flower_type', e.target.value)} required />
              <input type="number" min="0.01" step="0.01" className="pk-input" placeholder="Qty" value={item.quantity} onChange={(e) => setItem(idx, 'quantity', e.target.value)} required />
              <select className="pk-input" value={item.unit} onChange={(e) => setItem(idx, 'unit', e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
              <input type="number" min="0" step="0.01" className="pk-input" placeholder="Rate/unit" value={item.rate_per_unit} onChange={(e) => setItem(idx, 'rate_per_unit', e.target.value)} required />
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#16a34a', paddingBottom: '0.625rem' }}>
                {item.quantity && item.rate_per_unit ? `Rs. ${(item.quantity * item.rate_per_unit).toLocaleString()}` : '—'}
              </div>
              <div>
                {items.length > 1 && (
                  <button type="button" className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => removeItem(idx)}>
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="pk-btn pk-btn--outline pk-btn--sm" style={{ marginTop: '0.25rem' }} onClick={addItem}>
            <i className="bi bi-plus" />Add Row
          </button>

          <div style={{ marginTop: '1rem', padding: '0.875rem', background: '#f4f4f5', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {Number(form.discount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#dc2626', marginBottom: '0.35rem' }}>
                <span>Discount</span><span>− Rs. {Number(form.discount).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1.5px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span>Grand Total</span>
              <span style={{ color: '#16a34a' }}>Rs. {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="pk-field" style={{ marginTop: '0.75rem' }}><label>Notes</label><textarea className="pk-input pk-textarea" rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)} /></div>
        </div>
        <div className="pk-modal__foot">
          <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pk-btn pk-btn--dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-receipt" />}
            Create Sale · Rs. {grandTotal.toLocaleString()}
          </button>
        </div>
      </form>
    </PkModal>
  );
}

// ── Shared Modal wrapper ──
function PkModal({ title, onClose, children, wide = false }) {
  return (
    <div className="pk-modal-bd" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pk-modal" style={wide ? { maxWidth: 680 } : {}}>
        <div className="pk-modal__head">
          <span className="pk-modal__title">{title}</span>
          <button className="pk-modal__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
