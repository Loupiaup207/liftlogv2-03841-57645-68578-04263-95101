import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-helpers";

interface WorkoutSet {
  id: string;
  reps: number;
  weight: number | null;
  set_number: number;
  created_at: string;
  workout_id: string;
  exercise_id: string;
}

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

// Hook pour les préférences utilisateur avec cache
export const useCachedUserPreferences = () => {
  return useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Si pas de préférences, les créer
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from("user_preferences")
          .insert({
            user_id: user.id,
            reminder_enabled: false,
            workout_reminder_time: null,
            current_bodyweight: null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs;
      }

      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
};

// Mutation pour ajouter une série avec optimistic update
export const useAddWorkoutSet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ exerciseId, exerciseName, reps, weight, additionalWeight, isBodyweight }: { 
      exerciseId: string; 
      exerciseName: string; 
      reps: number; 
      weight: number;
      additionalWeight?: number;
      isBodyweight?: boolean;
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

      const existingSets = queryClient.getQueryData<WorkoutSet[]>(["workout-sets", exerciseId]) || [];
      const nextSetNumber = Math.max(0, ...existingSets.map((s) => s.set_number)) + 1;

      const { data: newSet, error } = await supabase
        .from("workout_sets")
        .insert([{
          workout_id: workout.id,
          exercise_id: exerciseId,
          reps,
          weight,
          set_number: nextSetNumber,
          is_bodyweight: isBodyweight || false,
          additional_weight: additionalWeight || 0,
        }])
        .select()
        .single();

      if (error) throw error;

      return { exerciseId, newSet };
    },
    // Optimistic update - mise à jour immédiate du cache
    onMutate: async ({ exerciseId, reps, weight }) => {
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ["workout-sets", exerciseId] });

      // Sauvegarder l'état précédent
      const previousSets = queryClient.getQueryData<WorkoutSet[]>(["workout-sets", exerciseId]);

      // Mettre à jour optimistiquement le cache
      queryClient.setQueryData<WorkoutSet[]>(["workout-sets", exerciseId], (old = []) => {
        const nextSetNumber = Math.max(0, ...old.map((s) => s.set_number)) + 1;
        const optimisticSet: WorkoutSet = {
          id: `temp-${Date.now()}`,
          reps,
          weight,
          set_number: nextSetNumber,
          created_at: new Date().toISOString(),
          workout_id: `temp-workout-${Date.now()}`,
          exercise_id: exerciseId,
        };
        return [optimisticSet, ...old];
      });

      return { previousSets };
    },
    // En cas d'erreur, restaurer l'état précédent
    onError: (err, { exerciseId }, context) => {
      if (context?.previousSets) {
        queryClient.setQueryData(["workout-sets", exerciseId], context.previousSets);
      }
    },
    // Toujours refetch après succès ou erreur
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["workout-sets", data.exerciseId] });
      }
    },
  });
};

// Mutation pour supprimer une série avec optimistic update
export const useDeleteWorkoutSet = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ setId, exerciseId }: { setId: string; exerciseId: string }) => {
      const { error } = await supabase
        .from("workout_sets")
        .delete()
        .eq("id", setId);

      if (error) throw error;
      return { exerciseId, setId };
    },
    // Optimistic update
    onMutate: async ({ setId, exerciseId }) => {
      await queryClient.cancelQueries({ queryKey: ["workout-sets", exerciseId] });
      
      const previousSets = queryClient.getQueryData<WorkoutSet[]>(["workout-sets", exerciseId]);
      
      // Supprimer optimistiquement du cache
      queryClient.setQueryData<WorkoutSet[]>(["workout-sets", exerciseId], (old = []) => 
        old.filter((s) => s.id !== setId)
      );

      return { previousSets };
    },
    onError: (err, { exerciseId }, context) => {
      if (context?.previousSets) {
        queryClient.setQueryData(["workout-sets", exerciseId], context.previousSets);
      }
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["workout-sets", data.exerciseId] });
      }
    },
  });
};

// Mutation pour toggle pin avec optimistic update
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
      
      return { exerciseId, isPinned };
    },
    // Optimistic update
    onMutate: async ({ exerciseId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: ["pinned-exercises"] });
      
      const previousPinned = queryClient.getQueryData<Set<string>>(["pinned-exercises"]);
      
      // Mettre à jour optimistiquement
      queryClient.setQueryData<Set<string>>(["pinned-exercises"], (old = new Set()) => {
        const newSet = new Set(old);
        if (isPinned) {
          newSet.delete(exerciseId);
        } else {
          newSet.add(exerciseId);
        }
        return newSet;
      });

      return { previousPinned };
    },
    onError: (err, variables, context) => {
      if (context?.previousPinned) {
        queryClient.setQueryData(["pinned-exercises"], context.previousPinned);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pinned-exercises"] });
    },
  });
};

// Mutation pour créer un exercice avec optimistic update
export const useCreateExercise = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newExercise: { name: string; category: string; equipment: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("exercises")
        .insert([{ ...newExercise, user_id: user.id, is_custom: true }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update
    onMutate: async (newExercise) => {
      await queryClient.cancelQueries({ queryKey: ["exercises"] });
      
      const previousExercises = queryClient.getQueryData(["exercises"]);
      
      // Ajouter optimistiquement
      queryClient.setQueryData(["exercises"], (old: any[] = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          ...newExercise,
          is_custom: true,
        },
      ]);

      return { previousExercises };
    },
    onError: (err, variables, context) => {
      if (context?.previousExercises) {
        queryClient.setQueryData(["exercises"], context.previousExercises);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
};
