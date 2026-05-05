import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendInviteCredentialsEmail } from '@/lib/invite-email';

function generateTemporaryPassword() {
  return randomBytes(12).toString('base64url').slice(0, 20);
}

function deriveFirstNameFromEmail(email: string) {
  const local = email.split('@')[0] || '';
  const withoutAlias = local.split('+')[0] || local;
  const firstChunk = withoutAlias.split(/[._-]+/)[0] || withoutAlias;
  const lettersOnly = firstChunk.replace(/[^a-zA-Z]/g, '');
  const base = (lettersOnly || firstChunk || 'User').trim();
  if (!base) return 'User';
  return base[0].toUpperCase() + base.slice(1).toLowerCase();
}

export async function POST(request: Request) {
  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role === 'editor' ? 'editor' : body.role === 'viewer' ? 'viewer' : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: 'Role must be viewer or editor' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error: 'Server misconfiguration',
        hint: 'Add SUPABASE_SERVICE_ROLE_KEY to the server environment (never expose it to the browser).',
      },
      { status: 503 }
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const derivedFirstName = deriveFirstNameFromEmail(email);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: derivedFirstName,
    },
  });

  if (createError) {
    const msg = createError.message?.toLowerCase() ?? '';
    if (msg.includes('already been registered') || msg.includes('already exists')) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: createError.message || 'Could not create user' }, { status: 400 });
  }

  const newId = created.user?.id;
  if (!newId) {
    return NextResponse.json({ error: 'User creation returned no id' }, { status: 500 });
  }

  const { error: roleError } = await admin.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', newId);

  if (roleError) {
    await admin.auth.admin.deleteUser(newId);
    return NextResponse.json({ error: 'Could not assign role; invite rolled back.' }, { status: 500 });
  }

  const emailResult = await sendInviteCredentialsEmail({
    to: email,
    temporaryPassword,
    role,
  });

  return NextResponse.json({
    ok: true,
    userId: newId,
    emailSent: emailResult.sent,
    ...(emailResult.sent
      ? {}
      : {
          temporaryPassword,
          emailWarning:
            emailResult.reason === 'missing_smtp_config'
              ? 'SMTP is not configured — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally INVITE_EMAIL_FROM).'
              : `Email could not be sent (${emailResult.reason}). Share the temporary password securely.`,
        }),
  });
}
