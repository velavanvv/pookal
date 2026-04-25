import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Legend,
} from 'recharts';
import api from '../../services/api';
import { useBranch } from '../branches/BranchContext';
import { useAuth } from '../auth/AuthContext';

const ROSE  = '#7d294a';
const GREEN = '#16a34a';
const AMBER = '#d97706';
const BLUE  = '#2563eb';
const PIE_COLORS = [ROSE, GREEN, BLUE, AMBER, '#7c3aed', '#0891b2', '#ea580c'];
const BRANCH_COLORS = [ROSE, BLUE, GREEN, AMBER, '#7c3aed', '#0891b2'];

const fmt = v => `Rs. ${Number(v).toLocaleString()}`;

export default function ReportsPage() {
  const { user }                              = useAuth();
  const { activeBranch }                      = useBranch();
  const [salesData,     setSalesData]         = useState(null);
  const [inventoryData, setInventoryData]     = useState(null);
  const [loading,       setLoading]           = useState(true);
  const [tab,           setTab]               = useState('sales');

  const isBranchUser = !!user?.locked_branch;
  // Scope: 'branch' when a branch is active (locked or switched), 'all' otherwise
  const inBranchScope = isBranchUser || !!activeBranch;
  const scopeName     = isBranchUser
    ? user.locked_branch.name
    : activeBranch?.name ?? null;

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/reports/sales'), api.get('/reports/inventory')])
      .then(([s, i]) => { setSalesData(s.data); setInventoryData(i.data); })
      .finally(() => setLoading(false));
  }, [activeBranch?.id, isBranchUser]); // refetch when branch context changes

  if (loading) return (
    <div className="pk-loading">
      <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
      <span>Loading analytics…</span>
    </div>
  );

  const summary    = salesData?.summary || {};
  const daily      = [...(salesData?.daily || [])].reverse();
  const categories = inventoryData?.category_breakdown || [];
  const channels   = salesData?.channel_breakdown ?? salesData?.channels ?? [];
  const branchRows = salesData?.branches || [];
  const invBranches = inventoryData?.branches || [];

  const kpis = [
    { label: 'Total Sales (30d)',  value: fmt(summary.gross_sales || 0),     icon: 'bi-currency-rupee',      tint: '#ffe4ef', color: 'var(--pookal-rose)' },
    { label: 'Orders (30d)',       value: summary.orders || 0,                icon: 'bi-bag-check',           tint: '#dbeafe', color: '#2563eb'            },
    { label: 'Avg Order Value',    value: fmt(summary.avg_order_value || 0),  icon: 'bi-graph-up',            tint: '#dcfce7', color: '#16a34a'            },
    { label: 'Low Stock Items',    value: inventoryData?.low_stock_items || 0,icon: 'bi-exclamation-triangle',tint: '#fef9c3', color: '#d97706'           },
  ];

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Reports &amp; Analytics</h4>
          <p className="pg-sub">
            {inBranchScope
              ? `Last 30 days — ${scopeName}`
              : 'Last 30 days — All branches combined'}
          </p>
        </div>
        {/* Scope badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {inBranchScope ? (
            <span className="pk-badge pk-badge--info" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
              <i className="bi bi-shop me-1" />{scopeName}
            </span>
          ) : (
            <span className="pk-badge pk-badge--success" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
              <i className="bi bi-diagram-3 me-1" />All Branches
            </span>
          )}
        </div>
      </div>

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

      {/* All-branches per-branch summary bar */}
      {!inBranchScope && branchRows.length > 0 && (
        <div className="pk-card" style={{ marginBottom: '1.25rem' }}>
          <div className="pk-card__head">
            <div className="pk-card__title">
              <i className="bi bi-diagram-3 me-2" />Branch-wise Sales (30d)
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="pk-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th style={{ textAlign: 'right' }}>Orders</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {branchRows.map((b, i) => {
                  const totalRev = branchRows.reduce((s, r) => s + Number(r.revenue || 0), 0);
                  const pct = totalRev > 0 ? Math.round((Number(b.revenue || 0) / totalRev) * 100) : 0;
                  return (
                    <tr key={b.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRANCH_COLORS[i % BRANCH_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontWeight: 600 }}>{b.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{b.orders}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(b.revenue)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: 6, background: '#f4f4f5', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: BRANCH_COLORS[i % BRANCH_COLORS.length], borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', minWidth: 30 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="pk-tabs">
        {[
          { key: 'sales',     label: 'Daily Sales'    },
          { key: 'channels',  label: 'Sales Channels' },
          { key: 'inventory', label: 'Inventory'      },
        ].map(t => (
          <button key={t.key} className={`pk-tab ${tab === t.key ? 'pk-tab--active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="pk-card">
            <div className="pk-card__head">
              <div className="pk-card__title">
                Revenue — Last 30 Days
                {!inBranchScope && <span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--text-2)', marginLeft: '0.5rem' }}>(all branches combined)</span>}
              </div>
            </div>
            <div className="pk-card__body">
              {daily.length === 0 ? <div className="pk-empty"><i className="bi bi-bar-chart" /><p>No sales data yet.</p></div> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => fmt(v)} labelFormatter={d => `Date: ${d}`} contentStyle={{ borderRadius: 8, border: '1.5px solid #e4e4e7', boxShadow: 'var(--shadow-sm)' }} />
                    <Bar dataKey="revenue" fill={ROSE} radius={[4,4,0,0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="pk-card">
            <div className="pk-card__head"><div className="pk-card__title">Order Count — Last 30 Days</div></div>
            <div className="pk-card__body">
              {daily.length === 0 ? <div className="pk-empty"><p>No data yet.</p></div> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                    <Tooltip labelFormatter={d => `Date: ${d}`} contentStyle={{ borderRadius: 8, border: '1.5px solid #e4e4e7' }} />
                    <Line type="monotone" dataKey="orders" stroke={GREEN} strokeWidth={2.5} dot={false} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="pk-card">
            <div className="pk-card__head"><div className="pk-card__title">Daily Breakdown</div></div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table className="pk-table">
                <thead><tr><th>Date</th><th>Orders</th><th style={{ textAlign: 'right' }}>Revenue</th></tr></thead>
                <tbody>
                  {[...(salesData?.daily || [])].map(row => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.orders}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(row.revenue)}</td>
                    </tr>
                  ))}
                  {daily.length === 0 && <tr className="pk-table__empty"><td colSpan={3}>No sales data yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'channels' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="pk-card">
            <div className="pk-card__head"><div className="pk-card__title">Orders by Channel</div></div>
            <div className="pk-card__body">
              {channels.length === 0 ? <div className="pk-empty"><p>No data yet.</p></div> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={channels.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }))} dataKey="orders" nameKey="channel" cx="50%" cy="50%" outerRadius={90} label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`} />
                    <Tooltip formatter={v => [`${v} orders`, 'Orders']} contentStyle={{ borderRadius: 8, border: '1.5px solid #e4e4e7' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="pk-card">
            <div className="pk-card__head"><div className="pk-card__title">Revenue by Channel</div></div>
            <div className="pk-card__body">
              {channels.length === 0 ? <div className="pk-empty"><p>No data yet.</p></div> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={channels} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="channel" tick={{ fontSize: 12, fill: '#71717a' }} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1.5px solid #e4e4e7' }} />
                    <Bar dataKey="revenue" fill={BLUE} radius={[0,4,4,0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* All-branches inventory per-branch breakdown */}
          {!inBranchScope && invBranches.length > 0 && (
            <div className="pk-card">
              <div className="pk-card__head">
                <div className="pk-card__title"><i className="bi bi-diagram-3 me-2" />Branch-wise Inventory</div>
              </div>
              <table className="pk-table">
                <thead><tr><th>Branch</th><th style={{ textAlign: 'right' }}>Products</th><th style={{ textAlign: 'right' }}>Low Stock</th></tr></thead>
                <tbody>
                  {invBranches.map((b, i) => (
                    <tr key={b.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRANCH_COLORS[i % BRANCH_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontWeight: 600 }}>{b.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{b.total_items}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ color: b.low_stock_items > 0 ? '#d97706' : 'var(--text-2)', fontWeight: b.low_stock_items > 0 ? 700 : 400 }}>
                          {b.low_stock_items}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.25rem' }}>
            <div className="pk-card">
              <div className="pk-card__head"><div className="pk-card__title">Stock by Category</div></div>
              <div className="pk-card__body">
                {categories.length === 0 ? <div className="pk-empty"><p>No data yet.</p></div> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={categories.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }))} dataKey="total_stock" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1.5px solid #e4e4e7' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="pk-card">
              <div className="pk-card__head"><div className="pk-card__title">Category Stock Levels</div></div>
              <div className="pk-card__body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f4f4f5', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-1)' }}>{inventoryData?.total_items || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Total Products</div>
                  </div>
                  <div style={{ background: '#fef9c3', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706' }}>{inventoryData?.low_stock_items || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Low Stock Items</div>
                  </div>
                </div>
                {categories.length > 0 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={categories} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1.5px solid #e4e4e7' }} />
                      <Bar dataKey="total_stock" fill={GREEN} radius={[4,4,0,0]} name="Stock" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
