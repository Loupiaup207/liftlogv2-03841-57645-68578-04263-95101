-- Create a per-user hidden list for base exercises instead of deleting shared rows
CREATE TABLE IF NOT EXISTS public.user_hidden_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_hidden_exercises_unique UNIQUE (user_id, exercise_id)
);

-- Enable RLS
ALTER TABLE public.user_hidden_exercises ENABLE ROW LEVEL SECURITY;

-- Policies: users manage only their own rows
CREATE POLICY "Users can select their hidden exercises"
ON public.user_hidden_exercises
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their hidden exercises"
ON public.user_hidden_exercises
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their hidden exercises"
ON public.user_hidden_exercises
FOR DELETE
USING (auth.uid() = user_id);

-- Helpful index for filtering
CREATE INDEX IF NOT EXISTS idx_user_hidden_exercises_user_id ON public.user_hidden_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hidden_exercises_exercise_id ON public.user_hidden_exercises(exercise_id);
