'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Link2, Table2, Settings, Users, Mail, ChevronLeft,
  ChevronRight, LogOut, ChevronDown, Plus, CalendarDays,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import type { DynamicTable } from '@/types';
import BrandLogo from '@/components/brand/BrandLogo';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [tables, setTables] = useState<DynamicTable[]>([]);
  const [tablesOpen, setTablesOpen] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('dynamic_tables').select('id, name, icon').order('created_at').then(({ data }) => {
      if (data) setTables(data as DynamicTable[]);
    });
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/links', icon: Link2, label: 'Links Vault' },
    { href: '/timetable', icon: CalendarDays, label: 'Timetable' },
  ];

  const settingsItems = [
    { href: '/settings', icon: Settings, label: 'Settings' },
    ...(profile?.role === 'admin' ? [{ href: '/settings/members', icon: Users, label: 'Members' }] : []),
    ...(profile?.role === 'admin' ? [{ href: '/settings/templates', icon: Mail, label: 'Templates' }] : []),
  ];

  const afterNav = () => onCloseMobile?.();
  const tablesActive = pathname.startsWith('/tables');

  const navItemClass = (active: boolean) =>
    cn(
      'flex items-center gap-2 rounded-md px-2 py-[6px] text-[13px] font-medium transition-all no-underline',
      active
        ? 'bg-[var(--bg-active)] text-[var(--fg)] ring-1 ring-[var(--border-strong)] shadow-sm'
        : 'text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]',
      collapsed && 'justify-center px-0'
    );

  return (
    <aside
      className={cn(
        'flex flex-col h-full transition-[width,transform] duration-200 ease-out relative flex-shrink-0 z-50',
        'border-r border-[var(--border)] bg-[var(--bg-muted)]',
        'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:shadow-2xl',
        'md:translate-x-0',
        mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
      )}
      style={{ width: collapsed ? '3.5rem' : '15rem' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-12 flex-shrink-0">
        <BrandLogo size={52} />
        {!collapsed && (
          <div className="overflow-hidden min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-tight truncate text-[var(--fg)]">
              Dev Weekends
            </p>
            <p className="text-[11px] truncate leading-tight text-[var(--fg-muted)]">
              Workspace
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-4">
        {/* Main nav */}
        <div className="space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={afterNav}
                title={collapsed ? label : undefined}
                className={navItemClass(active)}
              >
                <Icon size={15} strokeWidth={1.75} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Tables section */}
        <div>
          {!collapsed && (
            <div className="flex items-center justify-between mb-1 px-2 group">
              <button
                type="button"
                onClick={() => setTablesOpen(!tablesOpen)}
                className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                <ChevronDown
                  size={12}
                  className={cn('transition-transform', !tablesOpen && '-rotate-90')}
                />
                Tables
              </button>
              {profile?.role === 'admin' && (
                <Link
                  href="/tables"
                  onClick={afterNav}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--bg-hover)]"
                  title="View all tables"
                >
                  <Plus size={12} className="text-[var(--fg-muted)]" />
                </Link>
              )}
            </div>
          )}

          {collapsed ? (
            <Link
              href="/tables"
              onClick={afterNav}
              title="Tables"
              className={navItemClass(tablesActive)}
            >
              <Table2 size={15} strokeWidth={1.75} />
            </Link>
          ) : (
            tablesOpen && (
              <div className="space-y-0.5">
                <Link
                  href="/tables"
                  onClick={afterNav}
                  className={navItemClass(pathname === '/tables')}
                >
                  <Table2 size={15} strokeWidth={1.75} className="flex-shrink-0" />
                  <span className="truncate">All tables</span>
                </Link>
                {tables.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tables/${t.id}`}
                    onClick={afterNav}
                    className={navItemClass(pathname === `/tables/${t.id}`)}
                  >
                    <span className="flex-shrink-0 text-[14px] leading-none w-[15px] text-center" aria-hidden>
                      {t.icon}
                    </span>
                    <span className="truncate">{t.name}</span>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>

        {/* Account */}
        <div className="mt-auto">
          {!collapsed && (
            <p className="text-[11px] font-semibold uppercase tracking-wider px-2 mb-1 text-[var(--fg-muted)]">
              Account
            </p>
          )}
          <div className="space-y-0.5">
            {settingsItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={afterNav}
                  title={collapsed ? label : undefined}
                  className={navItemClass(active)}
                >
                  <Icon size={15} strokeWidth={1.75} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User card */}
      <div className="border-t border-[var(--border)] flex-shrink-0 p-2">
        {!collapsed && profile ? (
          <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors group">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{ background: 'var(--bg-active)', color: 'var(--fg)' }}
            >
              {(profile.full_name || profile.email)[0].toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-[12.5px] font-medium truncate leading-tight text-[var(--fg)]">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[11px] truncate capitalize leading-tight text-[var(--fg-muted)]">
                {profile.role}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1 rounded text-[var(--fg-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--fg)] opacity-50 group-hover:opacity-100 transition-all"
              title="Sign out"
            >
              <LogOut size={13} strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className={navItemClass(false) + ' w-full'}
            title="Sign out"
          >
            <LogOut size={15} strokeWidth={1.75} />
            {!collapsed && <span>Sign out</span>}
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => onCollapse(!collapsed)}
        className="absolute -right-3 top-4 w-6 h-6 rounded-full items-center justify-center border border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-hover)] transition-all hidden md:flex shadow"
        style={{ zIndex: 20 }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
