import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const QUICK = [
  { path: '/pos',       label: 'Open POS',      icon: 'bi-receipt',    tint: '#ede9fe', color: '#7c3aed' },
  { path: '/orders',    label: 'View Orders',    icon: 'bi-bag-check',  tint: '#dbeafe', color: '#2563eb' },
  { path: '/inventory', label: 'Inventory',      icon: 'bi-box-seam',   tint: '#dcfce7', color: '#16a34a' },
  { path: '/delivery',  label: 'Delivery Board', icon: 'bi-truck',      tint: '#fef9c3', color: '#d97706' },
];

export default function DashboardPage() {
  const [kpis, setKpis] = useState([
    { label: "Today's Sales",        value: '—',  icon: 'bi-currency-rupee', tint: '#ffe4ef', color: 'var(--pookal-rose)' },
    { label: 'Pending Orders',       value: '—',  icon: 'bi-bag-clock',      tint: '#dbeafe', color: '#2563eb' },
    { label: 'Low Stock Items',      value: '—',  icon: 'bi-exclamation-triangle', tint: '#fef9c3', color: '#d97706' },
    { label: 'Deliveries on Route',  value: '—',  icon: 'bi-truck',          tint: '#dcfce7', color: '#16a34a' },
  ]);

  useEffect(() => {
    api.get('/dashboard/summary').then(({ data }) => {
      setKpis([
        { label: "Today's Sales",        value: `Rs. ${Number(data.sales_today).toLocaleString()}`, icon: 'bi-currency-rupee', tint: '#ffe4ef', color: 'var(--pookal-rose)' },
        { label: 'Pending Orders',       value: data.pending_orders,  icon: 'bi-bag-clock',           tint: '#dbeafe', color: '#2563eb' },
        { label: 'Low Stock Items',      value: data.low_stock,       icon: 'bi-exclamation-triangle', tint: '#fef9c3', color: '#d97706' },
        { label: 'Deliveries on Route',  value: data.delivery_queue,  icon: 'bi-truck',                tint: '#dcfce7', color: '#16a34a' },
      ]);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Dashboard</h4>
          <p className="pg-sub">Today at a glance — live figures from POS, orders, and inventory</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="pk-kpi-row">
        {kpis.map(k => (
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

      {/* Quick actions */}
      <div className="pk-card">
        <div className="pk-card__head">
          <div>
            <div className="pk-card__title">Quick Actions</div>
            <div className="pk-card__sub">Jump directly to key operations</div>
          </div>
        </div>
        <div className="pk-card__body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            {QUICK.map(q => (
              <Link key={q.path} to={q.path} className="pk-action-card">
                <div className="pk-action-card__icon" style={{ background: q.tint, color: q.color }}>
                  <i className={`bi ${q.icon}`} />
                </div>
                <span className="pk-action-card__label">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
