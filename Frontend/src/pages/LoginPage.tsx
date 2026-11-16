import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGlassTheme } from '../context/ThemeContext';
import { MatiboxLogo } from '../components/MatiboxLogo';
import { Button } from '../components/ui/Button';
import { Lock, Mail, AlertCircle, Sun, Moon, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useGlassTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Top Right Floating Theme Switcher */}
      <div className="fixed top-4 right-4 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to Daylight theme' : 'Switch to Dark theme'}
          className="glass-floating px-3.5 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-2 hover:opacity-90 transition cursor-pointer"
          style={{ color: 'var(--text-heading)' }}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Daylight</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#276EF1]" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Centered Static Login Surface */}
      <main className="w-full max-w-[410px] glass-floating-strong rounded-3xl p-6 sm:p-8 space-y-6 animate-enter">
        <div className="space-y-4 pb-5 border-b border-[var(--border-subtle)]">
          <MatiboxLogo
            size="lg"
            subtitle="Kindergarten & School Meal Logistics"
            badge="Portal"
            darkText={theme === 'dark'}
          />
          <div>
            <h1
              className="font-bold tracking-[-0.02em]"
              style={{ fontSize: 'var(--text-display)', color: 'var(--text-heading)' }}
            >
              Sign in to Dispatch
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Access route operations, fleet status, and live deliveries.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[var(--status-danger-soft)] border border-[var(--status-danger)]/30 text-[var(--status-danger)] text-xs font-semibold"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold"
              style={{ color: 'var(--text-body-color)' }}
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium min-h-[46px]"
                placeholder="name@matibox.no"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold"
              style={{ color: 'var(--text-body-color)' }}
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full pl-10 pr-11 py-3 rounded-xl text-sm font-medium min-h-[46px]"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            className="mt-2"
          >
            <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </main>
    </div>
  );
};
