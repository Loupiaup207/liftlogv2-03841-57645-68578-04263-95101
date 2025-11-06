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
  is_bodyweight?: boolean;
  additional_weight?: number;
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
          is_bodyweight,
          additional_weight,
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

  // Rafraîchissement auto toutes les 3s (polling)
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadWorkouts();
    }, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const handleExerciseClick = (exerciseId: string, exerciseName: string) => {
    setSelectedExercise({ id: exerciseId, name: exerciseName });
  };

  // Prevent click during scroll on mobile
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent, exerciseId: string, exerciseName: string) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    
    // Only trigger click if movement is less than 10px (not scrolling)
    if (deltaX < 10 && deltaY < 10) {
      handleExerciseClick(exerciseId, exerciseName);
    }
    
    setTouchStart(null);
  };

  const groupSetsByExercise = (sets: WorkoutSet[]) => {
    const grouped: Record<string, { displayName: string; category: string; sets: WorkoutSet[]; exerciseId: string }> = {};
    
    sets.forEach(set => {
      const nameKey = (set.exercises.name || "").trim().toLowerCase();
      if (!grouped[nameKey]) {
        grouped[nameKey] = {
          displayName: set.exercises.name,
          category: set.exercises.category,
          exerciseId: set.exercise_id, // representative id for history dialog
          sets: []
        };
      }
      grouped[nameKey].sets.push(set);
    });

    return grouped;
  };
  // Filter workouts by selected date
  const filteredWorkouts = workouts.filter(workout => 
    isSameDay(new Date(workout.started_at), selectedDate)
  );

  // Group all sets across the day by exercise
  const allSetsForDay = filteredWorkouts.flatMap(w => w.workout_sets || []);
  const exerciseGroupsForDay = groupSetsByExercise(allSetsForDay);
  const allCompleted = filteredWorkouts.length > 0 && filteredWorkouts.every(w => w.completed_at);

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

      <div className="space-y-2">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
          {format(selectedDate, "d MMMM yyyy", { locale: fr })}
        </h2>
        {filteredWorkouts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Aucune séance ce jour
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(exerciseGroupsForDay).map(([nameKey, group]) => (
              <Card key={nameKey} className="p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleExerciseClick(group.exerciseId, group.displayName)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={(e) => handleTouchEnd(e, group.exerciseId, group.displayName)}
                    className="text-base font-medium hover:text-primary transition-colors touch-none"
                  >
                    {group.displayName}
                  </button>
                  {allCompleted && (
                    <div className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                      Terminé
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  {group.sets
                    .sort((a, b) => a.set_number - b.set_number)
                    .map((set, idx) => {
                      const displayWeight = set.is_bodyweight
                        ? (set.additional_weight && set.additional_weight > 0
                            ? `lesté à ${set.additional_weight}kg`
                            : `au poids du corps`)
                        : `${set.weight} kg`;

                      return (
                        <div 
                          key={set.id}
                          className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                        >
                          <span className="text-sm text-muted-foreground">Série {idx + 1}</span>
                          <div className="flex gap-4 text-sm">
                            <span className="font-medium">{set.reps} reps</span>
                            <span className="font-medium">{displayWeight}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Card>
            ))}
          </div>
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
