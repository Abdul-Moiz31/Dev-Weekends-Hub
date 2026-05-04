'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/activity';
import LinkCard from '@/components/links/LinkCard';
import LinkModal from '@/components/links/LinkModal';
import { toast } from 'sonner';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Link, LinkCategory } from '@/types';

const CATEGORY_FILTERS: { value: LinkCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'repo', label: 'Repos' },
  { value: 'canva', label: 'Canva' },
  { value: 'figma', label: 'Figma' },
  { value: 'docs', label: 'Docs' },
  { value: 'video', label: 'Videos' },
  { value: 'slides', label: 'Slides' },
  { value: 'notion', label: 'Notion' },
  { value: 'discord', label: 'Discord' },
  { value: 'other', label: 'Other' },
];

export default function LinksPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LinkCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editLink, setEditLink] = useState<Link | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor';

  const fetchLinks = async () => {
    const { data } = await supabase.from('links').select('*, profiles(full_name, email)').order('created_at', { ascending: false });
    setLinks((data || []) as Link[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLinks();
    const channel = supabase.channel('links-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, fetchLinks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = links.filter(l => {
    const matchCat = category === 'all' || l.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q) || (l.tags || []).some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const handleSave = async (data: Partial<Link>) => {
    if (editLink) {
      const { error } = await supabase.from('links').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editLink.id);
      if (error) { toast.error('Failed to update link'); return; }
      toast.success('Link updated');
      await logActivity('updated_link', 'link', editLink.id, data.title);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('links').insert({ ...data, added_by: user?.id });
      if (error) { toast.error('Failed to add link'); return; }
      toast.success('Link added');
      await logActivity('added_link', 'link', undefined, data.title as string);
    }
    setShowModal(false);
    setEditLink(null);
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    const link = links.find(l => l.id === id);
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (error) { toast.error('Failed to delete link'); return; }
    toast.success('Link deleted');
    await logActivity('deleted_link', 'link', id, link?.title);
    setDeleteId(null);
    fetchLinks();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 sm:gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Resources</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Links vault</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {links.length} saved link{links.length !== 1 ? 's' : ''} · filter by category or search
          </p>
        </div>
        {canEdit && (
          <button type="button" className="btn-primary self-start sm:self-auto" onClick={() => { setEditLink(null); setShowModal(true); }}>
            <Plus size={16} /> Add link
          </button>
        )}
      </header>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="topbar-search-wrap relative flex-1 min-w-0 max-w-lg">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-[1]" style={{ color: 'var(--text-secondary)' }} />
            <input
              className="input w-full pl-10 text-sm"
              style={{ height: '40px' }}
              placeholder="Search by title, URL, tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="segmented self-start sm:self-auto" role="group" aria-label="View layout">
            <button
              type="button"
              className={viewMode === 'grid' ? 'is-active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'is-active' : ''}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        <div className="links-tab-scroller">
          <div className="tab-strip" role="tablist" aria-label="Filter by category">
            {CATEGORY_FILTERS.map(f => (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={category === f.value}
                className={cn('tab', category === f.value && 'tab--active')}
                onClick={() => setCategory(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6' : 'space-y-4'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state py-16 max-w-lg mx-auto">
          <div className="empty-state__icon text-2xl" aria-hidden>🔗</div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No links match</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {search || category !== 'all' ? 'Try another category or clear your search.' : 'Save repos, docs, and recordings your team uses every week.'}
          </p>
          {canEdit && !search && category === 'all' && (
            <button type="button" className="btn-primary text-sm mt-5" onClick={() => { setEditLink(null); setShowModal(true); }}>
              <Plus size={15} /> Add your first link
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6'
          : 'space-y-4'
        }>
          {filtered.map(l => (
            <LinkCard
              key={l.id}
              link={l}
              variant={viewMode}
              onEdit={link => { setEditLink(link); setShowModal(true); }}
              onDelete={id => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <LinkModal
          link={editLink}
          onClose={() => { setShowModal(false); setEditLink(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Link?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone.</p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" style={{ background: '#ef4444' }}
                onClick={() => handleDelete(deleteId)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
