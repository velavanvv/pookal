import { useState, useEffect } from 'react';
import api from '../../services/api';

const STATUSES = ['all', 'pending', 'packed', 'dispatched', 'delivered'];

const STATUS_META = {
  pending:    { cls: 'pk-badge--warning', label: 'Pending'    },
  packed:     { cls: 'pk-badge--info',    label: 'Packed'     },
  dispatched: { cls: 'pk-badge--rose',    label: 'Dispatched' },
  delivered:  { cls: 'pk-badge--success', label: 'Delivered'  },
};

const CHANNEL_META = {
  store:    { cls: 'pk-badge--gray',    label: 'Store'    },
  online:   { cls: 'pk-badge--info',    label: 'Online'   },
  whatsapp: { cls: 'pk-badge--success', label: 'WhatsApp' },
};

const NEXT = {
  pending:    ['packed'],
  packed:     ['dispatched'],
  dispatched: ['delivered'],
  delivered:  [],
};

export default function OrdersPage() {
  const [orders,   setOrders]   = useState([]);
  const [status,   setStatus]   = useState('all');
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/branches').then(({ data }) => setBranches(data || []));
  }, []);

  const fetchOrders = (s, bid) => {
    setLoading(true);
    const params = [];
    if (s !== 'all') params.push(`status=${s}`);
    if (bid)         params.push(`branch_id=${bid}`);
    const q = params.length ? `?${params.join('&')}` : '';
    api.get(`/orders${q}`)
      .then(({ data }) => setOrders(data.data || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(status, branchId); }, [status, branchId]);

  const advance = async (id, s) => {
    await api.patch(`/orders/${id}`, { status: s });
    fetchOrders(status, branchId);
  };

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Orders</h4>
          <p className="pg-sub">{orders.length} order{orders.length !== 1 ? 's' : ''} {status !== 'all' ? `· ${status}` : ''}</p>
        </div>
        {branches.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="bi bi-shop" style={{ color: 'var(--text-3)' }} />
            <select
              className="pk-input"
              style={{ width: 160 }}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pk-tabs">
        {STATUSES.map(s => (
          <button
            key={s}
            className={`pk-tab ${status === s ? 'pk-tab--active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="pk-card">
        {loading ? (
          <div className="pk-loading">
            <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
            <span>Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="pk-empty">
            <i className="bi bi-bag-x" />
            <h6>No orders found</h6>
            <p>No {status !== 'all' ? status : ''} orders yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="pk-table orders-desktop-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer / Recipient</th>
                  <th>Channel</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Delivery</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const sm = STATUS_META[o.status]   || { cls: 'pk-badge--gray', label: o.status  };
                  const cm = CHANNEL_META[o.channel] || { cls: 'pk-badge--gray', label: o.channel };
                  return (
                    <tr key={o.id}>
                      <td><div style={{ fontWeight: 700 }}>{o.order_number}</div></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.customer_name || o.recipient_name || '—'}</div>
                        {o.recipient_phone && <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{o.recipient_phone}</div>}
                        {o.recipient_address && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.recipient_address}
                          </div>
                        )}
                        {o.gift_message && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--c-green)', marginTop: 2 }}>
                            <i className="bi bi-gift me-1" />"{o.gift_message}"
                          </div>
                        )}
                      </td>
                      <td><span className={`pk-badge ${cm.cls}`}>{cm.label}</span></td>
                      <td>
                        {o.branch_name
                          ? <span className="pk-badge pk-badge--gray"><i className="bi bi-shop me-1" />{o.branch_name}</span>
                          : <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>—</span>
                        }
                      </td>
                      <td><span className={`pk-badge ${sm.cls}`}>{sm.label}</span></td>
                      <td>
                        {o.delivery_date && <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{o.delivery_date}</div>}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{o.delivery_time_slot || o.delivery_slot || '—'}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>Rs. {Number(o.grand_total).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {(NEXT[o.status] || []).map(s => (
                            <button key={s} className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => advance(o.id, s)}>
                              → {s}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="orders-mobile-list">
              {orders.map(o => {
                const sm = STATUS_META[o.status]   || { cls: 'pk-badge--gray', label: o.status  };
                const cm = CHANNEL_META[o.channel] || { cls: 'pk-badge--gray', label: o.channel };
                return (
                  <div key={o.id} className="order-card">
                    <div className="order-card__top">
                      <span className="order-card__num">{o.order_number}</span>
                      <span className={`pk-badge ${sm.cls}`}>{sm.label}</span>
                      <span className={`pk-badge ${cm.cls}`}>{cm.label}</span>
                    </div>
                    <div className="order-card__name">
                      {o.customer_name || o.recipient_name || 'Walk-in'}
                      {o.recipient_phone && <span className="order-card__phone"> · {o.recipient_phone}</span>}
                    </div>
                    {o.recipient_address && (
                      <div className="order-card__addr">
                        <i className="bi bi-geo-alt" /> {o.recipient_address}
                      </div>
                    )}
                    {o.gift_message && (
                      <div className="order-card__gift">
                        <i className="bi bi-gift" /> "{o.gift_message}"
                      </div>
                    )}
                    <div className="order-card__meta">
                      {o.delivery_date && (
                        <span><i className="bi bi-calendar3" /> {o.delivery_date}{o.delivery_time_slot ? ` · ${o.delivery_time_slot}` : ''}</span>
                      )}
                      {o.branch_name && (
                        <span><i className="bi bi-shop" /> {o.branch_name}</span>
                      )}
                    </div>
                    <div className="order-card__foot">
                      <span className="order-card__total">Rs. {Number(o.grand_total).toLocaleString()}</span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {(NEXT[o.status] || []).map(s => (
                          <button key={s} className="pk-btn pk-btn--sm pk-btn--rose" onClick={() => advance(o.id, s)}>
                            → {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
