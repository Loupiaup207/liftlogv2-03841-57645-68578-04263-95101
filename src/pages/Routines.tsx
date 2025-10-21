import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Play } from "lucide-react";
import { supabase } from "@/lib/supabase-helpers";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Routine {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const Routines = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoutine, setNewRoutine] = useState({ name: "", description: "" });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    setRoutines(data || []);
  };

  const createRoutine = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("routines").insert([
      { ...newRoutine, user_id: user.id }
    ]);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Routine créée!" });
    setIsDialogOpen(false);
    setNewRoutine({ name: "", description: "" });
    loadRoutines();
  };

  const startWorkout = async (routineId: string, routineName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("workouts")
      .insert([{ user_id: user.id, routine_id: routineId, name: routineName }])
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }

    navigate(`/workout/${data.id}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-wide">ROUTINES</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="minimal" size="icon">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Nouvelle routine</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={newRoutine.name}
                  onChange={(e) => setNewRoutine({ ...newRoutine, name: e.target.value })}
                  placeholder="Ex: Push Day"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newRoutine.description}
                  onChange={(e) => setNewRoutine({ ...newRoutine, description: e.target.value })}
                  placeholder="Description optionnelle"
                />
              </div>
              <Button onClick={createRoutine} className="w-full">
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {routines.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Aucune routine. Créez-en une pour commencer!
          </p>
        ) : (
          routines.map((routine) => (
            <Card key={routine.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{routine.name}</h3>
                  {routine.description && (
                    <p className="text-sm text-muted-foreground mt-1">{routine.description}</p>
                  )}
                </div>
                <Button
                  variant="minimal"
                  size="icon"
                  onClick={() => startWorkout(routine.id, routine.name)}
                >
                  <Play className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Routines;
