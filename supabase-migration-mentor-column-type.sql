-- Allow new table column type: mentor
-- Run once on existing projects.

DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'public.table_columns'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%field_type IN%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.table_columns DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

ALTER TABLE public.table_columns
  ADD CONSTRAINT table_columns_field_type_check
  CHECK (field_type IN (
    'text', 'number', 'date', 'time', 'datetime',
    'status', 'url', 'checkbox', 'person', 'longtext',
    'select', 'email', 'phone', 'mentor'
  ));
