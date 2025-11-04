import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useState } from "react";

interface WorkoutSetInputProps {
  setNumber: number;
  onSave: (reps: number, weight: number, additionalWeight?: number) => void;
  onCancel: () => void;
  previousWeight?: number;
  isBodyweight?: boolean;
  userBodyweight?: number;
}

export const WorkoutSetInput = ({ 
  setNumber, 
  onSave, 
  onCancel, 
  previousWeight, 
  isBodyweight = false, 
  userBodyweight 
}: WorkoutSetInputProps) => {
  const [reps, setReps] = useState<string>("");
  const [isWeighted, setIsWeighted] = useState(false);
  const [additionalWeight, setAdditionalWeight] = useState<string>("");
  
  const displayWeight = isBodyweight && userBodyweight 
    ? `${userBodyweight} kg (poids du corps)` 
    : previousWeight 
    ? `${previousWeight} kg`
    : "";

  const handleSave = () => {
    const repsNum = parseInt(reps);
    
    if (isNaN(repsNum)) return;
    
    if (isBodyweight && userBodyweight) {
      const additionalWeightNum = isWeighted ? parseFloat(additionalWeight) || 0 : 0;
      onSave(repsNum, userBodyweight, additionalWeightNum);
    } else {
      const weightNum = parseFloat(previousWeight?.toString() || "0");
      if (isNaN(weightNum)) return;
      onSave(repsNum, weightNum);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-card rounded-lg border border-border">
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium w-12">Série {setNumber}</span>
        <Input
          type="number"
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-20"
          autoFocus
        />
        {isBodyweight ? (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{displayWeight}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{displayWeight}</span>
        )}
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
            <Check className="h-4 w-4 text-green-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <X className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </div>
      
      {isBodyweight && (
        <div className="flex items-center gap-2 pl-14">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isWeighted}
              onChange={(e) => setIsWeighted(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-xs">Lesté</span>
          </label>
          {isWeighted && (
            <Input
              type="number"
              placeholder="kg"
              value={additionalWeight}
              onChange={(e) => setAdditionalWeight(e.target.value)}
              className="w-20 h-7 text-xs"
              step="0.5"
            />
          )}
        </div>
      )}
    </div>
  );
};
