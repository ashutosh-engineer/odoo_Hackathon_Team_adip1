import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

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
    <AuthLayout>
      <div className="amz-auth">

        <div className="amz-auth__box">
          <h1 className="amz-auth__title">Sign in</h1>

          {error && (
            <div className="amz-auth__error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="amz-auth__field">
              <label className="amz-auth__label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="amz-auth__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="amz-auth__field">
              <div className="amz-auth__label-row">
                <label className="amz-auth__label" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="amz-auth__small-link">Forgot password?</Link>
              </div>
              <div className="amz-auth__pw-wrap">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="amz-auth__input amz-auth__input--pw"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button type="button" className="amz-auth__eye"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw
                    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" className="amz-auth__btn" disabled={loading}>
              {loading
                ? <><span className="amz-auth__spinner" aria-hidden="true" /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>

          <p className="amz-auth__terms">
            By signing in you agree to Traveloop's{' '}
            <span className="amz-auth__terms-link">Conditions of Use</span> and{' '}
            <span className="amz-auth__terms-link">Privacy Notice</span>.
          </p>
        </div>

        <div className="amz-auth__divider">
          <span>New to Traveloop?</span>
        </div>

        <Link to="/signup" className="amz-auth__create-btn">
          Create your Traveloop account
        </Link>
      </div>
    </AuthLayout>
  );
}
