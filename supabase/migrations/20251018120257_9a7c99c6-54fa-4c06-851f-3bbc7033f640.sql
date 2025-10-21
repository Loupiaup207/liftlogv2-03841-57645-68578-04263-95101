-- Table pour les exercices épinglés
CREATE TABLE IF NOT EXISTS public.pinned_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pinned_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their pinned exercises"
ON public.pinned_exercises
FOR ALL
USING (auth.uid() = user_id);

-- Table pour les objectifs d'exercices
CREATE TABLE IF NOT EXISTS public.exercise_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  target_weight NUMERIC,
  target_reps INTEGER,
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their exercise goals"
ON public.exercise_goals
FOR ALL
USING (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_exercise_goals_updated_at
BEFORE UPDATE ON public.exercise_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();