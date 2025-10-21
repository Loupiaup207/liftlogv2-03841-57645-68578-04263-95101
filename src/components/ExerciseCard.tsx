import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pin } from "lucide-react";

interface ExerciseCardProps {
  id?: string;
  name: string;
  category: string;
  equipment?: string;
  notes?: string;
  onAdd?: () => void;
  onClick?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  isPinned?: boolean;
  isCustom?: boolean;
}

const categoryColors: Record<string, string> = {
  chest: "bg-red-500/20 text-red-400 border-red-500/30",
  back: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  legs: "bg-green-500/20 text-green-400 border-green-500/30",
  shoulders: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  arms: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  core: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export const ExerciseCard = ({ id, name, category, equipment, notes, onAdd, onClick, onDelete, onPin, isPinned, isCustom }: ExerciseCardProps) => {
  return (
    <Card 
      className="p-3 flex items-center justify-between transition-all hover:bg-accent/80 cursor-pointer rounded-3xl border-2 border-border/40 backdrop-blur-sm"
      onClick={onClick}
    >
      <div className="flex-1">
        <h3 className="font-medium text-sm text-foreground">{name}</h3>
        <div className="flex gap-1.5 mt-1.5">
          <Badge variant="outline" className={`text-xs ${categoryColors[category]}`}>
            {category}
          </Badge>
          {equipment && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {equipment}
            </Badge>
          )}
        </div>
        {notes && <p className="text-xs text-muted-foreground mt-1.5">{notes}</p>}
      </div>
      <div className="flex gap-1">
        {onPin && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={isPinned ? "text-primary" : ""}
          >
            <Pin className={`h-4 w-4 ${isPinned ? "fill-current" : ""}`} />
          </Button>
        )}
        {onAdd && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </Card>
  );
};
