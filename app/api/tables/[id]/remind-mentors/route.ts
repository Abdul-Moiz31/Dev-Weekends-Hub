import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendTableMentorReminder, tableAbsoluteUrl } from '@/lib/email/mentor-reminder';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: tableId } = await context.params;
  const rawBody = await request.json().catch(() => ({})) as { templateKey?: string };
  const templateKey =
    rawBody.templateKey === 'mentor_added_default' ? 'mentor_added_default' : 'mentor_reminder_default';

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can send reminder templates' }, { status: 403 });
  }

  const { data: table, error: tableError } = await supabase
    .from('dynamic_tables')
    .select('id, name')
    .eq('id', tableId)
    .single();

  if (tableError || !table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const { data: mentorRows, error: mentorError } = await supabase
    .from('table_mentors')
    .select('slot, profile_id, profiles(full_name, email)')
    .eq('table_id', tableId)
    .order('slot');

  if (mentorError) {
    return NextResponse.json(
      {
        error: 'Could not load mentors',
        hint: 'Run the latest SQL from supabase-schema.sql (table_mentors) in Supabase.',
      },
      { status: 503 }
    );
  }

  type NestedProfile = { full_name: string | null; email: string };

  function singleProfile(
    p: NestedProfile | NestedProfile[] | null | undefined
  ): NestedProfile | null {
    if (p == null) return null;
    return Array.isArray(p) ? p[0] ?? null : p;
  }

  const mentors = (mentorRows || [])
    .map(r => {
      const prof = singleProfile(r.profiles as NestedProfile | NestedProfile[] | null);
      return {
        email: prof?.email?.trim(),
        name: prof?.full_name?.trim() || prof?.email || 'Mentor',
      };
    })
    .filter((m): m is { email: string; name: string } => Boolean(m.email));

  if (mentors.length === 0) {
    return NextResponse.json({ error: 'No mentors assigned to this table yet.' }, { status: 400 });
  }

  const triggeredByName =
    (profile.full_name && profile.full_name.trim()) || profile.email || 'A teammate';
  const tableUrl = tableAbsoluteUrl(tableId);
  const { data: reminderTemplate } = await supabase
    .from('email_templates')
    .select('subject, html')
    .eq('key', templateKey)
    .maybeSingle();

  let sent = 0;
  const failures: string[] = [];

  for (const m of mentors) {
    const r = await sendTableMentorReminder({
      to: m.email,
      mentorName: m.name,
      tableName: table.name,
      triggeredByName,
      tableUrl,
      templateKey,
      subjectTemplate: reminderTemplate?.subject || undefined,
      htmlTemplate: reminderTemplate?.html || undefined,
    });
    if (r.ok) sent++;
    else failures.push(m.email);
  }

  if (sent === 0 && failures.length > 0) {
    return NextResponse.json(
      {
        error: 'Email is not configured or sending failed',
        hint: 'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally INVITE_EMAIL_FROM) on the server.',
        failures,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed: failures.length,
    failures: failures.length ? failures : undefined,
    message:
      failures.length > 0
        ? `Sent ${sent} reminder(s); ${failures.length} failed (check SMTP settings).`
        : `Sent ${sent} reminder email(s).`,
  });
}
