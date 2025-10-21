-- Force types regeneration by adding a comment to existing table
COMMENT ON TABLE public.exercises IS 'Exercises table for workout tracking';
COMMENT ON TABLE public.workouts IS 'Workouts table for tracking workout sessions';
COMMENT ON TABLE public.workout_sets IS 'Workout sets for tracking individual sets';
COMMENT ON TABLE public.routines IS 'Routines table for workout templates';
COMMENT ON TABLE public.routine_exercises IS 'Junction table for routines and exercises';