import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkoutSetInput } from "@/components/WorkoutSetInput";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";

interface WorkoutSet {
  id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  is_bodyweight?: boolean;
  additional_weight?: number;
  exercises?: {
    name: string;
    category: string;
  };
}

const Workout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workoutName, setWorkoutName] = useState("");
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [isAddingSet, setIsAddingSet] = useState(false);
  const [userBodyweight, setUserBodyweight] = useState<number | null>(null);
  const [currentExercise, setCurrentExercise] = useState<{ id: string; name: string; category: string } | null>(null);

  useEffect(() => {
    loadWorkout();
    loadUserBodyweight();
  }, [id]);

  const loadUserBodyweight = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_preferences")
      .select("current_bodyweight")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.current_bodyweight) {
      setUserBodyweight(data.current_bodyweight);
    }
  };

  const loadWorkout = async () => {
    if (!id) return;

    const { data: workout } = await supabase
      .from("workouts")
      .select("*")
      .eq("id", id)
      .single();

    if (workout) {
      setWorkoutName(workout.name);
    }

    const { data: workoutSets } = await supabase
      .from("workout_sets")
      .select(`
        *,
        exercises(name, category)
      `)
      .eq("workout_id", id)
      .order("created_at");

    if (workoutSets && workoutSets.length > 0) {
      setSets(workoutSets);
      // Utiliser le dernier exercice utilisé
      const lastSet = workoutSets[workoutSets.length - 1];
      if (lastSet.exercises) {
        setCurrentExercise({
          id: lastSet.exercise_id,
          name: lastSet.exercises.name,
          category: lastSet.exercises.category
        });
      }
    }
  };

  const isBodyweightExercise = (exerciseName: string) => {
    const bodyweightKeywords = [
      'dips', 'traction', 'pull', 'push-up', 'pompe',
      'chin-up', 'muscle-up', 'handstand', 'pistol', 'squat au poids du corps'
    ];
    const nameLower = exerciseName.toLowerCase();
    return bodyweightKeywords.some(keyword => nameLower.includes(keyword));
  };

  const addSet = async (reps: number, weight: number, additionalWeight: number = 0) => {
    if (!id) return;

    // Pour simplifier, on utilise toujours le premier exercice de la base
    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name, category")
      .limit(1);

    if (!exercises || exercises.length === 0) return;

    const exercise = exercises[0];
    const isBodyweight = isBodyweightExercise(exercise.name);

    const { error } = await supabase.from("workout_sets").insert([
      {
        workout_id: id,
        exercise_id: exercise.id,
        set_number: sets.length + 1,
        reps,
        weight: isBodyweight ? (userBodyweight || weight) : weight,
        is_bodyweight: isBodyweight,
        additional_weight: additionalWeight,
      },
    ]);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    setIsAddingSet(false);
    loadWorkout();
  };

  const completeWorkout = async () => {
    if (!id) return;

    const { error } = await supabase
      .from("workouts")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Séance terminée! 💪" });
    navigate("/");
  };

  return (
    <div className="pt-12 p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-light tracking-wide">{workoutName}</h1>
        <Button variant="minimal" size="icon" className="h-9 w-9" onClick={completeWorkout}>
          <Check className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {sets.map((set) => {
          const exerciseName = set.exercises?.name || '';
          const isBodyweight = set.is_bodyweight || isBodyweightExercise(exerciseName);
          const displayWeight = isBodyweight 
            ? (set.additional_weight && set.additional_weight > 0
                ? `${exerciseName} lesté à ${set.additional_weight}kg`
                : `${exerciseName} au poids du corps`)
            : `${set.weight} kg`;
          
          return (
            <Card key={set.id} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs">Série {set.set_number}</span>
                <div className="flex gap-3 text-xs">
                  <span>{set.reps} reps</span>
                  <span>{displayWeight}</span>
                </div>
              </div>
            </Card>
          );
        })}

        {isAddingSet ? (
          <WorkoutSetInput
            setNumber={sets.length + 1}
            onSave={addSet}
            onCancel={() => setIsAddingSet(false)}
            previousWeight={sets[sets.length - 1]?.weight}
            isBodyweight={currentExercise ? isBodyweightExercise(currentExercise.name) : false}
            userBodyweight={userBodyweight || undefined}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full h-10 text-sm"
            onClick={() => setIsAddingSet(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une série
          </Button>
        )}
      </div>
    </div>
  );
};

export default Workout;
