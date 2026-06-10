import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { Button, Input } from '../../components/ui';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    jobTitle: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  function updateField(name: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage('');

      await authApi.register(form);

      setMessage('Registration successful. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 800);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <h1>BuildPro IMS</h1>
          <p>Construction Integrated Management System</p>
        </div>

        <h2>Create account</h2>
        <p className="auth-muted">Register a new system user.</p>

        {message && <div className="auth-error">{message}</div>}

        <form onSubmit={handleRegister}>
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
          />

          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />

          <Input
            label="Job Title"
            value={form.jobTitle}
            onChange={(e) => updateField('jobTitle', e.target.value)}
          />

          <Button disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}