'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Moon, Sun, Shield, Users, KeyRound, Mail } from 'lucide-react';
import { getInitials, formatDate } from '@/lib/utils';
import type { Theme } from '@/lib/theme-context';

export default function SettingsPage() {
  const { profile, refresh, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (profile) setName(profile.full_name || '');
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', profile.id);
    if (error) toast.error('Could not save profile');
    else {
      toast.success('Profile saved');
      await refresh();
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success('Password updated');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSavingPassword(false);
  };

  const setAppearance = (t: Theme) => setTheme(t);

  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto surface-card p-8 text-center space-y-3">
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Profile not found</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          You are signed in, but there is no matching row in <code className="text-xs">profiles</code>. Ask an admin to fix your account or re-run the database trigger.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10 sm:space-y-12 pb-4">
      <header className="space-y-2 max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Account</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm sm:text-[0.9375rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Profile, appearance, and security for your Hub account.
        </p>
      </header>

      {/* Profile */}
      <section>
        <p className="settings-section-title">Profile</p>
        <div className="surface-card p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                border: '2px solid rgba(16, 185, 129, 0.35)',
              }}
            >
              {getInitials(profile.full_name, profile.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                {profile.full_name || 'No display name'}
              </p>
              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{profile.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
                  style={{ background: 'var(--bg-hover)', color: 'var(--accent)' }}
                >
                  {profile.role}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Member since {formatDate(profile.created_at)}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div>
              <label className="label" htmlFor="settings-name">Display name</label>
              <input
                id="settings-name"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="How you appear in activity and the sidebar"
              />
            </div>
            <div>
              <label className="label" htmlFor="settings-email">Email</label>
              <input id="settings-email" className="input" value={profile.email} disabled style={{ opacity: 0.65 }} />
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email is tied to your login. To change it, contact an admin or use Supabase Auth flows.
              </p>
            </div>
            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? <Loader2 size={16} className="animate-spin" /> : null}
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>
      </section>

      {/* Appearance */}
      <section>
        <p className="settings-section-title">Appearance</p>
        <div className="surface-card p-6 sm:p-7">
          <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Choose how the Hub looks on this device. Your choice is saved in the browser.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setAppearance('dark')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                theme === 'dark' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : ''
              }`}
              style={theme !== 'dark' ? { borderColor: 'var(--border)', color: 'var(--text-primary)' } : undefined}
            >
              <Moon size={16} />
              Dark
            </button>
            <button
              type="button"
              onClick={() => setAppearance('light')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                theme === 'light' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : ''
              }`}
              style={theme !== 'light' ? { borderColor: 'var(--border)', color: 'var(--text-primary)' } : undefined}
            >
              <Sun size={16} />
              Light
            </button>
          </div>
        </div>
      </section>

      {/* Security */}
      <section>
        <p className="settings-section-title">Security</p>
        <div className="surface-card p-6 sm:p-7 space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-hover)' }}>
              <KeyRound size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Change password</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Use a strong password you do not reuse elsewhere.
              </p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
            <div>
              <label className="label" htmlFor="new-pw">New password</label>
              <input
                id="new-pw"
                type="password"
                className="input"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="label" htmlFor="confirm-pw">Confirm new password</label>
              <input
                id="confirm-pw"
                type="password"
                className="input"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
              />
            </div>
            <button type="submit" className="btn-secondary" disabled={savingPassword || !newPassword}>
              {savingPassword ? <Loader2 size={16} className="animate-spin" /> : null}
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </section>

      {/* Workspace (admin) */}
      {isAdmin && (
        <section>
          <p className="settings-section-title">Workspace</p>
          <div className="surface-card p-6 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
              <div className="p-2.5 rounded-xl flex-shrink-0 self-start" style={{ background: 'var(--accent-soft)' }}>
                <Users size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Team members</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Invite teammates and manage roles (admin, editor, viewer).
                </p>
              </div>
              <Link href="/settings/members" className="btn-primary whitespace-nowrap self-start sm:self-center">
                <Shield size={15} />
                Manage members
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="p-2.5 rounded-xl flex-shrink-0 self-start" style={{ background: 'var(--accent-soft)' }}>
                <Mail size={22} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Templates</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Manage plain-English invite and mentor templates in a separate admin tab.
                </p>
              </div>
              <Link href="/settings/templates" className="btn-primary whitespace-nowrap self-start sm:self-center">
                <Mail size={15} />
                Open templates
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
