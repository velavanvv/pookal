import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../../services/api';

export default function UsersPage() {
  const { user } = useAuth();
  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser,  setEditUser]  = useState(null);

  const isOwner  = !user?.parent_user_id && user?.role !== 'superadmin';
  const maxUsers = user?.subscription?.max_users ?? null;
  const totalUsers = 1 + staff.length; // owner + staff
  const atLimit  = maxUsers !== null && totalUsers >= maxUsers;

  const fetchStaff = () => {
    setLoading(true);
    api.get('/shop/staff').then(({ data }) => setStaff(data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleDelete = async (s) => {
    if (!confirm(`Remove "${s.name}" from this shop?`)) return;
    await api.delete(`/shop/staff/${s.id}`);
    fetchStaff();
  };

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Users</h4>
          <p className="pg-sub">
            Manage staff who can access this shop
            {maxUsers !== null && ` · ${totalUsers} / ${maxUsers} users`}
          </p>
        </div>
        {isOwner && (
          <button
            className="pk-btn pk-btn--rose"
            disabled={atLimit}
            title={atLimit ? `Plan limit of ${maxUsers} users reached` : undefined}
            onClick={() => { setEditUser(null); setShowModal(true); }}
          >
            <i className="bi bi-person-plus" />Add Staff
          </button>
        )}
      </div>

      {atLimit && (
        <div style={{ background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.83rem', color: '#92400e', marginBottom: '1rem' }}>
          <i className="bi bi-exclamation-triangle me-2" />
          You have reached the maximum of <strong>{maxUsers}</strong> users on your current plan. Contact your Pookal admin to upgrade.
        </div>
      )}

      {/* Shop owner card */}
      <div className="pk-card" style={{ marginBottom: '1rem' }}>
        <div className="pk-card__body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: '#ffe4ef', color: 'var(--pookal-rose)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
              {(user?.name || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{user?.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{user?.email}</div>
            </div>
            <span className="pk-badge pk-badge--rose">Shop Owner</span>
          </div>
        </div>
      </div>

      {/* Staff list */}
      <div className="pk-card">
        {loading ? (
          <div className="pk-loading">
            <div className="spinner-border" style={{ color: 'var(--pookal-rose)', width: '1.5rem', height: '1.5rem' }} />
            <span>Loading staff…</span>
          </div>
        ) : staff.length === 0 ? (
          <div className="pk-empty">
            <i className="bi bi-people" />
            <h6>No staff yet</h6>
            <p>Add staff members so they can log in and manage this shop.</p>
            {isOwner && !atLimit && (
              <button className="pk-btn pk-btn--rose" onClick={() => setShowModal(true)}>
                <i className="bi bi-person-plus" />Add Staff
              </button>
            )}
          </div>
        ) : (
          <table className="pk-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Added</th>
                {isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-2)' }}>{s.email}</td>
                  <td style={{ color: 'var(--text-2)' }}>{s.phone || '—'}</td>
                  <td><span className="pk-badge pk-badge--gray">Staff</span></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>
                    {new Date(s.created_at).toLocaleDateString('en-IN')}
                  </td>
                  {isOwner && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="pk-btn pk-btn--sm pk-btn--outline" onClick={() => { setEditUser(s); setShowModal(true); }}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="pk-btn pk-btn--sm pk-btn--outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDelete(s)}>
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <StaffModal
          staff={editUser}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchStaff(); }}
        />
      )}
    </div>
  );
}

function StaffModal({ staff, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:     staff?.name  || '',
    email:    staff?.email || '',
    password: '',
    phone:    staff?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (staff) {
        const payload = { name: form.name, phone: form.phone };
        if (form.password) payload.password = form.password;
        await api.patch(`/shop/staff/${staff.id}`, payload);
      } else {
        await api.post('/shop/staff', form);
      }
      onSaved();
    } catch (err) {
      setError(
        Object.values(err?.response?.data?.errors || {}).flat().join(' ') ||
        err?.response?.data?.message ||
        'Failed to save.'
      );
    } finally { setSaving(false); }
  };

  return (
    <div className="pk-modal-bd" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pk-modal">
        <div className="pk-modal__head">
          <span className="pk-modal__title">{staff ? `Edit — ${staff.name}` : 'Add Staff Member'}</span>
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
              <label>Full Name *</label>
              <input className="pk-input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            {!staff && (
              <div className="pk-field">
                <label>Email *</label>
                <input type="email" className="pk-input" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
            )}
            <div className="pk-field">
              <label>{staff ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" className="pk-input" value={form.password} onChange={e => set('password', e.target.value)} required={!staff} minLength={8} placeholder={staff ? '••••••••' : ''} />
            </div>
            <div className="pk-field">
              <label>Phone</label>
              <input className="pk-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.81rem', color: '#0369a1', marginTop: '0.5rem' }}>
              <i className="bi bi-info-circle me-2" />
              Staff members access all modules in your plan. They cannot manage users or branches.
            </div>
          </div>
          <div className="pk-modal__foot">
            <button type="button" className="pk-btn pk-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="pk-btn pk-btn--rose" disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
              {staff ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
