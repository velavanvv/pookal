import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/common/SectionCard';
import api from '../../services/api';

const quickLinks = [
  { path: '/pos',       label: 'Open POS',      icon: 'bi-receipt'   },
  { path: '/orders',    label: 'View Orders',    icon: 'bi-bag-check' },
  { path: '/inventory', label: 'Inventory',      icon: 'bi-box-seam'  },
  { path: '/delivery',  label: 'Delivery Board', icon: 'bi-truck'     },
];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState([
    { label: 'Today sales',        value: 'Rs. —' },
    { label: 'Pending orders',     value: '—'     },
    { label: 'Low stock items',    value: '—'     },
    { label: 'Deliveries on route', value: '—'   },
  ]);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(({ data }) => {
        setMetrics([
          { label: 'Today sales',         value: `Rs. ${data.sales_today}`                      },
          { label: 'Pending orders',       value: String(data.pending_orders)                    },
          { label: 'Low stock items',      value: String(data.low_stock).padStart(2, '0')        },
          { label: 'Deliveries on route',  value: String(data.delivery_queue).padStart(2, '0')  },
        ]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionCard title="Today at a glance" description="Live figures from POS, orders, and inventory.">
          <div className="row g-3">
            {metrics.map((m) => (
              <div className="col-md-3" key={m.label}>
                <div className="metric-tile">
                  <span>{m.label}</span>
                  <strong>{m.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="col-12">
        <SectionCard title="Quick actions" description="Jump directly to key operations.">
          <div className="row g-3">
            {quickLinks.map((link) => (
              <div className="col-sm-6 col-lg-3" key={link.path}>
                <Link to={link.path} className="quick-link-card">
                  <i className={`bi ${link.icon} fs-3`} />
                  <span>{link.label}</span>
                </Link>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
