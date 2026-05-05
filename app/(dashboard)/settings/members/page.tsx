'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Loader2, UserPlus, Shield, Copy, Check, Mail } from 'lucide-react';
import { getInitials, timeAgo } from '@/lib/utils';
import type { Profile, UserRole } from '@/types';

const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#ef4444',
  editor: '#f59e0b',
  viewer: '#6b7280',
};

type InviteRole = 'viewer' | 'editor' | 'admin';

export default function MembersPage() {
  const supabase = createClient();
  const { profile: currentUser } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [manualShare, setManualShare] = useState<{ email: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setMembers((data || []) as Profile[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const copyText = async (label: 'email' | 'password', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true);
    setManualShare(null);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        ok?: boolean;
        emailSent?: boolean;
        temporaryPassword?: string;
        emailWarning?: string;
      };

      if (!res.ok) {
        toast.error(data.error || 'Invite failed');
        if (data.hint) toast.info(data.hint, { duration: 8000 });
        return;
      }

      if (data.emailSent) {
        toast.success(`Invite email sent to ${email}`);
      } else if (data.temporaryPassword) {
        toast.success('Account created — share the password securely', { duration: 5000 });
        if (data.emailWarning) toast.info(data.emailWarning, { duration: 10000 });
        setManualShare({ email, password: data.temporaryPassword });
      }
      setInviteEmail('');
      await fetchMembers();
    } catch {
      toast.error('Network error');
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (memberId: string, role: UserRole) => {
    if (memberId === currentUser?.id) { toast.error("You can't change your own role"); return; }
    setUpdatingId(memberId);
    const { error } = await supabase.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', memberId);
    if (error) toast.error('Failed to update role');
    else { toast.success('Role updated'); await fetchMembers(); }
    setUpdatingId(null);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto empty-state py-14">
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Admins only</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Team invites and role changes are restricted to workspace admins.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 sm:space-y-10 pb-4">
      <header className="space-y-2 max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Workspace</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Team members</h1>
        <p className="text-sm sm:text-[0.9375rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Invite admins, editors, or viewers by email. They receive login instructions and a temporary password (configure SMTP for automated email).
        </p>
      </header>

      <section className="surface-card p-6 sm:p-7">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: 'var(--accent-soft)' }}>
            <UserPlus size={22} style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-semibold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>Invite by email</h2>
          </div>
        </div>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <label className="label" htmlFor="invite-email">Email</label>
              <input
                id="invite-email"
                className="input"
                type="email"
                autoComplete="off"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-44 flex-shrink-0">
              <label className="label" htmlFor="invite-role">Role</label>
              <select
                id="invite-role"
                className="input"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as InviteRole)}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full sm:w-auto h-[42px] px-5" disabled={inviting || !inviteEmail.trim()}>
                {inviting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        </form>

        {manualShare && (
          <div
            className="mt-6 rounded-xl border p-4 space-y-3"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Share these credentials manually</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Email delivery is not configured or failed. Copy the password once and send it through a channel you trust, then ask them to change it under Settings → Security.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide w-20 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Email</span>
                <code className="text-sm flex-1 min-w-0 truncate px-2 py-1.5 rounded-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{manualShare.email}</code>
                <button type="button" className="btn-secondary text-xs px-2 py-1.5" onClick={() => copyText('email', manualShare.email)}>
                  {copiedField === 'email' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide w-20 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Password</span>
                <code className="text-sm flex-1 min-w-0 break-all px-2 py-1.5 rounded-lg font-mono" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{manualShare.password}</code>
                <button type="button" className="btn-secondary text-xs px-2 py-1.5" onClick={() => copyText('password', manualShare.password)}>
                  {copiedField === 'password' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <button type="button" className="text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }} onClick={() => setManualShare(null)}>
              Dismiss
            </button>
          </div>
        )}
      </section>

      <section className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>All members</h2>
          <span className="text-xs font-semibold uppercase tracking-wide tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {members.length} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j}><div className="skeleton h-5 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3 py-0.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid rgba(16, 185, 129, 0.35)' }}
                      >
                        {getInitials(m.full_name, m.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {m.full_name || '—'}
                          {m.id === currentUser?.id && (
                            <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>(you)</span>
                          )}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="status-badge text-xs"
                      style={{ background: ROLE_COLORS[m.role] + '22', color: ROLE_COLORS[m.role] }}
                    >
                      <Shield size={11} strokeWidth={2} /> {m.role}
                    </span>
                  </td>
                  <td className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{timeAgo(m.created_at)}</td>
                  <td>
                    {m.id !== currentUser?.id ? (
                      <select
                        className="input text-sm"
                        style={{ minHeight: '38px', minWidth: '7.5rem' }}
                        value={m.role}
                        onChange={e => updateRole(m.id, e.target.value as UserRole)}
                        disabled={updatingId === m.id}
                      >
                        {(['admin', 'editor', 'viewer'] as const).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
