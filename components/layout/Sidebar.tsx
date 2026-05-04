'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Link2, Table2, Settings, Users, ChevronLeft,
  ChevronRight, LogOut, ChevronDown, ChevronRight as ChevronR
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import type { DynamicTable } from '@/types';

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
  ];

  const settingsItems = [
    { href: '/settings', icon: Settings, label: 'Settings' },
    ...(profile?.role === 'admin' ? [{ href: '/settings/members', icon: Users, label: 'Members' }] : []),
  ];

  const afterNav = () => onCloseMobile?.();
  const tablesActive = pathname.startsWith('/tables');

  return (
    <aside
      className={cn(
        'sidebar-shell flex flex-col h-full border-r transition-[width,transform] duration-200 ease-out relative flex-shrink-0 z-50',
        'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:shadow-2xl max-md:shadow-black/40',
        'md:translate-x-0',
        mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
      )}
      style={{
        width: collapsed ? '4.25rem' : '16.5rem',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 border-b min-h-[4.25rem]"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="sidebar-logo-mark flex-shrink-0">DW</div>
        {!collapsed && (
          <div className="overflow-hidden min-w-0">
            <p className="font-semibold text-sm leading-tight truncate tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Dev Weekends
            </p>
            <p className="text-[11px] truncate font-medium" style={{ color: 'var(--text-secondary)' }}>
              Hub
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        <p className={cn('sidebar-section-title', collapsed && 'sr-only')}>Navigation</p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={afterNav}
              title={collapsed ? label : undefined}
              className={cn(
                'sidebar-nav-link',
                active && 'sidebar-nav-link--active',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon size={18} strokeWidth={1.75} className="flex-shrink-0 opacity-90" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}

        <div className={cn('mt-1', collapsed && 'mt-0.5')}>
          {collapsed ? (
            <Link
              href="/tables"
              onClick={afterNav}
              title="Data Tables"
              className={cn(
                'sidebar-nav-link',
                tablesActive && 'sidebar-nav-link--active',
                'justify-center px-0'
              )}
            >
              <Table2 size={18} strokeWidth={1.75} className="flex-shrink-0 opacity-90" />
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setTablesOpen(!tablesOpen)}
                className={cn(
                  'sidebar-tables-trigger',
                  tablesOpen && 'sidebar-tables-trigger--open',
                  tablesActive && 'text-[var(--accent)]'
                )}
              >
                <Table2 size={18} strokeWidth={1.75} className="flex-shrink-0 opacity-90" />
                <span className="flex-1 text-left">Data Tables</span>
                {tablesOpen ? <ChevronDown size={15} className="opacity-70" /> : <ChevronR size={15} className="opacity-70" />}
              </button>

              {tablesOpen && (
                <div className="mt-1 ml-1 pl-2.5 border-l border-[color:var(--border)] space-y-0.5">
                  <Link
                    href="/tables"
                    onClick={afterNav}
                    className={cn('sidebar-sub-link', pathname === '/tables' && 'sidebar-sub-link--active')}
                  >
                    All tables
                  </Link>
                  {tables.map(t => (
                    <Link
                      key={t.id}
                      href={`/tables/${t.id}`}
                      onClick={afterNav}
                      className={cn(
                        'sidebar-sub-link',
                        pathname === `/tables/${t.id}` && 'sidebar-sub-link--active'
                      )}
                    >
                      <span className="flex-shrink-0 text-[13px] leading-none" aria-hidden>{t.icon}</span>
                      <span className="truncate">{t.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-4 mt-auto border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
          <p className={cn('sidebar-section-title', collapsed && 'sr-only')}>Account</p>
          {settingsItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={afterNav}
                title={collapsed ? label : undefined}
                className={cn(
                  'sidebar-nav-link',
                  active && 'sidebar-nav-link--active',
                  collapsed && 'justify-center px-0'
                )}
              >
                <Icon size={18} strokeWidth={1.75} className="flex-shrink-0 opacity-90" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t px-3 py-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
        {!collapsed && profile && (
          <div className="sidebar-user-card">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid rgba(16, 185, 129, 0.35)' }}
            >
              {(profile.full_name || profile.email)[0].toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold truncate tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {profile.full_name || profile.email}
              </p>
              <p className="text-[10px] uppercase tracking-wide font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                {profile.role}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'sidebar-nav-link w-full text-left !text-[var(--text-secondary)] hover:!text-[var(--text-primary)]',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut size={18} strokeWidth={1.75} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onCollapse(!collapsed)}
        className="absolute -right-3 top-[4.5rem] w-7 h-7 rounded-full items-center justify-center border transition-colors hidden md:flex shadow-sm"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
          zIndex: 20,
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
