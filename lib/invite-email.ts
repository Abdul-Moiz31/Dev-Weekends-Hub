import { getAppBaseUrl, sendResendHtml, type EmailSendResult } from '@/lib/email/resend-send';

export type InviteEmailResult =
  | { sent: true }
  | { sent: false; reason: 'missing_smtp_config' | 'smtp_error'; detail?: string };

export async function sendInviteCredentialsEmail(params: {
  to: string;
  temporaryPassword: string;
  role: string;
}): Promise<InviteEmailResult> {
  const base = getAppBaseUrl();
  const loginUrl = `${base}/login`;
  const logoLight = `${base}/logo1.png`;
  const logoDark = `${base}/logo2.png`;

  const html = `
    <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter,Segoe UI,Arial,sans-serif;">
      <style>
        .logo-dark { display:none; }
        @media (prefers-color-scheme: dark) {
          .email-card { background:#111827 !important; border-color:#1f2937 !important; color:#f3f4f6 !important; }
          .email-muted { color:#9ca3af !important; }
          .email-pill { background:#0f172a !important; border-color:#334155 !important; color:#e2e8f0 !important; }
          .logo-light { display:none !important; }
          .logo-dark { display:block !important; }
        }
      </style>
      <div class="email-card" style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;color:#111827;">
        <div style="text-align:center;margin-bottom:12px;">
          <img class="logo-light" src="${logoLight}" width="72" height="72" alt="Dev Weekends" style="display:block;margin:0 auto 8px auto;border-radius:999px;" />
          <img class="logo-dark" src="${logoDark}" width="72" height="72" alt="Dev Weekends" style="display:none;margin:0 auto 8px auto;border-radius:999px;" />
          <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#14b8a6;font-weight:700;">Dev Weekends Hub</p>
        </div>
        <h2 style="margin:8px 0 10px 0;font-size:22px;line-height:1.2;">You have been invited</h2>
        <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;">You were added as <strong>${params.role}</strong>. Sign in using your email and the temporary password below, then update your password in Settings.</p>
        <div class="email-pill" style="margin:14px 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:15px;">
          ${params.temporaryPassword}
        </div>
        <a href="${loginUrl}" style="display:inline-block;margin-top:2px;background:#14b8a6;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600;">Open login</a>
        <p class="email-muted" style="margin:16px 0 0 0;font-size:12px;line-height:1.6;color:#6b7280;">If this invite was unexpected, you can safely ignore this email.</p>
      </div>
    </div>
  `.trim();

  const r: EmailSendResult = await sendResendHtml({
    to: params.to,
    subject: 'Your Dev Weekends Hub invite',
    html,
  });
  if (!r.ok) return { sent: false, reason: r.reason, detail: r.detail };
  return { sent: true };
}
