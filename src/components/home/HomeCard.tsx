import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HomeCardProps {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
  delay?: number;
}

/** Carte de base du dashboard : arrondis généreux, profondeur subtile, apparition douce. */
export const HomeCard = ({ title, icon, action, className, onClick, children, delay = 0 }: HomeCardProps) => (
  <div
    onClick={onClick}
    style={{ animationDelay: `${delay}ms` }}
    className={cn(
      "rounded-3xl border border-border/70 bg-card/80 p-4 shadow-[0_1px_0_hsl(var(--foreground)/0.04),0_12px_30px_-18px_hsl(var(--foreground)/0.35)]",
      "backdrop-blur-sm animate-fade-in transition-transform duration-200",
      onClick && "cursor-pointer active:scale-[0.99]",
      className
    )}
  >
    {(title || action) && (
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          {title && (
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground truncate">{title}</p>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

interface ProgressLineProps {
  label: string;
  value: number;
  goal: number;
  unit: string;
}

export const ProgressLine = ({ label, value, goal, unit }: ProgressLineProps) => {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums">
          <span className="text-foreground font-medium">{Math.round(value)}</span>
          <span className="text-muted-foreground">
            {" "}
            / {Math.round(goal)} {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/80 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const Delta = ({ value }: { value: number }) => (
  <span className={cn("text-xs tabular-nums", value >= 0 ? "text-foreground" : "text-destructive")}>
    {value >= 0 ? "↑" : "↓"} {Math.abs(value)}%
  </span>
);
