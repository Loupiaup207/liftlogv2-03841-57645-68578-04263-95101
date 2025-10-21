import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useState } from "react";

interface WorkoutSetInputProps {
  setNumber: number;
  onSave: (reps: number, weight: number) => void;
  onCancel: () => void;
  previousWeight?: number;
}

export const WorkoutSetInput = ({ setNumber, onSave, onCancel, previousWeight }: WorkoutSetInputProps) => {
  const [reps, setReps] = useState<string>("");
  const [weight, setWeight] = useState<string>(previousWeight?.toString() || "");

  const handleSave = () => {
    const repsNum = parseInt(reps);
    const weightNum = parseFloat(weight);
    
    if (isNaN(repsNum) || isNaN(weightNum)) return;
    onSave(repsNum, weightNum);
  };

  return (
    <div className="flex gap-2 items-center p-3 bg-card rounded-lg border border-border">
      <span className="text-sm font-medium w-12">Série {setNumber}</span>
      <Input
        type="number"
        placeholder="Reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="w-20"
        autoFocus
      />
      <Input
        type="number"
        placeholder="kg"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        className="w-20"
        step="0.5"
      />
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
          <Check className="h-4 w-4 text-green-400" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
          <X className="h-4 w-4 text-red-400" />
        </Button>
      </div>
    </div>
  );
};
