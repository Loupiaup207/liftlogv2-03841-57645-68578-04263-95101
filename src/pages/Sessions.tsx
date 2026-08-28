import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { SessionTemplateDialog } from "@/components/SessionTemplateDialog";
import { SessionRunner, RunnerExercise } from "@/components/SessionRunner";

interface Template {
  id: string;
  name: string;
  days_of_week: number[];
  exercises: RunnerExercise[];
}

const DAY_LABELS: Record<number, string> = { 0: "Dim", 1: "Lun", 2: "Mar", 3: "Mer", 4: "Jeu", 5: "Ven", 6: "Sam" };

const Sessions = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [runner, setRunner] = useState<Template | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: tpls, error } = await supabase
      .from("session_templates")
      .select("id, name, days_of_week")
      .eq("user_id", user.id)
      .order("created_at");
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    const ids = (tpls || []).map((t) => t.id);
    let rows: any[] = [];
    if (ids.length > 0) {
      const { data } = await supabase
        .from("session_template_exercises")
        .select("*, exercises(name)")
        .in("template_id", ids)
        .order("order_index");
      rows = data || [];
    }
    setTemplates(
      (tpls || []).map((t) => ({
        id: t.id,
        name: t.name,
        days_of_week: t.days_of_week || [],
        exercises: rows
          .filter((r) => r.template_id === t.id)
          .map((r) => ({
            exercise_id: r.exercise_id,
            name: r.exercises?.name || "Exercice",
            target_sets: r.target_sets,
            target_reps: r.target_reps,
            target_weight: r.target_weight,
            rest_seconds: r.rest_seconds,
            notes: r.notes,
          })),
      }))
    );
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().getDay();
  const todaySessions = templates.filter((t) => t.days_of_week.includes(today));

  const remove = async (id: string) => {
    const { error } = await supabase.from("session_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Séance supprimée" });
    load();
  };

  return (
    <div className="px-4 sm:px-6 space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-light tracking-wide">SÉANCES</h1>
        <Button
          variant="minimal"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            setEditingId(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Séance du jour */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Séance du jour</p>
        {todaySessions.length === 0 ? (
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Aucune séance prévue aujourd'hui.</p>
          </Card>
        ) : (
          todaySessions.map((t) => (
            <Card key={t.id} className="p-4 space-y-3 border-primary/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t.name}</p>
                <Badge variant="secondary" className="text-[10px]">{t.exercises.length} exos</Badge>
              </div>
              <div className="space-y-1">
                {t.exercises.map((ex) => (
                  <div key={ex.exercise_id} className="flex justify-between text-[11px] text-muted-foreground">
                    <span className="truncate pr-2">{ex.name}</span>
                    <span className="shrink-0">
                      {ex.target_sets} × {ex.target_reps}
                      {ex.target_weight ? ` @ ${ex.target_weight} kg` : ""}
                    </span>
                  </div>
                ))}
              </div>
              <Button className="w-full h-10" onClick={() => setRunner(t)} disabled={t.exercises.length === 0}>
                <Play className="h-4 w-4 mr-2" />
                Démarrer / Reprendre
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Programmes */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Mes séances (modèles)</p>
        {templates.length === 0 && (
          <Card className="p-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Crée ta première séance avec le bouton +.</p>
          </Card>
        )}
        {templates.map((t) => (
          <Card key={t.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.days_of_week.length > 0
                    ? t.days_of_week.slice().sort().map((d) => DAY_LABELS[d]).join(" · ")
                    : "Aucun jour"}{" "}
                  · {t.exercises.length} exercices
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingId(t.id);
                    setEditorOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <SessionTemplateDialog open={editorOpen} onOpenChange={setEditorOpen} templateId={editingId} onSaved={load} />

      {runner && (
        <SessionRunner
          open={!!runner}
          onOpenChange={(v) => !v && setRunner(null)}
          template={{ id: runner.id, name: runner.name }}
          plannedExercises={runner.exercises}
          onFinished={load}
        />
      )}
    </div>
  );
};

export default Sessions;
