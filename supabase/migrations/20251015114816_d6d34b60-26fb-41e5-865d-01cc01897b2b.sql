-- Ajouter une colonne pour le muscle secondaire dans le programme hebdomadaire
ALTER TABLE public.user_weekly_programs
ADD COLUMN secondary_muscle TEXT;