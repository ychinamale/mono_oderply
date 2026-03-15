import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.tsx';

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

  async function handleSubmit() {
    setError(null);
    try {
      const { data } = await axios.post<LoginResponse>('/api/auth/login', { email, password });
      login(data.token, data.operator);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password.');
    }
  }

  return (
    <div>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => void handleSubmit()}>
        Sign in
      </button>
    </div>
  );
}
