import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../auth/I18nContext';

export default function DashboardPage() {
  const { user, businessType, hasCapability } = useAuth();
  const { t } = useI18n();
  const [summaryData, setSummaryData] = useState(null);
  const [restaurantStats, setRestaurantStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const promises = [api.get('/dashboard/summary')];
    if (hasCapability('restaurant')) {
      promises.push(api.get('/restaurant/stats').catch(() => ({ data: null })));
    }

    Promise.all(promises)
      .then(([summaryRes, restRes]) => {
        setSummaryData(summaryRes.data);
        if (restRes?.data) setRestaurantStats(restRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [businessType]);

  // Construct vertical-specific KPIs
  const getKpis = () => {
    const salesVal = summaryData?.sales_today != null
      ? `Rs. ${Number(summaryData.sales_today).toLocaleString()}`
      : '—';

    if (hasCapability('restaurant') || businessType === 'restaurant') {
      return [
        { label: t('todaysSales'),     value: salesVal, icon: 'bi-currency-rupee', tint: '#ffe4ef', color: '#be185d' },
        { label: t('occupiedTables'),  value: restaurantStats?.occupied_tables ?? '—', icon: 'bi-cup-hot', tint: '#dbeafe', color: '#2563eb' },
        { label: t('pendingKots'),     value: restaurantStats?.pending_kots ?? '—', icon: 'bi-fire', tint: '#fef3c7', color: '#d97706' },
        { label: t('vacantTables'),    value: restaurantStats?.vacant_tables ?? '—', icon: 'bi-check-circle', tint: '#dcfce7', color: '#16a34a' },
      ];
    }

    if (hasCapability('suppliers') || businessType === 'fresh_perishable') {
      return [
        { label: t('todaysSales'),        value: salesVal, icon: 'bi-currency-rupee', tint: '#ffe4ef', color: '#be185d' },
        { label: t('pendingOrders'),      value: summaryData?.pending_orders ?? '—', icon: 'bi-bag-clock', tint: '#dbeafe', color: '#2563eb' },
        { label: t('lowStockExpiry'),     value: summaryData?.low_stock ?? '—', icon: 'bi-exclamation-triangle', tint: '#fef3c7', color: '#d97706' },
        { label: t('deliveriesOnRoute'),  value: summaryData?.delivery_queue ?? '—', icon: 'bi-truck', tint: '#dcfce7', color: '#16a34a' },
      ];
    }

    // Default Retail / Supermarket / General Store
    return [
      { label: t('todaysSales'),        value: salesVal, icon: 'bi-currency-rupee', tint: '#ffe4ef', color: '#be185d' },
      { label: t('pendingOrders'),      value: summaryData?.pending_orders ?? '—', icon: 'bi-bag-clock', tint: '#dbeafe', color: '#2563eb' },
      { label: t('lowStockWarnings'),   value: summaryData?.low_stock ?? '—', icon: 'bi-exclamation-triangle', tint: '#fef3c7', color: '#d97706' },
      { label: t('liveOrdersQueue'),    value: summaryData?.delivery_queue ?? '—', icon: 'bi-receipt-cutoff', tint: '#dcfce7', color: '#16a34a' },
    ];
  };

  // Build quick actions list tailored to vertical
  const quickActions = [
    { path: '/pos', label: t('openPos'), icon: 'bi-receipt', tint: '#ede9fe', color: '#7c3aed' },
    ...(hasCapability('restaurant') ? [{ path: '/restaurant', label: t('floorAndKots'), icon: 'bi-cup-hot', tint: '#fee2e2', color: '#dc2626' }] : []),
    { path: '/orders', label: t('viewOrders'), icon: 'bi-bag-check', tint: '#dbeafe', color: '#2563eb' },
    { path: '/inventory', label: t('stockAndBatches'), icon: 'bi-box-seam', tint: '#dcfce7', color: '#16a34a' },
    ...(hasCapability('suppliers') ? [{ path: '/suppliers', label: t('suppliersAndIntake'), icon: 'bi-truck-flatbed', tint: '#ccfbf1', color: '#0f766e' }] : []),
    ...(hasCapability('delivery') ? [{ path: '/delivery', label: t('deliveryBoard'), icon: 'bi-truck', tint: '#fef9c3', color: '#d97706' }] : []),
    { path: '/reports', label: t('analytics'), icon: 'bi-bar-chart', tint: '#f3e8ff', color: '#9333ea' },
  ];

  const typeLabels = {
    retail: 'Retail / Supermarket',
    fresh_perishable: 'Fresh / Perishable Market',
    restaurant: 'Restaurant / Café',
    service: 'Service Business',
    hybrid: 'Multi-category Store',
  };

  return (
    <div>
      <div className="pg-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <h4 className="pg-title" style={{ margin: 0 }}>{t('dashboard')}</h4>
            <span className="pk-badge pk-badge--info" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {typeLabels[businessType] || user?.shop_profile?.label || 'Shop'}
            </span>
          </div>
          <p className="pg-sub">{t('liveOperations')}</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="pk-kpi-row">
        {getKpis().map((k) => (
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
            <div className="pk-card__title">{t('quickActions')}</div>
            <div className="pk-card__sub">{t('quickActionsDesc')}</div>
          </div>
        </div>
        <div className="pk-card__body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem' }}>
            {quickActions.map((q) => (
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
