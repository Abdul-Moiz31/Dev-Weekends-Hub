'use client';
import { ExternalLink, Edit2, Trash2, GitBranch, FileText, Video, Presentation, MessageSquare, Palette, PenTool, Link as LinkIcon } from 'lucide-react';
import type { Link, LinkCategory } from '@/types';
import { timeAgo, truncateUrl, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const CATEGORY_ICONS: Record<LinkCategory, React.ReactNode> = {
  repo: <GitBranch size={16} />,
  canva: <Palette size={16} />,
  figma: <PenTool size={16} />,
  docs: <FileText size={16} />,
  video: <Video size={16} />,
  slides: <Presentation size={16} />,
  notion: <FileText size={16} />,
  discord: <MessageSquare size={16} />,
  other: <LinkIcon size={16} />,
};

const CATEGORY_COLORS: Record<LinkCategory, string> = {
  repo: '#6366f1',
  canva: '#f97316',
  figma: '#ec4899',
  docs: '#3b82f6',
  video: '#ef4444',
  slides: '#f59e0b',
  notion: '#a0a0b0',
  discord: '#5865f2',
  other: '#6b7280',
};

interface LinkCardProps {
  link: Link;
  onEdit: (link: Link) => void;
  onDelete: (id: string) => void;
  variant?: 'grid' | 'list';
}

export default function LinkCard({ link, onEdit, onDelete, variant = 'grid' }: LinkCardProps) {
  const { profile } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'editor';
  const color = CATEGORY_COLORS[link.category];
  const isList = variant === 'list';

  const iconBox = (
    <div
      className={cn('rounded-xl flex items-center justify-center flex-shrink-0', isList ? 'w-10 h-10' : 'w-9 h-9')}
      style={{ background: color + '22', color }}
    >
      {CATEGORY_ICONS[link.category]}
    </div>
  );

  const actions = (
    <div className={cn('flex items-center gap-0.5 flex-shrink-0', !isList && 'opacity-0 group-hover:opacity-100 transition-opacity')}>
      {canEdit && (
        <>
          <button type="button" className="btn-ghost p-2 rounded-lg" onClick={() => onEdit(link)} title="Edit">
            <Edit2 size={14} />
          </button>
          <button type="button" className="btn-ghost p-2 rounded-lg" onClick={() => onDelete(link.id)} title="Delete" style={{ color: '#ef4444' }}>
            <Trash2 size={14} />
          </button>
        </>
      )}
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2 rounded-lg" title="Open in new tab">
        <ExternalLink size={14} />
      </a>
    </div>
  );

  if (isList) {
    return (
      <div className="link-card link-card--list">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {iconBox}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate tracking-tight" style={{ color: 'var(--text-primary)' }}>{link.title}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>{truncateUrl(link.url)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap pl-[52px] sm:pl-0 sm:flex-1 sm:justify-end">
          {(link.tags || []).slice(0, 4).map(tag => (
            <span key={tag} className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              {tag}
            </span>
          ))}
          <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{timeAgo(link.created_at)}</span>
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div className="link-card group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          {iconBox}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-snug" style={{ color: 'var(--text-primary)' }}>{link.title}</p>
            <p className="text-xs truncate mt-1" style={{ color: 'var(--text-secondary)' }}>{truncateUrl(link.url)}</p>
          </div>
        </div>
        {actions}
      </div>

      {link.description && (
        <p className="text-xs line-clamp-2 leading-relaxed pl-[3.25rem]" style={{ color: 'var(--text-secondary)' }}>{link.description}</p>
      )}

      <div className="flex items-end justify-between gap-2 mt-auto pt-1 pl-[3.25rem]">
        <div className="flex flex-wrap gap-1">
          {(link.tags || []).slice(0, 4).map(tag => (
            <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              {tag}
            </span>
          ))}
        </div>
        <span className="text-[11px] font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{timeAgo(link.created_at)}</span>
      </div>
    </div>
  );
}
