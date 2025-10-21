import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExerciseHistoryDialog } from "@/components/ExerciseHistoryDialog";

interface Workout {
  id: string;
  name: string;
  started_at: string;
  completed_at: string | null;
  workout_sets?: Array<{
    exercise_id: string;
  }>;
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
  }, []);

  const loadWorkouts = async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select(`
        *,
        workout_sets(exercise_id)
      `)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    setWorkouts(data || []);
  };

  const handleWorkoutClick = (workout: Workout) => {
    if (workout.workout_sets && workout.workout_sets.length > 0) {
      const exerciseId = workout.workout_sets[0].exercise_id;
      setSelectedExercise({ id: exerciseId, name: workout.name });
    }
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

      <div className="space-y-2">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
          {format(selectedDate, "d MMMM yyyy", { locale: fr })}
        </h2>
        {filteredWorkouts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Aucune séance ce jour
          </p>
        ) : (
          filteredWorkouts.map((workout) => (
            <Card 
              key={workout.id} 
              className="p-3 sm:p-4 cursor-pointer transition-all hover:bg-accent/80"
              onClick={() => handleWorkoutClick(workout)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm sm:text-base">{workout.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {format(new Date(workout.started_at), "d MMMM yyyy · HH:mm", { locale: fr })}
                  </p>
                </div>
                <div className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                  Terminé
                </div>
              </div>
            </Card>
          ))
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
