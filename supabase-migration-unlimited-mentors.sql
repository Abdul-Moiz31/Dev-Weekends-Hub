-- Allow unlimited mentors per table by removing the slot<=3 cap.
-- Run this once on existing projects that already have table_mentors.

ALTER TABLE public.table_mentors
  ALTER COLUMN slot TYPE INTEGER;

DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.table_mentors'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%slot <= 3%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.table_mentors DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

ALTER TABLE public.table_mentors
  ADD CONSTRAINT table_mentors_slot_check CHECK (slot >= 1);
