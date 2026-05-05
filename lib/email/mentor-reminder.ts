import { getAppBaseUrl, sendResendHtml } from '@/lib/email/resend-send';

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
}) {
  const base = getAppBaseUrl();
  const logoLight = `${base}/logo1.png`;
  const logoDark = `${base}/logo2.png`;
  const html = `
    <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <style>
        .logo-dark { display:none; }
        @media (prefers-color-scheme: dark) {
          .email-card { background:#111827 !important; border-color:#1f2937 !important; color:#f3f4f6 !important; }
          .email-muted { color:#9ca3af !important; }
          .logo-light { display:none !important; }
          .logo-dark { display:block !important; }
        }
      </style>
      <div class="email-card" style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;color:#111827;">
        <div style="text-align:center;margin-bottom:12px;">
          <img class="logo-light" src="${logoLight}" width="68" height="68" alt="Dev Weekends" style="display:block;margin:0 auto 8px auto;border-radius:999px;" />
          <img class="logo-dark" src="${logoDark}" width="68" height="68" alt="Dev Weekends" style="display:none;margin:0 auto 8px auto;border-radius:999px;" />
          <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#14b8a6;font-weight:700;">Dev Weekends Hub</p>
        </div>
        <h2 style="margin:8px 0 10px 0;font-size:22px;line-height:1.2;">Mentor reminder</h2>
        <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;">Hi ${escapeHtml(params.mentorName)},</p>
        <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;"><strong>${escapeHtml(params.triggeredByName)}</strong> sent a reminder about <strong>${escapeHtml(params.tableName)}</strong>.</p>
        <a href="${escapeHtml(params.tableUrl)}" style="display:inline-block;margin-top:2px;background:#14b8a6;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600;">Open table</a>
        <p class="email-muted" style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:#6b7280;">You are assigned as a responsible mentor for this sheet.</p>
      </div>
    </div>
  `.trim();

  return sendResendHtml({
    to: params.to,
    subject: `Reminder: ${params.tableName}`,
    html,
  });
}

export function tableAbsoluteUrl(tableId: string) {
  const base = getAppBaseUrl();
  return `${base}/tables/${tableId}`;
}
