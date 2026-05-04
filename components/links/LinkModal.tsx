'use client';
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Link, LinkCategory } from '@/types';

const CATEGORIES: { value: LinkCategory; label: string }[] = [
  { value: 'repo', label: 'Repository' },
  { value: 'canva', label: 'Canva Design' },
  { value: 'figma', label: 'Figma File' },
  { value: 'docs', label: 'Document' },
  { value: 'video', label: 'Video / Recording' },
  { value: 'slides', label: 'Slides / Presentation' },
  { value: 'notion', label: 'Notion Page' },
  { value: 'discord', label: 'Discord Link' },
  { value: 'other', label: 'Other' },
];

interface LinkModalProps {
  link?: Link | null;
  onClose: () => void;
  onSave: (data: Partial<Link>) => Promise<void>;
}

export default function LinkModal({ link, onClose, onSave }: LinkModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<LinkCategory>('other');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (link) {
      setTitle(link.title);
      setUrl(link.url);
      setCategory(link.category);
      setDescription(link.description || '');
      setTags((link.tags || []).join(', '));
    }
  }, [link]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      title: title.trim(),
      url: url.trim(),
      category,
      description: description.trim() || null,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            {link ? 'Edit Link' : 'Add Link'}
          </h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="e.g. DW Fellowship Repo" value={title}
              onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label">URL *</label>
            <input className="input" type="url" placeholder="https://…" value={url}
              onChange={e => setUrl(e.target.value)} required />
          </div>
          <div>
            <label className="label">Category *</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value as LinkCategory)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Optional description…"
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label">Tags <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(comma separated)</span></label>
            <input className="input" placeholder="fellowship, dsa, 2026" value={tags}
              onChange={e => setTags(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Saving…' : link ? 'Save Changes' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
