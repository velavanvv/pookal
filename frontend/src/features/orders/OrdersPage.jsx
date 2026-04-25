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
  const [orders,  setOrders]  = useState([]);
  const [status,  setStatus]  = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchOrders = (s) => {
    setLoading(true);
    const q = s !== 'all' ? `?status=${s}` : '';
    api.get(`/orders${q}`)
      .then(({ data }) => setOrders(data.data || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(status); }, [status]);

  const advance = async (id, s) => {
    await api.patch(`/orders/${id}`, { status: s });
    fetchOrders(status);
  };

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Orders</h4>
          <p className="pg-sub">{orders.length} order{orders.length !== 1 ? 's' : ''} {status !== 'all' ? `· ${status}` : ''}</p>
        </div>
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
          <table className="pk-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer / Recipient</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const sm = STATUS_META[o.status]   || { cls: 'pk-badge--gray', label: o.status   };
                const cm = CHANNEL_META[o.channel] || { cls: 'pk-badge--gray', label: o.channel  };
                return (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{o.order_number}</div>
                    </td>
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
        )}
      </div>
    </div>
  );
}
