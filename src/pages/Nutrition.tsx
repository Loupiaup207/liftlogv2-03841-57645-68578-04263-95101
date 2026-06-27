import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Dumbbell, UtensilsCrossed, User, Trash2, Target, Settings, Camera, TrendingUp, Footprints, Scale, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar,
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
  const [isAddMode, setIsAddMode] = useState<"manual" | "library" | "food" | "ai">("library");
  const [isGoalsDialogOpen, setIsGoalsDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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

  // Macro detail + transformation
  const [macroDetail, setMacroDetail] = useState<null | "protein" | "carbs" | "fat">(null);
  const [isTransformOpen, setIsTransformOpen] = useState(false);
  const [weightLogs, setWeightLogs] = useState<{ date: string; value: number }[]>([]);
  const [stepLogs, setStepLogs] = useState<{ date: string; value: number }[]>([]);
  const [photos, setPhotos] = useState<{ id: string; date: string; data: string; note?: string }[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [newSteps, setNewSteps] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [comparePhotos, setComparePhotos] = useState<[string | null, string | null]>([null, null]);

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
    const ob = localStorage.getItem("nutrition_onboard_data");
    if (ob) setOnboard(JSON.parse(ob));
    const w = localStorage.getItem("transform_weight"); if (w) setWeightLogs(JSON.parse(w));
    const s = localStorage.getItem("transform_steps"); if (s) setStepLogs(JSON.parse(s));
    const p = localStorage.getItem("transform_photos"); if (p) setPhotos(JSON.parse(p));
  }, []);

  const persistOnboard = (o: typeof onboard) => {
    setOnboard(o);
    localStorage.setItem("nutrition_onboard_data", JSON.stringify(o));
  };

  const addWeightLog = () => {
    const v = Number(newWeight);
    if (!v) return;
    const date = new Date().toISOString().slice(0, 10);
    const updated = [...weightLogs.filter(l => l.date !== date), { date, value: v }].sort((a, b) => a.date.localeCompare(b.date));
    setWeightLogs(updated);
    localStorage.setItem("transform_weight", JSON.stringify(updated));
    setNewWeight("");
    toast({ title: "Poids enregistré" });
  };

  const addStepLog = () => {
    const v = Number(newSteps);
    if (!v) return;
    const date = new Date().toISOString().slice(0, 10);
    const updated = [...stepLogs.filter(l => l.date !== date), { date, value: v }].sort((a, b) => a.date.localeCompare(b.date));
    setStepLogs(updated);
    localStorage.setItem("transform_steps", JSON.stringify(updated));
    setNewSteps("");
    toast({ title: "Pas enregistrés" });
  };

  const addPhoto = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const entry = { id: Date.now().toString(), date: new Date().toISOString().slice(0, 10), data, note: photoNote };
      const updated = [entry, ...photos];
      setPhotos(updated);
      try { localStorage.setItem("transform_photos", JSON.stringify(updated)); }
      catch { toast({ title: "Stockage plein", variant: "destructive" }); }
      setPhotoNote("");
      toast({ title: "Photo ajoutée" });
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    localStorage.setItem("transform_photos", JSON.stringify(updated));
    setComparePhotos(([a, b]) => [a === id ? null : a, b === id ? null : b]);
  };


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

  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = meals.filter(m => (m.date || today) === today);
  const totalCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProtein = todayMeals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbs = todayMeals.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFat = todayMeals.reduce((sum, meal) => sum + meal.fat, 0);

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
    const updated = [...customFoods, { id: Date.now().toString(), ...food }];
    setCustomFoods(updated);
    localStorage.setItem("nutrition_customFoods", JSON.stringify(updated));
    toast({ title: "Aliment enregistré" });
    setIsAddMode("library");
  };

  const deleteCustomFood = (id: string) => {
    const updated = customFoods.filter(f => f.id !== id);
    setCustomFoods(updated);
    localStorage.setItem("nutrition_customFoods", JSON.stringify(updated));
  };

  const quickAddFromFood = (food: any, grams: number) => {
    const g = Number(grams) > 0 ? Number(grams) : 100;
    const factor = g / 100;
    const round1 = (n: number) => Math.round(n * 10) / 10;
    const meal: Meal = {
      id: Date.now().toString(),
      name: `${food.name} (${g}g)`,
      calories: Math.round((food.cal || 0) * factor),
      protein: round1((food.protein || 0) * factor),
      carbs: round1((food.carbs || 0) * factor),
      fat: round1((food.fat || 0) * factor),
      date: new Date().toISOString().slice(0, 10),
    };
    const updated = [...meals, meal];
    setMeals(updated);
    localStorage.setItem("nutrition_meals", JSON.stringify(updated));
    setIsDialogOpen(false);
    toast({ title: `${food.name} ajouté`, description: `${meal.calories} kcal` });
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

  const MEAL_TYPES = [
    { id: "petit-dej", label: "Petit-déj" },
    { id: "dejeuner", label: "Déjeuner" },
    { id: "diner", label: "Dîner" },
    { id: "collation", label: "Collation" },
    { id: "autre", label: "Autre" },
  ];

  // Small inline component to create a custom food
  const CreateFoodForm = ({ onSave }: { onSave: (f: any) => void }) => {
    const [name, setName] = useState("");
    const [cal, setCal] = useState("");
    const [protein, setProtein] = useState("");
    const [carbs, setCarbs] = useState("");
    const [fat, setFat] = useState("");
    const [mealType, setMealType] = useState("dejeuner");
    return (
      <div className="space-y-3">
        <div><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Salade poulet" /></div>
        <div>
          <Label>Type de repas</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {MEAL_TYPES.map(t => (
              <Button key={t.id} type="button" size="sm" variant={mealType === t.id ? "default" : "ghost"} onClick={() => setMealType(t.id)}>
                {t.label}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground -mb-1">Valeurs nutritionnelles pour 100g</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Calories (kcal)</Label>
            <Input type="number" inputMode="decimal" min="0" placeholder="0" value={cal} onChange={(e) => setCal(e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px]">Protéines (g)</Label>
            <Input type="number" inputMode="decimal" min="0" placeholder="0" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px]">Glucides (g)</Label>
            <Input type="number" inputMode="decimal" min="0" placeholder="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px]">Lipides (g)</Label>
            <Input type="number" inputMode="decimal" min="0" placeholder="0" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => {
          if (!name.trim()) return toast({ title: 'Nom requis', variant: 'destructive' });
          if (!cal || Number(cal) <= 0) return toast({ title: 'Calories requises (> 0)', variant: 'destructive' });
          onSave({ name: name.trim(), cal: Number(cal) || 0, protein: Number(protein) || 0, carbs: Number(carbs) || 0, fat: Number(fat) || 0, mealType });
          setName(""); setCal(""); setProtein(""); setCarbs(""); setFat("");
        }} className="w-full">Enregistrer l'aliment</Button>
      </div>
    );
  };

  const LibraryPicker = () => {
    const [grams, setGrams] = useState<Record<string, string>>({});
    const [filter, setFilter] = useState<string>("all");
    if (customFoods.length === 0) {
      return (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-muted-foreground">Aucun aliment enregistré</p>
          <Button variant="outline" onClick={() => setIsAddMode("food")}>Créer mon premier aliment</Button>
        </div>
      );
    }
    const grouped = MEAL_TYPES.map(t => ({
      ...t,
      items: customFoods.filter(f => (f.mealType || "autre") === t.id),
    })).filter(g => g.items.length > 0);
    const visibleGroups = filter === "all" ? grouped : grouped.filter(g => g.id === filter);
    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        <div className="flex flex-wrap gap-1 sticky top-0 bg-background pb-1 z-10">
          <Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>Tous</Button>
          {MEAL_TYPES.map(t => (
            <Button key={t.id} size="sm" variant={filter === t.id ? "default" : "ghost"} onClick={() => setFilter(t.id)}>
              {t.label}
            </Button>
          ))}
        </div>
        {visibleGroups.map(group => (
          <div key={group.id} className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">{group.label}</p>
            {group.items.map((f) => {
              const g = grams[f.id] ?? "100";
              return (
                <Card key={f.id} className="p-3 bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {f.cal} kcal · P {f.protein}g · G {f.carbs}g · L {f.fat}g / 100g
                      </p>
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      className="w-16 h-8 text-xs"
                      value={g}
                      onChange={(e) => setGrams({ ...grams, [f.id]: e.target.value })}
                    />
                    <span className="text-[10px] text-muted-foreground">g</span>
                    <Button size="sm" className="h-8" onClick={() => quickAddFromFood(f, Number(g) || 100)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteCustomFood(f.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
        <Button variant="outline" className="w-full" onClick={() => setIsAddMode("food")}>
          <Plus className="h-3 w-3 mr-1" /> Créer un nouvel aliment
        </Button>
      </div>
    );
  };


  const AIEstimator = ({ onEstimate }: { onEstimate: (e: any) => void }) => {
    const [text, setText] = useState("");
    return (
      <div className="space-y-2">
        <Label>Décrire l'aliment (ex: "100g chicken")</Label>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="ex: 150g chicken breast" />
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
      <div className="px-4 pb-4 space-y-3">
        {/* Calories Donut */}
        {(() => {
          const consumed = Math.min(totalCalories, goals.daily_calories);
          const remaining = Math.max(0, goals.daily_calories - totalCalories);
          const over = Math.max(0, totalCalories - goals.daily_calories);
          const donutData = over > 0
            ? [{ name: "Consommées", value: goals.daily_calories }, { name: "Dépassement", value: over }]
            : [{ name: "Consommées", value: consumed }, { name: "Restantes", value: remaining }];
          const COLORS = over > 0 ? ["hsl(var(--primary))", "#ef4444"] : ["hsl(var(--primary))", "hsl(var(--muted))"];
          return (
            <Card
              className="p-4 bg-card cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setIsCaloriesDetailOpen(true)}
            >
              <div className="flex items-center gap-4">
                <div className="relative h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        innerRadius={42}
                        outerRadius={58}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        {donutData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-light leading-none">{remainingCalories}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">restantes</p>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Calories</p>
                  <p className="text-sm">
                    <span className="font-medium">{totalCalories}</span>
                    <span className="text-muted-foreground"> / {goals.daily_calories} kcal</span>
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Target className="h-3 w-3" />
                    <span>Toucher pour détails</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })()}

        {/* Macro current totals */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 bg-card cursor-pointer hover:bg-accent transition-colors" onClick={() => setIsGoalsDialogOpen(true)}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Protéines</p>
            <p className="text-lg font-light mt-0.5">{totalProtein}g</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">/ {goals.daily_protein}g</p>
          </Card>
          <Card className="p-3 bg-card cursor-pointer hover:bg-accent transition-colors" onClick={() => setIsGoalsDialogOpen(true)}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Glucides</p>
            <p className="text-lg font-light mt-0.5">{totalCarbs}g</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">/ {goals.daily_carbs}g</p>
          </Card>
          <Card className="p-3 bg-card cursor-pointer hover:bg-accent transition-colors" onClick={() => setIsGoalsDialogOpen(true)}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lipides</p>
            <p className="text-lg font-light mt-0.5">{totalFat}g</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">/ {goals.daily_fat}g</p>
          </Card>
        </div>

        {/* Range selector */}
        <div className="flex gap-2">
          {([7, 14, 30] as const).map(r => (
            <Button key={r} variant={chartRange === r ? "default" : "ghost"} size="sm" className="flex-1 h-7 text-[11px]" onClick={() => setChartRange(r)}>
              {r}j
            </Button>
          ))}
        </div>

        {/* 3 macro evolution charts */}
        {(() => {
          const data = aggregateLastDays(chartRange);
          const macros = [
            { key: "protein", label: "Protéines", color: "#06b6d4", goal: goals.daily_protein },
            { key: "carbs", label: "Glucides", color: "#f59e0b", goal: goals.daily_carbs },
            { key: "fat", label: "Lipides", color: "#a855f7", goal: goals.daily_fat },
          ];
          return (
            <div className="space-y-2">
              {macros.map(m => (
                <Card key={m.key} className="p-3 bg-card">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] uppercase tracking-wider" style={{ color: m.color }}>{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">Obj. {m.goal}g</p>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={28} />
                        <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                        <Line type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Calories Detail Dialog */}
      <Dialog open={isCaloriesDetailOpen} onOpenChange={setIsCaloriesDetailOpen}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Détails caloriques</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 max-h-[75vh] overflow-y-auto">
            {/* Range selector */}
            <div className="flex gap-2">
              {([7, 14, 30] as const).map(r => (
                <Button key={r} variant={chartRange === r ? "default" : "ghost"} size="sm" className="flex-1 h-7 text-[11px]" onClick={() => setChartRange(r)}>
                  {r}j
                </Button>
              ))}
            </div>

            {/* Key stats grid */}
            {(() => {
              const data = aggregateLastDays(chartRange);
              const totalKcal = data.reduce((s, d) => s + d.cal, 0);
              const daysLogged = data.filter(d => d.cal > 0).length;
              const avg = daysLogged ? Math.round(totalKcal / daysLogged) : 0;
              const max = data.reduce((m, d) => d.cal > m.cal ? d : m, data[0]);
              const min = data.filter(d => d.cal > 0).reduce((m, d) => !m || d.cal < m.cal ? d : m, null as any);
              const overGoal = data.filter(d => d.cal > goals.daily_calories).length;
              const underGoal = data.filter(d => d.cal > 0 && d.cal < goals.daily_calories).length;
              const diff = avg - goals.daily_calories;
              // Streak: consecutive days from end with logged meals
              let streak = 0;
              for (let i = data.length - 1; i >= 0; i--) {
                if (data[i].cal > 0) streak++; else break;
              }
              // Weight projection: surplus/deficit kcal → kg (~7700 kcal = 1kg)
              const totalDelta = data.reduce((s, d) => s + (d.cal > 0 ? d.cal - goals.daily_calories : 0), 0);
              const weightDelta = (totalDelta / 7700).toFixed(2);

              const Stat = ({ label, value, sub, color }: any) => (
                <Card className="p-2.5 bg-card">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="text-base font-light mt-0.5" style={color ? { color } : undefined}>{value}</p>
                  {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
                </Card>
              );

              return (
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Moyenne/jour" value={`${avg} kcal`} sub={`sur ${daysLogged} j`} />
                  <Stat label="Écart objectif" value={`${diff > 0 ? '+' : ''}${diff} kcal`} color={diff > 0 ? '#ef4444' : '#10b981'} />
                  <Stat label="Total période" value={`${totalKcal} kcal`} sub={`${chartRange} jours`} />
                  <Stat label="Streak" value={`${streak} j`} sub="jours consécutifs" />
                  <Stat label="Jours au-dessus" value={`${overGoal}`} sub="dépassements" color="#ef4444" />
                  <Stat label="Jours en-dessous" value={`${underGoal}`} color="#10b981" />
                  <Stat label="Jour max" value={max ? `${max.cal} kcal` : '—'} sub={max?.day} />
                  <Stat label="Jour min" value={min ? `${min.cal} kcal` : '—'} sub={min?.day} />
                  <Card className="p-2.5 bg-card col-span-2">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Évolution poids estimée</p>
                    <p className="text-base font-light mt-0.5" style={{ color: Number(weightDelta) > 0 ? '#ef4444' : '#10b981' }}>
                      {Number(weightDelta) > 0 ? '+' : ''}{weightDelta} kg
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Basé sur ±7700 kcal = 1 kg</p>
                  </Card>
                </div>
              );
            })()}

            {/* Calories remaining per day */}
            <Card className="p-3 bg-card">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Calories restantes / jour</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={aggregateLastDays(chartRange).map(d => ({ ...d, remaining: goals.daily_calories - d.cal }))}
                    margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={32} />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                    <Line type="monotone" dataKey="remaining" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} name="Restantes" />
                    <Line type="monotone" dataKey="cal" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Consommées" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Calories consumed bar trend */}
            <Card className="p-3 bg-card">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Tendance calorique vs objectif</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aggregateLastDays(chartRange)} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={32} />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                    <Line type="monotone" dataKey="cal" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} name="Consommées" />
                    <Line type="monotone" dataKey={() => goals.daily_calories} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Objectif" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>


            {/* Macro distribution today */}
            {(() => {
              const pData = [
                { name: "Protéines", value: totalProtein * 4, color: "#06b6d4" },
                { name: "Glucides", value: totalCarbs * 4, color: "#f59e0b" },
                { name: "Lipides", value: totalFat * 9, color: "#a855f7" },
              ].filter(d => d.value > 0);
              const totalKcal = pData.reduce((s, d) => s + d.value, 0) || 1;
              return (
                <Card className="p-3 bg-card">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Répartition macros — aujourd'hui</p>
                  {pData.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Aucun repas aujourd'hui</p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="h-36 w-36 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pData} dataKey="value" innerRadius={36} outerRadius={64} stroke="none">
                              {pData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} formatter={(v: any) => `${v} kcal`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {pData.map(d => (
                          <div key={d.name} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                            <span className="flex-1">{d.name}</span>
                            <span className="text-muted-foreground">{Math.round((d.value / totalKcal) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>


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
              <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Ajouter un repas</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2 overflow-y-auto flex-1 -mx-1 px-1">
                  <div className="flex gap-1 flex-wrap sticky top-0 bg-background z-10 pb-1">
                    <Button size="sm" variant={isAddMode === 'library' ? 'default' : 'ghost'} onClick={() => setIsAddMode('library')}>Bibliothèque</Button>
                    <Button size="sm" variant={isAddMode === 'manual' ? 'default' : 'ghost'} onClick={() => setIsAddMode('manual')}>Manuel</Button>
                    <Button size="sm" variant={isAddMode === 'food' ? 'default' : 'ghost'} onClick={() => setIsAddMode('food')}>Créer aliment</Button>
                    <Button size="sm" variant={isAddMode === 'ai' ? 'default' : 'ghost'} onClick={() => setIsAddMode('ai')}>IA</Button>
                  </div>

                  {isAddMode === 'library' && <LibraryPicker />}

                  {isAddMode === 'manual' && (
                    <>
                      <div>
                        <Label htmlFor="meal-name">Nom du repas</Label>
                        <Input id="meal-name" value={newMeal.name} onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })} placeholder="Petit déjeuner" />
                      </div>
                      <div>
                        <Label htmlFor="calories">Calories</Label>
                        <Input id="calories" type="number" inputMode="decimal" min="0" value={newMeal.calories} onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })} placeholder="500" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="protein">Protéines (g)</Label>
                          <Input id="protein" type="number" inputMode="decimal" min="0" value={newMeal.protein} onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })} placeholder="30" />
                        </div>
                        <div>
                          <Label htmlFor="carbs">Glucides (g)</Label>
                          <Input id="carbs" type="number" inputMode="decimal" min="0" value={newMeal.carbs} onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })} placeholder="50" />
                        </div>
                        <div>
                          <Label htmlFor="fat">Lipides (g)</Label>
                          <Input id="fat" type="number" inputMode="decimal" min="0" value={newMeal.fat} onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })} placeholder="15" />
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
                        setIsAddMode('manual');
                        toast({ title: 'Estimation chargée — vérifie et valide' });
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
          {todayMeals.length === 0 ? (
            <Card className="p-6 text-center bg-card">
              <p className="text-sm text-muted-foreground">Aucun repas ajouté aujourd'hui</p>
            </Card>
          ) : (
            todayMeals.map((meal) => (
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

          <Button
            variant="ghost"
            className="w-full mt-3 border border-border"
            onClick={() => setIsHistoryOpen(true)}
          >
            Voir l'historique
          </Button>
        </div>
      </main>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique nutrition</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {(() => {
              const past = meals.filter(m => (m.date || today) !== today);
              if (past.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-6">Aucun historique pour le moment</p>;
              }
              const byDay = new Map<string, Meal[]>();
              past.forEach(m => {
                const d = m.date || today;
                if (!byDay.has(d)) byDay.set(d, []);
                byDay.get(d)!.push(m);
              });
              const days = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));
              const dayNames = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
              return days.map(day => {
                const dayMeals = byDay.get(day)!;
                const cal = dayMeals.reduce((s, m) => s + m.calories, 0);
                const p = dayMeals.reduce((s, m) => s + m.protein, 0);
                const c = dayMeals.reduce((s, m) => s + m.carbs, 0);
                const f = dayMeals.reduce((s, m) => s + m.fat, 0);
                const date = new Date(day + "T00:00:00");
                const label = `${dayNames[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
                return (
                  <Card key={day} className="p-3 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-sm font-light">{cal} <span className="text-[10px] text-muted-foreground">kcal</span></p>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground mb-2">
                      <span>P: {p}g</span>
                      <span>G: {c}g</span>
                      <span>L: {f}g</span>
                      <span className="ml-auto">Obj. {goals.daily_calories}</span>
                    </div>
                    <div className="space-y-1">
                      {dayMeals.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-xs">
                          <span className="truncate flex-1">{m.name}</span>
                          <span className="text-muted-foreground ml-2">{m.calories} kcal</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => handleDeleteMeal(m.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Nutrition;
