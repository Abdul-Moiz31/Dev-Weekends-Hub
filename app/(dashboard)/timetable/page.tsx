'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/activity';
import { toast } from 'sonner';
import { CalendarDays, Clock3, ExternalLink, Loader2, Pencil, Plus, Trash2, User } from 'lucide-react';
import type { TableRow } from '@/types';

const TIMETABLE_MARKER = '__system:dervikims_timetable_v1__';

const DAY_OPTIONS = [
  { value: 'Monday', color: '#3b82f6' },
  { value: 'Tuesday', color: '#8b5cf6' },
  { value: 'Wednesday', color: '#06b6d4' },
  { value: 'Thursday', color: '#f59e0b' },
  { value: 'Friday', color: '#10b981' },
  { value: 'Saturday', color: '#ef4444' },
  { value: 'Sunday', color: '#6b7280' },
] as const;

type Day = (typeof DAY_OPTIONS)[number]['value'];

type ColKey = 'day' | 'time' | 'session' | 'link' | 'mentor' | 'notes';

type ColMap = Record<ColKey, string>;

type TimetableForm = {
  id?: string;
  day: Day;
  time: string;
  session: string;
  link: string;
  mentor: string;
  notes: string;
};

const DEFAULT_FORM: TimetableForm = {
  day: 'Monday',
  time: '',
  session: '',
  link: '',
  mentor: '',
  notes: '',
};

const REQUIRED_COLUMNS: {
  key: ColKey;
  name: string;
  field_type: string;
  is_required: boolean;
  options: { label: string; color: string }[] | null;
}[] = [
  {
    key: 'day',
    name: 'Day',
    field_type: 'select',
    is_required: true,
    options: DAY_OPTIONS.map((d) => ({ label: d.value, color: d.color })),
  },
  { key: 'time', name: 'Time', field_type: 'time', is_required: true, options: null },
  { key: 'session', name: 'Session', field_type: 'text', is_required: true, options: null },
  { key: 'link', name: 'Meeting Link', field_type: 'url', is_required: true, options: null },
  { key: 'mentor', name: 'Mentor', field_type: 'person', is_required: false, options: null },
  { key: 'notes', name: 'Notes', field_type: 'longtext', is_required: false, options: null },
];

function toTimeLabel(value: string) {
  if (!value) return '—';
  const date = new Date(`1970-01-01T${value}`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dayIndex(day: string) {
  const idx = DAY_OPTIONS.findIndex((d) => d.value === day);
  return idx === -1 ? 99 : idx;
}

function sortRows(rows: TableRow[], cols: ColMap) {
  return [...rows].sort((a, b) => {
    const aDay = String(a.data[cols.day] || '');
    const bDay = String(b.data[cols.day] || '');
    const dayDiff = dayIndex(aDay) - dayIndex(bDay);
    if (dayDiff !== 0) return dayDiff;
    const aTime = String(a.data[cols.time] || '');
    const bTime = String(b.data[cols.time] || '');
    return aTime.localeCompare(bTime);
  });
}

export default function TimetablePage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'editor';

  const [loading, setLoading] = useState(true);
  const [tableId, setTableId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColMap | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<TimetableForm>(DEFAULT_FORM);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    const { data: tables, error: tableError } = await supabase
      .from('dynamic_tables')
      .select('id, name, description')
      .eq('description', TIMETABLE_MARKER)
      .limit(1);

    if (tableError) {
      toast.error('Could not load timetable');
      setLoading(false);
      return;
    }

    let localTableId = tables?.[0]?.id || null;
    if (!localTableId) {
      if (!canEdit) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: newTable, error: createTableError } = await supabase
        .from('dynamic_tables')
        .insert({
          name: 'DSA Mentorship Timetable',
          icon: '🗓️',
          description: TIMETABLE_MARKER,
          created_by: user?.id,
        })
        .select('id')
        .single();

      if (createTableError || !newTable) {
        toast.error('Could not create timetable');
        setLoading(false);
        return;
      }
      localTableId = newTable.id;
    }

    const { data: existingCols, error: colLoadError } = await supabase
      .from('table_columns')
      .select('id, name, position')
      .eq('table_id', localTableId)
      .order('position', { ascending: true });

    if (colLoadError) {
      toast.error('Could not load timetable columns');
      setLoading(false);
      return;
    }

    const currentCols = existingCols || [];
    const existingByName = new Map(currentCols.map((c) => [c.name.toLowerCase(), c.id]));
    const missing = REQUIRED_COLUMNS.filter((c) => !existingByName.has(c.name.toLowerCase()));

    if (missing.length > 0 && canEdit) {
      const { error: colCreateError } = await supabase.from('table_columns').insert(
        missing.map((c, i) => ({
          table_id: localTableId,
          name: c.name,
          field_type: c.field_type,
          position: currentCols.length + i,
          is_required: c.is_required,
          options: c.options,
        }))
      );
      if (colCreateError) {
        toast.error('Could not initialize timetable columns');
        setLoading(false);
        return;
      }
    }

    const { data: resolvedCols, error: resolvedColError } = await supabase
      .from('table_columns')
      .select('id, name')
      .eq('table_id', localTableId);

    if (resolvedColError || !resolvedCols) {
      toast.error('Could not resolve timetable columns');
      setLoading(false);
      return;
    }

    const byName = new Map(resolvedCols.map((c) => [c.name.toLowerCase(), c.id]));
    const map: Partial<ColMap> = {
      day: byName.get('day'),
      time: byName.get('time'),
      session: byName.get('session'),
      link: byName.get('meeting link'),
      mentor: byName.get('mentor'),
      notes: byName.get('notes'),
    };

    if (!map.day || !map.time || !map.session || !map.link || !map.mentor || !map.notes) {
      toast.error('Timetable setup is incomplete');
      setLoading(false);
      return;
    }

    const colMap = map as ColMap;
    setColumns(colMap);
    setTableId(localTableId);

    const { data: rowData, error: rowError } = await supabase
      .from('table_rows')
      .select('*')
      .eq('table_id', localTableId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (rowError) {
      toast.error('Could not load timetable rows');
      setLoading(false);
      return;
    }

    setRows((rowData || []) as TableRow[]);
    setLoading(false);
  }, [canEdit, supabase]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!tableId) return;
    const channel = supabase
      .channel(`timetable-${tableId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_rows', filter: `table_id=eq.${tableId}` },
        () => {
          void bootstrap();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bootstrap, supabase, tableId]);

  const sorted = useMemo(() => {
    if (!columns) return [];
    return sortRows(rows, columns);
  }, [columns, rows]);

  const grouped = useMemo(() => {
    if (!columns) return [] as { day: Day; items: TableRow[] }[];
    return DAY_OPTIONS.map((d) => ({
      day: d.value,
      items: sorted.filter((r) => String(r.data[columns.day] || '') === d.value),
    })).filter((g) => g.items.length > 0);
  }, [columns, sorted]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setShowForm(false);
  };

  const openForEdit = (row: TableRow) => {
    if (!columns) return;
    setForm({
      id: row.id,
      day: (row.data[columns.day] as Day) || 'Monday',
      time: String(row.data[columns.time] || ''),
      session: String(row.data[columns.session] || ''),
      link: String(row.data[columns.link] || ''),
      mentor: String(row.data[columns.mentor] || ''),
      notes: String(row.data[columns.notes] || ''),
    });
    setShowForm(true);
  };

  const saveSession = async () => {
    if (!columns || !tableId) return;
    if (!form.session.trim()) {
      toast.error('Session title is required');
      return;
    }
    if (!form.time.trim()) {
      toast.error('Session time is required');
      return;
    }
    if (!form.link.trim()) {
      toast.error('Meeting link is required');
      return;
    }
    try {
      new URL(form.link);
    } catch {
      toast.error('Meeting link must be a valid URL');
      return;
    }

    setSaving(true);
    const payload = {
      [columns.day]: form.day,
      [columns.time]: form.time,
      [columns.session]: form.session.trim(),
      [columns.link]: form.link.trim(),
      [columns.mentor]: form.mentor.trim(),
      [columns.notes]: form.notes.trim(),
    };

    if (form.id) {
      const { error } = await supabase
        .from('table_rows')
        .update({ data: payload, updated_at: new Date().toISOString() })
        .eq('id', form.id);
      if (error) {
        toast.error('Could not update session');
        setSaving(false);
        return;
      }
      await logActivity('edited_row', 'row', form.id, 'DSA Mentorship Timetable');
      toast.success('Session updated');
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from('table_rows').insert({
        table_id: tableId,
        data: payload,
        position: rows.length,
        created_by: user?.id,
      });
      if (error) {
        toast.error('Could not add session');
        setSaving(false);
        return;
      }
      await logActivity('added_row', 'row', undefined, 'DSA Mentorship Timetable');
      toast.success('Session added');
    }
    setSaving(false);
    resetForm();
    await bootstrap();
  };

  const deleteSession = async (rowId: string) => {
    setDeleting(rowId);
    const { error } = await supabase.from('table_rows').delete().eq('id', rowId);
    if (error) toast.error('Could not delete session');
    else {
      await logActivity('deleted_row', 'row', rowId, 'DSA Mentorship Timetable');
      toast.success('Session deleted');
      await bootstrap();
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    );
  }

  if (!tableId || !columns) {
    return (
      <div className="max-w-xl mx-auto empty-state py-14">
        <div className="empty-state__icon text-2xl" aria-hidden>
          🗓️
        </div>
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Timetable is not available yet
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Ask an editor/admin to open this page once so the timetable can be initialized.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
            Dervikims
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CalendarDays size={26} /> Mentorship timetable
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Weekly DSA sessions with day, time, mentor, and meeting link in one place.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn-primary self-start sm:self-auto"
            onClick={() => {
              setForm(DEFAULT_FORM);
              setShowForm(true);
            }}
          >
            <Plus size={16} /> Add session
          </button>
        )}
      </header>

      {grouped.length === 0 ? (
        <div className="empty-state py-16 max-w-xl mx-auto">
          <div className="empty-state__icon text-2xl" aria-hidden>
            📭
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            No sessions scheduled
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Add your weekly mentorship sessions and links so everyone can find them quickly.
          </p>
          {canEdit && (
            <button
              type="button"
              className="btn-primary text-sm mt-5"
              onClick={() => {
                setForm(DEFAULT_FORM);
                setShowForm(true);
              }}
            >
              <Plus size={15} /> Add first session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.day} className="surface-card p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="status-badge text-xs"
                  style={{
                    background: `${DAY_OPTIONS.find((d) => d.value === group.day)?.color || '#6b7280'}22`,
                    color: DAY_OPTIONS.find((d) => d.value === group.day)?.color || '#6b7280',
                  }}
                >
                  {group.day}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {group.items.length} session{group.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2.5">
                {group.items.map((row) => {
                  const session = String(row.data[columns.session] || '');
                  const time = String(row.data[columns.time] || '');
                  const link = String(row.data[columns.link] || '');
                  const mentor = String(row.data[columns.mentor] || '');
                  const notes = String(row.data[columns.notes] || '');
                  return (
                    <article
                      key={row.id}
                      className="rounded-xl border p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
                    >
                      <div className="space-y-2 min-w-0">
                        <p className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                          {session}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="status-badge">
                            <Clock3 size={11} /> {toTimeLabel(time)}
                          </span>
                          {mentor && (
                            <span className="status-badge">
                              <User size={11} /> {mentor}
                            </span>
                          )}
                        </div>
                        {notes && (
                          <p className="text-xs leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
                            {notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-start">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-2.5 py-1.5">
                          <ExternalLink size={13} /> Open link
                        </a>
                        {canEdit && (
                          <>
                            <button type="button" className="btn-ghost p-2" onClick={() => openForEdit(row)} title="Edit session">
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-ghost p-2"
                              onClick={() => deleteSession(row.id)}
                              title="Delete session"
                              style={{ color: '#ef4444' }}
                              disabled={deleting === row.id}
                            >
                              {deleting === row.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && resetForm()}>
          <div className="modal max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                {form.id ? 'Edit session' : 'Add session'}
              </h2>
              <button type="button" className="btn-ghost p-1.5" onClick={resetForm}>
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Day *</label>
                <select
                  className="input"
                  value={form.day}
                  onChange={(e) => setForm((prev) => ({ ...prev, day: e.target.value as Day }))}
                >
                  {DAY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Time *</label>
                <input
                  className="input"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Session title *</label>
                <input
                  className="input"
                  placeholder="e.g. Dynamic Programming - Problem Solving"
                  value={form.session}
                  onChange={(e) => setForm((prev) => ({ ...prev, session: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Meeting link *</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://..."
                  value={form.link}
                  onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Mentor</label>
                <input
                  className="input"
                  placeholder="e.g. Muhammad Junaid"
                  value={form.mentor}
                  onChange={(e) => setForm((prev) => ({ ...prev, mentor: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notes</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Optional context for this session..."
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" className="btn-secondary flex-1" onClick={resetForm}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1 justify-center" onClick={saveSession} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? 'Saving...' : form.id ? 'Save changes' : 'Add session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
