-- Add foreign key constraints for exercise_goals and pinned_exercises tables

-- Add foreign key from exercise_goals to exercises
ALTER TABLE public.exercise_goals
ADD CONSTRAINT exercise_goals_exercise_id_fkey
FOREIGN KEY (exercise_id)
REFERENCES public.exercises(id)
ON DELETE CASCADE;

-- Add foreign key from pinned_exercises to exercises
ALTER TABLE public.pinned_exercises
ADD CONSTRAINT pinned_exercises_exercise_id_fkey
FOREIGN KEY (exercise_id)
REFERENCES public.exercises(id)
ON DELETE CASCADE;