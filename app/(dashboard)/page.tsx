'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { timeAgo } from '@/lib/utils';
import {
  Table2, Link2, Users, Rows3, Plus, ArrowRight, Inbox, UserPlus,
} from 'lucide-react';
import type { ActivityLog, DynamicTable } from '@/types';

interface Stats {
  tables: number;
  links: number;
  rows: number;
  members: number;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const canManageLinks = profile?.role === 'admin' || profile?.role === 'editor';
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({ tables: 0, links: 0, rows: 0, members: 0 });
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [tables, setTables] = useState<DynamicTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: tableCount },
        { count: linkCount },
        { count: rowCount },
        { count: memberCount },
        { data: activityData },
        { data: tablesData },
      ] = await Promise.all([
        supabase.from('dynamic_tables').select('*', { count: 'exact', head: true }),
        supabase.from('links').select('*', { count: 'exact', head: true }),
        supabase.from('table_rows').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('activity_log').select('*, profiles(full_name, email, avatar_url)').order('created_at', { ascending: false }).limit(8),
        supabase.from('dynamic_tables').select('id, name, icon, created_at, updated_at').order('updated_at', { ascending: false }).limit(6),
      ]);
      setStats({ tables: tableCount || 0, links: linkCount || 0, rows: rowCount || 0, members: memberCount || 0 });
      setActivity((activityData || []) as ActivityLog[]);
      setTables((tablesData || []) as DynamicTable[]);
      setLoading(false);
    };
    load();
  }, [supabase]);

  const statTiles = [
    { label: 'Tables', value: stats.tables, icon: Table2, href: '/tables' },
    { label: 'Links', value: stats.links, icon: Link2, href: '/links' },
    { label: 'Total rows', value: stats.rows, icon: Rows3, href: '/tables' },
    {
      label: 'Members',
      value: stats.members,
      icon: Users,
      href: isAdmin ? '/settings/members' : '/settings',
    },
  ];

  const actionLabels: Record<string, string> = {
    created_table: 'created table',
    added_row: 'added a row to',
    edited_row: 'edited a row in',
    deleted_row: 'deleted a row from',
    added_link: 'added link',
    deleted_link: 'deleted link',
    updated_link: 'updated link',
    deleted_table: 'deleted table',
    renamed_column: 'renamed column',
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <header className="mb-8">
        <h1 className="text-[26px] font-semibold tracking-tight text-[var(--fg)]">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-[14px] mt-1 text-[var(--fg-muted)]">
          Here&apos;s what&apos;s happening in your workspace today.
        </p>
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {statTiles.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group relative px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] transition-all hover:-translate-y-0.5 hover:shadow-md no-underline overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--accent)] opacity-70" />
            <div className="flex items-center gap-2 mb-3 text-[var(--fg-muted)]">
              <Icon size={14} strokeWidth={1.75} />
              <span className="text-[12px] font-medium">{label}</span>
            </div>
            {loading ? (
              <div className="skeleton h-7 w-12" />
            ) : (
              <p className="text-[26px] font-semibold tabular-nums leading-none text-[var(--fg)]">
                {value}
              </p>
            )}
            <ArrowRight
              size={13}
              className="absolute top-4 right-4 text-[var(--fg-subtle)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
            />
          </Link>
        ))}
      </div>

      {/* Two column section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity feed - takes 2/3 */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold tracking-tight text-[var(--fg)]">
              Recent activity
            </h2>
            {!loading && activity.length > 0 && (
              <span className="text-[12px] text-[var(--fg-muted)]">
                Last {activity.length} updates
              </span>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 items-center">
                    <div className="skeleton w-7 h-7 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3.5 w-4/5" />
                      <div className="skeleton h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <EmptyState
                icon={<Inbox size={20} strokeWidth={1.75} />}
                title="No activity yet"
                description="When your team creates tables, adds links, or edits rows, it will show up here."
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {activity.map((a) => {
                  const name = a.profiles?.full_name || a.profiles?.email || 'Someone';
                  const action = actionLabels[a.action] || a.action;
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                        style={{ background: 'var(--bg-active)', color: 'var(--fg)' }}
                      >
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-snug truncate text-[var(--fg)]">
                          <span className="font-medium">{name}</span>{' '}
                          <span className="text-[var(--fg-muted)]">{action}</span>{' '}
                          {a.entity_name && <span className="font-medium">{a.entity_name}</span>}
                        </p>
                      </div>
                      <span className="text-[12px] tabular-nums flex-shrink-0 text-[var(--fg-muted)]">
                        {timeAgo(a.created_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right side */}
        <aside className="space-y-6">
          {/* Quick actions */}
          <section>
            <h2 className="text-[14px] font-semibold tracking-tight mb-3 text-[var(--fg)]">
              Quick actions
            </h2>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm divide-y divide-[var(--border)] overflow-hidden">
              {isAdmin && (
                <ActionRow
                  href="/settings/members"
                  icon={<UserPlus size={14} strokeWidth={1.75} />}
                  label="Invite teammate"
                />
              )}
              {isAdmin && (
                <ActionRow
                  href="/tables"
                  icon={<Plus size={14} strokeWidth={2} />}
                  label="Create new table"
                />
              )}
              {canManageLinks && (
                <ActionRow
                  href="/links"
                  icon={<Link2 size={14} strokeWidth={1.75} />}
                  label="Add a link"
                />
              )}
              {!isAdmin && !canManageLinks && (
                <p className="text-[12px] leading-relaxed px-4 py-3 text-[var(--fg-muted)]">
                  You have view-only access. Ask an admin for editor permissions.
                </p>
              )}
            </div>
          </section>

          {/* Tables list */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-semibold tracking-tight text-[var(--fg)]">
                Tables
              </h2>
              <Link
                href="/tables"
                className="text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-2 space-y-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skeleton h-8 rounded" />
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <EmptyState
                  icon={<Table2 size={20} strokeWidth={1.75} />}
                  title="No tables yet"
                  description={
                    isAdmin
                      ? 'Create your first table to get started.'
                      : 'Ask an admin to create one.'
                  }
                  compact
                />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {tables.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tables/${t.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[var(--fg)] hover:bg-[var(--bg-hover)] transition-colors group no-underline"
                      >
                        <span className="text-[14px] leading-none w-4 text-center" aria-hidden>
                          {t.icon}
                        </span>
                        <span className="flex-1 truncate">{t.name}</span>
                        <ArrowRight
                          size={13}
                          className="text-[var(--fg-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ActionRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-[var(--fg)] hover:bg-[var(--bg-hover)] transition-colors group no-underline"
    >
      <span className="text-[var(--fg-muted)]">{icon}</span>
      <span className="flex-1">{label}</span>
      <ArrowRight
        size={13}
        className="text-[var(--fg-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
      />
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  description,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 ${
        compact ? 'py-8' : 'py-12'
      }`}
    >
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center mb-3 text-[var(--fg-muted)]"
        style={{ background: 'var(--bg-muted)' }}
      >
        {icon}
      </div>
      <p className="text-[14px] font-medium text-[var(--fg)]">{title}</p>
      <p className="text-[12.5px] mt-1 max-w-[220px] text-[var(--fg-muted)]">{description}</p>
    </div>
  );
}
