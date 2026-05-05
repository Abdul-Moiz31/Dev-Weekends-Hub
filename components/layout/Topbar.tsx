'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sun, Moon, Search, X, Menu, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { cn, getInitials } from '@/lib/utils';
import type { DynamicTable, Link as LinkType, TableRow } from '@/types';
import BrandLogo from '@/components/brand/BrandLogo';

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

  const iconBtn =
    'flex items-center justify-center w-8 h-8 rounded-md text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)] transition-colors';

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm shadow-sm">
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {onOpenMobileNav && (
          <button
            type="button"
            className={cn(iconBtn, 'lg:hidden')}
            aria-label="Open menu"
            onClick={onOpenMobileNav}
          >
            <Menu size={16} />
          </button>
        )}
        <h1 className="text-[14px] font-medium tracking-tight text-[var(--fg)]">
          <span className="inline-flex items-center gap-2">
            <BrandLogo size={52} className="hidden sm:block" />
            {title}
          </span>
        </h1>
      </div>

      {/* Center: search */}
      <div className="flex-1 max-w-xl mx-auto" ref={searchRef}>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--fg-muted)]"
          />
          <input
            type="text"
            className="w-full h-9 pl-9 pr-8 text-[13px] rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg)] placeholder:text-[var(--fg-subtle)] shadow-sm focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all"
            placeholder="Search tables, links, rows…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            aria-label="Search"
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--fg-muted)] transition-colors"
              onClick={() => {
                setQuery('');
                setOpen(false);
              }}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}

          {open && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg overflow-hidden max-h-[min(70vh,400px)] overflow-y-auto z-50">
              {orderedTypes.map((type) => (
                <div key={type}>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] bg-[var(--bg-muted)] border-b border-[var(--border)]">
                    {type}s
                  </p>
                  {grouped[type].map((item) => (
                    <button
                      key={`${type}-${item.id}-${item.href}`}
                      type="button"
                      className="w-full text-left px-3 py-2 text-[13px] flex items-center gap-2 hover:bg-[var(--bg-hover)] transition-colors text-[var(--fg)] border-b border-[var(--border)] last:border-b-0"
                      onClick={() => {
                        router.push(item.href);
                        setOpen(false);
                        setQuery('');
                        onNavigate?.();
                      }}
                    >
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-[var(--fg-muted)] bg-[var(--bg-muted)] flex-shrink-0">
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

      {/* Right: actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={toggle}
          className={iconBtn}
          title="Toggle theme"
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-1 py-1 hover:bg-[var(--bg-hover)] transition-colors"
            onClick={() => setUserMenuOpen((v) => !v)}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
              style={{ background: 'var(--bg-active)', color: 'var(--fg)' }}
            >
              {profile ? getInitials(profile.full_name, profile.email) : '?'}
            </div>
            <ChevronDown size={13} className="hidden sm:block text-[var(--fg-muted)]" />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg py-1 z-50"
              role="menu"
            >
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <p className="text-[13px] font-medium text-[var(--fg)] truncate">
                  {profile?.full_name || 'Account'}
                </p>
                <p className="text-[11px] text-[var(--fg-muted)] truncate">{profile?.email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-[var(--bg-hover)] transition-colors text-[var(--fg)]',
                  pathname === '/settings' && 'bg-[var(--bg-hover)]'
                )}
                onClick={() => {
                  router.push('/settings');
                  setUserMenuOpen(false);
                  onNavigate?.();
                }}
              >
                <Settings size={14} className="text-[var(--fg-muted)]" />
                Settings
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-[var(--bg-hover)] transition-colors text-[var(--fg)]"
                onClick={handleLogout}
              >
                <LogOut size={14} className="text-[var(--fg-muted)]" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
