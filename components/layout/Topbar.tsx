'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Sun, Moon, Search, X, Menu, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { cn, getInitials } from '@/lib/utils';
import type { DynamicTable, Link as LinkType, TableRow } from '@/types';

interface TopbarProps {
  title: string;
  onOpenMobileNav?: () => void;
  onNavigate?: () => void;
}

type SearchResult = { type: string; id: string; label: string; href: string };

function rowMatchesQuery(row: TableRow, q: string): boolean {
  if (!row.data || typeof row.data !== 'object') return false;
  return Object.values(row.data).some(v => v != null && String(v).toLowerCase().includes(q));
}

export default function Topbar({ title, onOpenMobileNav, onNavigate }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const q = query.toLowerCase();
    const search = async () => {
      const [{ data: tables }, { data: links }, { data: rows }] = await Promise.all([
        supabase.from('dynamic_tables').select('id, name, icon'),
        supabase.from('links').select('id, title, url, description, tags'),
        supabase.from('table_rows').select('id, table_id, data').limit(400),
      ]);
      const r: SearchResult[] = [];

      (tables as DynamicTable[] | null)?.forEach(t => {
        if (t.name.toLowerCase().includes(q)) {
          r.push({ type: 'Table', id: t.id, label: `${t.icon} ${t.name}`, href: `/tables/${t.id}` });
        }
      });

      (links as LinkType[] | null)?.forEach(l => {
        const inTitle = l.title.toLowerCase().includes(q);
        const inUrl = (l.url || '').toLowerCase().includes(q);
        const inDesc = (l.description || '').toLowerCase().includes(q);
        const inTags = (l.tags || []).some(t => t.toLowerCase().includes(q));
        if (inTitle || inUrl || inDesc || inTags) {
          r.push({ type: 'Link', id: l.id, label: l.title, href: '/links' });
        }
      });

      const tableNameById = new Map((tables as DynamicTable[] | null)?.map(t => [t.id, t.name]) || []);
      (rows as TableRow[] | null)?.forEach(row => {
        if (rowMatchesQuery(row, q)) {
          const tname = tableNameById.get(row.table_id) || 'Table';
          r.push({
            type: 'Row',
            id: row.id,
            label: `Row in ${tname}`,
            href: `/tables/${row.table_id}`,
          });
        }
      });

      setResults(r.slice(0, 12));
      setOpen(r.length > 0);
    };
    const timer = setTimeout(search, 220);
    return () => clearTimeout(timer);
  }, [query, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    if (!acc[item.type].some(x => x.id === item.id && x.href === item.href)) acc[item.type].push(item);
    return acc;
  }, {});

  const orderedTypes = ['Table', 'Row', 'Link'].filter(t => grouped[t]?.length);
  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/');

  return (
    <header
      className={cn(
        'topbar-shell sticky top-0 z-30',
        'grid gap-x-4 gap-y-3 px-4 sm:px-6 py-3',
        'grid-cols-[1fr_auto] grid-rows-[auto_auto]',
        'lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:grid-rows-1 lg:items-center lg:gap-x-6'
      )}
    >
      {/* Row 1: title (col 1) + actions (col 2). On lg: title | search | actions */}
      <div className="flex items-center gap-3 min-w-0 col-start-1 row-start-1 lg:max-w-[min(300px,36vw)]">
        {onOpenMobileNav && (
          <button
            type="button"
            className="topbar-icon-btn lg:hidden flex-shrink-0"
            aria-label="Open menu"
            onClick={onOpenMobileNav}
          >
            <Menu size={18} />
          </button>
        )}
        <h1
          className="text-base sm:text-[1.0625rem] font-semibold tracking-tight truncate leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center justify-end gap-2 flex-shrink-0 col-start-2 row-start-1 lg:col-start-3 lg:row-start-1">
        <Link
          href="/settings"
          onClick={() => onNavigate?.()}
          className={cn(
            'topbar-icon-btn no-underline',
            settingsActive && 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
          )}
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={17} strokeWidth={1.75} />
        </Link>
        <button type="button" onClick={toggle} className="topbar-icon-btn" title="Toggle theme" aria-label="Toggle color theme">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl pl-1 pr-2 py-1 border transition-colors hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
            onClick={() => setUserMenuOpen(v => !v)}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid rgba(16, 185, 129, 0.35)' }}
            >
              {profile ? getInitials(profile.full_name, profile.email) : '?'}
            </div>
            <ChevronDown size={14} className="hidden sm:block opacity-60" style={{ color: 'var(--text-secondary)' }} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-xl border py-1 z-50 overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
              }}
              role="menu"
            >
              <div className="px-3 py-2.5 border-b text-xs leading-snug" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {profile?.email}
              </div>
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[var(--bg-hover)]',
                  pathname === '/settings' && 'bg-[var(--bg-hover)]'
                )}
                style={{ color: 'var(--text-primary)' }}
                onClick={() => {
                  router.push('/settings');
                  setUserMenuOpen(false);
                  onNavigate?.();
                }}
              >
                <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
                Settings
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-primary)' }}
                onClick={handleLogout}
              >
                <LogOut size={16} style={{ color: 'var(--text-secondary)' }} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 full width on mobile; center column on desktop */}
      <div className="col-span-2 row-start-2 min-w-0 flex justify-center lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:px-2">
        <div ref={searchRef} className="topbar-search-wrap relative w-full max-w-xl lg:max-w-2xl">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-[1]" style={{ color: 'var(--text-secondary)' }} />
          <input
            className="input w-full pl-10 pr-9 text-sm"
            placeholder="Search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            aria-label="Search tables, rows, and links"
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--bg-hover)] transition-colors"
              onClick={() => { setQuery(''); setOpen(false); }}
              aria-label="Clear search"
            >
              <X size={14} style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}

          {open && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl overflow-hidden z-50 max-h-[min(70vh,380px)] overflow-y-auto"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              {orderedTypes.map(type => (
                <div key={type}>
                  <p
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)', background: 'var(--bg-hover)' }}
                  >
                    {type}s
                  </p>
                  {grouped[type].map(item => (
                    <button
                      key={`${type}-${item.id}-${item.href}`}
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-[var(--bg-hover)] transition-colors border-b border-[color:var(--border)] last:border-0"
                      style={{ color: 'var(--text-primary)' }}
                      onClick={() => {
                        router.push(item.href);
                        setOpen(false);
                        setQuery('');
                        onNavigate?.();
                      }}
                    >
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md flex-shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        {type}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
