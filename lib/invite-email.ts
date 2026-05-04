export type InviteEmailResult =
  | { sent: true }
  | { sent: false; reason: 'missing_api_key' | 'resend_error'; detail?: string };

function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  return vercel || 'http://localhost:3000';
}

export async function sendInviteCredentialsEmail(params: {
  to: string;
  temporaryPassword: string;
  role: string;
}): Promise<InviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: 'missing_api_key' };
  }

  const from = process.env.INVITE_EMAIL_FROM || 'Dev Weekends Hub <onboarding@resend.dev>';
  const base = appBaseUrl();
  const loginUrl = `${base}/login`;

  const html = `
    <p>You have been invited to <strong>Dev Weekends Hub</strong> as <strong>${params.role}</strong>.</p>
    <p>Sign in with this email and the temporary password below, then change your password under Settings → Security.</p>
    <p><a href="${loginUrl}">${loginUrl}</a></p>
    <p style="font-family:monospace;font-size:14px;background:#f4f4f5;padding:12px;border-radius:8px;">${params.temporaryPassword}</p>
    <p style="color:#6b7280;font-size:12px;">If you did not expect this message, you can ignore it.</p>
  `.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: 'Your Dev Weekends Hub invite',
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { sent: false, reason: 'resend_error', detail: text.slice(0, 200) };
  }
  return { sent: true };
}
