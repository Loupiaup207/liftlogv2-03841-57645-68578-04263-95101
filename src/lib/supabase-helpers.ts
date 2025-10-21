import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Helper types for tables
export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type Workout = Database['public']['Tables']['workouts']['Row'];
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];
export type Routine = Database['public']['Tables']['routines']['Row'];
export type RoutineExercise = Database['public']['Tables']['routine_exercises']['Row'];

// Re-export the client with proper typing
export { supabase };
