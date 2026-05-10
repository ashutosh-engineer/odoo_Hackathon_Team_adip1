import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
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
          <h2>Plan Smarter,<br />Travel Better</h2>
          <p>Build multi-city itineraries, track budgets, and share your journey with the world.</p>
          <div className="auth-features">
            <div className="auth-feature-item"><span className="check-icon">✓</span><span>Smart itinerary builder with drag &amp; drop</span></div>
            <div className="auth-feature-item"><span className="check-icon">✓</span><span>Real-time budget tracking &amp; cost breakdown</span></div>
            <div className="auth-feature-item"><span className="check-icon">✓</span><span>Explore 12+ destinations with 60+ activities</span></div>
            <div className="auth-feature-item"><span className="check-icon">✓</span><span>Share your plans with a single link</span></div>
          </div>
        </div>
      </div>

      <div className="auth-panel-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="logo-inline"><div className="icon">✈</div><span>Traveloop</span></div>
            <h1>Welcome back</h1>
            <p>Sign in to continue planning your next adventure</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input type="email" className="form-input" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input type="password" className="form-input" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account? <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
