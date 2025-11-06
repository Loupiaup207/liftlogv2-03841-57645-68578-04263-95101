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
    <div className="flex flex-col gap-3 p-3 bg-card rounded-lg border border-border">
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
          <span className="text-xs text-muted-foreground flex-1">{displayWeight}</span>
        ) : (
          <span className="text-xs text-muted-foreground flex-1">{displayWeight}</span>
        )}
      </div>

      {isBodyweight && (
        <div className="flex items-center gap-2">
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
              type="number"
              placeholder="kg lest"
              value={additionalWeight}
              onChange={(e) => setAdditionalWeight(e.target.value)}
              className="w-24 h-9"
              step="0.5"
            />
          )}
        </div>
      )}
      
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Annuler
        </Button>
        <Button variant="default" size="sm" onClick={handleSave}>
          <Check className="h-4 w-4 mr-1" />
          Valider
        </Button>
      </div>
    </div>
  );
};
