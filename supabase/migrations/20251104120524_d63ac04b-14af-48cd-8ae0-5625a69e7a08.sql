-- Ajouter les colonnes pour gérer les exercices au poids du corps et le lest
ALTER TABLE workout_sets 
ADD COLUMN is_bodyweight BOOLEAN DEFAULT FALSE,
ADD COLUMN additional_weight NUMERIC DEFAULT 0;

-- Commentaires pour clarifier
COMMENT ON COLUMN workout_sets.is_bodyweight IS 'Indique si l''exercice est au poids du corps';
COMMENT ON COLUMN workout_sets.additional_weight IS 'Poids additionnel pour le lest (en kg)';