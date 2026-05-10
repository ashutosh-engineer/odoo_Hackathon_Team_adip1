import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Save } from 'lucide-react';
import PageShell from '../components/layout/PageShell';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const data = await api.put('/profile', form);
      updateUser(data.data);
      setMessage('Saved your profile.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <PageShell
      title="Account"
      subtitle="Update traveler details synced with Flask-Login and Redis-backed sessions."
      contentClassName="content-area--narrow"
    >
      {message ? <div className="flash flash-success" style={{ marginBottom: '1rem' }}>{message}</div> : null}
      {error ? <div className="flash flash-error" style={{ marginBottom: '1rem' }}>{error}</div> : null}

      <div className="card card--quiet" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
          <div className="user-avatar" style={{ width: 56, height: 56, fontSize: '1.2rem', flexShrink: 0 }}>{user?.initials}</div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{user?.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
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
            <label className="form-label" htmlFor="profile-email">Email</label>
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
            <Save size={17} /> Save changes
          </button>
        </form>
      </div>
    </PageShell>
  );
}
