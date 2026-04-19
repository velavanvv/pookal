import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const TODAY = new Date().toISOString().slice(0, 10);
const UNITS  = ['kg', 'bunch', 'stems', 'boxes', 'nos'];
const CYCLES = [{ v: 'weekly', l: 'Weekly' }, { v: 'biweekly', l: 'Twice a Month' }, { v: 'monthly', l: 'Monthly' }];
const BUYER_TYPES = ['company', 'market', 'hotel', 'retailer', 'other'];

const STATUS_COLOR = { pending: 'warning', paid: 'success', draft: 'secondary', confirmed: 'primary' };

// ─────────────────────────────────────────────────────────────────────────────
export default function VendorPage() {
  const [tab, setTab]         = useState('farmers');
  const [stats, setStats]     = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [payments, setPayments]     = useState([]);
  const [buyers, setBuyers]         = useState([]);
  const [sales, setSales]           = useState([]);
  const [loading, setLoading]       = useState(true);

  // modals
  const [showFarmerModal, setShowFarmerModal]     = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal]   = useState(false);
  const [showBuyerModal, setShowBuyerModal]       = useState(false);
  const [showSaleModal, setShowSaleModal]         = useState(false);
  const [showPayModal, setShowPayModal]           = useState(false);
  const [editFarmer, setEditFarmer]               = useState(null);
  const [editBuyer, setEditBuyer]                 = useState(null);
  const [selectedPayment, setSelectedPayment]     = useState(null);

  // filters
  const [deliveryDate, setDeliveryDate]   = useState(TODAY);
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
    setStats(s.data);
    setFarmers(f.data);
    setDeliveries(d.data);
    setPayments(p.data);
    setBuyers(b.data);
    setSales(sl.data);
    setLoading(false);
  };

  const refreshDeliveries = () =>
    api.get(`/vendor/deliveries?date=${deliveryDate}${deliveryFarmer ? `&farmer_id=${deliveryFarmer}` : ''}`)
      .then(({ data }) => setDeliveries(data));

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { refreshDeliveries(); }, [deliveryDate, deliveryFarmer]);

  const tabs = [
    { key: 'farmers',    icon: 'bi-person-badge',   label: 'Farmers'       },
    { key: 'intake',     icon: 'bi-box-arrow-in-down', label: 'Daily Intake' },
    { key: 'payments',   icon: 'bi-wallet2',         label: 'Farmer Payments' },
    { key: 'buyers',     icon: 'bi-building',        label: 'Bulk Buyers'   },
    { key: 'sales',      icon: 'bi-receipt-cutoff',  label: 'Bulk Sales'    },
  ];

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0">Vendor Management</h4>
          <small className="text-muted">Farmers · Daily intake · Payments · Bulk sales</small>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchAll}>
          <i className="bi bi-arrow-clockwise me-1" />Refresh
        </button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Active Farmers',      value: stats.total_farmers,            icon: 'bi-person-badge',  color: 'primary'  },
            { label: 'Monthly Intake (Rs)', value: Number(stats.monthly_intake_value).toLocaleString(), icon: 'bi-flower1', color: 'success' },
            { label: 'Pending Payouts',     value: `Rs. ${Number(stats.pending_farmer_payments).toLocaleString()}`, icon: 'bi-wallet2', color: 'warning' },
            { label: 'Monthly Bulk Sales',  value: `Rs. ${Number(stats.monthly_bulk_sales).toLocaleString()}`, icon: 'bi-graph-up', color: 'info' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className={`admin-stat-icon bg-${color} bg-opacity-10 text-${color}`}>
                    <i className={`bi ${icon} fs-5`} />
                  </div>
                  <div>
                    <div className="text-muted small">{label}</div>
                    <div className="fw-bold fs-5">{value}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {tabs.map((t) => (
          <li key={t.key} className="nav-item">
            <button
              className={`nav-link d-flex align-items-center gap-2 ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <i className={`bi ${t.icon}`} />{t.label}
            </button>
          </li>
        ))}
      </ul>

      {/* ── FARMERS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'farmers' && (
        <FarmersTab
          farmers={farmers}
          onAdd={() => { setEditFarmer(null); setShowFarmerModal(true); }}
          onEdit={(f) => { setEditFarmer(f); setShowFarmerModal(true); }}
          onDelete={async (f) => {
            if (!confirm(`Delete farmer "${f.name}"?`)) return;
            await api.delete(`/vendor/farmers/${f.id}`);
            fetchAll();
          }}
          onImport={fetchAll}
        />
      )}

      {/* ── DAILY INTAKE TAB ─────────────────────────────────────────────── */}
      {tab === 'intake' && (
        <IntakeTab
          deliveries={deliveries}
          farmers={farmers}
          deliveryDate={deliveryDate}
          setDeliveryDate={setDeliveryDate}
          deliveryFarmer={deliveryFarmer}
          setDeliveryFarmer={setDeliveryFarmer}
          onAdd={() => setShowDeliveryModal(true)}
          onDelete={async (d) => {
            if (!confirm('Delete this delivery record?')) return;
            await api.delete(`/vendor/deliveries/${d.id}`);
            refreshDeliveries();
          }}
        />
      )}

      {/* ── FARMER PAYMENTS TAB ──────────────────────────────────────────── */}
      {tab === 'payments' && (
        <PaymentsTab
          payments={payments}
          farmers={farmers}
          onGenerate={() => setShowPaymentModal(true)}
          onMarkPaid={(p) => { setSelectedPayment(p); setShowPayModal(true); }}
        />
      )}

      {/* ── BULK BUYERS TAB ──────────────────────────────────────────────── */}
      {tab === 'buyers' && (
        <BuyersTab
          buyers={buyers}
          onAdd={() => { setEditBuyer(null); setShowBuyerModal(true); }}
          onEdit={(b) => { setEditBuyer(b); setShowBuyerModal(true); }}
          onDelete={async (b) => {
            if (!confirm(`Delete buyer "${b.name}"?`)) return;
            await api.delete(`/vendor/buyers/${b.id}`);
            fetchAll();
          }}
        />
      )}

      {/* ── BULK SALES TAB ───────────────────────────────────────────────── */}
      {tab === 'sales' && (
        <SalesTab
          sales={sales}
          onAdd={() => setShowSaleModal(true)}
          onStatusChange={async (s, status) => {
            await api.patch(`/vendor/sales/${s.id}/status`, { status });
            fetchAll();
          }}
          onDelete={async (s) => {
            if (!confirm(`Delete invoice ${s.invoice_number}?`)) return;
            await api.delete(`/vendor/sales/${s.id}`);
            fetchAll();
          }}
        />
      )}

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      {showFarmerModal && (
        <FarmerModal
          farmer={editFarmer}
          onClose={() => setShowFarmerModal(false)}
          onSaved={() => { setShowFarmerModal(false); fetchAll(); }}
        />
      )}

      {showDeliveryModal && (
        <DeliveryModal
          farmers={farmers}
          onClose={() => setShowDeliveryModal(false)}
          onSaved={() => { setShowDeliveryModal(false); refreshDeliveries(); }}
        />
      )}

      {showPaymentModal && (
        <GeneratePaymentModal
          farmers={farmers}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => { setShowPaymentModal(false); fetchAll(); }}
        />
      )}

      {showPayModal && selectedPayment && (
        <MarkPaidModal
          payment={selectedPayment}
          onClose={() => { setShowPayModal(false); setSelectedPayment(null); }}
          onSaved={() => { setShowPayModal(false); setSelectedPayment(null); fetchAll(); }}
        />
      )}

      {showBuyerModal && (
        <BuyerModal
          buyer={editBuyer}
          onClose={() => setShowBuyerModal(false)}
          onSaved={() => { setShowBuyerModal(false); fetchAll(); }}
        />
      )}

      {showSaleModal && (
        <BulkSaleModal
          buyers={buyers}
          onClose={() => setShowSaleModal(false)}
          onSaved={() => { setShowSaleModal(false); fetchAll(); }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Farmers Tab
// ─────────────────────────────────────────────────────────────────────────────
function FarmersTab({ farmers, onAdd, onEdit, onDelete, onImport }) {
  const fileRef = useRef();

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    // Normalise headers: "Farmer Name" → "name" etc.
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
      <div className="d-flex justify-content-end gap-2 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={downloadTemplate}>
          <i className="bi bi-download me-1" />Template
        </button>
        <button className="btn btn-outline-success btn-sm" onClick={() => fileRef.current.click()}>
          <i className="bi bi-file-earmark-excel me-1" />Import Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="d-none" onChange={handleExcelUpload} />
        <button className="btn btn-dark btn-sm" onClick={onAdd}>
          <i className="bi bi-person-plus me-1" />Add Farmer
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Farmer</th>
                <th>Phone</th>
                <th>Payment Cycle</th>
                <th>Bank</th>
                <th>Deliveries</th>
                <th>Total Paid</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {farmers.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="fw-semibold">{f.name}</div>
                    <div className="text-muted small">{f.email}</div>
                  </td>
                  <td>{f.phone || '—'}</td>
                  <td><span className="badge text-bg-info">{CYCLES.find(c => c.v === f.payment_cycle)?.l || f.payment_cycle}</span></td>
                  <td>
                    {f.bank_name ? (
                      <div>
                        <div className="small">{f.bank_name}</div>
                        <div className="text-muted small">{f.account_number}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td>{f.deliveries_count}</td>
                  <td>Rs. {Number(f.total_paid || 0).toLocaleString()}</td>
                  <td>
                    <span className={`badge text-bg-${f.is_active ? 'success' : 'secondary'}`}>
                      {f.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => onEdit(f)}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(f)}>
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {farmers.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted py-4">No farmers yet. Add one or import from Excel.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Intake Tab
// ─────────────────────────────────────────────────────────────────────────────
function IntakeTab({ deliveries, farmers, deliveryDate, setDeliveryDate, deliveryFarmer, setDeliveryFarmer, onAdd, onDelete }) {
  const dailyTotal = deliveries.reduce((s, d) => s + Number(d.total_amount), 0);

  return (
    <>
      <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
        <div>
          <label className="form-label small fw-semibold mb-1">Date</label>
          <input type="date" className="form-control form-control-sm" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
        <div>
          <label className="form-label small fw-semibold mb-1">Farmer</label>
          <select className="form-select form-select-sm" value={deliveryFarmer} onChange={(e) => setDeliveryFarmer(e.target.value)}>
            <option value="">All farmers</option>
            {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="ms-auto d-flex align-items-end gap-2">
          {deliveries.length > 0 && (
            <div className="text-muted small pt-1">
              Total: <strong className="text-success">Rs. {dailyTotal.toLocaleString()}</strong>
            </div>
          )}
          <button className="btn btn-dark btn-sm" onClick={onAdd}>
            <i className="bi bi-plus-lg me-1" />Record Delivery
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Farmer</th>
                <th>Flower</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Rate / Unit</th>
                <th>Total</th>
                <th>Grade</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td className="fw-semibold">{d.farmer_name}</td>
                  <td>{d.flower_type}</td>
                  <td>{d.quantity}</td>
                  <td>{d.unit}</td>
                  <td>Rs. {Number(d.rate_per_unit).toLocaleString()}</td>
                  <td className="fw-bold text-success">Rs. {Number(d.total_amount).toLocaleString()}</td>
                  <td>
                    {d.quality_grade ? (
                      <span className={`badge text-bg-${d.quality_grade === 'A' ? 'success' : d.quality_grade === 'B' ? 'info' : 'secondary'}`}>
                        Grade {d.quality_grade}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="text-muted small">{d.notes || '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(d)}>
                      <i className="bi bi-trash3" />
                    </button>
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted py-4">No deliveries recorded for this date.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Farmer Payments Tab
// ─────────────────────────────────────────────────────────────────────────────
function PaymentsTab({ payments, farmers, onGenerate, onMarkPaid }) {
  const pending = payments.filter((p) => p.status === 'pending');
  const paid    = payments.filter((p) => p.status === 'paid');

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-3">
          {pending.length > 0 && (
            <div className="badge text-bg-warning fs-6">
              {pending.length} pending · Rs. {pending.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
            </div>
          )}
        </div>
        <button className="btn btn-dark btn-sm" onClick={onGenerate}>
          <i className="bi bi-plus-lg me-1" />Generate Payment
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Farmer</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Paid On</th>
                <th>Mode</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className={p.status === 'pending' ? 'table-warning' : ''}>
                  <td className="fw-semibold">{p.farmer_name}</td>
                  <td className="small">{p.period_start} → {p.period_end}</td>
                  <td className="fw-bold">Rs. {Number(p.amount).toLocaleString()}</td>
                  <td><span className={`badge text-bg-${STATUS_COLOR[p.status]}`}>{p.status}</span></td>
                  <td className="small">{p.payment_date || '—'}</td>
                  <td className="small text-capitalize">{p.payment_mode || '—'}</td>
                  <td className="small text-muted">{p.notes || '—'}</td>
                  <td>
                    {p.status === 'pending' && (
                      <button className="btn btn-sm btn-success" onClick={() => onMarkPaid(p)}>
                        <i className="bi bi-check2 me-1" />Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={8} className="text-center text-muted py-4">No payments yet. Generate one from deliveries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Buyers Tab
// ─────────────────────────────────────────────────────────────────────────────
function BuyersTab({ buyers, onAdd, onEdit, onDelete }) {
  return (
    <>
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-dark btn-sm" onClick={onAdd}>
          <i className="bi bi-building-add me-1" />Add Buyer
        </button>
      </div>
      <div className="row g-3">
        {buyers.map((b) => (
          <div key={b.id} className="col-md-6 col-xl-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div className="fw-bold">{b.name}</div>
                    <span className="badge text-bg-light border text-capitalize small">{b.type}</span>
                  </div>
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => onEdit(b)}><i className="bi bi-pencil" /></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(b)}><i className="bi bi-trash3" /></button>
                  </div>
                </div>
                {b.contact_person && <div className="small text-muted"><i className="bi bi-person me-1" />{b.contact_person}</div>}
                {b.phone && <div className="small text-muted"><i className="bi bi-telephone me-1" />{b.phone}</div>}
                {b.email && <div className="small text-muted"><i className="bi bi-envelope me-1" />{b.email}</div>}
                {b.address && <div className="small text-muted mt-1"><i className="bi bi-geo-alt me-1" />{b.address}</div>}
              </div>
            </div>
          </div>
        ))}
        {buyers.length === 0 && (
          <div className="col-12 text-center text-muted py-4">
            <i className="bi bi-building display-4 d-block mb-2 opacity-25" />
            No bulk buyers yet. Add companies or markets you sell to.
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Sales Tab
// ─────────────────────────────────────────────────────────────────────────────
function SalesTab({ sales, onAdd, onStatusChange, onDelete }) {
  return (
    <>
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-dark btn-sm" onClick={onAdd}>
          <i className="bi bi-plus-lg me-1" />New Bulk Sale
        </button>
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Invoice</th>
                <th>Buyer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Total</th>
                <th>Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="fw-semibold small">{s.invoice_number}</td>
                  <td>
                    <div>{s.buyer_name}</div>
                    <div className="text-muted small text-capitalize">{s.buyer_type}</div>
                  </td>
                  <td className="small">{s.sale_date}</td>
                  <td className="small">
                    {(s.items || []).map((i, idx) => (
                      <div key={idx}>{i.flower_type} × {i.quantity} {i.unit}</div>
                    ))}
                  </td>
                  <td>Rs. {Number(s.subtotal).toLocaleString()}</td>
                  <td>{s.discount > 0 ? `Rs. ${Number(s.discount).toLocaleString()}` : '—'}</td>
                  <td className="fw-bold text-success">Rs. {Number(s.grand_total).toLocaleString()}</td>
                  <td className="small">{s.due_date || '—'}</td>
                  <td>
                    <span className={`badge text-bg-${STATUS_COLOR[s.status] || 'secondary'}`}>{s.status}</span>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      {s.status === 'confirmed' && (
                        <button className="btn btn-sm btn-success" title="Mark Paid" onClick={() => onStatusChange(s, 'paid')}>
                          <i className="bi bi-check2" />
                        </button>
                      )}
                      <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(s)}>
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={10} className="text-center text-muted py-4">No bulk sales recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FarmerModal
// ─────────────────────────────────────────────────────────────────────────────
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
    <Modal title={farmer ? `Edit — ${farmer.name}` : 'Add Farmer'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label">Name *</label><input className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
            <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="col-md-6"><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="col-md-6">
              <label className="form-label">Payment Cycle</label>
              <select className="form-select" value={form.payment_cycle} onChange={(e) => set('payment_cycle', e.target.value)}>
                {CYCLES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div className="col-12"><label className="form-label">Address</label><textarea className="form-control" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
            <div className="col-12"><hr className="my-1" /><small className="text-muted fw-semibold">Bank Details (for payment)</small></div>
            <div className="col-md-4"><label className="form-label">Bank Name</label><input className="form-control" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">Account No.</label><input className="form-control" value={form.account_number} onChange={(e) => set('account_number', e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">IFSC Code</label><input className="form-control" value={form.ifsc_code} onChange={(e) => set('ifsc_code', e.target.value)} /></div>
            <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
            {farmer && (
              <div className="col-12">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
                  <label className="form-check-label">Active</label>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            {farmer ? 'Save Changes' : 'Add Farmer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeliveryModal
// ─────────────────────────────────────────────────────────────────────────────
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
    try {
      await api.post('/vendor/deliveries', form);
      onSaved();
    } catch (err) {
      setError(Object.values(err?.response?.data?.errors || {}).flat().join(' ') || 'Failed.');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Record Delivery" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Farmer *</label>
              <select className="form-select" value={form.farmer_id} onChange={(e) => set('farmer_id', e.target.value)} required>
                <option value="">Select farmer…</option>
                {farmers.filter((f) => f.is_active).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="col-md-6"><label className="form-label">Flower Type *</label><input className="form-control" value={form.flower_type} onChange={(e) => set('flower_type', e.target.value)} required placeholder="e.g. Rose, Jasmine, Marigold" /></div>
            <div className="col-md-4">
              <label className="form-label">Quantity *</label>
              <input type="number" min="0.01" step="0.01" className="form-control" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Unit *</label>
              <select className="form-select" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Rate / Unit (Rs.) *</label>
              <input type="number" min="0" step="0.01" className="form-control" value={form.rate_per_unit} onChange={(e) => set('rate_per_unit', e.target.value)} required />
            </div>
            {total && (
              <div className="col-12">
                <div className="alert alert-success py-2 small mb-0">
                  Total: <strong>Rs. {Number(total).toLocaleString()}</strong>
                </div>
              </div>
            )}
            <div className="col-md-6"><label className="form-label">Delivery Date *</label><input type="date" className="form-control" value={form.delivery_date} onChange={(e) => set('delivery_date', e.target.value)} required /></div>
            <div className="col-md-6">
              <label className="form-label">Quality Grade</label>
              <select className="form-select" value={form.quality_grade} onChange={(e) => set('quality_grade', e.target.value)}>
                <option value="">Not graded</option>
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Basic)</option>
              </select>
            </div>
            <div className="col-12"><label className="form-label">Notes</label><input className="form-control" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}Record Delivery
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GeneratePaymentModal
// ─────────────────────────────────────────────────────────────────────────────
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
    <Modal title="Generate Farmer Payment" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <p className="text-muted small">Auto-calculates total from all deliveries in the selected period.</p>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Farmer *</label>
              <select className="form-select" value={form.farmer_id} onChange={(e) => set('farmer_id', e.target.value)} required>
                <option value="">Select farmer…</option>
                {farmers.map((f) => <option key={f.id} value={f.id}>{f.name} ({CYCLES.find(c => c.v === f.payment_cycle)?.l})</option>)}
              </select>
            </div>
            <div className="col-md-6"><label className="form-label">Period Start *</label><input type="date" className="form-control" value={form.period_start} onChange={(e) => set('period_start', e.target.value)} required /></div>
            <div className="col-md-6"><label className="form-label">Period End *</label><input type="date" className="form-control" value={form.period_end} onChange={(e) => set('period_end', e.target.value)} required /></div>
            <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-calculator me-1" />}
            Calculate & Generate
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MarkPaidModal
// ─────────────────────────────────────────────────────────────────────────────
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
    <Modal title="Mark Payment as Paid" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="alert alert-info py-2 small mb-3">
            Farmer: <strong>{payment.farmer_name}</strong> · Amount: <strong>Rs. {Number(payment.amount).toLocaleString()}</strong><br />
            Period: {payment.period_start} → {payment.period_end}
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Payment Mode *</label>
              <select className="form-select" value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Payment Date *</label>
              <input type="date" className="form-control" value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} required />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-check2 me-1" />}
            Confirm Payment
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BuyerModal
// ─────────────────────────────────────────────────────────────────────────────
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
    <Modal title={buyer ? `Edit — ${buyer.name}` : 'Add Bulk Buyer'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <div className="row g-3">
            <div className="col-md-8"><label className="form-label">Company / Market Name *</label><input className="form-control" value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
            <div className="col-md-4">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {BUYER_TYPES.map((t) => <option key={t} className="text-capitalize">{t}</option>)}
              </select>
            </div>
            <div className="col-md-6"><label className="form-label">Contact Person</label><input className="form-control" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} /></div>
            <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="col-12"><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="col-12"><label className="form-label">Address</label><textarea className="form-control" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
            <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            {buyer ? 'Save Changes' : 'Add Buyer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BulkSaleModal
// ─────────────────────────────────────────────────────────────────────────────
function BulkSaleModal({ buyers, onClose, onSaved }) {
  const emptyItem = () => ({ flower_type: '', quantity: '', unit: 'kg', rate_per_unit: '' });
  const [form, setForm] = useState({
    bulk_buyer_id: '', sale_date: TODAY, discount: '0', due_date: '', notes: '',
  });
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem  = (idx, k, v) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  const addItem  = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate_per_unit) || 0), 0);
  const grandTotal = subtotal - Number(form.discount || 0);

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
    <Modal title="New Bulk Sale" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Buyer *</label>
              <select className="form-select" value={form.bulk_buyer_id} onChange={(e) => setField('bulk_buyer_id', e.target.value)} required>
                <option value="">Select buyer…</option>
                {buyers.filter((b) => b.is_active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="col-md-6"><label className="form-label">Sale Date *</label><input type="date" className="form-control" value={form.sale_date} onChange={(e) => setField('sale_date', e.target.value)} required /></div>
            <div className="col-md-6"><label className="form-label">Due Date</label><input type="date" className="form-control" value={form.due_date} onChange={(e) => setField('due_date', e.target.value)} /></div>
            <div className="col-md-6"><label className="form-label">Discount (Rs.)</label><input type="number" min="0" className="form-control" value={form.discount} onChange={(e) => setField('discount', e.target.value)} /></div>
          </div>

          <div className="fw-semibold small text-uppercase text-muted mb-2">Flower Items</div>
          {items.map((item, idx) => (
            <div key={idx} className="row g-2 mb-2 align-items-end">
              <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Flower type" value={item.flower_type} onChange={(e) => setItem(idx, 'flower_type', e.target.value)} required /></div>
              <div className="col-md-2"><input type="number" min="0.01" step="0.01" className="form-control form-control-sm" placeholder="Qty" value={item.quantity} onChange={(e) => setItem(idx, 'quantity', e.target.value)} required /></div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={item.unit} onChange={(e) => setItem(idx, 'unit', e.target.value)}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-md-2"><input type="number" min="0" step="0.01" className="form-control form-control-sm" placeholder="Rate/unit" value={item.rate_per_unit} onChange={(e) => setItem(idx, 'rate_per_unit', e.target.value)} required /></div>
              <div className="col-md-2 text-end small fw-semibold text-success">
                {item.quantity && item.rate_per_unit ? `Rs. ${(item.quantity * item.rate_per_unit).toLocaleString()}` : '—'}
              </div>
              <div className="col-md-1">
                {items.length > 1 && (
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeItem(idx)}>
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={addItem}>
            <i className="bi bi-plus me-1" />Add Row
          </button>

          <div className="mt-3 p-3 bg-light rounded">
            <div className="d-flex justify-content-between small">
              <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {Number(form.discount) > 0 && (
              <div className="d-flex justify-content-between small text-danger">
                <span>Discount</span><span>− Rs. {Number(form.discount).toLocaleString()}</span>
              </div>
            )}
            <div className="d-flex justify-content-between fw-bold border-top mt-1 pt-1">
              <span>Grand Total</span><span className="text-success">Rs. {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-3"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-dark" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-receipt me-1" />}
            Create Sale · Rs. {grandTotal.toLocaleString()}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Modal wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, size = '' }) {
  return (
    <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size ? `modal-${size}` : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
