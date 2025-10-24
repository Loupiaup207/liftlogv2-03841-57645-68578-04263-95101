import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";

export interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  notes: string | null;
  is_custom: boolean;
}

export const fetchExercises = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [] as Exercise[];

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

  if (hiddenRes.error || exRes.error) {
    throw hiddenRes.error || exRes.error;
  }

  const hiddenIds = new Set((hiddenRes.data || []).map((h: { exercise_id: string }) => h.exercise_id));
  return (exRes.data || []).filter((ex: Exercise) => !hiddenIds.has(ex.id));
};

export const fetchPinnedExercises = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set<string>();

  const { data, error } = await supabase
    .from("pinned_exercises")
    .select("exercise_id")
    .eq("user_id", user.id);

  if (error) throw error;

  return new Set<string>(data?.map((p) => p.exercise_id) || []);
};

export const useExercises = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
  });

  const { data: pinnedExerciseIds = new Set(), isLoading: isPinnedLoading } = useQuery({
    queryKey: ["pinnedExercises"],
    queryFn: fetchPinnedExercises,
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ exerciseId, isPinned }: { exerciseId: string; isPinned: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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
    onSuccess: (_, { isPinned }) => {
      queryClient.invalidateQueries({ queryKey: ["pinnedExercises"] });
      toast({ title: isPinned ? "Exercice désépinglé" : "Exercice épinglé!" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  return {
    exercises,
    isLoading,
    pinnedExerciseIds,
    isPinnedLoading,
    togglePin: togglePinMutation.mutate,
  };
};
