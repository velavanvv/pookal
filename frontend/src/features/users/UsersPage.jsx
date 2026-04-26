import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../../services/api';

export default function UsersPage() {
  const { user } = useAuth();
  const [staff,    setStaff]    = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showScopePicker, setShowScopePicker] = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [editUser,    setEditUser]    = useState(null);
  const [addScope,    setAddScope]    = useState(null); // 'main' | branch object

  const isOwner = !user?.parent_user_id && user?.role !== 'superadmin';

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/shop/staff'),
      api.get('/branches'),
    ])
      .then(([s, b]) => { setStaff(s.data); setBranches(b.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // ── per-scope counts ────────────────────────────────────────────
  const mainMax   = user?.subscription?.max_users ?? null;
  const mainCount = 1 + staff.filter(s => !s.branch_id).length;
  const mainFull  = mainMax !== null && mainCount >= mainMax;

  const branchScopes = branches.map(b => {
    const count = staff.filter(s => s.branch_id === b.id).length;
    const max   = b.plan?.max_users ?? mainMax;
    return { ...b, userCount: count, userMax: max, full: max !== null && count >= max };
  });

  const handleAddClick = () => {
    if (branches.length === 0) {
      setAddScope('main'); setEditUser(null); setShowModal(true);
    } else {
      setShowScopePicker(true);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Remove "${s.name}" from this shop?`)) return;
    await api.delete(`/shop/staff/${s.id}`);
    fetchData();
  };

  return (
    <div>
      <div className="pg-header">
        <div>
          <h4 className="pg-title">Users</h4>
          <p className="pg-sub">Manage staff who can access this shop</p>
        </div>
        {isOwner && (
          <button className="pk-btn pk-btn--rose" onClick={handleAddClick}>
            <i className="bi bi-person-plus" />Add Staff
          </button>
        )}
      </div>

      {/* ── Scope user-count pills ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        <ScopePill icon="bi-shop" label="Main Shop" count={mainCount} max={mainMax} full={mainFull} color="var(--pookal-rose)" />
        {branchScopes.map(b => (
          <ScopePill key={b.id} icon="bi-building" label={b.name} count={b.userCount} max={b.userMax} full={b.full} color="#7c3aed" />
        ))}
      </div>

      {/* ── Shop owner row ────────────────────────────────────────── */}
      <div className="pk-card" style={{ marginBottom: '1rem' }}>
        <div className="pk-card__body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: '#ffe4ef', color: 'var(--pookal-rose)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{user?.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{user?.email}</div>
            </div>
            <span className="pk-badge pk-badge--rose">Shop Owner</span>
            <BranchBadge branch={null} />
          </div>
        </div>
      </div>

      {/* ── Staff table ───────────────────────────────────────────── */}
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
            {isOwner && (
              <button className="pk-btn pk-btn--rose" onClick={handleAddClick}>
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
                <th>Branch</th>
                <th>Added</th>
                {isOwner && <th />}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-2)' }}>{s.email}</td>
                  <td style={{ color: 'var(--text-2)' }}>{s.phone || '—'}</td>
                  <td>
                    <span className="pk-badge pk-badge--gray">
                      {s.branch_id ? 'Branch Staff' : 'Staff'}
                    </span>
                  </td>
                  <td><BranchBadge branch={s.branch} /></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>
                    {new Date(s.created_at).toLocaleDateString('en-IN')}
                  </td>
                  {isOwner && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {!s.branch_id && (
                          <button className="pk-btn pk-btn--sm pk-btn--outline"
                            onClick={() => { setEditUser(s); setAddScope('main'); setShowModal(true); }}>
                            <i className="bi bi-pencil" />
                          </button>
                        )}
                        <button className="pk-btn pk-btn--sm pk-btn--outline"
                          style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => handleDelete(s)}>
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

      {showScopePicker && (
        <ScopePickerModal
          mainCount={mainCount} mainMax={mainMax} mainFull={mainFull}
          branches={branchScopes}
          onSelect={scope => { setAddScope(scope); setShowScopePicker(false); setEditUser(null); setShowModal(true); }}
          onClose={() => setShowScopePicker(false)}
        />
      )}

      {showModal && (
        <StaffModal
          staff={editUser}
          scope={addScope}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function ScopePill({ icon, label, count, max, full, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.45rem',
      background: full ? '#fef9c3' : 'var(--card-bg)',
      border: `1.5px solid ${full ? '#fde68a' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)', padding: '0.45rem 0.85rem', fontSize: '0.8rem',
    }}>
      <i className={`bi ${icon}`} style={{ color }} />
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ color: full ? '#92400e' : 'var(--text-2)' }}>
        {count}{max ? ` / ${max}` : ''} users
      </span>
      {full && <span className="pk-badge" style={{ background: '#fde68a', color: '#92400e', fontSize: '0.68rem' }}>Limit</span>}
    </div>
  );
}

function BranchBadge({ branch }) {
  if (!branch) {
    return (
      <span className="pk-badge" style={{ background: '#ffe4ef', color: 'var(--pookal-rose)', border: '1px solid #fbcfe8' }}>
        <i className="bi bi-shop" style={{ marginRight: '0.25rem', fontSize: '0.68rem' }} />Main Shop
      </span>
    );
  }
  return (
    <span className="pk-badge" style={{ background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' }}>
      <i className="bi bi-building" style={{ marginRight: '0.25rem', fontSize: '0.68rem' }} />{branch.name}
    </span>
  );
}

// ── Scope picker ───────────────────────────────────────────────────────────────

function ScopePickerModal({ mainCount, mainMax, mainFull, branches, onSelect, onClose }) {
  return (
    <div className="pk-modal-bd" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pk-modal" style={{ maxWidth: 400 }}>
        <div className="pk-modal__head">
          <span className="pk-modal__title">Add Staff — Choose Location</span>
          <button className="pk-modal__close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="pk-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            className="pk-btn pk-btn--outline"
            disabled={mainFull}
            onClick={() => onSelect('main')}
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.85rem', opacity: mainFull ? 0.5 : 1 }}
          >
            <i className="bi bi-shop" style={{ color: 'var(--pookal-rose)', fontSize: '1.15rem', flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>Main Shop</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                {mainFull ? 'User limit reached' : `${mainCount}${mainMax ? ` / ${mainMax}` : ''} users`}
              </div>
            </div>
          </button>

          {branches.map(b => (
            <button
              key={b.id}
              className="pk-btn pk-btn--outline"
              disabled={b.full}
              onClick={() => onSelect(b)}
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', gap: '0.85rem', opacity: b.full ? 0.5 : 1 }}
            >
              <i className="bi bi-building" style={{ color: '#7c3aed', fontSize: '1.15rem', flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{b.name}
                  {b.code && <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: '0.4rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>({b.code})</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                  {b.full ? 'User limit reached' : `${b.userCount}${b.userMax ? ` / ${b.userMax}` : ''} users`}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Staff form modal ───────────────────────────────────────────────────────────

function StaffModal({ staff, scope, onClose, onSaved }) {
  const isBranch = scope && scope !== 'main';
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
      } else if (isBranch) {
        await api.post(`/shop/staff/branch/${scope.id}`, form);
      } else {
        await api.post('/shop/staff', form);
      }
      onSaved();
    } catch (err) {
      setError(
        Object.values(err?.response?.data?.errors || {}).flat().join(' ') ||
        err?.response?.data?.message || 'Failed to save.'
      );
    } finally { setSaving(false); }
  };

  const scopeLabel = isBranch ? scope.name : 'Main Shop';

  return (
    <div className="pk-modal-bd" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pk-modal">
        <div className="pk-modal__head">
          <span className="pk-modal__title">
            {staff ? `Edit — ${staff.name}` : `Add Staff · ${scopeLabel}`}
          </span>
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
            <div style={{ background: isBranch ? '#f5f3ff' : '#f0f9ff', border: `1.5px solid ${isBranch ? '#c4b5fd' : '#bae6fd'}`, borderRadius: 'var(--radius-md)', padding: '0.625rem', fontSize: '0.81rem', color: isBranch ? '#6d28d9' : '#0369a1', marginTop: '0.5rem' }}>
              <i className={`bi ${isBranch ? 'bi-building' : 'bi-shop'} me-2`} />
              {isBranch
                ? `This user will be locked to the "${scope.name}" branch and can only see that branch's data.`
                : 'This user will access the main shop with all modules in your plan.'}
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
