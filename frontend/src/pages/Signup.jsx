import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';

function PasswordStrength({ password }) {
  if (!password) return null;
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#cc0c39', '#e47911', '#007185', '#007600'];
  return (
    <div className="amz-pw-strength">
      <div className="amz-pw-strength__bars">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="amz-pw-strength__bar"
            style={{ background: i <= score ? colors[score] : '#d5d9d9' }} />
        ))}
      </div>
      <span className="amz-pw-strength__label" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '' });
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

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

  const EyeOff = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
  const Eye = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  return (
    <AuthLayout>
      <div className="amz-auth">

        <div className="amz-auth__box">
          <h1 className="amz-auth__title">Create account</h1>

          {error && (
            <div className="amz-auth__error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="amz-auth__field">
              <label className="amz-auth__label" htmlFor="name">Your name</label>
              <input
                id="name"
                type="text"
                className="amz-auth__input"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="First and last name"
                required
                minLength={2}
                autoComplete="name"
                autoFocus
              />
            </div>

            <div className="amz-auth__field">
              <label className="amz-auth__label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="amz-auth__input"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="amz-auth__field">
              <label className="amz-auth__label" htmlFor="password">Password</label>
              <div className="amz-auth__pw-wrap">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="amz-auth__input amz-auth__input--pw"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button type="button" className="amz-auth__eye"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff /> : <Eye />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <div className="amz-auth__field">
              <label className="amz-auth__label" htmlFor="confirm">Re-enter password</label>
              <div className="amz-auth__pw-wrap">
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className="amz-auth__input amz-auth__input--pw"
                  value={form.confirm_password}
                  onChange={(e) => update('confirm_password', e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button type="button" className="amz-auth__eye"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                  {showConfirm ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            <button type="submit" className="amz-auth__btn" disabled={loading}>
              {loading
                ? <><span className="amz-auth__spinner" aria-hidden="true" /> Creating account…</>
                : 'Create your Traveloop account'}
            </button>
          </form>

          <p className="amz-auth__terms">
            By creating an account, you agree to Traveloop's{' '}
            <span className="amz-auth__terms-link">Conditions of Use</span> and{' '}
            <span className="amz-auth__terms-link">Privacy Notice</span>.
          </p>
        </div>

        <div className="amz-auth__divider">
          <span>Already have an account?</span>
        </div>

        <Link to="/login" className="amz-auth__create-btn">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
