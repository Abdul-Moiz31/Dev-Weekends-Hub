'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthShell, AuthFooterLink } from '@/components/auth/AuthShell';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Account created! Please check your email to verify.');
      router.push('/login');
    }
  };

  return (
    <AuthShell
      title="Join the hub"
      subtitle="Create an account for the Dev Weekends core team workspace."
      footer={
        <>
          Already have an account? <AuthFooterLink href="/login">Sign in</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-0">
        <div className="auth-field">
          <label className="label" htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            className="input"
            placeholder="Your name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div className="auth-field">
          <label className="label" htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
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
          <label className="label" htmlFor="signup-password">Password</label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              className="input pr-11"
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
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
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
