import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext';
import { api } from '../api';
import logo from '../assets/logo.png';

export default function AdminLogin() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      localStorage.setItem('mendozapp_admin_token', token);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 bg-stone">
      <img src={logo} alt="Mendozapp" className="h-10 mb-8" />
      <form onSubmit={handleSubmit} className="w-full max-w-xs bg-white rounded-2xl p-6 shadow-sm">
        <div className="font-display text-lg font-bold text-malbec-deep mb-4 text-center">{t.admin_login}</div>

        <label className="text-xs font-semibold text-ink-soft">{t.email}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 mb-3 outline-none"
          required
        />

        <label className="text-xs font-semibold text-ink-soft">{t.password}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-stone rounded-lg px-3 py-2.5 text-sm mt-1 mb-4 outline-none"
          required
        />

        {error && <div className="text-xs text-red-600 mb-3">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-malbec text-white font-bold py-3 rounded-lg text-sm disabled:opacity-60"
        >
          {loading ? '…' : t.login}
        </button>

        <Link to="/" className="block text-center text-xs text-ink-soft mt-4">
          ← {t.back_to_web}
        </Link>
      </form>
    </div>
  );
}
