import type { EmailTemplateKey } from '@/types';

export const EMAIL_TEMPLATE_KEYS: EmailTemplateKey[] = [
  'invite_admin',
  'invite_editor',
  'invite_viewer',
  'mentor_reminder_default',
  'mentor_added_default',
];

export const EMAIL_TEMPLATE_CATEGORY: Record<EmailTemplateKey, 'invite' | 'mentor'> = {
  invite_admin: 'invite',
  invite_editor: 'invite',
  invite_viewer: 'invite',
  mentor_reminder_default: 'mentor',
  mentor_added_default: 'mentor',
};

export const EMAIL_TEMPLATE_NAME: Record<EmailTemplateKey, string> = {
  invite_admin: 'Invite - Admin',
  invite_editor: 'Invite - Editor',
  invite_viewer: 'Invite - Viewer',
  mentor_reminder_default: 'Mentor reminder',
  mentor_added_default: 'Mentor assignment',
};

export const EMAIL_TEMPLATE_DESCRIPTION: Record<EmailTemplateKey, string> = {
  invite_admin: 'Sent when a user is invited as admin.',
  invite_editor: 'Sent when a user is invited as editor.',
  invite_viewer: 'Sent when a user is invited as viewer.',
  mentor_reminder_default: 'Reminder sent to all mentors on a table.',
  mentor_added_default: 'Sent when a mentor is newly assigned to a table.',
};

type PresetTemplate = { subject: string; html: string };

export function defaultTemplateForKey(
  key: EmailTemplateKey,
  baseUrl: string
): PresetTemplate {
  switch (key) {
    case 'invite_admin':
      return {
        subject: 'Admin invite to Dev Weekends Hub',
        html:
          `<p>Hello {{recipient_name}},</p>` +
          `<p>You have been invited as an <strong>admin</strong> in Dev Weekends Hub.</p>` +
          `<p>Temporary password: <strong>{{temporary_password}}</strong></p>` +
          `<p>Open app: <a href="{{login_url}}">{{login_url}}</a></p>` +
          `<p>Please change your password after login.</p>`,
      };
    case 'invite_editor':
      return {
        subject: 'Editor invite to Dev Weekends Hub',
        html:
          `<p>Hello {{recipient_name}},</p>` +
          `<p>You have been invited as an <strong>editor</strong> in Dev Weekends Hub.</p>` +
          `<p>Temporary password: <strong>{{temporary_password}}</strong></p>` +
          `<p>Open app: <a href="{{login_url}}">{{login_url}}</a></p>` +
          `<p>Please change your password after login.</p>`,
      };
    case 'invite_viewer':
      return {
        subject: 'Viewer invite to Dev Weekends Hub',
        html:
          `<p>Hello {{recipient_name}},</p>` +
          `<p>You have been invited as a <strong>viewer</strong> in Dev Weekends Hub.</p>` +
          `<p>Temporary password: <strong>{{temporary_password}}</strong></p>` +
          `<p>Open app: <a href="{{login_url}}">{{login_url}}</a></p>` +
          `<p>Please change your password after login.</p>`,
      };
    case 'mentor_added_default':
      return {
        subject: 'You were added as mentor: {{table_name}}',
        html:
          `<p>Hello {{recipient_name}},</p>` +
          `<p>{{triggered_by}} added you as a mentor on <strong>{{table_name}}</strong>.</p>` +
          `<p>Open table: <a href="{{table_url}}">{{table_url}}</a></p>`,
      };
    case 'mentor_reminder_default':
    default:
      return {
        subject: 'Mentor reminder: {{table_name}}',
        html:
          `<p>Hello {{recipient_name}},</p>` +
          `<p>{{triggered_by}} sent a reminder for <strong>{{table_name}}</strong>.</p>` +
          `<p>Please review and update your assigned items.</p>` +
          `<p>Open table: <a href="{{table_url}}">{{table_url}}</a></p>`,
      };
  }
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>
) {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key) => vars[key] ?? '');
}
