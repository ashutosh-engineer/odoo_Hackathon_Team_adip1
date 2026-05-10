import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.confirm_password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-panel-left">
        <div className="auth-branding">
          <div className="logo-mark">✈</div>
          <h2>Your Next Trip<br />Starts Here</h2>
          <p>Join travelers who plan smarter with Traveloop.</p>
          <div className="auth-features">
            <div className="auth-feature-item"><span className="check-icon">✓</span><span>Free to use — no credit card required</span></div>
            <div className="auth-feature-item"><span className="check-icon">✓</span><span>Create unlimited trips and itineraries</span></div>
            <div className="auth-feature-item"><span className="check-icon">✓</span><span>Built-in packing lists and travel notes</span></div>
            <div className="auth-feature-item"><span className="check-icon">✓</span><span>Works beautifully on any device</span></div>
          </div>
        </div>
      </div>

      <div className="auth-panel-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="logo-inline"><div className="icon">✈</div><span>Traveloop</span></div>
            <h1>Create your account</h1>
            <p>Start planning your dream trip in minutes</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full name</label>
              <input type="text" className="form-input" id="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your full name" required minLength={2} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input type="email" className="form-input" id="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input type="password" className="form-input" id="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 6 characters" required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm">Confirm password</label>
              <input type="password" className="form-input" id="confirm" value={form.confirm_password} onChange={(e) => update('confirm_password', e.target.value)} placeholder="Repeat your password" required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
