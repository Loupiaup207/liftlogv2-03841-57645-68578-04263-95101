import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { Pin, Target, TrendingUp, Dumbbell, Search, Trash2, ArrowLeft, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";

interface PinnedExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  category: string;
}

interface ExercisePerformance {
  date: string;
  weight: number;
  reps: number;
  volume: number;
}

interface ExerciseGoal {
  id: string;
  exercise_id: string;
  exercise_name: string;
  target_weight: number;
  target_reps: number;
  current_weight: number;
  progress: number;
}

interface MuscleStats {
  category: string;
  count: number;
  percentage: number;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
}

const MUSCLE_COLORS = {
  chest: "#FF6384",
  back: "#36A2EB",
  legs: "#FFCE56",
  shoulders: "#4BC0C0",
  arms: "#9966FF",
  core: "#FF9F40",
};

const Statistics = () => {
  const [pinnedExercises, setPinnedExercises] = useState<PinnedExercise[]>([]);
  const [exerciseGoals, setExerciseGoals] = useState<ExerciseGoal[]>([]);
  const [muscleStats, setMuscleStats] = useState<MuscleStats[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [goalReps, setGoalReps] = useState("");
  const [selectedPinnedExercise, setSelectedPinnedExercise] = useState<PinnedExercise | null>(null);
  const [exercisePerformance, setExercisePerformance] = useState<ExercisePerformance[]>([]);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    await Promise.all([
      loadPinnedExercises(),
      loadExerciseGoals(),
      loadMuscleStats(),
      loadAllExercises(),
    ]);
  };

  const loadAllExercises = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, category, equipment")
      .order("name");

    if (error) return;

    setAllExercises(data || []);
  };

  const loadPinnedExercises = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("pinned_exercises")
      .select(`
        id,
        exercise_id,
        exercises (name, category)
      `)
      .eq("user_id", user.id);

    if (error) return;

    const formatted = data?.map((item: any) => ({
      id: item.id,
      exercise_id: item.exercise_id,
      exercise_name: item.exercises.name,
      category: item.exercises.category,
    })) || [];

    setPinnedExercises(formatted);
  };

  const loadExerciseGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: goals, error } = await supabase
      .from("exercise_goals")
      .select(`
        *,
        exercises (name)
      `);

    if (error || !goals) return;

    // Pour chaque objectif, récupérer la progression actuelle
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal: any) => {
        const { data: sets } = await supabase
          .from("workout_sets")
          .select("weight")
          .eq("exercise_id", goal.exercise_id)
          .order("created_at", { ascending: false })
          .limit(1);

        const currentWeight = sets?.[0]?.weight || 0;
        const progress = goal.target_weight 
          ? Math.min((currentWeight / goal.target_weight) * 100, 100)
          : 0;

        return {
          id: goal.id,
          exercise_id: goal.exercise_id,
          exercise_name: goal.exercises?.name || "Exercice",
          target_weight: goal.target_weight,
          target_reps: goal.target_reps,
          current_weight: currentWeight,
          progress,
        };
      })
    );

    setExerciseGoals(goalsWithProgress);
  };

  const loadMuscleStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Récupérer tous les workouts de l'utilisateur avec leurs exercices
    const { data: workouts } = await supabase
      .from("workout_sets")
      .select(`
        exercise_id,
        exercises (category)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!workouts) return;

    // Compter par muscle
    const muscleCounts: Record<string, number> = {};
    workouts.forEach((workout: any) => {
      const category = workout.exercises?.category;
      if (category) {
        muscleCounts[category] = (muscleCounts[category] || 0) + 1;
      }
    });

    const total = Object.values(muscleCounts).reduce((a, b) => a + b, 0);
    const stats = Object.entries(muscleCounts).map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / total) * 100),
    }));

    setMuscleStats(stats.sort((a, b) => b.count - a.count));
  };

  const createGoal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedExercise) return;

    const { error } = await supabase.from("exercise_goals").insert([
      {
        user_id: user.id,
        exercise_id: selectedExercise,
        target_weight: parseFloat(goalWeight),
        target_reps: parseInt(goalReps),
      },
    ]);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Objectif créé!" });
    setIsGoalDialogOpen(false);
    setGoalWeight("");
    setGoalReps("");
    loadExerciseGoals();
  };

  const deleteGoal = async (goalId: string) => {
    const { error } = await supabase
      .from("exercise_goals")
      .delete()
      .eq("id", goalId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Objectif supprimé!" });
    loadExerciseGoals();
  };

  const getMuscleLabel = (category: string) => {
    const labels: Record<string, string> = {
      chest: "Pecs",
      back: "Dos",
      legs: "Jambes",
      shoulders: "Épaules",
      arms: "Bras",
      core: "Core",
    };
    return labels[category] || category;
  };

  const categoryColors: Record<string, string> = {
    chest: "bg-red-500/20 text-red-400 border-red-500/30",
    back: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    legs: "bg-green-500/20 text-green-400 border-green-500/30",
    shoulders: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    arms: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    core: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  const filteredAllExercises = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const selectExercise = (exerciseId: string) => {
    setSelectedExercise(exerciseId);
    setIsExerciseSelectorOpen(false);
    setExerciseSearch("");
  };

  const loadExercisePerformance = async (exerciseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sets, error } = await supabase
      .from("workout_sets")
      .select("weight, reps, created_at")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: true });

    if (error || !sets) return;

    const performance = sets.map((set: any) => ({
      date: new Date(set.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      weight: set.weight || 0,
      reps: set.reps || 0,
      volume: (set.weight || 0) * (set.reps || 0),
    }));

    setExercisePerformance(performance);
  };

  const openPerformanceDialog = async (exercise: PinnedExercise) => {
    setSelectedPinnedExercise(exercise);
    await loadExercisePerformance(exercise.exercise_id);
    setIsPerformanceDialogOpen(true);
  };

  const getPerformanceStats = () => {
    if (exercisePerformance.length === 0) return null;

    const weights = exercisePerformance.map(p => p.weight);
    const volumes = exercisePerformance.map(p => p.volume);
    
    return {
      maxWeight: Math.max(...weights),
      avgWeight: (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1),
      maxVolume: Math.max(...volumes),
      totalSets: exercisePerformance.length,
      progression: weights.length > 1 
        ? ((weights[weights.length - 1] - weights[0]) / weights[0] * 100).toFixed(1)
        : "0",
    };
  };

  return (
    <div className="p-6 space-y-6 pt-safe">
      <h1 className="text-2xl font-light tracking-wide">STATISTIQUES</h1>

      {/* Répartition des muscles */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Muscles travaillés
        </h2>
        
        {muscleStats.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Pas encore de données d'entraînement
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={muscleStats}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${getMuscleLabel(entry.category)} ${entry.percentage}%`}
                  >
                    {muscleStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={MUSCLE_COLORS[entry.category as keyof typeof MUSCLE_COLORS] || "#999"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <div className="space-y-2">
              {muscleStats.map((stat) => (
                <Card key={stat.category} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: MUSCLE_COLORS[stat.category as keyof typeof MUSCLE_COLORS] || "#999",
                        }}
                      />
                      <span className="font-medium">{getMuscleLabel(stat.category)}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stat.count} séances ({stat.percentage}%)
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Objectifs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objectifs
          </h2>
          <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="minimal" size="sm">
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Nouvel objectif</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Exercice</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setIsExerciseSelectorOpen(true)}
                  >
                    {selectedExercise
                      ? allExercises.find((e) => e.id === selectedExercise)?.name || "Sélectionner"
                      : "Sélectionner un exercice"}
                  </Button>
                </div>
                <div>
                  <Label>Poids cible (kg)</Label>
                  <Input
                    type="number"
                    value={goalWeight}
                    onChange={(e) => setGoalWeight(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label>Reps cibles</Label>
                  <Input
                    type="number"
                    value={goalReps}
                    onChange={(e) => setGoalReps(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <Button onClick={createGoal} className="w-full">
                  Créer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {exerciseGoals.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Aucun objectif. Créez-en un pour suivre votre progression!
          </Card>
        ) : (
          exerciseGoals.map((goal) => (
            <Card key={goal.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{goal.exercise_name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {Math.round(goal.progress)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteGoal(goal.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Progress value={goal.progress} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Actuel: {goal.current_weight}kg</span>
                <span>Objectif: {goal.target_weight}kg × {goal.target_reps}</span>
              </div>
            </Card>
          ))
        )}
      </section>


      {/* Exercices épinglés */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Pin className="h-5 w-5" />
          Exercices suivis
        </h2>
        
        {pinnedExercises.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Aucun exercice épinglé. Épinglez des exercices depuis la bibliothèque!
          </Card>
        ) : (
          pinnedExercises.map((exercise) => (
            <Card 
              key={exercise.id} 
              className="p-4 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => openPerformanceDialog(exercise)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{exercise.exercise_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getMuscleLabel(exercise.category)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>

      {/* Dialog pour les performances détaillées */}
      <Dialog open={isPerformanceDialogOpen} onOpenChange={setIsPerformanceDialogOpen}>
        <DialogContent className="bg-card max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPerformanceDialogOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle>Performances - {selectedPinnedExercise?.exercise_name}</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPerformanceDialogOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {exercisePerformance.length > 0 ? (
              <div className="space-y-6">
                {/* Statistiques */}
                {(() => {
                  const stats = getPerformanceStats();
                  return stats ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground">Max Poids</p>
                        <p className="text-xl font-bold">{stats.maxWeight}kg</p>
                      </Card>
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground">Moy Poids</p>
                        <p className="text-xl font-bold">{stats.avgWeight}kg</p>
                      </Card>
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground">Max Volume</p>
                        <p className="text-xl font-bold">{stats.maxVolume}</p>
                      </Card>
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground">Total Séries</p>
                        <p className="text-xl font-bold">{stats.totalSets}</p>
                      </Card>
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground">Progression</p>
                        <p className={`text-xl font-bold ${parseFloat(stats.progression) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {stats.progression}%
                        </p>
                      </Card>
                    </div>
                  ) : null;
                })()}

                {/* Graphique du poids */}
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Évolution du poids</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={exercisePerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Poids (kg)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                {/* Graphique du volume */}
                <Card className="p-4">
                  <h3 className="font-medium mb-3">Évolution du volume</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={exercisePerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="volume" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Volume (kg×reps)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                Aucune donnée de performance disponible
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour sélectionner un exercice */}
      <Dialog open={isExerciseSelectorOpen} onOpenChange={setIsExerciseSelectorOpen}>
        <DialogContent className="bg-card max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Sélectionner un exercice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-10"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredAllExercises.map((exercise) => (
                <Card
                  key={exercise.id}
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => selectExercise(exercise.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{exercise.name}</h3>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="outline" className={`text-xs ${categoryColors[exercise.category]}`}>
                          {exercise.category}
                        </Badge>
                        {exercise.equipment && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {exercise.equipment}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Statistics;
