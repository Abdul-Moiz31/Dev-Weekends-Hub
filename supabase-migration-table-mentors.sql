-- Add sheet mentors + policies + realtime (run once on existing Supabase projects)

CREATE TABLE IF NOT EXISTS public.table_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.dynamic_tables(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot >= 1 AND slot <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, slot),
  UNIQUE(table_id, profile_id)
);

ALTER TABLE public.table_mentors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "table_mentors_read" ON public.table_mentors;
CREATE POLICY "table_mentors_read" ON public.table_mentors FOR SELECT USING (true);

DROP POLICY IF EXISTS "table_mentors_write" ON public.table_mentors;
CREATE POLICY "table_mentors_write" ON public.table_mentors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Skip next line if you already added this table to the publication (would error).
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_mentors;
