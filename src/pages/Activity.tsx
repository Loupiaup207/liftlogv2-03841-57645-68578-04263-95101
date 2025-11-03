import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExerciseHistoryDialog } from "@/components/ExerciseHistoryDialog";

interface WorkoutSet {
  id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  set_number: number;
  exercises: {
    name: string;
    category: string;
  };
}

interface Workout {
  id: string;
  name: string;
  started_at: string;
  completed_at: string | null;
  workout_sets: WorkoutSet[];
}

const Activity = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string } | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();

  // Get days of current week
  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const goToPreviousWeek = () => {
    const newWeek = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeek);
    setSelectedDate(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeek);
    setSelectedDate(newWeek);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setSelectedDate(today);
  };

  useEffect(() => {
    loadWorkouts();

    // Subscribe to real-time updates for workouts and workout_sets
    const channel = supabase
      .channel('activity-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workouts'
        },
        () => {
          loadWorkouts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_sets'
        },
        () => {
          loadWorkouts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadWorkouts = async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select(`
        *,
        workout_sets(
          id,
          exercise_id,
          weight,
          reps,
          set_number,
          exercises(name, category)
        )
      `)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    setWorkouts(data || []);
  };

  const handleExerciseClick = (exerciseId: string, exerciseName: string) => {
    setSelectedExercise({ id: exerciseId, name: exerciseName });
  };

  const groupSetsByExercise = (sets: WorkoutSet[]) => {
    const grouped: Record<string, { name: string; category: string; sets: WorkoutSet[] }> = {};
    
    sets.forEach(set => {
      if (!grouped[set.exercise_id]) {
        grouped[set.exercise_id] = {
          name: set.exercises.name,
          category: set.exercises.category,
          sets: []
        };
      }
      grouped[set.exercise_id].sets.push(set);
    });

    return grouped;
  };

  // Filter workouts by selected date
  const filteredWorkouts = workouts.filter(workout => 
    isSameDay(new Date(workout.started_at), selectedDate)
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-light tracking-wide">ACTIVITÉ</h1>

      {/* Month/Year Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousWeek}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-lg font-light tracking-wide capitalize">
          {format(weekStart, "MMMM yyyy", { locale: fr })}
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Calendar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {weekDays.map((day) => {
          const dayWorkouts = workouts.filter(w => 
            isSameDay(new Date(w.started_at), day) && w.completed_at
          );
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          
          return (
            <Button
              key={day.toISOString()}
              variant={isSelected ? "default" : "outline"}
              className={`flex-shrink-0 flex flex-col items-center gap-1 h-auto py-3 px-4 min-w-[70px] ${
                isCurrentDay && !isSelected ? "border-primary" : ""
              }`}
              onClick={() => setSelectedDate(day)}
            >
              <span className="text-xs uppercase font-light">
                {format(day, "EEE", { locale: fr })}
              </span>
              <span className="text-lg font-light">
                {format(day, "d")}
              </span>
              {dayWorkouts.length > 0 && (
                <div className="w-1 h-1 rounded-full bg-primary mt-1" />
              )}
            </Button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filteredWorkouts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Aucune séance ce jour
          </p>
        ) : (
          filteredWorkouts.map((workout) => {
            const exerciseGroups = groupSetsByExercise(workout.workout_sets || []);
            
            return (
              <div key={workout.id} className="space-y-4">
                {Object.entries(exerciseGroups).map(([exerciseId, group]) => (
                  <Card key={exerciseId} className="p-4 sm:p-6 space-y-3">
                    <button
                      onClick={() => handleExerciseClick(exerciseId, group.name)}
                      className="text-lg sm:text-xl font-medium hover:text-primary transition-colors text-left"
                    >
                      {group.name}
                    </button>
                    
                    <div className="space-y-2">
                      {group.sets
                        .sort((a, b) => a.set_number - b.set_number)
                        .map((set) => (
                          <div 
                            key={set.id}
                            className="flex items-center justify-between py-2"
                          >
                            <span className="text-muted-foreground text-sm sm:text-base">
                              Set {set.set_number}
                            </span>
                            <div className="flex items-center gap-6 sm:gap-12">
                              <span className="text-lg sm:text-xl font-medium">
                                {set.weight} <span className="text-sm text-muted-foreground">kgs</span>
                              </span>
                              <span className="text-lg sm:text-xl font-medium">
                                {set.reps} <span className="text-sm text-muted-foreground">reps</span>
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Card>
                ))}
              </div>
            );
          })
        )}
      </div>

      {selectedExercise && (
        <ExerciseHistoryDialog
          open={!!selectedExercise}
          onOpenChange={(open) => !open && setSelectedExercise(null)}
          exerciseId={selectedExercise.id}
          exerciseName={selectedExercise.name}
        />
      )}
    </div>
  );
};

export default Activity;
