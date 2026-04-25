import { useState, useEffect } from 'react';
import api from '../../services/api';

const COLUMNS = [
  { key: 'packed',     label: 'Packed',           tint: '#dbeafe', color: '#2563eb', icon: 'bi-box-seam'    },
  { key: 'dispatched', label: 'Out for Delivery',  tint: '#ede9fe', color: '#7c3aed', icon: 'bi-truck'       },
  { key: 'delivered',  label: 'Delivered',          tint: '#dcfce7', color: '#16a34a', icon: 'bi-check-circle'},
];

export default function DeliveryPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBoard = () => {
    setLoading(true);
    api.get('/delivery/board')
      .then(({ data }) => setOrders(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBoard(); }, []);

  const dispatch = async (orderId, status) => {
    await api.post('/delivery/dispatch', { order_id: orderId, status });
    fetchBoard();
  };

  if (loading) return (
    <div className="pk-loading">
      <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
      <span>Loading board…</span>
    </div>
  );

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Delivery Board</h4>
          <p className="pg-sub">Real-time order movement — packed → dispatched → delivered</p>
        </div>
        <button className="pk-btn pk-btn--outline" onClick={fetchBoard}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </div>

      <div className="delivery-board">
        {COLUMNS.map(col => {
          const colOrders = orders.filter(o => o.status === col.key);
          return (
            <div key={col.key} className="delivery-col">
              <div className="delivery-col__head" style={{ background: col.tint, color: col.color }}>
                <i className={`bi ${col.icon}`} />
                <span>{col.label}</span>
                <div className="delivery-col__badge" style={{ background: col.color, color: '#fff' }}>
                  {colOrders.length}
                </div>
              </div>
              <div className="delivery-col__body">
                {colOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '1.5rem 1rem', fontSize: '0.82rem' }}>
                    Nothing here
                  </div>
                ) : colOrders.map(order => (
                  <div key={order.order_id} className="delivery-card">
                    <div className="delivery-card__top">
                      <span className="delivery-card__num">{order.order_number}</span>
                      <span className="delivery-card__slot">{order.slot}</span>
                    </div>
                    <div className="delivery-card__customer">
                      {order.customer_name || 'Walk-in'}
                    </div>
                    {col.key === 'packed' && (
                      <button
                        className="pk-btn pk-btn--sm w-100 mt-2"
                        style={{ background: '#2563eb', justifyContent: 'center' }}
                        onClick={() => dispatch(order.order_id, 'dispatched')}
                      >
                        <i className="bi bi-truck" /> Dispatch
                      </button>
                    )}
                    {col.key === 'dispatched' && (
                      <button
                        className="pk-btn pk-btn--sm w-100 mt-2"
                        style={{ background: 'var(--c-green)', justifyContent: 'center' }}
                        onClick={() => dispatch(order.order_id, 'delivered')}
                      >
                        <i className="bi bi-check-circle" /> Mark Delivered
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
