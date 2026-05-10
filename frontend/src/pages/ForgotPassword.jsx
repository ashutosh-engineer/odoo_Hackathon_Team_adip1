import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import AuthLayout from '../components/auth/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setDone(true);
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
          <h1 className="amz-auth__title">Password assistance</h1>
          <p className="amz-auth__subtitle">
            Enter the email address associated with your Traveloop account.
          </p>

          {error && (
            <div className="amz-auth__error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {!done ? (
            <form onSubmit={handleSubmit} noValidate>
              <div className="amz-auth__field">
                <label className="amz-auth__label" htmlFor="fp-email">Email</label>
                <input
                  id="fp-email"
                  type="email"
                  className="amz-auth__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <button type="submit" className="amz-auth__btn" disabled={loading}>
                {loading
                  ? <><span className="amz-auth__spinner" aria-hidden="true" /> Sending…</>
                  : 'Continue'}
              </button>
            </form>
          ) : (
            <div className="amz-auth__notice amz-auth__notice--ok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <p>
                If <strong>{email}</strong> matches an account, you'll receive reset instructions shortly.
                Check your spam folder too.
              </p>
            </div>
          )}
        </div>

        <div className="amz-auth__divider"><span>or</span></div>

        <Link to="/login" className="amz-auth__create-btn">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
