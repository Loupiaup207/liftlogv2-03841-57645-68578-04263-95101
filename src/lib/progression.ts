import { supabase } from "@/lib/supabase-helpers";
import type { RunnerExercise } from "@/components/SessionRunner";

export interface ExerciseHistoryPoint {
  date: string;
  sets: { reps: number; weight: number }[];
  bestWeight: number;
  bestReps: number;
  oneRm: number;
}

export interface Suggestion {
  exercise_id: string;
  name: string;
  /** valeurs proposées */
  sets: number;
  reps: number;
  weight: number;
  rest_seconds: number;
  notes: string | null;
  /** contexte */
  reason: string;
  oneRm: number | null;
  isFirstTime: boolean;
  last: ExerciseHistoryPoint | null;
}

export const REP_CEILING = 12;
export const LOW_REP_RESET = 6; // plage basse 4-6
export const WEIGHT_STEP = 5;
export const START_INTENSITY = 0.7; // 70 % du 1RM pour la charge de travail

export const epley1RM = (weight: number, reps: number) =>
  weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;

export const roundToStep = (w: number, step = 2.5) => Math.max(0, Math.round(w / step) * step);

/** Historique par jour d'un exercice (le plus récent en premier) */
export const buildHistory = (rows: any[]): ExerciseHistoryPoint[] => {
  const byDay: Record<string, { reps: number; weight: number }[]> = {};
  rows.forEach((s) => {
    const key = new Date(s.created_at).toISOString().slice(0, 10);
    (byDay[key] ||= []).push({
      reps: s.reps || 0,
      weight: (Number(s.weight) || 0) + (Number(s.additional_weight) || 0),
    });
  });
  return Object.keys(byDay)
    .sort()
    .reverse()
    .map((date) => {
      const sets = byDay[date];
      const best = sets.reduce((a, b) => (epley1RM(b.weight, b.reps) > epley1RM(a.weight, a.reps) ? b : a), sets[0]);
      return {
        date,
        sets,
        bestWeight: best.weight,
        bestReps: best.reps,
        oneRm: epley1RM(best.weight, best.reps),
      };
    });
};

/** Calcule la proposition de surcharge progressive pour un exercice */
export const computeSuggestion = (ex: RunnerExercise, history: ExerciseHistoryPoint[]): Suggestion => {
  const base = {
    exercise_id: ex.exercise_id,
    name: ex.name,
    rest_seconds: ex.rest_seconds,
    notes: ex.notes,
  };

  const last = history[0] || null;

  // --- Première fois : estimation via Epley -----------------------------
  if (!last) {
    const refWeight = ex.target_weight || 0;
    const oneRm = epley1RM(refWeight, ex.target_reps);
    const working = oneRm > 0 ? roundToStep(oneRm * START_INTENSITY) : 0;
    return {
      ...base,
      sets: ex.target_sets,
      reps: ex.target_reps,
      weight: working,
      reason:
        oneRm > 0
          ? `Première fois : 1RM estimé à ${oneRm.toFixed(1)} kg (Epley), charge de départ à ${Math.round(
              START_INTENSITY * 100
            )} % = ${working} kg.`
          : "Première fois : renseigne une charge de départ, elle servira de base au calcul du 1RM.",
      oneRm: oneRm || null,
      isFirstTime: true,
      last: null,
    };
  }

  const lastWeight = Math.max(...last.sets.map((s) => s.weight));
  const setsAtWeight = last.sets.filter((s) => s.weight >= lastWeight - 0.01);
  const minReps = Math.min(...setsAtWeight.map((s) => s.reps));
  const targetReps = ex.target_reps;
  const goalReached = minReps >= targetReps;

  let reps = goalReached ? minReps + 2 : Math.max(minReps, targetReps);
  let weight = lastWeight;
  let reason = goalReached
    ? `Objectif atteint (${minReps} reps) : +2 reps par série.`
    : `Objectif non atteint la dernière fois (${minReps}/${targetReps}) : on garde la charge et on vise ${targetReps} reps.`;

  if (reps > REP_CEILING) {
    weight = roundToStep(lastWeight + WEIGHT_STEP);
    reps = LOW_REP_RESET;
    reason = `Plus de ${REP_CEILING} reps atteintes : +${WEIGHT_STEP} kg et retour sur une plage basse (4-6 reps).`;
  }

  return {
    ...base,
    sets: Math.max(1, setsAtWeight.length || ex.target_sets),
    reps,
    weight,
    reason,
    oneRm: last.oneRm || null,
    isFirstTime: false,
    last,
  };
};

/** Charge l'historique de tous les exercices d'une séance et renvoie les suggestions */
export const buildSuggestions = async (exercises: RunnerExercise[]): Promise<Suggestion[]> => {
  const ids = exercises.map((e) => e.exercise_id);
  if (ids.length === 0) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return exercises.map((e) => computeSuggestion(e, []));

  const { data } = await supabase
    .from("workout_sets")
    .select("exercise_id, reps, weight, additional_weight, created_at, workouts!inner(user_id)")
    .in("exercise_id", ids)
    .eq("workouts.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3000);

  const byEx: Record<string, any[]> = {};
  (data || []).forEach((s: any) => {
    (byEx[s.exercise_id] ||= []).push(s);
  });

  return exercises.map((e) => computeSuggestion(e, buildHistory(byEx[e.exercise_id] || [])));
};
