import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function RestaurantPage() {
  const [activeTab, setActiveTab] = useState('floor'); // 'floor' | 'kot' | 'modifiers'
  const [tables, setTables] = useState([]);
  const [kots, setKots] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Table Modal
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({ name: '', capacity: 4, section: 'Main Hall', notes: '' });

  // Modifier Modal
  const [showModModal, setShowModModal] = useState(false);
  const [modForm, setModForm] = useState({ product_id: '', name: '', price_delta: 0, is_required: false, options: '' });

  // Thermal KOT print ref
  const [selectedKot, setSelectedKot] = useState(null);
  const kotPrintRef = useRef(null);

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, kRes, mRes, pRes, sRes] = await Promise.all([
        api.get('/restaurant/tables'),
        api.get('/restaurant/kots'),
        api.get('/restaurant/modifiers'),
        api.get('/catalog/products?per_page=100'),
        api.get('/restaurant/stats'),
      ]);
      setTables(tRes.data.data || []);
      setKots(kRes.data.data || []);
      setModifiers(mRes.data.data || []);
      setProducts(pRes.data.data || pRes.data || []);
      setStats(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      api.get('/restaurant/kots').then(res => setKots(res.data.data || [])).catch(() => {});
      api.get('/restaurant/tables').then(res => setTables(res.data.data || [])).catch(() => {});
    }, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleSaveTable = async (e) => {
    e.preventDefault();
    try {
      if (editingTable) {
        await api.patch(`/restaurant/tables/${editingTable.id}`, tableForm);
      } else {
        await api.post('/restaurant/tables', tableForm);
      }
      setShowTableModal(false);
      setEditingTable(null);
      setTableForm({ name: '', capacity: 4, section: 'Main Hall', notes: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving table');
    }
  };

  const handleTableStatus = async (tableId, status) => {
    try {
      await api.patch(`/restaurant/tables/${tableId}/status`, { status });
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
    } catch (err) {
      alert('Failed to update table status');
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;
    try {
      await api.delete(`/restaurant/tables/${tableId}`);
      loadData();
    } catch (err) {
      alert('Failed to delete table');
    }
  };

  const handleAdvanceKot = async (kotId, currentStatus) => {
    const nextStatus = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'served',
    }[currentStatus];

    if (!nextStatus) return;

    try {
      await api.patch(`/restaurant/kots/${kotId}/status`, { status: nextStatus });
      setKots(prev => prev.map(k => k.id === kotId ? { ...k, status: nextStatus } : k));
    } catch (err) {
      alert('Failed to advance ticket status');
    }
  };

  const handlePrintKot = (kot) => {
    setSelectedKot(kot);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleSaveModifier = async (e) => {
    e.preventDefault();
    const opts = modForm.options
      ? modForm.options.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    try {
      await api.post('/restaurant/modifiers', {
        ...modForm,
        options: opts,
      });
      setShowModModal(false);
      setModForm({ product_id: '', name: '', price_delta: 0, is_required: false, options: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving modifier');
    }
  };

  const handleDeleteModifier = async (id) => {
    if (!window.confirm('Delete this modifier?')) return;
    try {
      await api.delete(`/restaurant/modifiers/${id}`);
      loadData();
    } catch (err) {
      alert('Failed to delete modifier');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      vacant:   { bg: '#dcfce7', text: '#16a34a', label: 'Vacant' },
      occupied: { bg: '#fee2e2', text: '#dc2626', label: 'Occupied' },
      billing:  { bg: '#fef3c7', text: '#d97706', label: 'Billing' },
      reserved: { bg: '#ede9fe', text: '#7c3aed', label: 'Reserved' },
    };
    const s = map[status] || { bg: '#f3f4f6', text: '#4b5563', label: status };
    return (
      <span style={{
        background: s.bg,
        color: s.text,
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        textTransform: 'uppercase',
        letterSpacing: '0.03em'
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="pg-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <h4 className="pg-title" style={{ margin: 0 }}>Restaurant Operations</h4>
            <span className="pk-badge pk-badge--info" style={{ fontSize: '0.72rem' }}>Dine-in &amp; Kitchen</span>
          </div>
          <p className="pg-sub">Floor management, live kitchen tickets (KOT), and menu modifiers</p>
        </div>

        {activeTab === 'floor' && (
          <button
            className="pk-btn pk-btn--primary"
            onClick={() => {
              setEditingTable(null);
              setTableForm({ name: '', capacity: 4, section: 'Main Hall', notes: '' });
              setShowTableModal(true);
            }}
          >
            <i className="bi bi-plus-lg me-1" /> Add Dining Table
          </button>
        )}

        {activeTab === 'modifiers' && (
          <button
            className="pk-btn pk-btn--primary"
            onClick={() => {
              setModForm({ product_id: products[0]?.id || '', name: '', price_delta: 0, is_required: false, options: '' });
              setShowModModal(true);
            }}
          >
            <i className="bi bi-plus-lg me-1" /> Add Modifier
          </button>
        )}
      </div>

      {/* KPI Overview */}
      {stats && (
        <div className="pk-kpi-row" style={{ marginBottom: '1.25rem' }}>
          <div className="pk-kpi">
            <div className="pk-kpi__icon" style={{ background: '#ede9fe', color: '#7c3aed' }}><i className="bi bi-shop" /></div>
            <div>
              <div className="pk-kpi__val">{stats.total_tables}</div>
              <div className="pk-kpi__lbl">Total Tables</div>
            </div>
          </div>
          <div className="pk-kpi">
            <div className="pk-kpi__icon" style={{ background: '#fee2e2', color: '#dc2626' }}><i className="bi bi-people-fill" /></div>
            <div>
              <div className="pk-kpi__val">{stats.occupied_tables}</div>
              <div className="pk-kpi__lbl">Occupied Tables</div>
            </div>
          </div>
          <div className="pk-kpi">
            <div className="pk-kpi__icon" style={{ background: '#fef3c7', color: '#d97706' }}><i className="bi bi-fire" /></div>
            <div>
              <div className="pk-kpi__val">{stats.pending_kots}</div>
              <div className="pk-kpi__lbl">Pending KOTs</div>
            </div>
          </div>
          <div className="pk-kpi">
            <div className="pk-kpi__icon" style={{ background: '#dcfce7', color: '#16a34a' }}><i className="bi bi-check-circle" /></div>
            <div>
              <div className="pk-kpi__val">{stats.vacant_tables}</div>
              <div className="pk-kpi__lbl">Vacant Tables</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color, #e5e7eb)', marginBottom: '1.25rem', paddingBottom: '0.25rem' }}>
        <button
          className={`pk-btn ${activeTab === 'floor' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
          style={{ borderRadius: 'var(--radius-sm)' }}
          onClick={() => setActiveTab('floor')}
        >
          <i className="bi bi-grid-3x3-gap-fill me-1" /> Floor Plan ({tables.length})
        </button>
        <button
          className={`pk-btn ${activeTab === 'kot' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
          style={{ borderRadius: 'var(--radius-sm)' }}
          onClick={() => setActiveTab('kot')}
        >
          <i className="bi bi-fire me-1" /> Kitchen Display / KOTs ({kots.filter(k => k.status !== 'served' && k.status !== 'cancelled').length})
        </button>
        <button
          className={`pk-btn ${activeTab === 'modifiers' ? 'pk-btn--primary' : 'pk-btn--outline'}`}
          style={{ borderRadius: 'var(--radius-sm)' }}
          onClick={() => setActiveTab('modifiers')}
        >
          <i className="bi bi-sliders me-1" /> Menu Modifiers ({modifiers.length})
        </button>
      </div>

      {loading ? (
        <div className="pk-loading">
          <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
          <span>Loading restaurant data…</span>
        </div>
      ) : (
        <>
          {/* ── TAB 1: FLOOR PLAN ── */}
          {activeTab === 'floor' && (
            <div>
              {tables.length === 0 ? (
                <div className="pk-card" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  <i className="bi bi-cup-hot" style={{ fontSize: '2.5rem', color: '#9ca3af', marginBottom: '1rem', display: 'block' }} />
                  <h5>No dining tables configured yet</h5>
                  <p>Add tables with seating capacities to manage dine-in guests and active tickets.</p>
                  <button className="pk-btn pk-btn--primary mt-2" onClick={() => setShowTableModal(true)}>
                    <i className="bi bi-plus-lg me-1" /> Add Your First Table
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {tables.map(tbl => (
                    <div
                      key={tbl.id}
                      className="pk-card"
                      style={{
                        padding: '1.25rem',
                        borderLeft: `4px solid ${
                          tbl.status === 'vacant' ? '#16a34a' :
                          tbl.status === 'occupied' ? '#dc2626' :
                          tbl.status === 'billing' ? '#d97706' : '#7c3aed'
                        }`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div>
                            <h5 style={{ margin: 0, fontWeight: 700 }}>{tbl.name}</h5>
                            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{tbl.section || 'Main Hall'} · {tbl.capacity} Seats</span>
                          </div>
                          {getStatusBadge(tbl.status)}
                        </div>

                        {tbl.active_order && (
                          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 'var(--radius-sm)', padding: '0.6rem', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                              <span>Order: {tbl.active_order.order_number}</span>
                              <span>Rs. {Number(tbl.active_order.grand_total).toLocaleString()}</span>
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                              Guest: {tbl.active_order.customer?.name || 'Walk-in'}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', marginTop: '1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          className="pk-btn pk-btn--primary pk-btn--sm"
                          style={{ flex: 1 }}
                          onClick={() => navigate('/pos', { state: { tableId: tbl.id, tableName: tbl.name } })}
                        >
                          <i className="bi bi-receipt me-1" /> Open POS
                        </button>
                        
                        <select
                          value={tbl.status}
                          onChange={(e) => handleTableStatus(tbl.id, e.target.value)}
                          className="form-select form-select-sm"
                          style={{ width: 'auto', fontSize: '0.78rem' }}
                        >
                          <option value="vacant">Vacant</option>
                          <option value="occupied">Occupied</option>
                          <option value="billing">Billing</option>
                          <option value="reserved">Reserved</option>
                        </select>

                        <button
                          className="pk-btn pk-btn--outline pk-btn--sm"
                          onClick={() => {
                            setEditingTable(tbl);
                            setTableForm({ name: tbl.name, capacity: tbl.capacity, section: tbl.section || 'Main Hall', notes: tbl.notes || '' });
                            setShowTableModal(true);
                          }}
                          title="Edit table"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="pk-btn pk-btn--outline pk-btn--sm text-danger"
                          onClick={() => handleDeleteTable(tbl.id)}
                          title="Delete table"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: KITCHEN DISPLAY SYSTEM / KOTS ── */}
          {activeTab === 'kot' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {kots.map(kot => {
                  const isPending = kot.status === 'pending';
                  const isPreparing = kot.status === 'preparing';
                  const isReady = kot.status === 'ready';

                  return (
                    <div
                      key={kot.id}
                      className="pk-card"
                      style={{
                        padding: '1.25rem',
                        borderTop: `4px solid ${isPending ? '#f59e0b' : isPreparing ? '#3b82f6' : isReady ? '#10b981' : '#9ca3af'}`,
                        background: isPending ? '#fffdfa' : '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: '#111827' }}>{kot.ticket_number}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                            {kot.table ? `📍 ${kot.table.name}` : '🥡 Takeaway / Online'} · Station: {kot.station}
                          </div>
                        </div>
                        <span className={`pk-badge pk-badge--${isPending ? 'warning' : isPreparing ? 'info' : isReady ? 'success' : 'secondary'}`}>
                          {kot.status}
                        </span>
                      </div>

                      {/* Items List */}
                      <div style={{ borderTop: '1px dashed #e5e7eb', borderBottom: '1px dashed #e5e7eb', padding: '0.75rem 0', margin: '0.75rem 0' }}>
                        {Array.isArray(kot.items) && kot.items.map((it, idx) => (
                          <div key={idx} style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                              <span>{it.qty} × {it.name}</span>
                            </div>
                            {it.modifiers && it.modifiers.length > 0 && (
                              <div style={{ color: '#d97706', fontSize: '0.75rem', paddingLeft: '1rem' }}>
                                + {it.modifiers.join(', ')}
                              </div>
                            )}
                            {it.notes && (
                              <div style={{ color: '#6b7280', fontSize: '0.75rem', fontStyle: 'italic', paddingLeft: '1rem' }}>
                                Note: {it.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                        <button
                          className="pk-btn pk-btn--outline pk-btn--sm"
                          onClick={() => handlePrintKot(kot)}
                        >
                          <i className="bi bi-printer me-1" /> Print KOT
                        </button>

                        {(isPending || isPreparing || isReady) && (
                          <button
                            className={`pk-btn pk-btn--${isPending ? 'primary' : isPreparing ? 'success' : 'outline'} pk-btn--sm`}
                            onClick={() => handleAdvanceKot(kot.id, kot.status)}
                          >
                            {isPending && <><i className="bi bi-play-fill me-1" /> Start Prep</>}
                            {isPreparing && <><i className="bi bi-check2-circle me-1" /> Mark Ready</>}
                            {isReady && <><i className="bi bi-arrow-right-circle me-1" /> Mark Served</>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 3: MENU MODIFIERS ── */}
          {activeTab === 'modifiers' && (
            <div className="pk-card">
              <div className="pk-card__head">
                <div>
                  <div className="pk-card__title">Item Modifiers &amp; Add-ons</div>
                  <div className="pk-card__sub">Customization options like extra ingredients, preparation styles, or packaging</div>
                </div>
              </div>
              <div className="pk-table-responsive">
                <table className="pk-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Modifier Name</th>
                      <th>Price Delta</th>
                      <th>Required</th>
                      <th>Options Available</th>
                      <th style={{ width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modifiers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                          No product modifiers created yet.
                        </td>
                      </tr>
                    ) : (
                      modifiers.map(mod => (
                        <tr key={mod.id}>
                          <td><strong>{mod.product?.name || `Product #${mod.product_id}`}</strong></td>
                          <td>{mod.name}</td>
                          <td>{mod.price_delta > 0 ? `+ Rs. ${mod.price_delta}` : 'Free'}</td>
                          <td>{mod.is_required ? <span className="pk-badge pk-badge--warning">Required</span> : <span className="pk-badge pk-badge--secondary">Optional</span>}</td>
                          <td>
                            {Array.isArray(mod.options) && mod.options.length > 0 ? (
                              mod.options.map((opt, i) => (
                                <span key={i} className="pk-badge pk-badge--info me-1" style={{ fontSize: '0.72rem' }}>{opt}</span>
                              ))
                            ) : '—'}
                          </td>
                          <td>
                            <button
                              className="pk-btn pk-btn--outline pk-btn--sm text-danger"
                              onClick={() => handleDeleteModifier(mod.id)}
                            >
                              <i className="bi bi-trash" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TABLE MODAL ── */}
      {showTableModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSaveTable}>
                <div className="modal-header">
                  <h5 className="modal-title">{editingTable ? 'Edit Table' : 'Add Dining Table'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowTableModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Table Name / Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Table 12, Window 3, Rooftop A"
                      required
                      value={tableForm.name}
                      onChange={e => setTableForm({ ...tableForm, name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Seating Capacity</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="form-control"
                      value={tableForm.capacity}
                      onChange={e => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 4 })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Dining Section</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Main Hall, AC Section, Rooftop, Patio"
                      value={tableForm.section}
                      onChange={e => setTableForm({ ...tableForm, section: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="pk-btn pk-btn--outline" onClick={() => setShowTableModal(false)}>Cancel</button>
                  <button type="submit" className="pk-btn pk-btn--primary">Save Table</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODIFIER MODAL ── */}
      {showModModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSaveModifier}>
                <div className="modal-header">
                  <h5 className="modal-title">Add Menu Modifier</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Attach to Product *</label>
                    <select
                      className="form-select"
                      required
                      value={modForm.product_id}
                      onChange={e => setModForm({ ...modForm, product_id: e.target.value })}
                    >
                      <option value="">-- Select product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Rs. {p.price})</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Modifier Group Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Extra Cheese, Spice Level, Gift Wrapping"
                      required
                      value={modForm.name}
                      onChange={e => setModForm({ ...modForm, name: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Additional Price Delta (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="0.00"
                      value={modForm.price_delta}
                      onChange={e => setModForm({ ...modForm, price_delta: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Options (Comma separated)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Mild, Medium, Extra Spicy"
                      value={modForm.options}
                      onChange={e => setModForm({ ...modForm, options: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="pk-btn pk-btn--outline" onClick={() => setShowModModal(false)}>Cancel</button>
                  <button type="submit" className="pk-btn pk-btn--primary">Save Modifier</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── HIDDEN PRINT LAYOUT FOR KOT ── */}
      {selectedKot && (
        <div className="d-none d-print-block" style={{ width: '80mm', margin: '0 auto', fontFamily: 'monospace', fontSize: '12px' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '5px' }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '18px' }}>*** KITCHEN TICKET ***</h4>
            <div>Ticket: <strong>{selectedKot.ticket_number}</strong></div>
            <div>Table: <strong>{selectedKot.table?.name || 'Takeaway'}</strong></div>
            <div>Time: {new Date(selectedKot.printed_at || Date.now()).toLocaleTimeString()}</div>
          </div>
          <div style={{ padding: '8px 0', borderBottom: '1px dashed #000' }}>
            {Array.isArray(selectedKot.items) && selectedKot.items.map((it, idx) => (
              <div key={idx} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>{it.qty} × {it.name}</span>
                </div>
                {it.modifiers && it.modifiers.length > 0 && (
                  <div style={{ fontSize: '10px', paddingLeft: '10px' }}>
                    + {it.modifiers.join(', ')}
                  </div>
                )}
                {it.notes && (
                  <div style={{ fontSize: '10px', paddingLeft: '10px' }}>
                    ** {it.notes} **
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', paddingTop: '5px', fontSize: '10px' }}>
            Station: {selectedKot.station}
          </div>
        </div>
      )}
    </div>
  );
}
