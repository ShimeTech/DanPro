import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../../api/auth.api';
import { Button, Input } from '../../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('admin@buildpro.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sessionStatus = searchParams.get('session');

    if (sessionStatus === 'expired') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('authUser');
      setMessage('Your session has expired. Please sign in again.');
    }

    if (sessionStatus === 'logout') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('authUser');
      setMessage('You have been signed out successfully.');
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    if (!email.trim()) {
      setMessage('Email is required');
      return;
    }

    if (!password.trim()) {
      setMessage('Password is required');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      localStorage.removeItem('accessToken');
      localStorage.removeItem('authUser');

      const data = await authApi.login({
        email: email.trim(),
        password,
      });

      localStorage.setItem('accessToken', data.accessToken);

      const profile = await authApi.me();

      localStorage.setItem('authUser', JSON.stringify(profile));

      navigate('/dashboard', {
        replace: true,
      });
    } catch (error: any) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('authUser');

      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Invalid email or password',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {loading && (
        <div className="auth-loading-overlay" role="status" aria-live="polite">
          <div className="auth-loading-card">
            <Spinner />
            <strong>Signing you in</strong>
            <p>Verifying your credentials and loading your account.</p>
          </div>
        </div>
      )}

      <div className="auth-card">
        <div className="auth-brand">
          <h1>BuildPro IMS</h1>
          <p>Construction Integrated Management System</p>
        </div>

        <h2>Sign in</h2>
        <p className="auth-muted">Access your project dashboard.</p>

        {message && (
          <div
            className={
              message.toLowerCase().includes('successfully')
                ? 'auth-success'
                : 'auth-error'
            }
            role="alert"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} aria-busy={loading}>
          <Input
            label="Email"
            type="email"
            value={email}
            disabled={loading}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            disabled={loading}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <Spinner />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <p className="auth-footer">
          Do not have an account? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="auth-spinner" />;
}