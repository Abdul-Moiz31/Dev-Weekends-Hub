'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { EmailTemplate, EmailTemplateKey } from '@/types';
import {
  EMAIL_TEMPLATE_KEYS,
  EMAIL_TEMPLATE_NAME,
  EMAIL_TEMPLATE_DESCRIPTION,
  defaultTemplateForKey,
} from '@/lib/email/template-presets';

export default function TemplatesPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<EmailTemplateKey>('invite_editor');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .in('key', EMAIL_TEMPLATE_KEYS)
        .order('key');
      if (error) toast.error('Could not load templates');
      setTemplates((data || []) as EmailTemplate[]);
      setLoading(false);
    };
    void load();
  }, [isAdmin, supabase]);

  useEffect(() => {
    if (!isAdmin) return;
    const fromDb = templates.find(t => t.key === selectedTemplateKey);
    if (fromDb) {
      setTemplateSubject(fromDb.subject);
      setTemplateHtml(fromDb.html);
      return;
    }
    const fallback = defaultTemplateForKey(selectedTemplateKey, window.location.origin);
    setTemplateSubject(fallback.subject);
    setTemplateHtml(fallback.html);
  }, [isAdmin, selectedTemplateKey, templates]);

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!templateSubject.trim() || !templateHtml.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    setSaving(true);
    const existing = templates.find(t => t.key === selectedTemplateKey);
    const payload = {
      key: selectedTemplateKey,
      category: selectedTemplateKey.startsWith('invite_') ? 'invite' : 'mentor',
      name: EMAIL_TEMPLATE_NAME[selectedTemplateKey],
      description: EMAIL_TEMPLATE_DESCRIPTION[selectedTemplateKey],
      subject: templateSubject.trim(),
      html: templateHtml,
      updated_at: new Date().toISOString(),
      created_by: profile?.id ?? null,
    };
    const query = existing
      ? supabase.from('email_templates').update(payload).eq('id', existing.id)
      : supabase.from('email_templates').insert(payload);
    const { error } = await query;
    if (error) {
      toast.error(error.message || 'Could not save template');
      setSaving(false);
      return;
    }
    const { data } = await supabase.from('email_templates').select('*').in('key', EMAIL_TEMPLATE_KEYS);
    setTemplates((data || []) as EmailTemplate[]);
    toast.success('Template saved');
    setSaving(false);
  };

  const resetTemplate = () => {
    const fallback = defaultTemplateForKey(selectedTemplateKey, window.location.origin);
    setTemplateSubject(fallback.subject);
    setTemplateHtml(fallback.html);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto surface-card p-8 text-center">
        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Admin only</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          Only admins can view and edit email templates.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Workspace</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Templates</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Edit templates in plain English. Placeholders supported: {'{{recipient_name}}'}, {'{{temporary_password}}'}, {'{{login_url}}'}, {'{{table_name}}'}, {'{{triggered_by}}'}, {'{{table_url}}'}.
        </p>
      </header>

      <section className="surface-card p-6 sm:p-7">
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 size={16} className="animate-spin" /> Loading templates...
          </div>
        ) : (
          <form className="space-y-4" onSubmit={saveTemplate}>
            <div>
              <label className="label" htmlFor="template-key">Template</label>
              <select
                id="template-key"
                className="input max-w-sm"
                value={selectedTemplateKey}
                onChange={e => setSelectedTemplateKey(e.target.value as EmailTemplateKey)}
              >
                {EMAIL_TEMPLATE_KEYS.map(key => (
                  <option key={key} value={key}>{EMAIL_TEMPLATE_NAME[key]}</option>
                ))}
              </select>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                {EMAIL_TEMPLATE_DESCRIPTION[selectedTemplateKey]}
              </p>
            </div>

            <div>
              <label className="label" htmlFor="template-subject">Subject</label>
              <input
                id="template-subject"
                className="input"
                value={templateSubject}
                onChange={e => setTemplateSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="template-body">Email body</label>
              <textarea
                id="template-body"
                className="input min-h-[260px] leading-relaxed"
                value={templateHtml}
                onChange={e => setTemplateHtml(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save template'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetTemplate}>
                Reset to default
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
