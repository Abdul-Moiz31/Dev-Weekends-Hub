'use client';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { timeAgo } from '@/lib/utils';
import {
  Table2, Link2, Users, Rows3, Plus, ArrowRight, Activity, Inbox, UserPlus,
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
        supabase.from('activity_log').select('*, profiles(full_name, email, avatar_url)').order('created_at', { ascending: false }).limit(12),
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
    { label: 'Data tables', value: stats.tables, icon: Table2, color: '#3b82f6', href: '/tables', hint: 'Spreadsheets' },
    { label: 'Links', value: stats.links, icon: Link2, color: '#10b981', href: '/links', hint: 'Vault' },
    { label: 'Total rows', value: stats.rows, icon: Rows3, color: '#f59e0b', href: '/tables', hint: 'Across tables' },
    {
      label: 'Team',
      value: stats.members,
      icon: Users,
      color: '#8b5cf6',
      href: isAdmin ? '/settings/members' : '/settings',
      hint: 'Members',
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
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12 pb-2">
      <header className="space-y-2 sm:space-y-3 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Overview</p>
        <h2 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-sm sm:text-[0.9375rem] max-w-2xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Snapshot of workspace data. Jump into tables or the links vault to work; activity shows recent team changes.
        </p>
      </header>

      {/* KPI row — each tile links to the relevant area */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {statTiles.map(({ label, value, icon: Icon, color, href, hint }) => (
          <Link
            key={label}
            href={href}
            className="dash-stat-card block no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{ '--dash-stat-accent': color } as CSSProperties}
          >
            {loading ? (
              <div className="space-y-2.5">
                <div className="skeleton h-3.5 w-20" />
                <div className="skeleton h-8 w-12" />
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{hint}</p>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[0.8125rem] font-semibold leading-snug pr-2" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
                    <Icon size={18} style={{ color }} strokeWidth={1.75} />
                  </div>
                </div>
                <p className="text-2xl sm:text-[1.75rem] font-bold tracking-tight tabular-nums mt-auto pt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 lg:items-stretch">
        <section className="surface-card p-6 sm:p-7 lg:col-span-3 flex flex-col h-full min-h-[260px]">
          <div className="flex items-center justify-between gap-3 mb-5 flex-shrink-0">
            <h3 className="font-semibold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>Recent activity</h3>
            {!loading && activity.length > 0 && (
              <span
                className="text-xs font-semibold tabular-nums px-2.5 py-1 rounded-lg"
                style={{ color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid rgba(16, 185, 129, 0.25)' }}
              >
                Last {activity.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3 flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton w-8 h-8 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-4/5" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="empty-state flex-1 my-auto">
              <div className="empty-state__icon">
                <Inbox size={22} strokeWidth={1.75} />
              </div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No activity yet</p>
              <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
                When your team creates tables, adds links, or edits rows, it will show up here.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-5">
                <Link href="/tables" className="btn-primary text-sm">
                  <Table2 size={15} /> Open tables
                </Link>
                <Link href="/links" className="btn-secondary text-sm">
                  <Link2 size={15} /> Links vault
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y flex-1 min-h-0 overflow-y-auto -mx-0.5 pr-1" style={{ borderColor: 'var(--border)' }}>
              {activity.map(a => {
                const name = a.profiles?.full_name || a.profiles?.email || 'Someone';
                const action = actionLabels[a.action] || a.action;
                return (
                  <div key={a.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0 px-0.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                      {name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                        <span className="font-semibold">{name}</span>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{action}</span>{' '}
                        {a.entity_name && <span className="font-medium">{a.entity_name}</span>}
                      </p>
                      <p className="text-[11px] mt-1 font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="lg:col-span-2 flex flex-col gap-5 h-full min-h-0">
          <section className="surface-card p-5 sm:p-6 flex-shrink-0">
            <div className="flex items-center gap-2.5 mb-4">
              <Activity size={18} style={{ color: 'var(--accent)' }} strokeWidth={1.75} />
              <h3 className="font-semibold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>Quick actions</h3>
            </div>
            <div className="space-y-1.5">
              {isAdmin && (
                <Link href="/settings/members" className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--bg-hover)] no-underline"
                  style={{ color: 'var(--text-primary)' }}>
                  <UserPlus size={16} style={{ color: 'var(--accent)' }} strokeWidth={2} />
                  Invite teammate
                </Link>
              )}
              {isAdmin && (
                <Link href="/tables" className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--bg-hover)] no-underline"
                  style={{ color: 'var(--text-primary)' }}>
                  <Plus size={16} style={{ color: 'var(--accent)' }} strokeWidth={2} />
                  Create new table
                </Link>
              )}
              {canManageLinks && (
                <Link href="/links" className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--bg-hover)] no-underline"
                  style={{ color: 'var(--text-primary)' }}>
                  <Plus size={16} style={{ color: 'var(--accent)' }} strokeWidth={2} />
                  Add link
                </Link>
              )}
              {!isAdmin && !canManageLinks && (
                <p className="text-xs leading-relaxed px-3 py-3 rounded-xl" style={{ color: 'var(--text-secondary)', background: 'var(--bg-hover)' }}>
                  You have view-only access. Ask an admin for editor permissions to add tables or links.
                </p>
              )}
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>Tables</h3>
              <Link href="/tables" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                View all
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2 flex-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-10 rounded-xl" />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <div className="empty-state flex-1 border-none bg-transparent py-8 justify-center min-h-0 my-auto">
                <div className="empty-state__icon">
                  <Table2 size={22} strokeWidth={1.75} />
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>No tables yet</p>
                <p className="text-xs mt-1 max-w-[220px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
                  {isAdmin ? 'Create a table to track sessions, cohorts, or anything your team needs.' : 'An admin can create the first workspace table.'}
                </p>
                {isAdmin && (
                  <Link href="/tables" className="btn-primary text-sm mt-4">
                    <Plus size={15} /> Create table
                  </Link>
                )}
              </div>
            ) : (
              <ul className="space-y-1 flex-1 min-h-0 overflow-y-auto">
                {tables.map(t => (
                  <li key={t.id}>
                    <Link href={`/tables/${t.id}`}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--bg-hover)] group no-underline"
                      style={{ color: 'var(--text-primary)' }}>
                      <span className="text-base leading-none" aria-hidden>{t.icon}</span>
                      <span className="flex-1 truncate">{t.name}</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
