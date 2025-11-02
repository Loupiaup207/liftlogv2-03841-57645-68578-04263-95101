import { useCachedUserPreferences } from "./useCache";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface UserPreferences {
  id?: string;
  user_id?: string;
  workout_reminder_time: string | null;
  reminder_enabled: boolean;
  current_bodyweight: number | null;
  created_at?: string;
  updated_at?: string;
}

export const useUserPreferences = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: preferences, isLoading: loading } = useCachedUserPreferences();

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !preferences) return;

      // Optimistic update
      queryClient.setQueryData(["user-preferences"], (old: any) => ({
        ...old,
        ...updates,
      }));

      const { data, error } = await supabase
        .from("user_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Préférences mises à jour",
        description: "Vos préférences ont été enregistrées",
      });

      // Invalider pour refetch
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });

      return data;
    } catch {
      // Restaurer en cas d'erreur
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les préférences",
        variant: "destructive",
      });
    }
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
  };

  return {
    preferences,
    loading,
    updatePreferences,
    refetch,
  };
};
