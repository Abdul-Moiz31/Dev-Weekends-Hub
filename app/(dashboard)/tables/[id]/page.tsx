'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/activity';
import Cell from '@/components/tables/CellRenderer';
import { toast } from 'sonner';
import {
  Plus, Download, Search, Trash2, Copy, Loader2, Columns3, Pencil,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DynamicTable, TableColumn, TableRow } from '@/types';
import { FIELD_TYPE_ICONS, FIELD_TYPE_LABELS } from '@/components/tables/fieldTypeIcons';

interface EditingCell {
  rowId: string;
  colId: string;
}

export default function TableViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useAuth();

  const [table, setTable] = useState<DynamicTable | null>(null);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);
  const [addingRow, setAddingRow] = useState(false);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [hiddenColIds, setHiddenColIds] = useState<Set<string>>(() => new Set());
  const [editingHeaderId, setEditingHeaderId] = useState<string | null>(null);
  const [headerDraft, setHeaderDraft] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

  const myUserIdRef = useRef<string | null>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const ignoreHeaderBlurRef = useRef(false);
  const skipRemoteToastUntilRef = useRef(0);
  const lastRemoteToastRef = useRef(0);
  const colMenuRef = useRef<HTMLDivElement>(null);

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor';
  const isAdmin = profile?.role === 'admin';

  const bumpSkipRemoteToast = () => {
    skipRemoteToastUntilRef.current = Date.now() + 2500;
  };

  const maybeToastRemote = useCallback((kind: 'insert' | 'update' | 'delete', row?: TableRow) => {
    if (Date.now() < skipRemoteToastUntilRef.current) return;
    if (Date.now() - lastRemoteToastRef.current < 3500) return;
    lastRemoteToastRef.current = Date.now();
    if (kind === 'insert' && row?.created_by && row.created_by === myUserIdRef.current) return;
    const messages = {
      insert: 'A teammate added a row',
      update: 'A teammate updated this table',
      delete: 'A teammate removed a row',
    };
    toast.info(messages[kind], { duration: 4000 });
  }, []);

  const fetchData = useCallback(async () => {
    const [{ data: t }, { data: cols }, { data: rws }] = await Promise.all([
      supabase.from('dynamic_tables').select('*').eq('id', id).single(),
      supabase.from('table_columns').select('*').eq('table_id', id).order('position'),
      supabase.from('table_rows').select('*').eq('table_id', id).order('position').order('created_at'),
    ]);
    setTable(t as DynamicTable);
    setColumns((cols || []) as TableColumn[]);
    setRows((rws || []) as TableRow[]);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      myUserIdRef.current = user?.id ?? null;
    })();
  }, [supabase]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel(`table-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'table_rows', filter: `table_id=eq.${id}` },
        payload => {
          const nr = payload.new as TableRow;
          setRows(prev => (prev.some(r => r.id === nr.id) ? prev : [...prev, nr]));
          maybeToastRemote('insert', nr);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'table_rows', filter: `table_id=eq.${id}` },
        payload => {
          const updated = payload.new as TableRow;
          setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
          maybeToastRemote('update');
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'table_rows', filter: `table_id=eq.${id}` },
        payload => {
          setRows(prev => prev.filter(r => r.id !== payload.old.id));
          maybeToastRemote('delete');
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchData, supabase, maybeToastRemote]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!editingHeaderId) return;
    const t = window.setTimeout(() => {
      headerInputRef.current?.focus();
      headerInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [editingHeaderId]);

  useEffect(() => {
    if (editingHeaderId && hiddenColIds.has(editingHeaderId)) {
      ignoreHeaderBlurRef.current = false;
      setEditingHeaderId(null);
      setHeaderDraft('');
    }
  }, [editingHeaderId, hiddenColIds]);

  const visibleColumns = columns.filter(c => !hiddenColIds.has(c.id));

  const filteredRows = rows.filter(row => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return columns.some(col => {
      const val = row.data[col.id];
      return val != null && val !== '' && String(val).toLowerCase().includes(q);
    });
  });

  const saveCell = async (rowId: string, colId: string, value: unknown) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    bumpSkipRemoteToast();
    const newData = { ...row.data, [colId]: value };
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: newData } : r));
    const { error } = await supabase.from('table_rows').update({ data: newData, updated_at: new Date().toISOString() }).eq('id', rowId);
    if (error) { toast.error('Failed to save'); fetchData(); }
    else await logActivity('edited_row', 'row', rowId, table?.name);
  };

  const addRow = async () => {
    if (!canEdit || addingRow) return;
    setAddingRow(true);
    bumpSkipRemoteToast();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: newRow, error } = await supabase.from('table_rows').insert({
      table_id: id,
      data: {},
      position: rows.length,
      created_by: user?.id,
    }).select().single();
    if (error) { toast.error('Failed to add row'); }
    else {
      if (newRow) {
        setRows(prev => (prev.some(r => r.id === newRow.id) ? prev : [...prev, newRow as TableRow]));
      }
      await logActivity('added_row', 'row', newRow?.id, table?.name);
      toast.success('Row added');
    }
    setAddingRow(false);
  };

  const deleteRow = async (rowId: string) => {
    bumpSkipRemoteToast();
    setRows(prev => prev.filter(r => r.id !== rowId));
    const { error } = await supabase.from('table_rows').delete().eq('id', rowId);
    if (error) { toast.error('Failed to delete row'); fetchData(); return; }
    await logActivity('deleted_row', 'row', rowId, table?.name);
    toast.success('Row deleted');
    setDeleteRowId(null);
  };

  const duplicateRow = async (row: TableRow) => {
    bumpSkipRemoteToast();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: newRow, error } = await supabase.from('table_rows').insert({
      table_id: id,
      data: { ...row.data },
      position: rows.length,
      created_by: user?.id,
    }).select().single();
    if (error) toast.error('Failed to duplicate');
    else {
      if (newRow) setRows(prev => (prev.some(r => r.id === newRow.id) ? prev : [...prev, newRow as TableRow]));
      await logActivity('added_row', 'row', newRow?.id, table?.name);
      toast.success('Row duplicated');
    }
  };

  const cancelRenameColumn = () => {
    ignoreHeaderBlurRef.current = false;
    setEditingHeaderId(null);
    setHeaderDraft('');
  };

  const beginRenameColumn = (col: TableColumn) => {
    if (!isAdmin) return;
    setEditing(null);
    setEditingHeaderId(col.id);
    setHeaderDraft(col.name);
  };

  const saveRenameColumn = async (colId: string, rawFromInput?: string) => {
    if (!isAdmin || savingHeader) return;
    const col = columns.find(c => c.id === colId);
    if (!col) {
      cancelRenameColumn();
      return;
    }
    const raw = (rawFromInput ?? headerDraft).trim();
    const next = raw || col.name;
    if (next === col.name) {
      cancelRenameColumn();
      return;
    }
    setSavingHeader(true);
    bumpSkipRemoteToast();
    const { error } = await supabase.from('table_columns').update({ name: next }).eq('id', colId);
    if (error) {
      toast.error(error.message || 'Could not rename column');
      cancelRenameColumn();
      setSavingHeader(false);
      return;
    }
    setColumns(prev => prev.map(c => (c.id === colId ? { ...c, name: next } : c)));
    await logActivity('renamed_column', 'column', colId, next, {
      table_id: id,
      table_name: table?.name,
      previous: col.name,
    });
    toast.success('Column renamed');
    cancelRenameColumn();
    setSavingHeader(false);
  };

  const exportCSV = () => {
    const headers = visibleColumns.map(c => c.name).join(',');
    const csvRows = filteredRows.map(row =>
      visibleColumns.map(c => {
        const val = row.data[c.id] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${table?.name || 'table'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const data = filteredRows.map(row => {
      const obj: Record<string, unknown> = {};
      visibleColumns.forEach(c => { obj[c.name] = row.data[c.id] ?? ''; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (table?.name || 'Sheet1').slice(0, 31));
    XLSX.writeFile(wb, `${table?.name || 'table'}.xlsx`);
  };

  const toggleCol = (colId: string) => {
    setHiddenColIds(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="max-w-full">
        <div className="skeleton h-8 w-48 mb-2 rounded-lg" />
        <div className="skeleton h-4 w-32 mb-6 rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!table) return <div style={{ color: 'var(--text-secondary)' }}>Table not found.</div>;

  const rowSummary = search.trim()
    ? `${filteredRows.length} match${filteredRows.length !== 1 ? 'es' : ''} of ${rows.length} row${rows.length !== 1 ? 's' : ''}`
    : `${filteredRows.length} row${filteredRows.length !== 1 ? 's' : ''}`;

  const metaLine =
    columns.length === 0
      ? rows.length > 0
        ? `${rows.length} row${rows.length !== 1 ? 's' : ''} saved, but this table has no column definitions yet.`
        : 'No columns yet — add at least one column to use this table.'
      : `${rowSummary} · ${visibleColumns.length} of ${columns.length} column${columns.length !== 1 ? 's' : ''} visible`;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full max-w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <span className="text-2xl sm:text-[1.75rem] leading-none">{table.icon}</span>
        <div className="flex-1 min-w-0 space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>{table.name}</h2>
          <p className="text-xs sm:text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            {metaLine}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative" ref={colMenuRef}>
            <button
              type="button"
              className="btn-secondary text-xs px-2 py-1.5"
              onClick={() => setColMenuOpen(v => !v)}
              title="Show or hide columns"
            >
              <Columns3 size={12} /> Columns
            </button>
            {colMenuOpen && columns.length > 0 && (
              <div
                className="absolute right-0 top-full mt-1 w-56 max-h-64 overflow-y-auto rounded-xl border py-1 z-50 shadow-lg"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                {columns.map(col => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenColIds.has(col.id)}
                      onChange={() => toggleCol(col.id)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="truncate">{col.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input className="input pl-7 text-xs" style={{ height: '32px', width: '180px' }}
              placeholder="Search rows…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="flex items-center gap-1">
            <button type="button" className="btn-secondary text-xs px-2 py-1.5" onClick={exportCSV}>
              <Download size={12} /> CSV
            </button>
            <button type="button" className="btn-secondary text-xs px-2 py-1.5" onClick={exportExcel}>
              <Download size={12} /> Excel
            </button>
          </div>

          {canEdit && (
            <button type="button" className="btn-primary text-sm" onClick={addRow} disabled={addingRow}>
              {addingRow ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add Row
            </button>
          )}
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="table-shell flex-1 flex flex-col items-center justify-center text-center px-6 py-16 min-h-[280px]">
          <div className="empty-state max-w-md border-solid">
            <div className="empty-state__icon text-2xl" aria-hidden>📭</div>
            <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>This table has no columns</p>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {rows.length > 0
                ? 'Older tables may have been created without the column builder. Create a new table from Data tables (columns are added automatically), or remove this table if it is empty.'
                : isAdmin
                  ? 'Create a new table from the workspace — the flow now adds at least one column so the grid always works.'
                  : 'Ask an admin to replace this table with one that includes columns.'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              <button type="button" className="btn-secondary text-sm" onClick={() => router.push('/tables')}>
                All tables
              </button>
              {isAdmin && rows.length === 0 && (
                <button type="button" className="btn-primary text-sm" style={{ background: '#ef4444' }}
                  onClick={async () => {
                    if (!confirm('Delete this table permanently?')) return;
                    const { error } = await supabase.from('dynamic_tables').delete().eq('id', id);
                    if (error) { toast.error('Could not delete'); return; }
                    toast.success('Table removed');
                    router.push('/tables');
                  }}>
                  Delete empty table
                </button>
              )}
            </div>
          </div>
        </div>
      ) : visibleColumns.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>All columns are hidden. Turn at least one column on from the Columns menu.</p>
      ) : (
        <div className="flex-1 min-h-0 table-shell" role="region" aria-label="Table data — scroll horizontally for more columns">
          <table className="data-table">
            <thead>
              <tr>
                <th className="data-table__rownum">#</th>
                {visibleColumns.map(col => (
                  <th key={col.id} className="data-table__col-heading">
                    <div className="col-heading-cell">
                      <div className="col-heading-top">
                        <span className="col-heading-type-icon" aria-hidden>{FIELD_TYPE_ICONS[col.field_type]}</span>
                        {editingHeaderId === col.id ? (
                          <input
                            ref={headerInputRef}
                            className="col-heading-input"
                            value={headerDraft}
                            onChange={e => setHeaderDraft(e.target.value)}
                            maxLength={120}
                            disabled={savingHeader}
                            aria-label={`Rename column, was ${col.name}`}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                ignoreHeaderBlurRef.current = true;
                                void saveRenameColumn(col.id, (e.target as HTMLInputElement).value);
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelRenameColumn();
                              }
                            }}
                            onBlur={e => {
                              if (ignoreHeaderBlurRef.current) {
                                ignoreHeaderBlurRef.current = false;
                                return;
                              }
                              void saveRenameColumn(col.id, e.currentTarget.value);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="col-heading-name-btn"
                            disabled={!isAdmin}
                            onClick={() => beginRenameColumn(col)}
                            title={isAdmin ? 'Rename column' : undefined}
                          >
                            <span className="col-heading-name">{col.name}</span>
                            {col.is_required && (
                              <span style={{ color: 'var(--accent)' }} aria-label="required">*</span>
                            )}
                            {isAdmin && <Pencil className="col-heading-edit-icon" size={12} strokeWidth={2} aria-hidden />}
                          </button>
                        )}
                      </div>
                      <span className="col-heading-type-label">{FIELD_TYPE_LABELS[col.field_type]}</span>
                    </div>
                  </th>
                ))}
                {canEdit && <th className="data-table__actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (canEdit ? 2 : 1)} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    {search ? 'No rows match your search.' : 'No rows yet. Click "Add Row" to get started.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id} className="group">
                    <td style={{ color: 'var(--text-secondary)', fontSize: '11px', textAlign: 'center', paddingLeft: '8px' }}>{idx + 1}</td>
                    {visibleColumns.map(col => (
                      <td key={col.id}>
                        <Cell
                          value={row.data[col.id]}
                          column={col}
                          editing={editing?.rowId === row.id && editing?.colId === col.id}
                          onEdit={() => canEdit && setEditing({ rowId: row.id, colId: col.id })}
                          onSave={val => saveCell(row.id, col.id, val)}
                          onBlur={() => setEditing(null)}
                          canEdit={canEdit}
                        />
                      </td>
                    ))}
                    {canEdit && (
                      <td>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" className="btn-ghost p-1" title="Duplicate" onClick={() => duplicateRow(row)}>
                            <Copy size={12} />
                          </button>
                          <button type="button" className="btn-ghost p-1" title="Delete" style={{ color: '#ef4444' }}
                            onClick={() => setDeleteRowId(row.id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteRowId && (
        <div className="modal-overlay">
          <div className="modal max-w-sm">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Delete Row?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setDeleteRowId(null)}>Cancel</button>
              <button type="button" className="btn-primary flex-1 justify-center" style={{ background: '#ef4444' }}
                onClick={() => deleteRow(deleteRowId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
