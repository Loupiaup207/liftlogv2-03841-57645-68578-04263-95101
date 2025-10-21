import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import type { Exercise } from "@/lib/supabase-helpers";

interface WeeklyProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const DAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

const MUSCLE_GROUPS = [
  { value: "chest", label: "Pectoraux" },
  { value: "back", label: "Dos" },
  { value: "legs", label: "Jambes" },
  { value: "shoulders", label: "Épaules" },
  { value: "arms", label: "Bras" },
  { value: "core", label: "Abdos" },
  { value: "rest", label: "Repos" },
];

export const WeeklyProgramDialog = ({ open, onOpenChange, onSave }: WeeklyProgramDialogProps) => {
  const [program, setProgram] = useState<Record<number, string[]>>({
    1: ["chest"],
    2: ["back"],
    3: ["rest"],
    4: ["legs"],
    5: ["shoulders"],
    6: ["arms"],
    0: ["rest"],
  });
  const [secondaryExercises, setSecondaryExercises] = useState<Record<number, string[]>>({});
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProgram();
      loadExercises();
    }
  }, [open]);

  const loadExercises = async () => {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("name");

    if (!error && data) {
      setExercises(data);
    }
  };

  const loadProgram = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_weekly_programs")
      .select("*")
      .eq("user_id", user.id);

    if (error) return;

    if (data && data.length > 0) {
      const loadedProgram: Record<number, string[]> = {};
      const loadedSecondaryExercises: Record<number, string[]> = {};
      let hasSecondary = false;

      data.forEach((item) => {
        // Parse muscle groups (stored as comma-separated string)
        loadedProgram[item.day_of_week] = item.muscle_group.split(',').filter(Boolean);
        
        if (item.secondary_muscle) {
          // Parse secondary exercises (stored as comma-separated string of UUIDs)
          loadedSecondaryExercises[item.day_of_week] = item.secondary_muscle.split(',').filter(Boolean);
          hasSecondary = true;
        }
      });
      
      setProgram(loadedProgram);
      setSecondaryExercises(loadedSecondaryExercises);
      setAdvancedMode(hasSecondary);
    }
  };

  const saveProgram = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Supprimer l'ancien programme
    await supabase
      .from("user_weekly_programs")
      .delete()
      .eq("user_id", user.id);

    // Insérer le nouveau programme
    const programData = Object.entries(program).map(([day, muscles]) => ({
      user_id: user.id,
      day_of_week: parseInt(day),
      muscle_group: muscles.join(','), // Store as comma-separated string
      secondary_muscle: advancedMode && secondaryExercises[parseInt(day)]?.length 
        ? secondaryExercises[parseInt(day)].join(',') // Store as comma-separated string
        : null,
    }));

    const { error } = await supabase
      .from("user_weekly_programs")
      .insert(programData);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Programme sauvegardé!" });
    setLoading(false);
    onSave?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mon programme hebdomadaire</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Mode avancé</Label>
              <p className="text-xs text-muted-foreground">Ajouter un muscle secondaire</p>
            </div>
            <Switch
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
            />
          </div>

          {DAYS.map((day) => (
            <div key={day.value} className="space-y-3 p-3 border rounded-lg">
              <Label className="text-sm font-medium">{day.label}</Label>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Muscles principaux</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MUSCLE_GROUPS.map((muscle) => {
                    const isChecked = program[day.value]?.includes(muscle.value) || false;
                    return (
                      <div key={muscle.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${day.value}-${muscle.value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const current = program[day.value] || [];
                            if (checked) {
                              setProgram({ ...program, [day.value]: [...current, muscle.value] });
                            } else {
                              setProgram({ ...program, [day.value]: current.filter(m => m !== muscle.value) });
                            }
                          }}
                        />
                        <Label htmlFor={`${day.value}-${muscle.value}`} className="text-xs cursor-pointer">
                          {muscle.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {advancedMode && !program[day.value]?.includes("rest") && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Exercices secondaires</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {exercises
                      .filter(ex => !program[day.value]?.includes(ex.category))
                      .map((exercise) => {
                        const isChecked = secondaryExercises[day.value]?.includes(exercise.id) || false;
                        return (
                          <div key={exercise.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${day.value}-ex-${exercise.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const current = secondaryExercises[day.value] || [];
                                if (checked) {
                                  setSecondaryExercises({ ...secondaryExercises, [day.value]: [...current, exercise.id] });
                                } else {
                                  setSecondaryExercises({ ...secondaryExercises, [day.value]: current.filter(e => e !== exercise.id) });
                                }
                              }}
                            />
                            <Label htmlFor={`${day.value}-ex-${exercise.id}`} className="text-xs cursor-pointer">
                              {exercise.name}
                            </Label>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ))}
          <Button onClick={saveProgram} className="w-full" disabled={loading}>
            {loading ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
