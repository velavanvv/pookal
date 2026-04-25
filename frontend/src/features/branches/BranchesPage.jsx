import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);

  const fetchBranches = () => {
    setLoading(true);
    api.get('/branches').then(({ data }) => setBranches(data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBranches(); }, []);

  const handleDelete = async (b) => {
    if (!confirm(`Delete branch "${b.name}"? Orders linked to it will have no branch tag.`)) return;
    await api.delete(`/branches/${b.id}`);
    fetchBranches();
  };

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Branches</h4>
          <p className="pg-sub">Manage physical shop locations — tag POS orders to a branch</p>
        </div>
        <button className="pk-btn pk-btn--rose" onClick={() => { setEditBranch(null); setShowModal(true); }}>
          <i className="bi bi-plus-lg" />Add Branch
        </button>
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
          <p>Add your first branch to start tagging orders by location.</p>
          <button className="pk-btn pk-btn--rose" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-lg" />Add Branch
          </button>
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
                    <span className={`pk-badge ${b.is_active ? 'pk-badge--success' : 'pk-badge--gray'}`} style={{ marginTop: '0.2rem', display: 'inline-block' }}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto' }}>
                  <button className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => { setEditBranch(b); setShowModal(true); }}>
                    <i className="bi bi-pencil" />
                  </button>
                  <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDelete(b)}>
                    <i className="bi bi-trash3" />
                  </button>
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
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <BranchModal
          branch={editBranch}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchBranches(); }}
        />
      )}
    </div>
  );
}

function BranchModal({ branch, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:         branch?.name         || '',
    address:      branch?.address      || '',
    phone:        branch?.phone        || '',
    manager_name: branch?.manager_name || '',
    is_active:    branch?.is_active    ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (branch) await api.patch(`/branches/${branch.id}`, form);
      else await api.post('/branches', form);
      onSaved();
    } catch (err) {
      setError(Object.values(err?.response?.data?.errors || {}).flat().join(' ') || 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <div className="pk-modal-bd" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pk-modal">
        <div className="pk-modal__head">
          <span className="pk-modal__title">{branch ? `Edit — ${branch.name}` : 'Add Branch'}</span>
          <button className="pk-modal__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="pk-modal__body">
            {error && (
              <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.82rem', color: '#dc2626', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}
            <div className="pk-field">
              <label>Branch Name *</label>
              <input className="pk-input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Anna Nagar Branch" />
            </div>
            <div className="pk-field">
              <label>Manager Name</label>
              <input className="pk-input" value={form.manager_name} onChange={e => set('manager_name', e.target.value)} placeholder="Branch manager" />
            </div>
            <div className="pk-form-row">
              <div className="pk-field">
                <label>Phone</label>
                <input className="pk-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="pk-field">
                <label>Status</label>
                <select className="pk-input" value={form.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
            <div className="pk-field">
              <label>Address</label>
              <textarea className="pk-input pk-textarea" rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
            </div>
          </div>
          <div className="pk-modal__foot">
            <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="pk-btn pk-btn--rose" disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
              {branch ? 'Save Changes' : 'Add Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
