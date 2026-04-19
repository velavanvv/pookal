import { useState, useEffect } from 'react';
import api from '../../services/api';

const SEGMENT_COLORS = { vip: 'warning', regular: 'secondary', event: 'info' };
const CHANNEL_ICONS  = { whatsapp: 'bi-whatsapp', sms: 'bi-phone', email: 'bi-envelope' };

export default function CrmPage() {
  const [tab,       setTab]       = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({
    name: '', phone: '', email: '', segment: 'regular', preferred_channel: 'whatsapp',
  });
  const [saving, setSaving] = useState(false);

  const fetchCustomers = () => {
    api.get('/crm/customers')
      .then(({ data }) => setCustomers(data.data || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
    api.get('/crm/campaigns').then(({ data }) => setCampaigns(data));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/crm/customers', form);
      setShowAdd(false);
      setForm({ name: '', phone: '', email: '', segment: 'regular', preferred_channel: 'whatsapp' });
      fetchCustomers();
    } catch {
      alert('Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">CRM &amp; Loyalty</h4>
        {tab === 'customers' && (
          <button className="btn btn-dark" onClick={() => setShowAdd(true)}>
            <i className="bi bi-person-plus me-2" />Add Customer
          </button>
        )}
      </div>

      <ul className="nav nav-tabs mb-3">
        {['customers', 'campaigns'].map((t) => (
          <li className="nav-item" key={t}>
            <button
              className={`nav-link ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'customers' && (
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
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Segment</th>
                    <th>Loyalty Points</th>
                    <th>Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="fw-semibold">{c.name}</td>
                      <td className="text-muted">{c.phone || '—'}</td>
                      <td>
                        <span className={`badge text-bg-${SEGMENT_COLORS[c.segment] || 'secondary'}`}>
                          {c.segment}
                        </span>
                      </td>
                      <td>
                        <i className="bi bi-star-fill text-warning me-1" />
                        {c.loyalty_points}
                      </td>
                      <td>
                        <i className={`bi ${CHANNEL_ICONS[c.preferred_channel] || 'bi-chat'} me-1`} />
                        {c.preferred_channel}
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        No customers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="row g-3">
          {campaigns.map((c, i) => (
            <div key={i} className="col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="mb-2">{c.name}</h6>
                  <div className="d-flex gap-2">
                    <span className="badge text-bg-success">{c.channel}</span>
                    <span className={`badge text-bg-${c.status === 'scheduled' ? 'primary' : 'secondary'}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className="col-12 text-center text-muted py-4">No campaigns yet.</div>
          )}
        </div>
      )}

      {/* ── Add Customer Modal ────────────────────────────────────────── */}
      {showAdd && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Customer</h5>
                <button className="btn-close" onClick={() => setShowAdd(false)} />
              </div>
              <form onSubmit={handleAdd}>
                <div className="modal-body d-grid gap-3">
                  {[
                    { label: 'Full Name',    key: 'name',  type: 'text'  },
                    { label: 'Phone',        key: 'phone', type: 'text'  },
                    { label: 'Email',        key: 'email', type: 'email' },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="form-label">{label}</label>
                      <input
                        type={type}
                        className="form-control"
                        value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        required={key === 'name'}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="form-label">Segment</label>
                    <select
                      className="form-select"
                      value={form.segment}
                      onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
                    >
                      <option value="regular">Regular</option>
                      <option value="vip">VIP</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Preferred Channel</label>
                    <select
                      className="form-select"
                      value={form.preferred_channel}
                      onChange={(e) => setForm((f) => ({ ...f, preferred_channel: e.target.value }))}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-dark" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm" /> : 'Save Customer'}
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
