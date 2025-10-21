import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Dumbbell, UtensilsCrossed, User, Trash2, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const Nutrition = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const [newMeal, setNewMeal] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const [goals, setGoals] = useState({
    daily_calories: 2500,
    daily_protein: 150,
    daily_carbs: 250,
    daily_fat: 70,
    target_weight: null as number | null,
  });

  const [editedGoals, setEditedGoals] = useState(goals);

  useEffect(() => {
    loadNutritionGoals();
  }, []);

  const loadNutritionGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setGoals({
        daily_calories: data.daily_calories,
        daily_protein: data.daily_protein,
        daily_carbs: data.daily_carbs,
        daily_fat: data.daily_fat,
        target_weight: data.target_weight,
      });
      setEditedGoals({
        daily_calories: data.daily_calories,
        daily_protein: data.daily_protein,
        daily_carbs: data.daily_carbs,
        daily_fat: data.daily_fat,
        target_weight: data.target_weight,
      });
    }
  };

  const saveNutritionGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('nutrition_goals')
      .upsert({
        user_id: user.id,
        daily_calories: editedGoals.daily_calories,
        daily_protein: editedGoals.daily_protein,
        daily_carbs: editedGoals.daily_carbs,
        daily_fat: editedGoals.daily_fat,
        target_weight: editedGoals.target_weight,
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    } else {
      setGoals(editedGoals);
      setIsGoalsDialogOpen(false);
      toast({ title: "Objectifs enregistrés avec succès" });
    }
  };

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFat = meals.reduce((sum, meal) => sum + meal.fat, 0);

  const remainingCalories = goals.daily_calories - totalCalories;

  const handleAddMeal = () => {
    if (!newMeal.name || !newMeal.calories) {
      toast({ title: "Veuillez remplir au moins le nom et les calories", variant: "destructive" });
      return;
    }

    const meal: Meal = {
      id: Date.now().toString(),
      name: newMeal.name,
      calories: Number(newMeal.calories),
      protein: Number(newMeal.protein) || 0,
      carbs: Number(newMeal.carbs) || 0,
      fat: Number(newMeal.fat) || 0,
    };

    setMeals([...meals, meal]);
    setNewMeal({ name: "", calories: "", protein: "", carbs: "", fat: "" });
    setIsDialogOpen(false);
    toast({ title: "Repas ajouté avec succès" });
  };

  const handleDeleteMeal = (id: string) => {
    setMeals(meals.filter(meal => meal.id !== id));
    toast({ title: "Repas supprimé" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 animate-fade-in pt-12">
      {/* Header */}
      <header className="p-4 pb-2">
        <h1 className="text-xl font-light tracking-widest text-foreground">
          NUTRITION
        </h1>
      </header>

      {/* Widgets - Calories Overview */}
      <div className="px-4 pb-4 space-y-2">
        <Card 
          className="p-4 bg-card cursor-pointer hover:bg-accent transition-colors"
          onClick={() => setIsGoalsDialogOpen(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Calories restantes</p>
              <p className="text-3xl font-light tracking-wide mt-0.5">
                {remainingCalories}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Objectif</p>
              <p className="text-xl font-light">{goals.daily_calories}</p>
              <Target className="h-3 w-3 ml-auto mt-0.5 text-muted-foreground" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Card 
            className="p-3 bg-card cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setIsGoalsDialogOpen(true)}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Protéines</p>
            <p className="text-lg font-light mt-0.5">{totalProtein}g</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">/ {goals.daily_protein}g</p>
          </Card>
          <Card 
            className="p-3 bg-card cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setIsGoalsDialogOpen(true)}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Glucides</p>
            <p className="text-lg font-light mt-0.5">{totalCarbs}g</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">/ {goals.daily_carbs}g</p>
          </Card>
          <Card 
            className="p-3 bg-card cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setIsGoalsDialogOpen(true)}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lipides</p>
            <p className="text-lg font-light mt-0.5">{totalFat}g</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">/ {goals.daily_fat}g</p>
          </Card>
        </div>
      </div>

      {/* Goals Dialog */}
      <Dialog open={isGoalsDialogOpen} onOpenChange={setIsGoalsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier mes objectifs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="goal-calories">Objectif calories quotidien</Label>
              <Input
                id="goal-calories"
                type="number"
                value={editedGoals.daily_calories}
                onChange={(e) => setEditedGoals({ ...editedGoals, daily_calories: Number(e.target.value) })}
                placeholder="2500"
              />
            </div>
            <div>
              <Label htmlFor="goal-protein">Objectif protéines (g)</Label>
              <Input
                id="goal-protein"
                type="number"
                value={editedGoals.daily_protein}
                onChange={(e) => setEditedGoals({ ...editedGoals, daily_protein: Number(e.target.value) })}
                placeholder="150"
              />
            </div>
            <div>
              <Label htmlFor="goal-carbs">Objectif glucides (g)</Label>
              <Input
                id="goal-carbs"
                type="number"
                value={editedGoals.daily_carbs}
                onChange={(e) => setEditedGoals({ ...editedGoals, daily_carbs: Number(e.target.value) })}
                placeholder="250"
              />
            </div>
            <div>
              <Label htmlFor="goal-fat">Objectif lipides (g)</Label>
              <Input
                id="goal-fat"
                type="number"
                value={editedGoals.daily_fat}
                onChange={(e) => setEditedGoals({ ...editedGoals, daily_fat: Number(e.target.value) })}
                placeholder="70"
              />
            </div>
            <div>
              <Label htmlFor="target-weight">Poids cible (kg) - Optionnel</Label>
              <Input
                id="target-weight"
                type="number"
                step="0.1"
                value={editedGoals.target_weight || ""}
                onChange={(e) => setEditedGoals({ ...editedGoals, target_weight: e.target.value ? Number(e.target.value) : null })}
                placeholder="75.0"
              />
            </div>
            <Button onClick={saveNutritionGoals} className="w-full">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meals List */}
      <main className="flex-1 overflow-y-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-light tracking-wider">MES REPAS</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-full h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un repas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="meal-name">Nom du repas</Label>
                  <Input
                    id="meal-name"
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                    placeholder="Petit déjeuner, déjeuner..."
                  />
                </div>
                <div>
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="protein">Protéines (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      value={newMeal.protein}
                      onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="carbs">Glucides (g)</Label>
                    <Input
                      id="carbs"
                      type="number"
                      value={newMeal.carbs}
                      onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fat">Lipides (g)</Label>
                    <Input
                      id="fat"
                      type="number"
                      value={newMeal.fat}
                      onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })}
                      placeholder="15"
                    />
                  </div>
                </div>
                <Button onClick={handleAddMeal} className="w-full">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2 pb-4">
          {meals.length === 0 ? (
            <Card className="p-6 text-center bg-card">
              <p className="text-sm text-muted-foreground">Aucun repas ajouté aujourd'hui</p>
            </Card>
          ) : (
            meals.map((meal) => (
              <Card key={meal.id} className="p-3 bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">{meal.name}</h3>
                    <p className="text-xl font-light mt-0.5">{meal.calories} kcal</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>P: {meal.protein}g</span>
                      <span>G: {meal.carbs}g</span>
                      <span>L: {meal.fat}g</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteMeal(meal.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-card border-t border-border flex justify-around items-center py-3 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="flex flex-col gap-0.5 h-auto py-1.5"
          onClick={() => navigate("/")}
        >
          <Dumbbell className="h-5 w-5" />
          <span className="text-[10px]">Training</span>
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="flex flex-col gap-0.5 h-auto py-1.5 text-primary"
        >
          <UtensilsCrossed className="h-5 w-5" />
          <span className="text-[10px]">Nutrition</span>
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="flex flex-col gap-0.5 h-auto py-1.5"
          onClick={() => navigate("/profile")}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px]">Profil</span>
        </Button>
      </nav>
    </div>
  );
};

export default Nutrition;
