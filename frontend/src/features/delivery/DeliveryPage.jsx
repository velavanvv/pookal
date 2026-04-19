import { useState, useEffect } from 'react';
import api from '../../services/api';

const COLUMNS = [
  { key: 'packed',     label: 'Packed',           color: 'info'    },
  { key: 'dispatched', label: 'Out for Delivery',  color: 'primary' },
  { key: 'delivered',  label: 'Delivered',         color: 'success' },
];

export default function DeliveryPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBoard = () => {
    api.get('/delivery/board')
      .then(({ data }) => setOrders(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBoard(); }, []);

  const dispatch = async (orderId, status) => {
    await api.post('/delivery/dispatch', { order_id: orderId, status });
    fetchBoard();
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Delivery Control Tower</h4>
        <button className="btn btn-outline-dark btn-sm" onClick={fetchBoard}>
          <i className="bi bi-arrow-clockwise me-1" />Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" />
        </div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const colOrders = orders.filter((o) => o.status === col.key);
            return (
              <div className="kanban-col" key={col.key}>
                <div className={`kanban-col__header bg-${col.color} bg-opacity-10`}>
                  <span className={`badge text-bg-${col.color} me-2`}>{colOrders.length}</span>
                  <strong>{col.label}</strong>
                </div>
                <div className="kanban-col__body">
                  {colOrders.map((order) => (
                    <div className="kanban-card" key={order.order_id}>
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-semibold small">{order.order_number}</span>
                        <span className="badge text-bg-light text-dark border small">
                          {order.slot}
                        </span>
                      </div>
                      <div className="text-muted small mb-2">
                        {order.customer_name || 'Walk-in'}
                      </div>
                      {col.key === 'packed' && (
                        <button
                          className="btn btn-sm btn-primary w-100"
                          onClick={() => dispatch(order.order_id, 'dispatched')}
                        >
                          <i className="bi bi-truck me-1" />Dispatch
                        </button>
                      )}
                      {col.key === 'dispatched' && (
                        <button
                          className="btn btn-sm btn-success w-100"
                          onClick={() => dispatch(order.order_id, 'delivered')}
                        >
                          <i className="bi bi-check-circle me-1" />Mark Delivered
                        </button>
                      )}
                    </div>
                  ))}
                  {colOrders.length === 0 && (
                    <p className="text-muted small text-center py-3">No orders here.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
