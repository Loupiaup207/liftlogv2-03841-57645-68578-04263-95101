import { useMemo } from "react";
import { Activity, Dumbbell, Flame, LineChart as LineChartIcon, Sparkles, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HomeCard, ProgressLine, Delta } from "@/components/home/HomeCard";
import { useHomeData } from "@/hooks/useHomeData";
import { cn } from "@/lib/utils";

interface HomeProps {
  onNavigate?: (target: "training" | "nutrition" | "sessions" | "statistics" | "activity") => void;
}

const Gauge = ({ value }: { value: number }) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} strokeWidth="8" className="stroke-muted" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={r}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          className="stroke-foreground transition-all duration-1000 ease-out"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-light tabular-nums">{value}</span>
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">score</span>
      </div>
    </div>
  );
};

const Home = ({ onNavigate }: HomeProps) => {
  const { loading, metrics, streak, nutrition, program, weights } = useHomeData();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

  const today = program.find((p) => p.isToday);
  const chartWeights = weights.slice(-30);
  const weightDelta =
    chartWeights.length > 1
      ? Math.round((chartWeights[chartWeights.length - 1].value - chartWeights[0].value) * 10) / 10
      : 0;

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-3 px-3 pb-8 pt-2">
      {/* En-tête */}
      <div className="animate-fade-in px-1 pb-1">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{greeting}</p>
        <h2 className="text-2xl font-light tracking-tight">
          {today?.isRest ? "Jour de repos" : today?.title || "Prêt à t'entraîner"}
        </h2>
      </div>

      {/* Score global */}
      <HomeCard delay={40} className="flex items-center gap-4" onClick={() => onNavigate?.("statistics")}>
        <Gauge value={loading ? 0 : metrics.global} />
        <div className="min-w-0 flex-1 space-y-2">
          {[
            { label: "Force", value: metrics.strength },
            { label: "Endurance", value: metrics.endurance },
            { label: "Volume", value: metrics.volume },
            { label: "Régularité", value: metrics.regularity },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <Delta value={m.value} />
            </div>
          ))}
        </div>
      </HomeCard>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        <HomeCard delay={80} className="p-3">
          <Flame className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-xl font-light tabular-nums">{streak}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">série j.</p>
        </HomeCard>
        <HomeCard delay={110} className="p-3">
          <Dumbbell className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-xl font-light tabular-nums">{metrics.totalWorkouts}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            séances ({metrics.workoutsThisWeek} sem.)
          </p>
        </HomeCard>
        <HomeCard delay={140} className="p-3">
          <Activity className="mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-xl font-light tabular-nums">{Math.round(metrics.totalVolume / 1000)}t</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            volume ({Math.round(metrics.volumeThisWeek / 1000)}t sem.)
          </p>
        </HomeCard>
      </div>

      {/* Nutrition */}
      <HomeCard
        delay={170}
        title="Nutrition du jour"
        icon={<Sparkles className="h-3.5 w-3.5 text-muted-foreground" />}
        onClick={() => onNavigate?.("nutrition")}
      >
        <div className="space-y-2.5">
          <ProgressLine label="Calories" value={nutrition.calories} goal={nutrition.goals.calories} unit="kcal" />
          <ProgressLine label="Protéines" value={nutrition.protein} goal={nutrition.goals.protein} unit="g" />
          <ProgressLine label="Glucides" value={nutrition.carbs} goal={nutrition.goals.carbs} unit="g" />
          <ProgressLine label="Lipides" value={nutrition.fat} goal={nutrition.goals.fat} unit="g" />
        </div>
      </HomeCard>

      {/* Programme de la semaine */}
      <HomeCard
        delay={200}
        title="Semaine"
        icon={<Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />}
        onClick={() => onNavigate?.("sessions")}
      >
        <div className="space-y-1">
          {program.map((d) => (
            <div
              key={d.day}
              className={cn(
                "flex items-center justify-between rounded-xl px-2.5 py-2",
                d.isToday && "bg-accent"
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    d.done ? "bg-foreground" : d.isRest ? "bg-muted-foreground/30" : "bg-muted-foreground/60"
                  )}
                />
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{d.label.slice(0, 3)}</span>
                <span className={cn("truncate text-xs", d.isRest && "text-muted-foreground")}>{d.title}</span>
              </div>
              {d.done && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">fait</span>}
            </div>
          ))}
        </div>
      </HomeCard>

      {/* Poids */}
      <HomeCard
        delay={230}
        title="Poids corporel"
        icon={<LineChartIcon className="h-3.5 w-3.5 text-muted-foreground" />}
        action={
          chartWeights.length > 1 ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {weightDelta > 0 ? "+" : ""}
              {weightDelta} kg
            </span>
          ) : undefined
        }
      >
        {chartWeights.length > 1 ? (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartWeights} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="date" hide />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={900}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Ajoute ton poids pour suivre ton évolution
          </p>
        )}
      </HomeCard>

      {/* Raccourci entraînement */}
      <HomeCard delay={260} onClick={() => onNavigate?.("training")} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Ouvrir l'entraînement</span>
        </div>
        <span className="text-muted-foreground">→</span>
      </HomeCard>
    </div>
  );
};

export default Home;
