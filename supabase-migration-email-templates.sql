-- Add editable email templates (run once on existing projects)

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE CHECK (key IN (
    'invite_admin',
    'invite_editor',
    'invite_viewer',
    'mentor_reminder_default',
    'mentor_added_default'
  )),
  category TEXT NOT NULL CHECK (category IN ('invite', 'mentor')),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_read_admin" ON public.email_templates;
CREATE POLICY "email_templates_read_admin" ON public.email_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "email_templates_write_admin" ON public.email_templates;
CREATE POLICY "email_templates_write_admin" ON public.email_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO public.email_templates (key, category, name, subject, html, description)
VALUES
(
  'invite_admin',
  'invite',
  'Invite - Admin',
  'Admin invite to Dev Weekends Hub',
  '<p>Hi {{recipient_name}}, you were added as <strong>admin</strong>.</p><p>Your temporary password: <code>{{temporary_password}}</code></p><p><a href="{{login_url}}">Open login</a></p>',
  'Sent when a user is invited as admin.'
),
(
  'invite_editor',
  'invite',
  'Invite - Editor',
  'Editor invite to Dev Weekends Hub',
  '<p>Hi {{recipient_name}}, you were added as <strong>editor</strong>.</p><p>Your temporary password: <code>{{temporary_password}}</code></p><p><a href="{{login_url}}">Open login</a></p>',
  'Sent when a user is invited as editor.'
),
(
  'invite_viewer',
  'invite',
  'Invite - Viewer',
  'Viewer invite to Dev Weekends Hub',
  '<p>Hi {{recipient_name}}, you were added as <strong>viewer</strong>.</p><p>Your temporary password: <code>{{temporary_password}}</code></p><p><a href="{{login_url}}">Open login</a></p>',
  'Sent when a user is invited as viewer.'
),
(
  'mentor_reminder_default',
  'mentor',
  'Mentor reminder',
  'Mentor reminder: {{table_name}}',
  '<p>Hi {{recipient_name}},</p><p><strong>{{triggered_by}}</strong> sent a reminder for <strong>{{table_name}}</strong>.</p><p><a href="{{table_url}}">Open table</a></p>',
  'Reminder sent to mentors for a table.'
),
(
  'mentor_added_default',
  'mentor',
  'Mentor assignment',
  'You were added as mentor: {{table_name}}',
  '<p>Hi {{recipient_name}},</p><p><strong>{{triggered_by}}</strong> added you as a mentor for <strong>{{table_name}}</strong>.</p><p><a href="{{table_url}}">Open table</a></p>',
  'Sent when someone is assigned as mentor.'
)
ON CONFLICT (key) DO NOTHING;
