import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserPreferences {
  id?: string;
  user_id?: string;
  workout_reminder_time: string | null;
  reminder_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const { data: newPrefs, error: insertError } = await supabase
          .from("user_preferences")
          .insert({
            user_id: user.id,
            reminder_enabled: false,
            workout_reminder_time: null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs);
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de charger les préférences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !preferences) return;

      const { data, error } = await supabase
        .from("user_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      toast({
        title: "Préférences mises à jour",
        description: "Vos préférences ont été enregistrées",
      });

      return data;
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les préférences",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  return {
    preferences,
    loading,
    updatePreferences,
    refetch: fetchPreferences,
  };
};
