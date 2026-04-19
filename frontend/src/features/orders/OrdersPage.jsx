import { useState, useEffect } from 'react';
import api from '../../services/api';

const STATUSES = ['all', 'pending', 'packed', 'dispatched', 'delivered'];

const STATUS_COLORS = {
  pending:    'warning',
  packed:     'info',
  dispatched: 'primary',
  delivered:  'success',
};

const CHANNEL_COLORS = {
  store:    'secondary',
  online:   'primary',
  whatsapp: 'success',
};

const NEXT_STATUSES = {
  pending:    ['packed'],
  packed:     ['dispatched'],
  dispatched: ['delivered'],
  delivered:  [],
};

export default function OrdersPage() {
  const [orders,       setOrders]       = useState([]);
  const [activeStatus, setActiveStatus] = useState('all');
  const [loading,      setLoading]      = useState(true);

  const fetchOrders = (status) => {
    setLoading(true);
    const params = status !== 'all' ? `?status=${status}` : '';
    api.get(`/orders${params}`)
      .then(({ data }) => setOrders(data.data || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(activeStatus); }, [activeStatus]);

  const updateStatus = async (orderId, status) => {
    await api.patch(`/orders/${orderId}`, { status });
    fetchOrders(activeStatus);
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Orders</h4>
        <span className="text-muted small">{orders.length} orders</span>
      </div>

      <ul className="nav nav-tabs mb-3">
        {STATUSES.map((s) => (
          <li className="nav-item" key={s}>
            <button
              className={`nav-link ${activeStatus === s ? 'active' : ''}`}
              onClick={() => setActiveStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          </li>
        ))}
      </ul>

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
                  <th>Order #</th>
                  <th>Customer / Recipient</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="fw-semibold">{order.order_number}</td>
                    <td>
                      <div>{order.customer_name || order.recipient_name || '—'}</div>
                      {order.recipient_phone && <div className="text-muted small">{order.recipient_phone}</div>}
                      {order.recipient_address && <div className="text-muted small" style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{order.recipient_address}</div>}
                      {order.gift_message && <div className="text-success small"><i className="bi bi-gift me-1"/>"{order.gift_message}"</div>}
                    </td>
                    <td>
                      <span className={`badge text-bg-${CHANNEL_COLORS[order.channel] || 'secondary'}`}>
                        {order.channel}
                      </span>
                    </td>
                    <td>
                      <span className={`badge text-bg-${STATUS_COLORS[order.status] || 'secondary'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>Rs.{' '}{Number(order.grand_total).toLocaleString()}</td>
                    <td className="small">
                      {order.delivery_date && <div className="fw-semibold">{order.delivery_date}</div>}
                      <div className="text-muted">{order.delivery_time_slot || order.delivery_slot || '—'}</div>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        {(NEXT_STATUSES[order.status] || []).map((s) => (
                          <button
                            key={s}
                            className="btn btn-sm btn-outline-dark"
                            onClick={() => updateStatus(order.id, s)}
                          >
                            → {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
