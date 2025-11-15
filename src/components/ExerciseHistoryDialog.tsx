import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Check, X, Trash2, Edit2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCachedWorkoutSets, useCachedExerciseDetails, useAddWorkoutSet, useDeleteWorkoutSet } from "@/hooks/useCache";

interface ExerciseHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseId: string;
  exerciseName: string;
}

interface WorkoutSet {
  id: string;
  reps: number;
  weight: number | null;
  set_number: number;
  created_at: string;
  workout_id: string;
  additional_weight?: number | null;
}

export const ExerciseHistoryDialog = ({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
}: ExerciseHistoryDialogProps) => {
  const [newReps, setNewReps] = useState<string>("");
  const [newWeight, setNewWeight] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(exerciseName);
  const [editedCategory, setEditedCategory] = useState("");
  const [editedEquipment, setEditedEquipment] = useState("");
  const [editedNotes, setEditedNotes] = useState("");
  const [isWeighted, setIsWeighted] = useState(false);
  const [additionalWeight, setAdditionalWeight] = useState<string>("");
  const { toast } = useToast();
  const { preferences } = useUserPreferences();

  const { data: sets = [], isLoading: setsLoading } = useCachedWorkoutSets(exerciseId, open);
  const { data: exerciseDetails, isLoading: detailsLoading } = useCachedExerciseDetails(exerciseId, open);
  const addSetMutation = useAddWorkoutSet();
  const deleteSetMutation = useDeleteWorkoutSet();

  const isBodyweightExercise = exerciseDetails?.equipment === "bodyweight";

  useEffect(() => {
    if (open && exerciseDetails) {
      setEditedName(exerciseDetails.name);
      setEditedCategory(exerciseDetails.category || "");
      setEditedEquipment(exerciseDetails.equipment || "");
      setEditedNotes(exerciseDetails.notes || "");

      // Récupérer les dernières valeurs depuis localStorage (en strings)
      const lastWeight = localStorage.getItem(`exercise_${exerciseId}_weight`);
      const lastReps = localStorage.getItem(`exercise_${exerciseId}_reps`);
      const lastAdditionalWeight = localStorage.getItem(`exercise_${exerciseId}_additionalWeight`);

      // Pré-remplir les reps
      if (lastReps) {
        setNewReps(lastReps);
      }

      // Pré-remplir le poids
      if (lastWeight && !isBodyweightExercise) {
        setNewWeight(lastWeight); // <-- déjà une string depuis localStorage
      } else if (isBodyweightExercise && preferences?.current_bodyweight) {
        setNewWeight(String(preferences.current_bodyweight)); // <-- convertir en string
      }

      // Pré-remplir le poids additionnel (lesté)
      if (isBodyweightExercise && lastAdditionalWeight) {
        setAdditionalWeight(lastAdditionalWeight);
        setIsWeighted(true); // activer le bouton lesté
      }
    }
  }, [open, exerciseDetails, isBodyweightExercise, preferences, exerciseId]);


  const addSet = async () => {
    try {
      const repsNum = parseInt(newReps || "0") || 0;
      const weightNum = parseFloat(newWeight || "0") || 0;
      const addWeightNum = isWeighted ? (parseFloat(additionalWeight || "0") || 0) : 0;

      await addSetMutation.mutateAsync({
        exerciseId,
        exerciseName,
        reps: repsNum,
        weight: weightNum,
        additionalWeight: isBodyweightExercise && isWeighted ? addWeightNum : 0,
        isBodyweight: isBodyweightExercise,
      });
      
      // Sauvegarder les dernières valeurs utilisées (en strings)
      localStorage.setItem(`exercise_${exerciseId}_weight`, newWeight);
      localStorage.setItem(`exercise_${exerciseId}_reps`, newReps);
      if (isBodyweightExercise && isWeighted) {
        localStorage.setItem(`exercise_${exerciseId}_additionalWeight`, additionalWeight);
      }
      
      toast({ title: "Série ajoutée!" });
      // Ne pas vider les champs — garder les dernières valeurs
      // setNewReps("");
      // setNewWeight("");
      // setIsWeighted(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const deleteSet = async (setId: string) => {
    try {
      await deleteSetMutation.mutateAsync({ setId, exerciseId });
      toast({ title: "Série supprimée" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const groupSetsByDate = () => {
    const grouped: { [key: string]: WorkoutSet[] } = {};
    
    sets.forEach(set => {
      const date = format(new Date(set.created_at), "dd MMM yyyy", { locale: fr });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(set);
    });

    return grouped;
  };

  const groupedSets = groupSetsByDate();

  const getProgressionData = () => {
    const dates = Object.keys(groupedSets).reverse().slice(-10);
    return dates.map(date => {
      const dateSets = groupedSets[date];
      const maxWeight = Math.max(...dateSets.map(s => s.weight || 0));
      const avgReps = Math.round(dateSets.reduce((acc, s) => acc + s.reps, 0) / dateSets.length);
      return { date: format(new Date(dateSets[0].created_at), "dd/MM"), weight: maxWeight, reps: avgReps };
    });
  };

  const progressionData = getProgressionData();

  const updateExercise = async () => {
    const { error } = await supabase
      .from("exercises")
      .update({
        name: editedName,
        category: editedCategory,
        equipment: editedEquipment,
        notes: editedNotes,
      })
      .eq("id", exerciseId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Exercice modifié" });
    setIsEditing(false);
    window.location.reload();
  };

  const deleteExercise = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Récupérer tous les workouts de l'utilisateur
    const { data: userWorkouts } = await supabase
      .from("workouts")
      .select("id")
      .eq("user_id", user.id);

    const workoutIds = userWorkouts?.map(w => w.id) || [];

    // Supprimer tous les workout_sets de cet exercice
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

    // Masquer l'exercice
    const { error } = await supabase
      .from("user_hidden_exercises")
      .upsert({ user_id: user.id, exercise_id: exerciseId }, { onConflict: "user_id,exercise_id" });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Exercice et historique supprimés" });
    onOpenChange(false);
    window.location.reload();
  };

  const getBarColor = (currentWeight: number, previousWeight: number | null) => {
    if (previousWeight === null) return "bg-yellow-500/60";
    if (currentWeight > previousWeight) return "bg-green-500/60";
    if (currentWeight < previousWeight) return "bg-red-500/60";
    return "bg-yellow-500/60";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card w-screen h-screen max-w-none max-h-none m-0 rounded-none overflow-y-auto [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pt-12">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-base sm:text-lg">{editedName}</DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {isEditing && (
            <Card className="p-4 rounded-2xl bg-accent/30 border-border/30 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs">Nom de l'exercice</Label>
                <Input
                  id="name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs">Catégorie (partie musculaire)</Label>
                <Input
                  id="category"
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}
                  placeholder="Ex: Pectoraux, Dos, Jambes..."
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment" className="text-xs">Équipement</Label>
                <Input
                  id="equipment"
                  value={editedEquipment}
                  onChange={(e) => setEditedEquipment(e.target.value)}
                  placeholder="Ex: Haltères, Barre, Machine..."
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Textarea
                  id="notes"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="Ajoutez des notes..."
                  className="text-sm min-h-[60px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={updateExercise}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Enregistrer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                onClick={() => {
                  setIsEditing(false);
                  if (exerciseDetails) {
                    setEditedName(exerciseDetails.name);
                    setEditedCategory(exerciseDetails.category || "");
                    setEditedEquipment(exerciseDetails.equipment || "");
                    setEditedNotes(exerciseDetails.notes || "");
                  }
                }}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
              </div>
            </Card>
          )}
          <div className="flex flex-col gap-2 p-3 bg-accent/30 rounded-2xl border border-border/30">
            <span className="text-xs font-medium text-muted-foreground">Série {sets.length + 1}</span>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const current = parseInt(newReps || "0") || 0;
                    const next = Math.max(1, current - 1);
                    setNewReps(String(next));
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={newReps}
                  onChange={(e) => setNewReps(e.target.value)}
                  className="w-14 h-8 text-center text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const current = parseInt(newReps || "0") || 0;
                    const next = current + 1;
                    setNewReps(String(next));
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground">reps</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const current = parseFloat(newWeight || "0") || 0;
                    const next = Math.max(0, current - 2.5);
                    setNewWeight(String(next));
                  }}
                  disabled={isBodyweightExercise && !!preferences?.current_bodyweight}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-14 h-8 text-center text-sm"
                  disabled={isBodyweightExercise && !!preferences?.current_bodyweight}
                  readOnly={isBodyweightExercise && !!preferences?.current_bodyweight}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const current = parseFloat(newWeight || "0") || 0;
                    const next = current + 2.5;
                    setNewWeight(String(next));
                  }}
                  disabled={isBodyweightExercise && !!preferences?.current_bodyweight}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground">kg</span>
              </div>
            </div>

            {isBodyweightExercise && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant={isWeighted ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsWeighted(!isWeighted)}
                  className="flex-shrink-0"
                >
                  {isWeighted ? "Lesté ✓" : "+ Ajouter lest"}
                </Button>
                {isWeighted && (
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="kg lest"
                    value={additionalWeight}
                    onChange={(e) => setAdditionalWeight(e.target.value)}
                    className="w-24 h-9"
                  />
                )}
              </div>
            )}

            <div className="flex gap-1 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={addSet}
                className="h-8 gap-1"
                disabled={addSetMutation.isPending}
              >
                <Check className="h-3 w-3 text-green-400" />
                <span className="text-xs">Valider</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 gap-1"
              >
                <X className="h-3 w-3 text-red-400" />
                <span className="text-xs">Annuler</span>
              </Button>
            </div>
          </div>

          {progressionData.length > 0 && (
            <Card className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <h3 className="font-semibold text-sm text-foreground mb-4">📈 Progression du poids</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={progressionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
                    label={{ value: 'kg', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                      padding: '8px 12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: number) => [`${value} kg`, 'Poids max']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="space-y-2">
            <h3 className="font-medium text-xs text-muted-foreground">Historique</h3>
            {Object.keys(groupedSets).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucune série enregistrée
              </p>
            ) : (
              Object.entries(groupedSets).map(([date, dateSets]) => (
                <Card key={date} className="p-2 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1.5">{date}</p>
                  <div className="space-y-1">
                    {dateSets.map((set, index) => (
                      <div
                        key={set.id}
                        className="flex justify-between items-center text-xs gap-2"
                      >
                        <span className="text-muted-foreground">
                          Série {dateSets.length - index}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {set.reps} reps {set.weight ? `× ${set.weight} kg` : ""}{set.additional_weight && set.additional_weight > 0 ? ` +${set.additional_weight}kg` : ""}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteSet(set.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              className="flex-1 gap-2"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
              Fermer
            </Button>
            <Button
              variant="ghost"
              className="flex-1 gap-2 text-destructive hover:text-destructive"
              onClick={deleteExercise}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
