-- Force types regeneration by adding and removing a temporary column
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS temp_column text;
ALTER TABLE public.exercises DROP COLUMN IF EXISTS temp_column;