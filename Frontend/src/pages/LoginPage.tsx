import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGlassTheme } from '../context/ThemeContext';
import { MatiboxLogo } from '../components/MatiboxLogo';
import { Lock, Mail, AlertCircle, Sun, Moon } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useGlassTheme();
  const [email, setEmail] = useState('admin@matibox.no');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Ambient Floating Liquid Glass Orbs */}
      <div
        className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-35"
        style={{
          background:
            theme === 'dark'
              ? 'radial-gradient(circle, #276EF1 0%, transparent 70%)'
              : 'radial-gradient(circle, #E97905 0%, transparent 70%)'
        }}
      />
      <div
        className="pointer-events-none fixed top-1/4 -right-28 w-96 h-96 rounded-full blur-3xl opacity-25"
        style={{
          background:
            theme === 'dark'
              ? 'radial-gradient(circle, #1D4ED8 0%, transparent 70%)'
              : 'radial-gradient(circle, #F01111 0%, transparent 70%)'
        }}
      />

      {/* Top Right Theme Toggle Pill */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="liquid-glass px-3.5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 hover:border-[#276EF1]/50 transition cursor-pointer"
          style={{ color: 'var(--text-heading)' }}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#FCB900]" />
              Daylight Glass
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#276EF1]" />
              Uber Dark Glass
            </>
          )}
        </button>
      </div>

      {/* Static (Non-Draggable) Centered Login Liquid Glass Panel */}
      <div className="w-full max-w-md liquid-glass-strong rounded-3xl overflow-hidden relative z-10 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/15">
          <MatiboxLogo
            size="lg"
            subtitle="Kindergarten & School Meal Logistics"
            badge="Portal"
            darkText={theme === 'dark'}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#F01111]/15 border border-[#F01111]/35 text-[#F01111] text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-body)' }}
            >
              E-post / Email Address
            </label>
            <div className="relative">
              <Mail
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  theme === 'dark' ? 'text-[#276EF1]' : 'text-[#E97905]'
                }`}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                style={{ color: 'var(--text-heading)' }}
                placeholder="name@matibox.no"
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-body)' }}
            >
              Passord / Password
            </label>
            <div className="relative">
              <Lock
                className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  theme === 'dark' ? 'text-[#276EF1]' : 'text-[#E97905]'
                }`}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                style={{ color: 'var(--text-heading)' }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl liquid-btn-orange font-extrabold text-sm tracking-wide uppercase disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Logger inn...' : 'Logg Inn • Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
