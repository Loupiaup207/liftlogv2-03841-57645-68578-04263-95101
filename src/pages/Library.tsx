import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseHistoryDialog } from "@/components/ExerciseHistoryDialog";
import { WeeklyProgramDialog } from "@/components/WeeklyProgramDialog";
import { MuscleSwapDialog } from "@/components/MuscleSwapDialog";
import { Plus, Search, RefreshCw, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { useExercises } from "@/hooks/useExercises";

const categories = ["chest", "back", "legs", "shoulders", "arms", "core"];
const equipments = ["barbell", "dumbbell", "machine", "bodyweight", "cable"];

const Library = () => {
  const { exercises, pinnedExerciseIds, togglePin } = useExercises();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [todayMuscles, setTodayMuscles] = useState<string[]>([]);
  const [todaySecondaryExercises, setTodaySecondaryExercises] = useState<string[]>([]);
  const [newExercise, setNewExercise] = useState({
    name: "",
    category: "chest",
    equipment: "barbell",
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTodayProgram();
  }, []);

  const loadTodayProgram = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().getDay();
    
    const { data, error } = await supabase
      .from("user_weekly_programs")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_of_week", today)
      .maybeSingle();

    if (error) return;

    if (data) {
      // Parse muscles (comma-separated string)
      const muscles = data.muscle_group.split(',').filter(Boolean);
      
      // Parse secondary exercises (comma-separated UUIDs)
      const secondaryExercises = data.secondary_muscle 
        ? data.secondary_muscle.split(',').filter(Boolean)
        : [];
      
      setTodayMuscles(muscles.filter(m => m !== "rest"));
      setTodaySecondaryExercises(secondaryExercises);
    } else {
      // Première utilisation, ouvrir le dialogue de configuration
      setIsProgramDialogOpen(true);
    }
  };


  const handleSwapMuscle = () => {
    loadTodayProgram(); // Recharger pour avoir la version à jour
  };

  const getMuscleLabel = (muscle: string) => {
    const labels: Record<string, string> = {
      chest: "Pectoraux",
      back: "Dos",
      legs: "Jambes",
      shoulders: "Épaules",
      arms: "Bras",
      core: "Abdos",
    };
    return labels[muscle] || muscle;
  };

  const getTodayProgramLabel = () => {
    if (todayMuscles.length === 0) return "Swap";
    
    const muscleLabels = todayMuscles.map(m => getMuscleLabel(m));
    return muscleLabels.join(' + ');
  };

  const createExercise = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("exercises").insert([
      { ...newExercise, user_id: user.id, is_custom: true }
    ]);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Exercice créé!" });
    setIsDialogOpen(false);
    setNewExercise({ name: "", category: "chest", equipment: "barbell", notes: "" });
    // React Query will auto-refresh
  };

  const deleteExercise = async (exerciseId: string, isCustom: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fermer le dialogue si l'exercice sélectionné est celui qu'on supprime
    if (selectedExercise?.id === exerciseId) {
      setSelectedExercise(null);
    }

    // Récupérer tous les workouts de l'utilisateur
    const { data: userWorkouts } = await supabase
      .from("workouts")
      .select("id")
      .eq("user_id", user.id);

    const workoutIds = userWorkouts?.map(w => w.id) || [];

    // Supprimer tous les workout_sets de cet exercice pour cet utilisateur
    if (workoutIds.length > 0) {
      const { error: setsError } = await supabase
        .from("workout_sets")
        .delete()
        .eq("exercise_id", exerciseId)
        .in("workout_id", workoutIds);

      if (setsError) {
        toast({ title: "Erreur", description: setsError.message, variant: "destructive" });
        return;
      }
    }

    // Masquer l'exercice pour l'utilisateur
    const { error } = await supabase
      .from("user_hidden_exercises")
      .upsert({ user_id: user.id, exercise_id: exerciseId }, { onConflict: "user_id,exercise_id" });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Exercice et historique supprimés!" });
    // React Query will auto-refresh
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    
    // Check if exercise matches selected muscles or is in secondary exercises list
    const matchesMuscleCategory = todayMuscles.includes(ex.category);
    const isSelectedExercise = todaySecondaryExercises.includes(ex.id);
    
    // Show exercise if it matches search AND (is in today's muscles OR is a selected secondary exercise)
    return matchesSearch && (matchesMuscleCategory || isSelectedExercise);
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-light tracking-wide">LIBRAIRIE</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="gap-1.5 bg-primary/10 hover:bg-primary/20 border-primary/30"
            onClick={() => setIsSwapDialogOpen(true)}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-xs">{getTodayProgramLabel()}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-9 w-9"
            onClick={() => setIsProgramDialogOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="minimal" size="icon" className="h-9 w-9">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-card max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvel exercice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  placeholder="Ex: Développé couché"
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={newExercise.category} onValueChange={(v) => setNewExercise({ ...newExercise, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Équipement</Label>
                <Select value={newExercise.equipment} onValueChange={(v) => setNewExercise({ ...newExercise, equipment: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {equipments.map((eq) => (
                      <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={newExercise.notes}
                  onChange={(e) => setNewExercise({ ...newExercise, notes: e.target.value })}
                  placeholder="Notes optionnelles"
                />
              </div>
              <Button onClick={createExercise} className="w-full">
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filteredExercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            id={exercise.id}
            name={exercise.name}
            category={exercise.category}
            equipment={exercise.equipment || undefined}
            notes={exercise.notes || undefined}
            onClick={() => setSelectedExercise(exercise)}
            onDelete={() => deleteExercise(exercise.id, exercise.is_custom)}
            onPin={() => togglePin({ exerciseId: exercise.id, isPinned: pinnedExerciseIds.has(exercise.id) })}
            isPinned={pinnedExerciseIds.has(exercise.id)}
            isCustom={exercise.is_custom}
          />
        ))}
      </div>

      {selectedExercise && (
        <ExerciseHistoryDialog
          open={!!selectedExercise}
          onOpenChange={(open) => !open && setSelectedExercise(null)}
          exerciseId={selectedExercise.id}
          exerciseName={selectedExercise.name}
        />
      )}

      <WeeklyProgramDialog
        open={isProgramDialogOpen}
        onOpenChange={setIsProgramDialogOpen}
        onSave={() => {
          loadTodayProgram();
        }}
      />

      <MuscleSwapDialog
        open={isSwapDialogOpen}
        onOpenChange={setIsSwapDialogOpen}
        currentMuscle={todayMuscles[0] || "chest"}
        onSelect={handleSwapMuscle}
      />
    </div>
  );
};

export default Library;
