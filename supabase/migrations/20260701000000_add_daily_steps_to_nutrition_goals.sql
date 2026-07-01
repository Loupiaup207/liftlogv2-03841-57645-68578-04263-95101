ALTER TABLE public.nutrition_goals
ADD COLUMN IF NOT EXISTS daily_steps integer DEFAULT 10000;

COMMENT ON COLUMN public.nutrition_goals.daily_steps IS 'Nombre de pas par jour utilisé pour ajuster les calories quotidiennes';
