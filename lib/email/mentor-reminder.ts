import { getAppBaseUrl, sendResendHtml } from '@/lib/email/resend-send';
import { defaultTemplateForKey, renderTemplate } from '@/lib/email/template-presets';
import type { EmailTemplateKey } from '@/types';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendTableMentorReminder(params: {
  to: string;
  mentorName: string;
  tableName: string;
  triggeredByName: string;
  tableUrl: string;
  templateKey?: 'mentor_reminder_default' | 'mentor_added_default';
  subjectTemplate?: string;
  htmlTemplate?: string;
}) {
  const base = getAppBaseUrl();
  const key: EmailTemplateKey = params.templateKey || 'mentor_reminder_default';
  const fallback = defaultTemplateForKey(key, base);
  const subjectTemplate = params.subjectTemplate || fallback.subject;
  const htmlTemplate = params.htmlTemplate || fallback.html;
  const vars = {
    recipient_name: escapeHtml(params.mentorName),
    table_name: escapeHtml(params.tableName),
    triggered_by: escapeHtml(params.triggeredByName),
    table_url: escapeHtml(params.tableUrl),
  };

  return sendResendHtml({
    to: params.to,
    subject: renderTemplate(subjectTemplate, vars),
    html: renderTemplate(htmlTemplate, vars),
  });
}

export function tableAbsoluteUrl(tableId: string) {
  const base = getAppBaseUrl();
  return `${base}/tables/${tableId}`;
}
