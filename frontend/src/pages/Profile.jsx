import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Save, Lock, LogOut } from 'lucide-react';
import PageShell from '../components/layout/PageShell';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]         = useState({ name: user?.name || '', email: user?.email || '' });
  const [pwForm, setPwForm]     = useState({ old_password: '', new_password: '', confirm: '' });
  const [message, setMessage]   = useState('');
  const [error, setError]       = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError]   = useState('');

  /* ── Profile update ── */
  async function handleProfileSubmit(e) {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      const data = await api.put('/profile', { name: form.name, email: form.email });
      updateUser(data.data);
      setMessage('Profile saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  /* ── Password change ── */
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwMessage(''); setPwError('');
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    try {
      // Backend /profile/change-password is an HTML route; use the API profile endpoint
      // which accepts old_password + new_password
      await api.post('/auth/change-password', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      setPwMessage('Password changed successfully.');
      setPwForm({ old_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setPwError(err.message);
    }
  }

  /* ── Logout ── */
  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <PageShell
      title="Account"
      subtitle="Manage your profile, password, and session."
      contentClassName="content-area--narrow"
    >
      {/* ── Profile card ── */}
      <div className="card card--quiet" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
          <div className="user-avatar" style={{ width: 56, height: 56, fontSize: '1.2rem', flexShrink: 0, background: '#131921', border: '2px solid #febd69' }}>
            {user?.initials}
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{user?.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{user?.email}</p>
          </div>
        </div>

        {message && <div className="flash flash-success" style={{ marginBottom: '1rem' }}>{message}</div>}
        {error   && <div className="flash flash-error"   style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-name">Full name</label>
            <input
              type="text"
              className="form-input"
              id="profile-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-email">Email address</label>
            <input
              type="email"
              className="form-input"
              id="profile-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <Save size={15} /> Save changes
          </button>
        </form>
      </div>

      {/* ── Password card ── */}
      <div className="card card--quiet" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={16} /> Change password
        </h3>

        {pwMessage && <div className="flash flash-success" style={{ marginBottom: '1rem' }}>{pwMessage}</div>}
        {pwError   && <div className="flash flash-error"   style={{ marginBottom: '1rem' }}>{pwError}</div>}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="old-pw">Current password</label>
            <input
              type="password"
              className="form-input"
              id="old-pw"
              value={pwForm.old_password}
              onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-pw">New password</label>
            <input
              type="password"
              className="form-input"
              id="new-pw"
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-pw">Confirm new password</label>
            <input
              type="password"
              className="form-input"
              id="confirm-pw"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-outline">
            <Lock size={15} /> Update password
          </button>
        </form>
      </div>

      {/* ── Session card ── */}
      <div className="card card--quiet" style={{ padding: '1.25rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>Sign out</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>End your current session on this device.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </PageShell>
  );
}
