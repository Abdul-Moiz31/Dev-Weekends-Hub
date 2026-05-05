import { getAppBaseUrl, sendResendHtml, type EmailSendResult } from '@/lib/email/resend-send';
import { defaultTemplateForKey, renderTemplate } from '@/lib/email/template-presets';
import type { EmailTemplateKey } from '@/types';

export type InviteEmailResult =
  | { sent: true }
  | { sent: false; reason: 'missing_smtp_config' | 'smtp_error'; detail?: string };

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendInviteCredentialsEmail(params: {
  to: string;
  temporaryPassword: string;
  role: 'admin' | 'editor' | 'viewer';
  inviteeName?: string;
  subjectTemplate?: string;
  htmlTemplate?: string;
}): Promise<InviteEmailResult> {
  const base = getAppBaseUrl();
  const templateKey: EmailTemplateKey = `invite_${params.role}`;
  const fallback = defaultTemplateForKey(templateKey, base);
  const subjectTemplate = params.subjectTemplate || fallback.subject;
  const htmlTemplate = params.htmlTemplate || fallback.html;
  const vars = {
    recipient_name: escapeHtml(params.inviteeName || 'there'),
    temporary_password: escapeHtml(params.temporaryPassword),
    login_url: `${base}/login`,
  };

  const r: EmailSendResult = await sendResendHtml({
    to: params.to,
    subject: renderTemplate(subjectTemplate, vars),
    html: renderTemplate(htmlTemplate, vars),
  });
  if (!r.ok) return { sent: false, reason: r.reason, detail: r.detail };
  return { sent: true };
}
