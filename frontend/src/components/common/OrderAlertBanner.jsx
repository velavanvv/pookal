import { useNavigate } from 'react-router-dom';
import { playOrderChime } from '../../hooks/useOrderAlerts';

export default function OrderAlertBanner({ order, onDismiss }) {
  const navigate = useNavigate();

  if (!order) return null;

  const handleViewOrder = () => {
    onDismiss();
    navigate('/orders');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 100000,
        width: '420px',
        maxWidth: 'calc(100vw - 2.5rem)',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 0 0 2px rgba(244, 114, 182, 0.4)',
        padding: '1.25rem',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Glow pulse element */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '120px',
          height: '120px',
          background: 'rgba(236, 72, 153, 0.25)',
          filter: 'blur(30px)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        {/* Animated Bell Ring Icon */}
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #be185d, #ec4899)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.35rem',
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 0 0 6px rgba(236, 72, 153, 0.25)',
            animation: 'bellRing 1.5s infinite',
          }}
        >
          <i className="bi bi-bell-fill" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#f472b6',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              🔔 NEW ONLINE ORDER
            </span>
            <button
              onClick={onDismiss}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>
            {order.recipient_name}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>📞 {order.recipient_phone || '—'}</span>
            <span>·</span>
            <span style={{ color: '#4ade80', fontWeight: 700 }}>₹{order.grand_total}</span>
          </div>

          {order.delivery_time_slot && (
            <div style={{ fontSize: '0.75rem', color: '#fbcfe8', background: 'rgba(255,255,255,0.08)', padding: '0.25rem 0.5rem', borderRadius: '6px', marginBottom: '0.85rem' }}>
              🌅 {order.delivery_time_slot}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleViewOrder}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #be185d, #831843)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                boxShadow: '0 4px 12px rgba(190, 24, 93, 0.35)',
              }}
            >
              <span>👁️ View Order</span>
              <i className="bi bi-arrow-right" />
            </button>

            <button
              onClick={() => playOrderChime()}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '0.45rem 0.65rem',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
              title="Replay notification chime sound"
            >
              <i className="bi bi-volume-up-fill" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
