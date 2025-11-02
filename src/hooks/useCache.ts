import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-helpers";

// Hook pour les exercices avec cache
export const useCachedExercises = () => {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const [hiddenRes, exRes] = await Promise.all([
        supabase
          .from("user_hidden_exercises")
          .select("exercise_id")
          .eq("user_id", user.id),
        supabase
          .from("exercises")
          .select("*")
          .order("name"),
      ]);

      if (hiddenRes.error || exRes.error) throw new Error("Erreur de chargement");

      const hiddenIds = new Set((hiddenRes.data || []).map((h: { exercise_id: string }) => h.exercise_id));
      return (exRes.data || []).filter((ex) => !hiddenIds.has(ex.id));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook pour les séries d'un exercice avec cache
export const useCachedWorkoutSets = (exerciseId: string, enabled = true) => {
  return useQuery({
    queryKey: ["workout-sets", exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("*")
        .eq("exercise_id", exerciseId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook pour les détails d'un exercice avec cache
export const useCachedExerciseDetails = (exerciseId: string, enabled = true) => {
  return useQuery({
    queryKey: ["exercise-details", exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("name, category, equipment, notes")
        .eq("id", exerciseId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });
};

// Hook pour les exercices épinglés avec cache
export const useCachedPinnedExercises = () => {
  return useQuery({
    queryKey: ["pinned-exercises"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Set<string>();

      const { data, error } = await supabase
        .from("pinned_exercises")
        .select("exercise_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return new Set(data?.map((p) => p.exercise_id) || []);
    },
    staleTime: 10 * 60 * 1000,
  });
};

// Hook pour le programme du jour avec cache
export const useCachedTodayProgram = () => {
  return useQuery({
    queryKey: ["today-program"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { muscles: [], secondaryExercises: [] };

      const today = new Date().getDay();
      
      const { data, error } = await supabase
        .from("user_weekly_programs")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_of_week", today)
        .maybeSingle();

      if (error || !data) return { muscles: [], secondaryExercises: [] };

      const muscles = data.muscle_group.split(',').filter(Boolean);
      const secondaryExercises = data.secondary_muscle 
        ? data.secondary_muscle.split(',').filter(Boolean)
        : [];
      
      return { 
        muscles: muscles.filter((m: string) => m !== "rest"), 
        secondaryExercises 
      };
    },
    staleTime: 10 * 60 * 1000,
  });
};

// Mutation pour ajouter une série avec invalidation de cache
export const useAddWorkoutSet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ exerciseId, exerciseName, reps, weight }: { 
      exerciseId: string; 
      exerciseName: string; 
      reps: number; 
      weight: number; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert([{
          user_id: user.id,
          name: exerciseName,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Récupérer les séries existantes depuis le cache
      const existingSets = queryClient.getQueryData<any[]>(["workout-sets", exerciseId]) || [];
      const nextSetNumber = Math.max(0, ...existingSets.map((s: any) => s.set_number)) + 1;

      const { error } = await supabase.from("workout_sets").insert([{
        workout_id: workout.id,
        exercise_id: exerciseId,
        reps,
        weight,
        set_number: nextSetNumber,
      }]);

      if (error) throw error;

      return { exerciseId };
    },
    onSuccess: ({ exerciseId }) => {
      // Invalider seulement les données de cet exercice
      queryClient.invalidateQueries({ queryKey: ["workout-sets", exerciseId] });
    },
  });
};

// Mutation pour supprimer une série
export const useDeleteWorkoutSet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ setId, exerciseId }: { setId: string; exerciseId: string }) => {
      const { error } = await supabase
        .from("workout_sets")
        .delete()
        .eq("id", setId);

      if (error) throw error;
      return { exerciseId };
    },
    onSuccess: ({ exerciseId }) => {
      queryClient.invalidateQueries({ queryKey: ["workout-sets", exerciseId] });
    },
  });
};

// Mutation pour toggle pin
export const useTogglePin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ exerciseId, isPinned }: { exerciseId: string; isPinned: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      if (isPinned) {
        const { error } = await supabase
          .from("pinned_exercises")
          .delete()
          .eq("user_id", user.id)
          .eq("exercise_id", exerciseId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pinned_exercises")
          .insert([{ user_id: user.id, exercise_id: exerciseId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pinned-exercises"] });
    },
  });
};
