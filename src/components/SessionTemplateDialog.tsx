import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Check, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";

export interface TemplateExerciseDraft {
  id?: string;
  exercise_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  target_weight: number | null;
  rest_seconds: number;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateId: string | null;
  onSaved: () => void;
}

const DAYS = [
  { v: 1, l: "L" },
  { v: 2, l: "M" },
  { v: 3, l: "M" },
  { v: 4, l: "J" },
  { v: 5, l: "V" },
  { v: 6, l: "S" },
  { v: 0, l: "D" },
];

export const SessionTemplateDialog = ({ open, onOpenChange, templateId, onSaved }: Props) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [items, setItems] = useState<TemplateExerciseDraft[]>([]);
  const [library, setLibrary] = useState<{ id: string; name: string; category: string }[]>([]);
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadLibrary();
    if (templateId) loadTemplate(templateId);
    else {
      setName("");
      setDays([]);
      setItems([]);
    }
    setPicking(false);
    setSearch("");
  }, [open, templateId]);

  const loadLibrary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: exs }, { data: hidden }] = await Promise.all([
      supabase.from("exercises").select("id, name, category").order("name"),
      supabase.from("user_hidden_exercises").select("exercise_id").eq("user_id", user.id),
    ]);
    const hiddenIds = new Set((hidden || []).map((h) => h.exercise_id));
    setLibrary((exs || []).filter((e) => !hiddenIds.has(e.id)));
  };

  const loadTemplate = async (id: string) => {
    const { data: tpl } = await supabase.from("session_templates").select("*").eq("id", id).maybeSingle();
    if (tpl) {
      setName(tpl.name);
      setDays(tpl.days_of_week || []);
    }
    const { data: rows } = await supabase
      .from("session_template_exercises")
      .select("*, exercises(name)")
      .eq("template_id", id)
      .order("order_index");
    setItems(
      (rows || []).map((r: any) => ({
        id: r.id,
        exercise_id: r.exercise_id,
        name: r.exercises?.name || "Exercice",
        target_sets: r.target_sets,
        target_reps: r.target_reps,
        target_weight: r.target_weight,
        rest_seconds: r.rest_seconds,
        notes: r.notes,
      }))
    );
  };

  const filtered = useMemo(
    () => library.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())),
    [library, search]
  );

  const addExercise = (ex: { id: string; name: string }) => {
    setItems((prev) => [
      ...prev,
      { exercise_id: ex.id, name: ex.name, target_sets: 3, target_reps: 10, target_weight: null, rest_seconds: 90, notes: null },
    ]);
    setPicking(false);
    setSearch("");
  };

  const move = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const update = (i: number, patch: Partial<TemplateExerciseDraft>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let id = templateId;
      if (id) {
        await supabase.from("session_templates").update({ name: name.trim(), days_of_week: days }).eq("id", id);
        await supabase.from("session_template_exercises").delete().eq("template_id", id);
      } else {
        const { data, error } = await supabase
          .from("session_templates")
          .insert({ user_id: user.id, name: name.trim(), days_of_week: days })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      if (items.length > 0) {
        const { error } = await supabase.from("session_template_exercises").insert(
          items.map((it, idx) => ({
            template_id: id!,
            exercise_id: it.exercise_id,
            order_index: idx,
            target_sets: it.target_sets,
            target_reps: it.target_reps,
            target_weight: it.target_weight,
            rest_seconds: it.rest_seconds,
            notes: it.notes,
          }))
        );
        if (error) throw error;
      }
      toast({ title: templateId ? "Séance mise à jour" : "Séance créée" });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border" style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}>
          <DialogTitle className="text-base font-light tracking-wide">
            {templateId ? "Modifier la séance" : "Nouvelle séance"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <Label className="text-xs">Nom de la séance</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Push A" />
          </div>

          <div>
            <Label className="text-xs">Jours prévus</Label>
            <div className="flex gap-1.5 mt-1.5">
              {DAYS.map((d) => (
                <Button
                  key={d.v}
                  type="button"
                  variant={days.includes(d.v) ? "default" : "outline"}
                  className="flex-1 h-9 px-0 text-xs"
                  onClick={() => setDays((p) => (p.includes(d.v) ? p.filter((x) => x !== d.v) : [...p, d.v]))}
                >
                  {d.l}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {items.map((it, i) => (
              <Card key={`${it.exercise_id}-${i}`} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{it.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Séries</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-8 text-xs"
                      value={it.target_sets}
                      onChange={(e) => update(i, { target_sets: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Reps</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-8 text-xs"
                      value={it.target_reps}
                      onChange={(e) => update(i, { target_reps: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Poids</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="h-8 text-xs"
                      value={it.target_weight ?? ""}
                      onChange={(e) =>
                        update(i, { target_weight: e.target.value === "" ? null : parseFloat(e.target.value.replace(",", ".")) })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Repos (s)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-8 text-xs"
                      value={it.rest_seconds}
                      onChange={(e) => update(i, { rest_seconds: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <Input
                  className="h-8 text-xs"
                  placeholder="Note (optionnel)"
                  value={it.notes ?? ""}
                  onChange={(e) => update(i, { notes: e.target.value || null })}
                />
              </Card>
            ))}
          </div>

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
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-accent flex items-center justify-between"
                  >
                    <span className="text-xs">{ex.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{ex.category}</Badge>
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Button variant="outline" className="w-full h-10 text-sm" onClick={() => setPicking(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un exercice
            </Button>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border flex gap-2" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={save} disabled={saving}>
            <Check className="h-4 w-4 mr-1" />
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
