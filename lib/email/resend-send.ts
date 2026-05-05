import nodemailer from 'nodemailer';

export type EmailSendResult =
  | { ok: true }
  | { ok: false; reason: 'missing_smtp_config' | 'smtp_error'; detail?: string };

export function getAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  return vercel || 'http://localhost:3000';
}

export function getResendFrom() {
  return process.env.INVITE_EMAIL_FROM || 'Dev Weekends Hub <noreply@localhost>';
}

/** Single transactional email via SMTP (server-only). */
export async function sendResendHtml(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailSendResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_PORT === '465';

  if (!host || !port || !user || !pass) {
    return { ok: false, reason: 'missing_smtp_config' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: getResendFrom(),
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: 'smtp_error', detail: detail.slice(0, 200) };
  }

  return { ok: true };
}
