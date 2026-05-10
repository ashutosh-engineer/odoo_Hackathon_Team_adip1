import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Save } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      const data = await api.put('/profile', form);
      updateUser(data.data);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-header"><div><h1 className="page-title">Settings</h1><p className="page-subtitle">Manage your account</p></div></div>
      <div className="content-area" style={{ maxWidth: 550 }}>
        {message && <div className="flash flash-success">{message}</div>}
        {error && <div className="flash flash-error">{error}</div>}

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div className="user-avatar" style={{ width: 56, height: 56, fontSize: '1.2rem' }}>{user?.initials}</div>
            <div><h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user?.name}</h3><p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{user?.email}</p></div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">Full name</label>
              <input type="text" className="form-input" id="profile-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-email">Email address</label>
              <input type="email" className="form-input" id="profile-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary"><Save size={16} /> Save Changes</button>
          </form>
        </div>
      </div>
    </>
  );
}
