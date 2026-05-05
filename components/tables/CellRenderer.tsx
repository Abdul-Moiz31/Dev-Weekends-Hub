'use client';
import { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import type { TableColumn } from '@/types';
import { formatDate, formatDateTime, formatTimeDisplay, truncateUrl } from '@/lib/utils';

function urlDisplayName(raw: string) {
  try {
    const u = new URL(raw);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return u.hostname.replace(/^www\./, '');
    const last = parts[parts.length - 1].replace(/[-_]+/g, ' ');
    return last.charAt(0).toUpperCase() + last.slice(1);
  } catch {
    return truncateUrl(raw, 30);
  }
}

function StatusBadge({ value, options }: { value: string; options: { label: string; color: string }[] }) {
  const opt = options.find(o => o.label === value);
  const color = opt?.color || '#6b7280';
  return (
    <span className="status-badge" style={{ background: color + '20', color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {value || '—'}
    </span>
  );
}

interface CellProps {
  value: unknown;
  column: TableColumn;
  editing: boolean;
  onEdit: () => void;
  onSave: (val: unknown) => void;
  onBlur: () => void;
  canEdit: boolean;
}

export default function Cell({ value, column, editing, onEdit, onSave, onBlur, canEdit }: CellProps) {
  const [draft, setDraft] = useState<unknown>(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const handleBlur = () => { onSave(draft); onBlur(); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && column.field_type !== 'longtext') { handleBlur(); }
    if (e.key === 'Escape') { setDraft(value); onBlur(); }
  };

  const inputStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--accent)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    padding: '3px 6px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  if (editing && canEdit) {
    if (column.field_type === 'checkbox') {
      return (
        <input type="checkbox" checked={!!draft} className="w-4 h-4 accent-[var(--accent)]"
          onChange={e => { onSave(e.target.checked); onBlur(); }} autoFocus />
      );
    }
    if (column.field_type === 'status' || column.field_type === 'select' || column.field_type === 'mentor') {
      return (
        <select ref={inputRef as React.RefObject<HTMLSelectElement>} value={draft as string || ''} style={inputStyle}
          onChange={e => setDraft(e.target.value)} onBlur={handleBlur}>
          <option value="">— None —</option>
          {(column.options || []).map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
        </select>
      );
    }
    if (column.field_type === 'longtext') {
      return (
        <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={draft as string || ''} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
          onChange={e => setDraft(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown} rows={2} />
      );
    }
    const inputType = column.field_type === 'date' ? 'date'
      : column.field_type === 'time' ? 'time'
      : column.field_type === 'datetime' ? 'datetime-local'
      : column.field_type === 'number' ? 'number'
      : column.field_type === 'email' ? 'email'
      : column.field_type === 'url' ? 'url'
      : 'text';
    return (
      <input ref={inputRef as React.RefObject<HTMLInputElement>} type={inputType} value={draft as string || ''} style={inputStyle}
        onChange={e => setDraft(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown} />
    );
  }

  // Display mode
  const displayStyle: React.CSSProperties = {
    cursor: canEdit ? 'text' : 'default',
    minHeight: '24px',
    display: 'block',
    width: '100%',
  };

  if (column.field_type === 'checkbox') {
    return (
      <div onClick={canEdit ? onEdit : undefined} style={{ cursor: canEdit ? 'pointer' : 'default' }}>
        <input type="checkbox" checked={!!value} readOnly className="w-4 h-4 accent-[var(--accent)]" />
      </div>
    );
  }
  if (column.field_type === 'status' || column.field_type === 'select' || column.field_type === 'mentor') {
    return (
      <div onClick={canEdit ? onEdit : undefined} style={{ cursor: canEdit ? 'pointer' : 'default' }}>
        {value ? (
          <StatusBadge value={value as string} options={column.options || []} />
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{canEdit ? 'Set status…' : '—'}</span>
        )}
      </div>
    );
  }
  if (column.field_type === 'url' && value) {
    return (
      <div className="flex items-center gap-1" onClick={canEdit ? onEdit : undefined}>
        <a href={value as string} target="_blank" rel="noopener noreferrer"
          className="text-[var(--accent)] flex items-center gap-1 hover:underline text-xs"
          onClick={e => e.stopPropagation()}>
          {urlDisplayName(value as string)} <ExternalLink size={11} />
        </a>
      </div>
    );
  }
  if (column.field_type === 'email' && value) {
    return (
      <div onClick={canEdit ? onEdit : undefined} style={displayStyle}>
        <a href={`mailto:${value}`} className="text-[var(--accent)] hover:underline text-xs"
          onClick={e => e.stopPropagation()}>{value as string}</a>
      </div>
    );
  }
  if (column.field_type === 'phone' && value) {
    return (
      <div onClick={canEdit ? onEdit : undefined} style={displayStyle}>
        <a href={`tel:${value}`} className="text-[var(--accent)] hover:underline text-xs"
          onClick={e => e.stopPropagation()}>{value as string}</a>
      </div>
    );
  }
  if (column.field_type === 'date' && value) {
    return <div style={displayStyle} onClick={canEdit ? onEdit : undefined}>{formatDate(value as string)}</div>;
  }
  if (column.field_type === 'time' && value) {
    return (
      <div style={displayStyle} onClick={canEdit ? onEdit : undefined}>
        {formatTimeDisplay(String(value))}
      </div>
    );
  }
  if (column.field_type === 'datetime' && value) {
    return (
      <div style={displayStyle} onClick={canEdit ? onEdit : undefined}>
        {formatDateTime(value as string)}
      </div>
    );
  }
  if (column.field_type === 'number' && value !== null && value !== undefined && value !== '') {
    return <div style={{ ...displayStyle, textAlign: 'right' }} onClick={canEdit ? onEdit : undefined}>{Number(value).toLocaleString()}</div>;
  }

  return (
    <div style={displayStyle} onClick={canEdit ? onEdit : undefined}
      className={!value ? 'text-[var(--text-secondary)]' : ''}>
      {value as string || <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>—</span>}
    </div>
  );
}
