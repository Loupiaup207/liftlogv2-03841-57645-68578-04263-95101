-- Force types regeneration by updating table comments
COMMENT ON TABLE public.exercises IS 'Table des exercices pour le tracking des entraînements';
COMMENT ON TABLE public.workouts IS 'Table des séances d''entraînement';
COMMENT ON TABLE public.workout_sets IS 'Table des séries effectuées pendant les entraînements';
COMMENT ON TABLE public.routines IS 'Table des programmes d''entraînement';
COMMENT ON TABLE public.routine_exercises IS 'Table de liaison entre routines et exercices';
COMMENT ON TABLE public.nutrition_goals IS 'Table des objectifs nutritionnels des utilisateurs';
COMMENT ON TABLE public.user_hidden_exercises IS 'Table des exercices cachés par utilisateur';
COMMENT ON TABLE public.user_weekly_programs IS 'Table des programmes hebdomadaires par utilisateur';