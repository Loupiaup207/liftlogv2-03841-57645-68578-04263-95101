import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles } from "lucide-react";
import type { RunnerExercise } from "@/components/SessionRunner";
import { buildSuggestions, epley1RM, Suggestion } from "@/lib/progression";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateName: string;
  exercises: RunnerExercise[];
  onConfirm: (adjusted: RunnerExercise[]) => void;
}

export const ProgressionDialog = ({ open, onOpenChange, templateName, exercises, onConfirm }: Props) => {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    buildSuggestions(exercises)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [open, exercises]);

  const patch = (id: string, p: Partial<Suggestion>) =>
    setItems((prev) => prev.map((i) => (i.exercise_id === id ? { ...i, ...p } : i)));

  const confirm = () => {
    const adjusted: RunnerExercise[] = items.map((i) => ({
      exercise_id: i.exercise_id,
      name: i.name,
      target_sets: Math.max(1, i.sets),
      target_reps: Math.max(1, i.reps),
      target_weight: i.weight > 0 ? i.weight : null,
      rest_seconds: i.rest_seconds,
      notes: i.notes,
    }));
    onConfirm(adjusted);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen p-0">
        <DialogHeader
          className="px-4 pt-4 pb-2 border-b border-border"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
        >
          <DialogTitle className="text-base font-light tracking-wide flex items-center gap-2 pr-8">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="truncate">Progression · {templateName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading && <p className="text-xs text-muted-foreground">Analyse de ton historique...</p>}

          {!loading && (
            <p className="text-[11px] text-muted-foreground">
              Propositions basées sur tes dernières performances. Modifie librement avant de démarrer.
            </p>
          )}

          {items.map((i) => {
            const newRm = epley1RM(i.weight, i.reps);
            return (
              <Card key={i.exercise_id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{i.name}</p>
                  {i.isFirstTime ? (
                    <Badge variant="secondary" className="text-[10px] shrink-0">Nouveau</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] shrink-0 tabular-nums">
                      1RM ≈ {i.oneRm ? i.oneRm.toFixed(1) : "–"} kg
                    </Badge>
                  )}
                </div>

                {i.last && (
                  <p className="text-[11px] text-muted-foreground">
                    Dernière séance ({i.last.date}) : {i.last.sets.length} × {Math.min(...i.last.sets.map((s) => s.reps))}
                    –{Math.max(...i.last.sets.map((s) => s.reps))} @ {Math.max(...i.last.sets.map((s) => s.weight))} kg
                  </p>
                )}

                <p className="text-[11px] text-primary flex items-start gap-1">
                  <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{i.reason}</span>
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Séries</p>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="h-9 text-sm"
                      value={i.sets}
                      onChange={(e) => patch(i.exercise_id, { sets: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Reps</p>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="h-9 text-sm"
                      value={i.reps}
                      onChange={(e) => patch(i.exercise_id, { reps: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Charge (kg)</p>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-9 text-sm"
                      value={String(i.weight)}
                      onChange={(e) =>
                        patch(i.exercise_id, { weight: parseFloat(e.target.value.replace(",", ".")) || 0 })
                      }
                    />
                  </div>
                </div>

                {newRm > 0 && (
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    1RM visé avec ces valeurs : {newRm.toFixed(1)} kg
                  </p>
                )}
              </Card>
            );
          })}
        </div>

        <div
          className="px-4 py-3 border-t border-border flex gap-2"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Button variant="outline" className="flex-1 h-11" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="flex-1 h-11" onClick={confirm} disabled={loading || items.length === 0}>
            Confirmer et démarrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
