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
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date?: string;
}

const Nutrition = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState<"manual" | "food" | "ai">("manual");
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const [isCaloriesDetailOpen, setIsCaloriesDetailOpen] = useState(false);
  const [chartRange, setChartRange] = useState<7 | 14 | 30>(14);
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

  // Onboarding + custom foods
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboard, setOnboard] = useState({ weight: "", height: "", age: "", sex: "male", activity: "moderate", goal: "maintenance" });
  const [customFoods, setCustomFoods] = useState<any[]>([]);

  useEffect(() => {
    loadNutritionGoals();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("nutrition_meals");
    if (stored) setMeals(JSON.parse(stored));
    const foods = localStorage.getItem("nutrition_customFoods");
    if (foods) setCustomFoods(JSON.parse(foods));
    const onboarded = localStorage.getItem("nutrition_onboarded");
    if (!onboarded) setShowOnboarding(true);
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
      localStorage.setItem("nutrition_onboarded", "1");
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
      date: new Date().toISOString().slice(0,10),
    };

    const updated = [...meals, meal];
    setMeals(updated);
    localStorage.setItem("nutrition_meals", JSON.stringify(updated));
    setNewMeal({ name: "", calories: "", protein: "", carbs: "", fat: "" });
    setIsDialogOpen(false);
    toast({ title: "Repas ajouté avec succès" });
  };

  const handleDeleteMeal = (id: string) => {
    const updated = meals.filter(meal => meal.id !== id);
    setMeals(updated);
    localStorage.setItem("nutrition_meals", JSON.stringify(updated));
    toast({ title: "Repas supprimé" });
  };

  const saveCustomFood = (food: any) => {
    const updated = [...customFoods, food];
    setCustomFoods(updated);
    localStorage.setItem("nutrition_customFoods", JSON.stringify(updated));
    toast({ title: "Aliment enregistré" });
  };

  const foodDb: Record<string, {cal: number; protein: number; carbs: number; fat: number}> = {
    chicken: { cal: 165, protein: 31, carbs: 0, fat: 3.6 },
    egg: { cal: 155, protein: 13, carbs: 1.1, fat: 11 },
    banana: { cal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    rice: { cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    bread: { cal: 265, protein: 9, carbs: 49, fat: 3.2 },
  };

  const estimateFromText = (text: string) => {
    const t = text.toLowerCase();
    for (const key of Object.keys(foodDb)) {
      if (t.includes(key)) {
        const db = foodDb[key];
        const gMatch = t.match(/(\d+)\s*g/);
        let grams = 100;
        if (gMatch) grams = Number(gMatch[1]);
        else {
          const nMatch = t.match(/(\d+)\s*(x|pieces|piece|pcs|p)*/);
          if (nMatch) grams = Number(nMatch[1]) * 100;
        }
        const factor = grams / 100;
        return {
          name: text,
          calories: Math.round(db.cal * factor),
          protein: Math.round(db.protein * factor),
          carbs: Math.round(db.carbs * factor),
          fat: Math.round(db.fat * factor),
        };
      }
    }
    return null;
  };

  const aggregateLastDays = (days = 14) => {
    const map = new Map<string, {cal: number; protein: number; carbs: number; fat: number}>();
    for (let i=days-1;i>=0;i--) {
      const d = new Date();
      d.setDate(d.getDate()-i);
      const key = d.toISOString().slice(0,10);
      map.set(key, {cal:0, protein:0, carbs:0, fat:0});
    }
    meals.forEach(m => {
      const d = (m.date || new Date().toISOString().slice(0,10));
      if (map.has(d)) {
        const cur = map.get(d)!;
        cur.cal += m.calories;
        cur.protein += m.protein;
        cur.carbs += m.carbs;
        cur.fat += m.fat;
      }
    });
    return Array.from(map.entries()).map(([day, v]) => ({day: day.slice(5), ...v}));
  };

  const computeGoalsFromOnboard = () => {
    const weight = Number(onboard.weight);
    const height = Number(onboard.height);
    const age = Number(onboard.age);
    const sex = onboard.sex;
    const activity = onboard.activity;
    if (!weight || !height || !age) return;
    // Mifflin-St Jeor
    let bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
    const activityFactors: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
    const tdee = Math.round(bmr * (activityFactors[activity] || 1.55));
    // goal modifier
    let kcal = tdee;
    if (onboard.goal === 'bulk') kcal = Math.round(tdee * 1.12);
    if (onboard.goal === 'dry_bulk') kcal = Math.round(tdee + 250);
    // protein: 2g/kg
    const proteinG = Math.round(2 * weight);
    // fats: 25% kcal
    const fatKcal = Math.round(kcal * 0.25);
    const fatG = Math.round(fatKcal / 9);
    const proteinKcal = proteinG * 4;
    const carbsKcal = Math.max(0, kcal - proteinKcal - fatKcal);
    const carbsG = Math.round(carbsKcal / 4);

    const newGoals = {
      daily_calories: kcal,
      daily_protein: proteinG,
      daily_carbs: carbsG,
      daily_fat: fatG,
      target_weight: null as number | null,
    };
    setEditedGoals(newGoals);
    // persist via existing save function
    setTimeout(() => saveNutritionGoals(), 200);
    setShowOnboarding(false);
  };

  const ChartSpark = ({ days = 14 }: { days?: number }) => {
    const data = aggregateLastDays(days);
    const maxVal = Math.max(...data.map(d => Math.max(d.protein, d.carbs, 1)));
    const w = 320; const h = 80; const pad = 8;
    return (
      <div className="p-2 bg-card rounded-md">
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          {data.map((d, i) => {
            const x = pad + (i * (w - pad * 2)) / (data.length - 1 || 1);
            const py = h - pad - (d.protein / maxVal) * (h - pad * 2);
            const cy = h - pad - (d.carbs / maxVal) * (h - pad * 2);
            return (
              <g key={d.day}>
                <circle cx={x} cy={py} r={2} fill="#06b6d4" />
                <circle cx={x} cy={cy} r={2} fill="#f59e0b" />
              </g>
            );
          })}
        </svg>
        <div className="flex text-[10px] text-muted-foreground mt-2 gap-3">
          <div className="flex items-center gap-1"><span className="h-2 w-2 bg-cyan-500 inline-block rounded-full"/> Protéines</div>
          <div className="flex items-center gap-1"><span className="h-2 w-2 bg-amber-500 inline-block rounded-full"/> Glucides</div>
        </div>
      </div>
    );
  };

  // Small inline component to create a custom food
  const CreateFoodForm = ({ onSave }: { onSave: (f:any) => void }) => {
    const [name, setName] = useState("");
    const [cal, setCal] = useState("");
    const [protein, setProtein] = useState("");
    const [carbs, setCarbs] = useState("");
    const [fat, setFat] = useState("");
    return (
      <div className="space-y-2">
        <div><Label>Nom</Label><Input value={name} onChange={(e)=>setName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="kcal /100g" value={cal} onChange={(e)=>setCal(e.target.value)} />
          <Input placeholder="prot g /100g" value={protein} onChange={(e)=>setProtein(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="carbs g /100g" value={carbs} onChange={(e)=>setCarbs(e.target.value)} />
          <Input placeholder="fat g /100g" value={fat} onChange={(e)=>setFat(e.target.value)} />
        </div>
        <Button onClick={() => {
          if (!name) return toast({ title: 'Nom requis', variant: 'destructive' });
          onSave({ name, cal: Number(cal)||0, protein: Number(protein)||0, carbs: Number(carbs)||0, fat: Number(fat)||0 });
        }} className="w-full">Enregistrer l'aliment</Button>
      </div>
    );
  };

  const AIEstimator = ({ onEstimate }:{onEstimate:(e:any)=>void}) => {
    const [text, setText] = useState("");
    return (
      <div className="space-y-2">
        <Label>Décrire l'aliment (ex: "100g chicken")</Label>
        <Input value={text} onChange={(e)=>setText(e.target.value)} placeholder="ex: 150g chicken breast" />
        <div className="flex gap-2">
          <Button onClick={() => { const est = estimateFromText(text); onEstimate(est); }}>Estimer</Button>
          <Button variant="ghost" onClick={() => setText('')}>Effacer</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 animate-fade-in pt-12">
      {/* Header */}
      <header className="p-4 pb-2">
        <h1 className="text-xl font-light tracking-widest text-foreground">
          NUTRITION
        </h1>
      </header>

      {/* Onboarding (first-open) */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informations de base</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Poids (kg)</Label>
              <Input value={onboard.weight} onChange={(e) => setOnboard({ ...onboard, weight: e.target.value })} />
            </div>
            <div>
              <Label>Taille (cm)</Label>
              <Input value={onboard.height} onChange={(e) => setOnboard({ ...onboard, height: e.target.value })} />
            </div>
            <div>
              <Label>Âge</Label>
              <Input value={onboard.age} onChange={(e) => setOnboard({ ...onboard, age: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={onboard.sex === 'male' ? 'default' : 'ghost'} onClick={() => setOnboard({ ...onboard, sex: 'male' })}>Homme</Button>
              <Button variant={onboard.sex === 'female' ? 'default' : 'ghost'} onClick={() => setOnboard({ ...onboard, sex: 'female' })}>Femme</Button>
              <Button variant={onboard.goal === 'bulk' ? 'default' : 'ghost'} onClick={() => setOnboard({ ...onboard, goal: 'bulk' })}>Prise de masse</Button>
            </div>
            <div>
              <Label>Activité</Label>
              <select className="w-full p-2 bg-input rounded" value={onboard.activity} onChange={(e) => setOnboard({ ...onboard, activity: e.target.value })}>
                <option value="sedentary">Sédentaire</option>
                <option value="light">Légère</option>
                <option value="moderate">Modérée</option>
                <option value="active">Active</option>
              </select>
            </div>
            <Button onClick={computeGoalsFromOnboard} className="w-full">Calculer et enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

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

        {/* Long-term chart */}
        <div className="mt-2">
          <ChartSpark days={14} />
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
                  <div className="flex gap-2">
                    <Button variant={isAddMode === 'manual' ? 'default' : 'ghost'} onClick={() => setIsAddMode('manual')}>Manuel</Button>
                    <Button variant={isAddMode === 'food' ? 'default' : 'ghost'} onClick={() => setIsAddMode('food')}>Créer aliment</Button>
                    <Button variant={isAddMode === 'ai' ? 'default' : 'ghost'} onClick={() => setIsAddMode('ai')}>Estimer (IA)</Button>
                  </div>

                  {isAddMode === 'manual' && (
                    <>
                      <div>
                        <Label htmlFor="meal-name">Nom du repas</Label>
                        <Input id="meal-name" value={newMeal.name} onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })} placeholder="Petit déjeuner" />
                      </div>
                      <div>
                        <Label htmlFor="calories">Calories</Label>
                        <Input id="calories" type="number" value={newMeal.calories} onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })} placeholder="500" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="protein">Protéines (g)</Label>
                          <Input id="protein" type="number" value={newMeal.protein} onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })} placeholder="30" />
                        </div>
                        <div>
                          <Label htmlFor="carbs">Glucides (g)</Label>
                          <Input id="carbs" type="number" value={newMeal.carbs} onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })} placeholder="50" />
                        </div>
                        <div>
                          <Label htmlFor="fat">Lipides (g)</Label>
                          <Input id="fat" type="number" value={newMeal.fat} onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })} placeholder="15" />
                        </div>
                      </div>
                      <Button onClick={handleAddMeal} className="w-full">Ajouter</Button>
                    </>
                  )}

                  {isAddMode === 'food' && (
                    <CreateFoodForm onSave={(f:any) => saveCustomFood(f)} />
                  )}

                  {isAddMode === 'ai' && (
                    <AIEstimator onEstimate={(est:any) => {
                      if (est) {
                        setNewMeal({ name: est.name, calories: String(est.calories), protein: String(est.protein), carbs: String(est.carbs), fat: String(est.fat) });
                        toast({ title: 'Estimation chargée' });
                      } else {
                        toast({ title: 'Aucune estimation trouvée', variant: 'destructive' });
                      }
                    }} />
                  )}
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
      {/* floating add button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button size="icon" className="rounded-full h-12 w-12" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>

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
