-- Création des tables pour l'application de musculation

-- Table des exercices
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- chest, back, legs, shoulders, arms, core
  equipment TEXT, -- barbell, dumbbell, machine, bodyweight, cable
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_custom BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des programmes/routines
CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des exercices dans les routines
CREATE TABLE public.routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL,
  target_sets INTEGER DEFAULT 3,
  target_reps TEXT DEFAULT '8-12',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des séances d'entraînement
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des séries effectuées
CREATE TABLE public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(10, 2), -- en kg
  notes TEXT,
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour exercises (publics + custom privés)
CREATE POLICY "Users can view all exercises"
  ON public.exercises FOR SELECT
  USING (is_custom = false OR user_id = auth.uid());

CREATE POLICY "Users can create their own exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercises"
  ON public.exercises FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercises"
  ON public.exercises FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies pour routines
CREATE POLICY "Users can view their own routines"
  ON public.routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own routines"
  ON public.routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines"
  ON public.routines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines"
  ON public.routines FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies pour routine_exercises
CREATE POLICY "Users can view their routine exercises"
  ON public.routine_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.routines
      WHERE routines.id = routine_exercises.routine_id
      AND routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their routine exercises"
  ON public.routine_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.routines
      WHERE routines.id = routine_exercises.routine_id
      AND routines.user_id = auth.uid()
    )
  );

-- RLS Policies pour workouts
CREATE POLICY "Users can view their own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts"
  ON public.workouts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies pour workout_sets
CREATE POLICY "Users can view their workout sets"
  ON public.workout_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_sets.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their workout sets"
  ON public.workout_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts
      WHERE workouts.id = workout_sets.workout_id
      AND workouts.user_id = auth.uid()
    )
  );

-- Trigger pour updated_at sur routines
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insertion d'exercices par défaut (bibliothèque standard)
INSERT INTO public.exercises (name, category, equipment, is_custom, user_id, notes) VALUES
  ('Développé couché', 'chest', 'barbell', false, NULL, 'Mouvement de base pour les pectoraux'),
  ('Développé incliné', 'chest', 'barbell', false, NULL, 'Cible le haut des pectoraux'),
  ('Écarté haltères', 'chest', 'dumbbell', false, NULL, 'Isolation des pectoraux'),
  ('Squat', 'legs', 'barbell', false, NULL, 'Exercice roi pour les jambes'),
  ('Leg press', 'legs', 'machine', false, NULL, 'Alternative au squat'),
  ('Soulevé de terre', 'back', 'barbell', false, NULL, 'Exercice complet du dos et des jambes'),
  ('Tractions', 'back', 'bodyweight', false, NULL, 'Exercice au poids du corps pour le dos'),
  ('Rowing barre', 'back', 'barbell', false, NULL, 'Développe l''épaisseur du dos'),
  ('Développé militaire', 'shoulders', 'barbell', false, NULL, 'Exercice de base pour les épaules'),
  ('Élévations latérales', 'shoulders', 'dumbbell', false, NULL, 'Isolation des deltoïdes latéraux'),
  ('Curl biceps', 'arms', 'barbell', false, NULL, 'Exercice de base pour les biceps'),
  ('Extension triceps', 'arms', 'cable', false, NULL, 'Isolation des triceps'),
  ('Planche', 'core', 'bodyweight', false, NULL, 'Renforcement du gainage'),
  ('Crunch', 'core', 'bodyweight', false, NULL, 'Exercice d''abdominaux');
