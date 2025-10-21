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
}

const Workout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workoutName, setWorkoutName] = useState("");
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [isAddingSet, setIsAddingSet] = useState(false);

  useEffect(() => {
    loadWorkout();
  }, [id]);

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
      .select("*")
      .eq("workout_id", id)
      .order("created_at");

    if (workoutSets) {
      setSets(workoutSets);
    }
  };

  const addSet = async (reps: number, weight: number) => {
    if (!id) return;

    // Pour simplifier, on utilise toujours le premier exercice de la base
    const { data: exercises } = await supabase
      .from("exercises")
      .select("id")
      .limit(1);

    if (!exercises || exercises.length === 0) return;

    const { error } = await supabase.from("workout_sets").insert([
      {
        workout_id: id,
        exercise_id: exercises[0].id,
        set_number: sets.length + 1,
        reps,
        weight,
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
        {sets.map((set) => (
          <Card key={set.id} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs">Série {set.set_number}</span>
              <div className="flex gap-3 text-xs">
                <span>{set.reps} reps</span>
                <span>{set.weight} kg</span>
              </div>
            </div>
          </Card>
        ))}

        {isAddingSet ? (
          <WorkoutSetInput
            setNumber={sets.length + 1}
            onSave={addSet}
            onCancel={() => setIsAddingSet(false)}
            previousWeight={sets[sets.length - 1]?.weight}
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
