import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Legend,
} from 'recharts';
import api from '../../services/api';

const ROSE   = '#e05c7a';
const GREEN  = '#2e7d32';
const AMBER  = '#f59e0b';
const BLUE   = '#3b82f6';
const PIE_COLORS = [ROSE, GREEN, BLUE, AMBER, '#8b5cf6', '#06b6d4', '#f97316'];

const fmt = (v) => `Rs. ${Number(v).toLocaleString()}`;

export default function ReportsPage() {
  const [salesData,     setSalesData]     = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('sales');

  useEffect(() => {
    Promise.all([api.get('/reports/sales'), api.get('/reports/inventory')])
      .then(([salesRes, invRes]) => {
        setSalesData(salesRes.data);
        setInventoryData(invRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" />
      </div>
    );
  }

  const summary = salesData?.summary || {};
  const daily   = [...(salesData?.daily || [])].reverse(); // oldest → newest for chart

  const kpis = [
    { label: 'Total Sales (30d)',  value: fmt(summary.gross_sales || 0),      icon: 'bi-currency-rupee', color: 'rose'  },
    { label: 'Orders (30d)',       value: summary.orders || 0,                 icon: 'bi-bag-check',      color: 'green' },
    { label: 'Avg Order Value',    value: fmt(summary.avg_order_value || 0),   icon: 'bi-graph-up',       color: 'blue'  },
    { label: 'Low Stock Items',    value: inventoryData?.low_stock_items || 0, icon: 'bi-exclamation-triangle', color: 'amber' },
  ];

  // ── Category breakdown from inventory ────────────────────────────────────
  const categories = inventoryData?.category_breakdown || [];

  // ── Channel breakdown ─────────────────────────────────────────────────────
  const channels = salesData?.channel_breakdown || [];

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h4 className="mb-0">Reports &amp; Analytics</h4>
        <small className="text-muted">Last 30 days</small>
      </div>

      {/* KPI cards */}
      <div className="row g-3 mb-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className={`report-kpi-icon report-kpi-icon--${kpi.color}`}>
                  <i className={`bi ${kpi.icon} fs-4`} />
                </div>
                <div>
                  <div className="text-muted small">{kpi.label}</div>
                  <div className="fw-bold fs-5">{kpi.value}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <ul className="nav nav-tabs mb-4">
        {['sales', 'channels', 'inventory'].map((tab) => (
          <li key={tab} className="nav-item">
            <button
              className={`nav-link ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'sales'     ? 'Daily Sales'    : null}
              {tab === 'channels'  ? 'Sales Channels' : null}
              {tab === 'inventory' ? 'Inventory'      : null}
            </button>
          </li>
        ))}
      </ul>

      {/* ── Daily Sales Tab ─────────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h6 className="mb-3">Revenue — Last 30 Days</h6>
              {daily.length === 0 ? (
                <p className="text-muted text-center py-4">No sales data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={daily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => fmt(v)} labelFormatter={(d) => `Date: ${d}`} />
                    <Bar dataKey="revenue" fill={ROSE} radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h6 className="mb-3">Order Count — Last 30 Days</h6>
              {daily.length === 0 ? (
                <p className="text-muted text-center py-4">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={daily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip labelFormatter={(d) => `Date: ${d}`} />
                    <Line type="monotone" dataKey="orders" stroke={GREEN} strokeWidth={2} dot={false} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="mb-3">Daily Breakdown</h6>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="table table-hover table-sm mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Date</th>
                      <th>Orders</th>
                      <th className="text-end">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(salesData?.daily || [])].map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>{row.orders}</td>
                        <td className="text-end">{fmt(row.revenue)}</td>
                      </tr>
                    ))}
                    {daily.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-4">No sales data yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Channels Tab ────────────────────────────────────────────────── */}
      {activeTab === 'channels' && (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="mb-3">Orders by Channel</h6>
                {channels.length === 0 ? (
                  <p className="text-muted text-center py-4">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={channels.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }))}
                        dataKey="orders"
                        nameKey="channel"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`}
                      />
                      <Tooltip formatter={(v) => [`${v} orders`, 'Orders']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="mb-3">Revenue by Channel</h6>
                {channels.length === 0 ? (
                  <p className="text-muted text-center py-4">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={channels} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="channel" tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => fmt(v)} />
                      <Bar dataKey="revenue" fill={BLUE} radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Inventory Tab ───────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="row g-4">
          <div className="col-md-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="mb-3">Stock by Category</h6>
                {categories.length === 0 ? (
                  <p className="text-muted text-center py-4">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categories.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }))}
                        dataKey="total_stock"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      />
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <div className="p-3 rounded bg-light text-center">
                      <div className="fs-3 fw-bold">{inventoryData?.total_items || 0}</div>
                      <div className="small text-muted">Total Products</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded text-center" style={{ background: '#fff3cd' }}>
                      <div className="fs-3 fw-bold text-warning">{inventoryData?.low_stock_items || 0}</div>
                      <div className="small text-muted">Low Stock Items</div>
                    </div>
                  </div>
                </div>
                <h6 className="mb-2">Category Stock Levels</h6>
                {categories.length > 0 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={categories} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total_stock" fill={GREEN} radius={[4, 4, 0, 0]} name="Stock" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
