import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import apiClient from '../../lib/apiClient.ts';
import { useAuth } from '../../context/AuthContext.tsx';

import { useStyles } from './styles.ts';

interface LoginResponse {
  token: string;
  operator: { id: string; email: string; name: string };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const styles = useStyles();

  async function handleSubmit() {
    setError(null);
    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
      login(data.token, data.operator);
      void navigate('/dashboard');
    } catch {
      setError('Invalid email or password.');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.appTitle}>ODERP&apos;ly</h1>
          <p className={styles.subtitle}>Control Room Access</p>
        </div>
        <div className={styles.fieldsGroup}>
          <div>
            <label htmlFor="email" className={styles.fieldLabel}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
            />
          </div>
          <div>
            <label htmlFor="password" className={styles.fieldLabel}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              autoComplete="off"
            />
          </div>
        </div>
        {error && (
          <p role="alert" className={styles.errorText}>
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          className={styles.submitButton}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
