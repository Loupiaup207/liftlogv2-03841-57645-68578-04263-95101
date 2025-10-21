import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";

interface MuscleSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMuscle: string;
  onSelect: (muscle: string) => void;
}

const MUSCLE_GROUPS = [
  { value: "chest", label: "Pectoraux", emoji: "💪" },
  { value: "back", label: "Dos", emoji: "🔙" },
  { value: "legs", label: "Jambes", emoji: "🦵" },
  { value: "shoulders", label: "Épaules", emoji: "🤷" },
  { value: "arms", label: "Bras", emoji: "💪" },
  { value: "core", label: "Abdos", emoji: "🔥" },
  { value: "rest", label: "Repos", emoji: "😴" },
];

export const MuscleSwapDialog = ({ open, onOpenChange, currentMuscle, onSelect }: MuscleSwapDialogProps) => {
  const { toast } = useToast();
  const currentDay = new Date().getDay();

  const handleChangeMuscle = async (newMuscle: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_weekly_programs")
      .upsert({
        user_id: user.id,
        day_of_week: currentDay,
        muscle_group: newMuscle,
        secondary_muscle: null,
      }, {
        onConflict: "user_id,day_of_week"
      });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    const muscleLabel = MUSCLE_GROUPS.find(m => m.value === newMuscle)?.label || newMuscle;
    toast({ title: `Programme mis à jour: ${muscleLabel}` });
    onSelect(newMuscle);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer le muscle du jour</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 mt-4">
          <p className="text-sm text-muted-foreground">
            Choisir un nouveau muscle pour aujourd'hui
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MUSCLE_GROUPS.map((muscle) => (
              <Button
                key={muscle.value}
                variant={currentMuscle === muscle.value ? "default" : "outline"}
                className="h-24 flex flex-col gap-2"
                onClick={() => handleChangeMuscle(muscle.value)}
              >
                <span className="text-4xl">{muscle.emoji}</span>
                <span className="text-xs font-medium">{muscle.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
