'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { AuthShell, AuthFooterLink } from '@/components/auth/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configBanner, setConfigBanner] = useState(false);
  const [redirectTo, setRedirectTo] = useState('/');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setConfigBanner(p.get('reason') === 'config');
    const next = p.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes(':')) {
      setRedirectTo(next);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your team email to open the hub."
      footer={
        <>
          Don&apos;t have an account? <AuthFooterLink href="/signup">Create one</AuthFooterLink>
        </>
      }
    >
      {configBanner && (
        <div
          className="flex gap-2.5 p-3 rounded-xl mb-4 text-left text-sm"
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: 'var(--text-primary)',
          }}
        >
          <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} style={{ color: '#f59e0b' }} />
          <div>
            <p className="font-semibold">Supabase is not configured</p>
            <p className="text-xs mt-1 opacity-90" style={{ color: 'var(--text-secondary)' }}>
              Set <code className="text-[11px] px-1 rounded bg-[var(--bg-hover)]">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="text-[11px] px-1 rounded bg-[var(--bg-hover)]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{' '}
              <code className="text-[11px] px-1 rounded bg-[var(--bg-hover)]">.env.local</code>, then restart the dev server.
            </p>
          </div>
        </div>
      )}
      <form onSubmit={handleLogin} className="space-y-0">
        <div className="auth-field">
          <label className="label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="input"
            placeholder="you@devweekends.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="auth-field">
          <label className="label" htmlFor="login-password">Password</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="input pr-11"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 topbar-icon-btn !w-9 !h-9 !border-0 !bg-transparent"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <button type="submit" className="btn-primary auth-submit" disabled={loading}>
          {loading ? <Loader2 size={17} className="animate-spin" /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
