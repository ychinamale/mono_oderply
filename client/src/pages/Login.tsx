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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-sm bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl backdrop-blur-sm">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight">ODERP&apos;ly</h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Control Room Access</p>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-blue-900/20"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
