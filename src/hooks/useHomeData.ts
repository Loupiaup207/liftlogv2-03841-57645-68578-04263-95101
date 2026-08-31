import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-helpers";
import { epley1RM } from "@/lib/progression";

export interface WeightPoint {
  date: string;
  value: number;
}

export interface ProgramDay {
  day: number; // 0 = dimanche
  label: string;
  title: string;
  done: boolean;
  isToday: boolean;
  isRest: boolean;
}

export interface HomeMetrics {
  strength: number;
  endurance: number;
  volume: number;
  regularity: number;
  global: number;
  workoutsThisWeek: number;
  volumeThisWeek: number;
  totalWorkouts: number;
  totalVolume: number;
}

export interface HomeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goals: { calories: number; protein: number; carbs: number; fat: number };
}

export interface HomeData {
  loading: boolean;
  metrics: HomeMetrics;
  streak: number;
  nutrition: HomeNutrition;
  program: ProgramDay[];
  weights: WeightPoint[];
  reload: () => void;
}

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const dayKey = (d: Date) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};

/** Lundi de la semaine en cours */
const startOfWeek = (ref = new Date()) => {
  const d = new Date(ref);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const pctChange = (curr: number, prev: number) => {
  if (prev <= 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
};

const emptyMetrics: HomeMetrics = {
  strength: 0,
  endurance: 0,
  volume: 0,
  regularity: 0,
  global: 0,
  workoutsThisWeek: 0,
  volumeThisWeek: 0,
  totalWorkouts: 0,
  totalVolume: 0,
};

export const useHomeData = (): HomeData => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<HomeMetrics>(emptyMetrics);
  const [streak, setStreak] = useState(0);
  const [program, setProgram] = useState<ProgramDay[]>([]);
  const [weights, setWeights] = useState<WeightPoint[]>([]);
  const [nutrition, setNutrition] = useState<HomeNutrition>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    goals: { calories: 2500, protein: 150, carbs: 250, fat: 70 },
  });

  const readNutrition = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    let meals: any[] = [];
    try {
      meals = JSON.parse(localStorage.getItem("nutrition_meals") || "[]");
    } catch {
      meals = [];
    }
    const todayMeals = meals.filter((m) => (m.date || today) === today);
    const sum = (k: string) => todayMeals.reduce((a, m) => a + (Number(m[k]) || 0), 0);

    const { data: { user } } = await supabase.auth.getUser();
    let goals = { calories: 2500, protein: 150, carbs: 250, fat: 70 };
    if (user) {
      const { data } = await supabase
        .from("nutrition_goals")
        .select("daily_calories, daily_protein, daily_carbs, daily_fat")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        goals = {
          calories: data.daily_calories,
          protein: data.daily_protein,
          carbs: data.daily_carbs,
          fat: data.daily_fat,
        };
      }
    }
    setNutrition({
      calories: sum("calories"),
      protein: sum("protein"),
      carbs: sum("carbs"),
      fat: sum("fat"),
      goals,
    });
  }, []);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: workouts }, { data: templates }, { data: weekly }, { data: bwLogs }] = await Promise.all([
      supabase
        .from("workouts")
        .select("id, name, started_at, completed_at, workout_sets(reps, weight, additional_weight, exercise_id)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(50000),

      supabase.from("session_templates").select("name, days_of_week").eq("user_id", user.id),
      supabase.from("user_weekly_programs").select("day_of_week, muscle_group").eq("user_id", user.id),
      supabase
        .from("bodyweight_logs")
        .select("weight, logged_at")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: true })
        .limit(2000),
    ]);

    const sessions = (workouts || []).map((w: any) => ({
      date: dayKey(new Date(w.completed_at || w.started_at)),
      ts: new Date(w.completed_at || w.started_at).getTime(),
      sets: (w.workout_sets || []).map((s: any) => ({
        reps: Number(s.reps) || 0,
        weight: (Number(s.weight) || 0) + (Number(s.additional_weight) || 0),
        exercise_id: s.exercise_id,
      })),
    }));

    // --- Semaine courante (stats rapides) --------------------------------
    const weekStart = startOfWeek().getTime();
    const WEEK = 7 * 86400000;
    const chrono = [...sessions].sort((a, b) => a.ts - b.ts);
    const cur = chrono.filter((s) => s.ts >= weekStart);

    const volumeOf = (arr: typeof sessions) =>
      arr.reduce((a, s) => a + s.sets.reduce((b, x) => b + x.weight * x.reps, 0), 0);

    // --- Progression all-time par exercice (inspirée de l'onglet Stats) ---
    // Pour chaque exercice : meilleur 1RM/reps de la 1ère séance vs la dernière
    const exFirst: Record<string, { rm: number; reps: number }> = {};
    const exLast: Record<string, { rm: number; reps: number }> = {};
    const exCount: Record<string, number> = {};
    chrono.forEach((s) => {
      const best: Record<string, { rm: number; reps: number }> = {};
      s.sets.forEach((x) => {
        const rm = epley1RM(x.weight, x.reps);
        if (rm > (best[x.exercise_id]?.rm || 0)) best[x.exercise_id] = { rm, reps: x.reps };
      });
      Object.entries(best).forEach(([id, b]) => {
        if (!exFirst[id]) exFirst[id] = b;
        exLast[id] = b;
        exCount[id] = (exCount[id] || 0) + 1;
      });
    });

    const avgProg = (key: "rm" | "reps") => {
      const vals = Object.keys(exFirst)
        .filter((id) => (exCount[id] || 0) > 1)
        .map((id) => pctChange(exLast[id][key], exFirst[id][key]));
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    };

    const strength = avgProg("rm");
    const endurance = avgProg("reps");

    // Volume : moyenne des 4 dernières semaines vs les 4 précédentes
    const last4 = chrono.filter((s) => s.ts >= weekStart - 3 * WEEK);
    const prev4 = chrono.filter((s) => s.ts >= weekStart - 7 * WEEK && s.ts < weekStart - 3 * WEEK);
    const volume = pctChange(volumeOf(last4) / 4, volumeOf(prev4) / 4);

    // Régularité : séances des 30 derniers jours vs les 30 précédents
    const now = Date.now();
    const d30 = 30 * 86400000;
    const regularity = pctChange(
      chrono.filter((s) => s.ts >= now - d30).length,
      chrono.filter((s) => s.ts >= now - 2 * d30 && s.ts < now - d30).length
    );

    const score = (v: number) => Math.max(0, Math.min(100, 50 + v * 2));
    const global = Math.round((score(strength) + score(endurance) + score(volume) + score(regularity)) / 4);

    setMetrics({
      strength,
      endurance,
      volume,
      regularity,
      global,
      workoutsThisWeek: cur.length,
      volumeThisWeek: Math.round(volumeOf(cur)),
      totalWorkouts: chrono.length,
      totalVolume: Math.round(volumeOf(chrono)),
    });

    // --- Streak ----------------------------------------------------------
    const days = new Set(sessions.map((s) => s.date));
    let count = 0;
    const cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(dayKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(count);

    // --- Programme de la semaine ----------------------------------------
    const todayIdx = new Date().getDay();
    const weekDays: ProgramDay[] = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (i + 1) % 7; // lundi -> dimanche
      const date = new Date(startOfWeek());
      date.setDate(date.getDate() + i);
      const key = dayKey(date);
      const tplNames = (templates || [])
        .filter((t: any) => (t.days_of_week || []).includes(dayIndex))
        .map((t: any) => t.name);
      const muscle = (weekly || []).find((w: any) => w.day_of_week === dayIndex)?.muscle_group;
      const title = tplNames.length ? tplNames.join(" · ") : muscle || "Repos";
      weekDays.push({
        day: dayIndex,
        label: DAY_LABELS[dayIndex],
        title,
        done: days.has(key),
        isToday: dayIndex === todayIdx,
        isRest: !tplNames.length && !muscle,
      });
    }
    setProgram(weekDays);

    // --- Poids ------------------------------------------------------------
    const map = new Map<string, number>();
    (bwLogs || []).forEach((l: any) => map.set(dayKey(new Date(l.logged_at)), Number(l.weight)));
    try {
      const local = JSON.parse(localStorage.getItem("transform_weight") || "[]");
      local.forEach((l: any) => l?.date && map.set(l.date, Number(l.value)));
    } catch {
      /* ignore */
    }
    setWeights(
      Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, value]) => ({ date, value }))
    );

    setLoading(false);
  }, []);

  const reload = useCallback(() => {
    load();
    readNutrition();
  }, [load, readNutrition]);

  useEffect(() => {
    reload();
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === "home") reload();
    };
    window.addEventListener("liftlog:tab-open", handler);
    return () => window.removeEventListener("liftlog:tab-open", handler);
  }, [reload]);

  return { loading, metrics, streak, nutrition, program, weights, reload };
};
