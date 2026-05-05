-- ============================================================
-- Dev Weekends Hub - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- User profiles with roles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dynamic tables metadata
CREATE TABLE dynamic_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Column definitions for dynamic tables
CREATE TABLE table_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'time', 'datetime', 'status', 'url', 'checkbox', 'person', 'longtext', 'select', 'email', 'phone')),
  position INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row data for dynamic tables
CREATE TABLE table_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Responsible mentors for a sheet (1–3 workspace members per table)
CREATE TABLE table_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot >= 1 AND slot <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, slot),
  UNIQUE(table_id, profile_id)
);

-- Links vault
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('repo', 'canva', 'figma', 'docs', 'video', 'slides', 'notion', 'discord', 'other')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Admins may update any profile (Team members page: role changes).
-- Re-run safely: drop first if the policy already exists.
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

ALTER TABLE dynamic_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables_read" ON dynamic_tables FOR SELECT USING (true);
CREATE POLICY "tables_insert" ON dynamic_tables FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "tables_update" ON dynamic_tables FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "tables_delete" ON dynamic_tables FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE table_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "columns_read" ON table_columns FOR SELECT USING (true);
CREATE POLICY "columns_write" ON table_columns FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE table_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rows_read" ON table_rows FOR SELECT USING (true);
CREATE POLICY "rows_insert" ON table_rows FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "rows_update" ON table_rows FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "rows_delete" ON table_rows FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

ALTER TABLE table_mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "table_mentors_read" ON table_mentors FOR SELECT USING (true);
CREATE POLICY "table_mentors_write" ON table_mentors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "links_read" ON links FOR SELECT USING (true);
CREATE POLICY "links_insert" ON links FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "links_update" ON links FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "links_delete" ON links FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_read" ON activity_log FOR SELECT USING (true);
CREATE POLICY "activity_insert" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE table_rows;
ALTER PUBLICATION supabase_realtime ADD TABLE links;
ALTER PUBLICATION supabase_realtime ADD TABLE dynamic_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE table_mentors;

-- ============================================================
-- Auto-create profile on signup trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
  user_role TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  -- First user gets admin role
  IF user_count = 0 THEN
    user_role := 'admin';
  ELSE
    user_role := 'viewer';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    user_role,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Seed Data
-- ============================================================

-- NOTE: Seed data inserts require a logged-in admin user.
-- After setting up auth, run the seed-data.sql script separately,
-- or use the app's UI to create the seed tables.
