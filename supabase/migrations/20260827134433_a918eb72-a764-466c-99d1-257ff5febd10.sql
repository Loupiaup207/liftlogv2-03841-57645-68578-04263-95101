CREATE TABLE public.session_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  days_of_week integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_templates TO authenticated;
GRANT ALL ON public.session_templates TO service_role;
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their session templates" ON public.session_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_session_templates_updated_at BEFORE UPDATE ON public.session_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.session_template_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.session_templates(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  target_sets integer NOT NULL DEFAULT 3,
  target_reps integer NOT NULL DEFAULT 10,
  target_weight numeric,
  rest_seconds integer NOT NULL DEFAULT 90,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_template_exercises TO authenticated;
GRANT ALL ON public.session_template_exercises TO service_role;
ALTER TABLE public.session_template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their template exercises" ON public.session_template_exercises FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = template_id AND t.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.session_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));

ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS session_template_id uuid REFERENCES public.session_templates(id) ON DELETE SET NULL;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS duration_seconds integer;

ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS planned_weight numeric;
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS planned_reps integer;
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS rest_seconds integer;
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS rpe integer;