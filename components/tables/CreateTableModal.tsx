'use client';
import { useEffect, useState } from 'react';
import { X, Trash2, GripVertical, Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import type { FieldType, MentorSelectionPayload, Profile, TableColumn } from '@/types';
import { DEFAULT_STATUS_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FIELD_TYPES: { type: FieldType; label: string; icon: string; desc: string }[] = [
  { type: 'text', label: 'Text', icon: 'T', desc: 'Short text' },
  { type: 'number', label: 'Number', icon: '#', desc: 'Numeric value' },
  { type: 'date', label: 'Date', icon: '📅', desc: 'Date picker' },
  { type: 'time', label: 'Time', icon: '⏰', desc: 'Time picker' },
  { type: 'datetime', label: 'Date & Time', icon: '🗓', desc: 'Datetime' },
  { type: 'status', label: 'Status', icon: '●', desc: 'Status badge' },
  { type: 'url', label: 'URL', icon: '🔗', desc: 'Link' },
  { type: 'checkbox', label: 'Checkbox', icon: '☑', desc: 'Toggle' },
  { type: 'person', label: 'Person', icon: '👤', desc: 'Name / person' },
  { type: 'longtext', label: 'Long Text', icon: '¶', desc: 'Multiline text' },
  { type: 'select', label: 'Select', icon: '▼', desc: 'Dropdown' },
  { type: 'email', label: 'Email', icon: '@', desc: 'Email address' },
  { type: 'phone', label: 'Phone', icon: '📞', desc: 'Phone number' },
  { type: 'mentor', label: 'Mentor', icon: '👥', desc: 'Mentor dropdown' },
];

const EMOJI_OPTIONS = ['📋', '📊', '📈', '📉', '🗂', '📁', '📝', '✅', '🎯', '🚀', '💡', '🔥', '⭐', '🏆', '👥', '🎓', '💼', '🛠', '📅', '🔗', '🌐', '📢', '🎉', '🧩'];

interface ColDraft extends Omit<TableColumn, 'id' | 'table_id' | 'created_at'> {
  localId: string;
}

interface SortableColProps {
  col: ColDraft;
  onRemove: () => void;
  onChange: (updates: Partial<ColDraft>) => void;
}

function SortableCol({ col, onRemove, onChange }: SortableColProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: col.localId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [showOptions, setShowOptions] = useState(false);
  const [newOption, setNewOption] = useState('');

  const addOption = () => {
    if (!newOption.trim()) return;
    const existing = col.options || [];
    const colors = ['#6b7280', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6', '#f97316', '#ec4899'];
    onChange({ options: [...existing, { label: newOption.trim(), color: colors[existing.length % colors.length] }] });
    setNewOption('');
  };

  return (
    <div ref={setNodeRef} style={{ ...style, borderColor: 'var(--border)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }} className="space-y-2">
      <div className="flex items-center gap-2">
        <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-0.5" style={{ color: 'var(--text-secondary)' }}>
          <GripVertical size={14} />
        </button>
        <input className="input flex-1 text-sm" style={{ height: '32px' }} value={col.name}
          onChange={e => onChange({ name: e.target.value })} placeholder="Column name" />
        <span className="text-xs px-2 py-1 rounded-md flex-shrink-0"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
          {FIELD_TYPES.find(f => f.type === col.field_type)?.label}
        </span>
        <label className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={col.is_required} onChange={e => onChange({ is_required: e.target.checked })}
            className="w-3 h-3 accent-[var(--accent)]" />
          Req.
        </label>
        {(col.field_type === 'status' || col.field_type === 'select') && (
          <button className="btn-ghost p-1 text-xs flex-shrink-0" onClick={() => setShowOptions(!showOptions)}
            style={{ color: 'var(--accent)' }}>
            Options
          </button>
        )}
        <button className="btn-ghost p-1 flex-shrink-0" onClick={onRemove} style={{ color: '#ef4444' }}>
          <Trash2 size={13} />
        </button>
      </div>

      {showOptions && (col.field_type === 'status' || col.field_type === 'select') && (
        <div className="ml-6 space-y-1.5 pt-1">
          {(col.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: opt.color }} />
              <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
              <button className="text-xs" style={{ color: '#ef4444' }}
                onClick={() => onChange({ options: (col.options || []).filter((_, j) => j !== i) })}>
                ×
              </button>
            </div>
          ))}
          <div className="flex gap-1">
            <input className="input flex-1 text-xs" style={{ height: '28px' }} placeholder="Add option…"
              value={newOption} onChange={e => setNewOption(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} />
            <button className="btn-ghost px-2 text-xs" onClick={addOption} style={{ color: 'var(--accent)' }}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateTableModalProps {
  onClose: () => void;
  onCreated: (tableId: string) => void;
  onCreate: (
    name: string,
    icon: string,
    description: string,
    columns: ColDraft[],
    mentors: MentorSelectionPayload
  ) => Promise<string>;
}

function profileOptionLabel(p: Pick<Profile, 'full_name' | 'email'>) {
  return (p.full_name && p.full_name.trim()) || p.email;
}

export default function CreateTableModal({ onClose, onCreate }: CreateTableModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📋');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState<ColDraft[]>([]);
  const [mentorPick, setMentorPick] = useState<string[]>(['', '']);
  const [profiles, setProfiles] = useState<Pick<Profile, 'id' | 'email' | 'full_name'>[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('profiles').select('id, email, full_name').order('full_name');
      if (!cancelled) setProfiles(data || []);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addColumn = (type: FieldType) => {
    const col: ColDraft = {
      localId: crypto.randomUUID(),
      name: FIELD_TYPES.find(f => f.type === type)?.label || 'Column',
      field_type: type,
      position: columns.length,
      is_required: false,
      options: (type === 'status') ? [...DEFAULT_STATUS_OPTIONS] : (type === 'select') ? [] : null,
    };
    setColumns(prev => [...prev, col]);
  };

  const updateCol = (localId: string, updates: Partial<ColDraft>) => {
    setColumns(prev => prev.map(c => c.localId === localId ? { ...c, ...updates } : c));
  };

  const removeCol = (localId: string) => {
    setColumns(prev => prev.filter(c => c.localId !== localId));
  };

  const handleDragEnd = (event: { active: { id: string }; over: { id: string } | null }) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns(items => {
        const oldIndex = items.findIndex(i => i.localId === active.id);
        const newIndex = items.findIndex(i => i.localId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const picks = mentorPick.filter((pid): pid is string => Boolean(pid));
    if (new Set(picks).size !== picks.length) {
      toast.error('Choose a different mentor for each slot');
      return;
    }
    const mentors: MentorSelectionPayload = {
      slotCount: picks.length,
      profileIds: picks,
    };
    setSaving(true);
    await onCreate(
      name.trim(),
      icon,
      description.trim(),
      columns.map((c, i) => ({ ...c, position: i })),
      mentors
    );
    setSaving(false);
  };

  const setMentorAt = (index: number, value: string) => {
    setMentorPick(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addMentorField = () => {
    setMentorPick(prev => [...prev, '']);
  };

  const removeMentorField = (index: number) => {
    setMentorPick(prev => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button className="btn-ghost p-1.5" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={16} />
              </button>
            )}
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              {step === 1 ? 'Details' : step === 2 ? 'Responsible mentors' : step === 3 ? 'Define columns' : 'Review & create'}
            </h2>
          </div>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-1 mb-5">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: s <= step ? 'var(--accent)' : 'var(--border)' }} />
          ))}
        </div>

        {/* Step 1: Name & Icon */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="label">Table Name *</label>
              <input className="input" placeholder="e.g. AI Engineering Sessions"
                value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Icon</label>
              <div className="grid grid-cols-12 gap-1">
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => setIcon(e)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors',
                      icon === e ? 'ring-2 ring-[var(--accent)]' : 'hover:bg-[var(--bg-hover)]'
                    )}
                    style={{ background: icon === e ? 'var(--accent-soft)' : undefined }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Description <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span></label>
              <textarea className="input resize-none" rows={2} placeholder="What is this table for?"
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" disabled={!name.trim()} onClick={() => setStep(2)}>
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Mentors */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Pick as many workspace members as needed for this sheet. They must already have a Hub account (invite them under Settings → Members first).
            </p>
            {mentorPick.map((pid, slotIdx) => (
              <div key={slotIdx}>
                <label className="label" htmlFor={`mentor-${slotIdx}`}>Mentor {slotIdx + 1}</label>
                <div className="flex gap-2">
                  <select
                    id={`mentor-${slotIdx}`}
                    className="input"
                    value={pid}
                    onChange={e => setMentorAt(slotIdx, e.target.value)}
                  >
                    <option value="">— Optional —</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{profileOptionLabel(p)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => removeMentorField(slotIdx)}
                    aria-label={`Remove mentor slot ${slotIdx + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn-secondary text-sm" onClick={addMentorField}>
              <Plus size={14} /> Add mentor
            </button>
            <div className="flex gap-2 pt-1">
              <button className="btn-secondary flex-1" type="button" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary flex-1 justify-center" type="button" onClick={() => setStep(3)}>
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Define Columns */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="label mb-2">Add Columns</label>
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {FIELD_TYPES.map(ft => (
                  <button key={ft.type} onClick={() => addColumn(ft.type)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs border transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    <span className="font-mono font-bold w-4 text-center" style={{ color: 'var(--accent)' }}>{ft.icon}</span>
                    {ft.label}
                  </button>
                ))}
              </div>
            </div>

            {columns.length > 0 && (
              <div>
                <label className="label mb-2">Columns ({columns.length})</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd as never}>
                    <SortableContext items={columns.map(c => c.localId)} strategy={verticalListSortingStrategy}>
                      {columns.map(col => (
                        <div key={col.localId} className="border rounded-lg p-3 space-y-2"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                          <SortableCol col={col} onRemove={() => removeCol(col.localId)} onChange={u => updateCol(col.localId, u)} />
                        </div>
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button className="btn-secondary flex-1" type="button" onClick={() => setStep(2)}>Back</button>
              <button className="btn-primary flex-1 justify-center" type="button" onClick={() => setStep(4)}>
                Review <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="border rounded-xl p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
                  {description && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
                </div>
              </div>
              <div>
                <p className="text-xs mb-1 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Responsible mentors
                </p>
                <ul className="text-sm space-y-0.5" style={{ color: 'var(--text-primary)' }}>
                  {mentorPick.every(id => !id) ? (
                    <li style={{ color: 'var(--text-secondary)' }}>None chosen — you can assign mentors on this table page later.</li>
                  ) : (
                    mentorPick.map((pid, i) => {
                      const p = profiles.find(x => x.id === pid);
                      return (
                        <li key={i}>{pid && p ? profileOptionLabel(p) : `Slot ${i + 1}: —`}</li>
                      );
                    })
                  )}
                </ul>
              </div>
              {columns.length > 0 ? (
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{columns.length} column{columns.length !== 1 ? 's' : ''}:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {columns.map(c => (
                      <span key={c.localId} className="text-xs px-2 py-1 rounded-md"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                        {c.name}
                        {c.is_required && <span style={{ color: 'var(--accent)' }}> *</span>}
                        <span style={{ color: 'var(--text-secondary)' }}> ({FIELD_TYPES.find(f => f.type === c.field_type)?.label})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  No columns in the builder — a default <strong style={{ color: 'var(--text-primary)' }}>Title</strong> text column will be created so the table opens with a proper grid.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary flex-1" type="button" onClick={() => setStep(3)}>Back</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : '✨'}
                {saving ? 'Creating…' : 'Create Table'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
