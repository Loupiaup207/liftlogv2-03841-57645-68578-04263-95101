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
      "rounded-3xl border border-border/60 bg-card/80 p-4 shadow-[0_1px_0_hsl(var(--foreground)/0.04),0_16px_36px_-20px_hsl(var(--foreground)/0.4)]",
      "backdrop-blur-sm animate-fade-in transition-all duration-200",
      onClick && "cursor-pointer active:scale-[0.985] hover:border-border",
      className
    )}
  >
    {(title || action) && (
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              {icon}
            </span>
          )}
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
  const over = goal > 0 && value > goal;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs tabular-nums">
          <span className={cn("font-medium", over ? "text-destructive" : "text-foreground")}>
            {Math.round(value)}
          </span>
          <span className="text-muted-foreground">
            {" "}
            / {Math.round(goal)} {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            over ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const Delta = ({ value }: { value: number }) => (
  <span
    className={cn(
      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
      value >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
    )}
  >
    {value >= 0 ? "↑" : "↓"} {Math.abs(value)}%
  </span>
);
