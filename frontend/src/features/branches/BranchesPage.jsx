import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/branches')
      .then(({ data }) => setBranches(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Branches</h4>
          <p className="pg-sub">Physical shop locations managed by your Pookal admin</p>
        </div>
      </div>

      <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.83rem', color: '#0369a1', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <i className="bi bi-info-circle" />
        Branches are created and managed by your Pookal administrator. Contact them to add or modify branches.
      </div>

      {loading ? (
        <div className="pk-loading">
          <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
          <span>Loading branches…</span>
        </div>
      ) : branches.length === 0 ? (
        <div className="pk-empty" style={{ marginTop: '3rem' }}>
          <i className="bi bi-diagram-3" />
          <h6>No branches yet</h6>
          <p>Your administrator will add branches here once they are set up.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {branches.map(b => (
            <div key={b.id} className="pk-card">
              <div className="pk-card__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: '#ffe4ef', color: 'var(--pookal-rose)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <i className="bi bi-shop" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.name}</div>
                    {b.code && <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontFamily: 'monospace' }}>{b.code}</div>}
                    <span className={`pk-badge ${b.is_active ? 'pk-badge--success' : 'pk-badge--gray'}`} style={{ marginTop: '0.2rem', display: 'inline-block' }}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pk-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {b.manager_name && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                    <i className="bi bi-person me-2" />{b.manager_name}
                  </div>
                )}
                {b.phone && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                    <i className="bi bi-telephone me-2" />{b.phone}
                  </div>
                )}
                {b.address && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                    <i className="bi bi-geo-alt me-2" />{b.address}
                  </div>
                )}
                {b.database?.database && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                    <i className="bi bi-hdd-network me-2" />{b.database.database}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
