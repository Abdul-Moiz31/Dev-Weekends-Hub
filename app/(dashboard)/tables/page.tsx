'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/activity';
import CreateTableModal from '@/components/tables/CreateTableModal';
import { toast } from 'sonner';
import { Plus, Trash2, Columns } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import type { DynamicTable } from '@/types';

interface TableWithCount extends DynamicTable {
  row_count?: number;
  column_count?: number;
}

export default function TablesPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useAuth();
  const [tables, setTables] = useState<TableWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  const fetchTables = useCallback(async () => {
    const { data: tablesData } = await supabase.from('dynamic_tables').select('*').order('created_at', { ascending: false });
    if (!tablesData) { setLoading(false); return; }

    const withCounts = await Promise.all(tablesData.map(async (t) => {
      const [{ count: rowCount }, { count: colCount }] = await Promise.all([
        supabase.from('table_rows').select('*', { count: 'exact', head: true }).eq('table_id', t.id),
        supabase.from('table_columns').select('*', { count: 'exact', head: true }).eq('table_id', t.id),
      ]);
      return { ...t, row_count: rowCount || 0, column_count: colCount || 0 };
    }));

    setTables(withCounts as TableWithCount[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleCreate = async (
    name: string,
    icon: string,
    description: string,
    columns: { name: string; field_type: string; position: number; is_required: boolean; options: unknown; localId?: string }[]
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: newTable, error } = await supabase
      .from('dynamic_tables')
      .insert({ name, icon, description: description || null, created_by: user?.id })
      .select()
      .single();

    if (error || !newTable) { toast.error('Failed to create table'); return ''; }

    const normalized =
      columns.length > 0
        ? columns.map((c, i) => ({
            table_id: newTable.id,
            name: (c.name || 'Column').trim(),
            field_type: c.field_type,
            position: i,
            is_required: Boolean(c.is_required),
            options: c.options ?? null,
          }))
        : [{
            table_id: newTable.id,
            name: 'Title',
            field_type: 'text',
            position: 0,
            is_required: false,
            options: null,
          }];

    const { error: colError } = await supabase.from('table_columns').insert(normalized);
    if (colError) {
      await supabase.from('dynamic_tables').delete().eq('id', newTable.id);
      toast.error('Failed to add columns');
      return '';
    }

    toast.success(`Table "${name}" created!`);
    await logActivity('created_table', 'table', newTable.id, name);
    setShowCreate(false);
    router.push(`/tables/${newTable.id}`);
    return newTable.id;
  };

  const handleDelete = async (id: string) => {
    const table = tables.find(t => t.id === id);
    const { error } = await supabase.from('dynamic_tables').delete().eq('id', id);
    if (error) { toast.error('Failed to delete table'); return; }
    toast.success('Table deleted');
    await logActivity('deleted_table', 'table', id, table?.name);
    setDeleteId(null);
    fetchTables();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 sm:gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Workspace</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Data tables</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tables.length} table{tables.length !== 1 ? 's' : ''} · rows and columns stay in sync with Supabase
          </p>
        </div>
        {isAdmin && (
          <button type="button" className="btn-primary self-start sm:self-auto" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create table
          </button>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : tables.length === 0 ? (
        <div className="empty-state py-16 max-w-lg mx-auto">
          <div className="empty-state__icon text-2xl" aria-hidden>📊</div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No tables yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin
              ? 'Spin up a sheet-style table with typed columns, realtime updates, and exports.'
              : 'Ask an admin to create a table, or check back after the next session.'}
          </p>
          {isAdmin && (
            <button type="button" className="btn-primary text-sm mt-5" onClick={() => setShowCreate(true)}>
              <Plus size={15} /> Create your first table
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {tables.map(t => (
            <div
              key={t.id}
              className="table-list-card group relative"
              onClick={() => router.push(`/tables/${t.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/tables/${t.id}`); } }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="table-list-card__emoji flex-shrink-0">{t.icon}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm tracking-tight leading-snug" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                    {t.description && (
                      <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 transition-opacity flex-shrink-0 rounded-lg"
                    style={{ color: '#ef4444' }}
                    onClick={e => { e.stopPropagation(); setDeleteId(t.id); }}
                    title="Delete table"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide mt-auto pt-1" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1.5">
                  <Columns size={13} strokeWidth={2} /> {t.column_count} cols
                </span>
                <span className="w-px h-3 self-center opacity-40" style={{ background: 'var(--text-secondary)' }} />
                <span>{t.row_count} rows</span>
              </div>

              <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Updated {timeAgo(t.updated_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTableModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {}}
          onCreate={handleCreate as never}
        />
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Table?</h3>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              This will permanently delete the table and all its rows.
            </p>
            <p className="text-sm font-medium mb-5" style={{ color: '#ef4444' }}>This action cannot be undone.</p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" style={{ background: '#ef4444' }}
                onClick={() => handleDelete(deleteId)}>
                Delete Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
