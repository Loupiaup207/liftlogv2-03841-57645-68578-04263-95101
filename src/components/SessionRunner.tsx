import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Flag, Lightbulb, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { useTimer, fmtTime } from "@/contexts/TimerContext";

export interface RunnerExercise {
  exercise_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  target_weight: number | null;
  rest_seconds: number;
  notes: string | null;
}

interface DoneSet {
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  planned_reps: number;
  planned_weight: number | null;
  rpe: number | null;
}

interface Draft {
  workoutId: string;
  templateId: string;
  startedAt: number;
  exercises: RunnerExercise[];
  done: DoneSet[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: { id: string; name: string };
  plannedExercises: RunnerExercise[];
  onFinished: () => void;
}

const todayKey = () => new Date().toISOString().slice(0, 10);
const draftKey = (templateId: string) => `liftlog_session_draft_${templateId}_${todayKey()}`;

export const SessionRunner = ({ open, onOpenChange, template, plannedExercises, onFinished }: Props) => {
  const { toast } = useToast();
  const timer = useTimer();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState<{ id: string; name: string; category: string }[]>([]);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [advice, setAdvice] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState<Record<string, { reps: string; weight: string; rpe: string }>>({});

  // ---- init / restore draft --------------------------------------------
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const raw = localStorage.getItem(draftKey(template.id));
        if (raw) {
          const parsed: Draft = JSON.parse(raw);
          setDraft(parsed);
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("workouts")
          .insert({ user_id: user.id, name: template.name, session_template_id: template.id })
          .select("id, started_at")
          .single();
        if (error) throw error;
        const d: Draft = {
          workoutId: data.id,
          templateId: template.id,
          startedAt: new Date(data.started_at || Date.now()).getTime(),
          exercises: plannedExercises,
          done: [],
        };
        localStorage.setItem(draftKey(template.id), JSON.stringify(d));
        setDraft(d);
      } catch (e: any) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, template.id]);

  const persist = (d: Draft) => {
    setDraft(d);
    try { localStorage.setItem(draftKey(d.templateId), JSON.stringify(d)); } catch {}
  };

  // ---- library for adding exercises today only -------------------------
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: exs }, { data: hidden }] = await Promise.all([
        supabase.from("exercises").select("id, name, category").order("name"),
        supabase.from("user_hidden_exercises").select("exercise_id").eq("user_id", user.id),
      ]);
      const hiddenIds = new Set((hidden || []).map((h) => h.exercise_id));
      setLibrary((exs || []).filter((e) => !hiddenIds.has(e.id)));
    })();
  }, [open]);

  // ---- assistant: analyse recent performance ---------------------------
  useEffect(() => {
    if (!open || !draft) return;
    const ids = draft.exercises.map((e) => e.exercise_id);
    if (ids.length === 0) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("workout_sets")
        .select("exercise_id, weight, reps, rpe, additional_weight, created_at, workouts!inner(user_id)")
        .in("exercise_id", ids)
        .eq("workouts.user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1500);

      const byEx: Record<string, any[]> = {};
      (data || []).forEach((s: any) => {
        (byEx[s.exercise_id] ||= []).push(s);
      });

      const result: Record<string, string> = {};
      Object.entries(byEx).forEach(([exId, sets]) => {
        const byDay: Record<string, any[]> = {};
        sets.forEach((s) => {
          const k = new Date(s.created_at).toISOString().slice(0, 10);
          (byDay[k] ||= []).push(s);
        });
        const days = Object.keys(byDay).sort().reverse();
        if (days.length === 0) return;
        const maxW = (k: string) => Math.max(...byDay[k].map((s) => (s.weight || 0) + (s.additional_weight || 0)));
        const avgRpe = (k: string) => {
          const r = byDay[k].map((s) => s.rpe).filter((x) => typeof x === "number");
          return r.length ? r.reduce((a: number, b: number) => a + b, 0) / r.length : null;
        };
        const rpes = days.slice(0, 3).map(avgRpe).filter((x): x is number => x !== null);
        const easy = rpes.length >= 2 && rpes.every((r) => r <= 6);
        const hard = rpes.length >= 2 && rpes.every((r) => r >= 9);

        if (easy) {
          result[exId] = "Plusieurs séances faciles : augmente progressivement (+2,5 kg).";
          return;
        }
        if (hard) {
          result[exId] = "Plusieurs séances difficiles : récupère davantage ou réduis légèrement la charge.";
          return;
        }
        if (days.length < 2) {
          result[exId] = "Pas assez d'historique : garde la charge prévue et note ta difficulté.";
          return;
        }
        const delta = maxW(days[0]) - maxW(days[1]);
        if (delta > 0) result[exId] = "Tu progresses : tente une légère augmentation (+2,5 kg).";
        else if (delta === 0) result[exId] = "Stable : conserve la charge et vise 1 rep de plus.";
        else result[exId] = "Léger recul : conserve la charge ou réduis-la légèrement.";
      });
      setAdvice(result);
    })();
  }, [open, draft?.exercises.length]);

  // ---- actions ----------------------------------------------------------
  const setInput = (key: string, patch: Partial<{ reps: string; weight: string; rpe: string }>) =>
    setInputs((p) => ({ ...p, [key]: { reps: "", weight: "", rpe: "", ...(p[key] || {}), ...patch } }));

  const validateSet = async (ex: RunnerExercise, setNumber: number) => {
    if (!draft) return;
    const key = `${ex.exercise_id}-${setNumber}`;
    const v = inputs[key] || { reps: "", weight: "", rpe: "" };
    const reps = parseInt(v.reps) || ex.target_reps;
    const weight = v.weight === "" ? ex.target_weight ?? 0 : parseFloat(v.weight.replace(",", ".")) || 0;
    const rpe = v.rpe === "" ? null : Math.min(10, Math.max(1, parseInt(v.rpe)));

    const { error } = await supabase.from("workout_sets").insert({
      workout_id: draft.workoutId,
      exercise_id: ex.exercise_id,
      set_number: setNumber,
      reps,
      weight,
      planned_reps: ex.target_reps,
      planned_weight: ex.target_weight,
      rest_seconds: ex.rest_seconds,
      rpe,
      completed: true,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    persist({
      ...draft,
      done: [
        ...draft.done,
        { exercise_id: ex.exercise_id, set_number: setNumber, reps, weight, planned_reps: ex.target_reps, planned_weight: ex.target_weight, rpe },
      ],
    });
    if (ex.rest_seconds > 0) timer.start(ex.rest_seconds);
  };

  const addTodayExercise = (ex: { id: string; name: string }) => {
    if (!draft) return;
    persist({
      ...draft,
      exercises: [
        ...draft.exercises,
        { exercise_id: ex.id, name: ex.name, target_sets: 3, target_reps: 10, target_weight: null, rest_seconds: 90, notes: null },
      ],
    });
    setPicking(false);
    setSearch("");
  };

  const removeTodayExercise = (exerciseId: string) => {
    if (!draft) return;
    persist({ ...draft, exercises: draft.exercises.filter((e) => e.exercise_id !== exerciseId) });
  };

  const updateToday = (exerciseId: string, patch: Partial<RunnerExercise>) => {
    if (!draft) return;
    persist({
      ...draft,
      exercises: draft.exercises.map((e) => (e.exercise_id === exerciseId ? { ...e, ...patch } : e)),
    });
  };

  const finish = async () => {
    if (!draft) return;
    const duration = Math.max(1, Math.round((Date.now() - draft.startedAt) / 1000));
    const { error } = await supabase
      .from("workouts")
      .update({ completed_at: new Date().toISOString(), duration_seconds: duration })
      .eq("id", draft.workoutId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    try { localStorage.removeItem(draftKey(draft.templateId)); } catch {}
    toast({ title: "Séance terminée 💪", description: `Durée : ${fmtTime(duration)}` });
    setDraft(null);
    onFinished();
    onOpenChange(false);
  };

  const filtered = useMemo(
    () => library.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())),
    [library, search]
  );

  const elapsed = draft ? Math.round((Date.now() - draft.startedAt) / 1000) : 0;
  const [, force] = useState(0);
  useEffect(() => {
    if (!open) return;
    const i = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}>
          <DialogTitle className="text-base font-light tracking-wide flex items-center justify-between pr-8">
            <span className="truncate">{template.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{fmtTime(elapsed)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading && <p className="text-xs text-muted-foreground">Chargement...</p>}

          {draft?.exercises.map((ex) => {
            const doneSets = draft.done.filter((d) => d.exercise_id === ex.exercise_id);
            return (
              <Card key={ex.exercise_id} className="p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Prévu : {ex.target_sets} × {ex.target_reps}
                      {ex.target_weight ? ` @ ${ex.target_weight} kg` : ""} · repos {ex.rest_seconds}s
                    </p>
                    {ex.notes && <p className="text-[11px] text-muted-foreground italic">{ex.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeTodayExercise(ex.exercise_id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Ajustements du jour */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Séries (auj.)</Label>
                    <Input
                      className="h-8 text-xs"
                      inputMode="numeric"
                      value={ex.target_sets}
                      onChange={(e) => updateToday(ex.exercise_id, { target_sets: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Reps (auj.)</Label>
                    <Input
                      className="h-8 text-xs"
                      inputMode="numeric"
                      value={ex.target_reps}
                      onChange={(e) => updateToday(ex.exercise_id, { target_reps: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Poids (auj.)</Label>
                    <Input
                      className="h-8 text-xs"
                      inputMode="decimal"
                      value={ex.target_weight ?? ""}
                      onChange={(e) =>
                        updateToday(ex.exercise_id, {
                          target_weight: e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")),
                        })
                      }
                    />
                  </div>
                </div>

                {/* Séries */}
                <div className="space-y-1.5">
                  {Array.from({ length: Math.max(ex.target_sets, doneSets.length) }).map((_, i) => {
                    const n = i + 1;
                    const done = doneSets.find((d) => d.set_number === n);
                    const key = `${ex.exercise_id}-${n}`;
                    const v = inputs[key] || { reps: "", weight: "", rpe: "" };
                    if (done) {
                      return (
                        <div key={n} className="flex items-center justify-between rounded-lg bg-accent/40 px-2.5 py-1.5">
                          <span className="text-[11px] text-muted-foreground">Série {n}</span>
                          <span className="text-[11px]">
                            prévu {done.planned_weight ?? "–"} kg × {done.planned_reps} → <b>{done.weight} kg × {done.reps}</b>
                            {done.rpe ? ` · RPE ${done.rpe}` : ""}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={n} className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground w-12 shrink-0">Série {n}</span>
                        <Input
                          className="h-8 text-xs flex-1 min-w-0"
                          inputMode="decimal"
                          placeholder={ex.target_weight != null ? `${ex.target_weight} kg` : "kg"}
                          value={v.weight}
                          onChange={(e) => setInput(key, { weight: e.target.value })}
                        />
                        <Input
                          className="h-8 text-xs w-14 shrink-0"
                          inputMode="numeric"
                          placeholder={`${ex.target_reps}`}
                          value={v.reps}
                          onChange={(e) => setInput(key, { reps: e.target.value })}
                        />
                        <Input
                          className="h-8 text-xs w-14 shrink-0"
                          inputMode="numeric"
                          placeholder="RPE"
                          value={v.rpe}
                          onChange={(e) => setInput(key, { rpe: e.target.value })}
                        />
                        <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => validateSet(ex, n)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {advice[ex.exercise_id] && (
                  <div className="flex gap-2 items-start rounded-lg bg-primary/10 px-2.5 py-2">
                    <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">{advice[ex.exercise_id]}</p>
                  </div>
                )}
              </Card>
            );
          })}

          {picking ? (
            <Card className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input autoFocus className="h-8 text-xs" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPicking(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filtered.map((ex) => (
                  <button key={ex.id} onClick={() => addTodayExercise(ex)} className="w-full text-left px-2 py-2 rounded-lg hover:bg-accent flex items-center justify-between">
                    <span className="text-xs">{ex.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{ex.category}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Button variant="outline" className="w-full h-10 text-sm" onClick={() => setPicking(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un exercice (aujourd'hui)
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Les modifications du jour ne changent pas le programme d'origine.
          </p>
        </div>

        <div className="px-4 py-3 border-t border-border flex gap-2" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Reprendre plus tard
          </Button>
          <Button className="flex-1" onClick={finish}>
            <Flag className="h-4 w-4 mr-1" />
            Séance terminée
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
