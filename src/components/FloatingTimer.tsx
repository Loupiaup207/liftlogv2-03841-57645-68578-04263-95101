import { useTimer, fmtTime } from "@/contexts/TimerContext";
import { Pause, Play, X } from "lucide-react";

type Props = { onOpen: () => void };

export const FloatingTimer = ({ onOpen }: Props) => {
  const { total, remaining, running, finished, pause, resume, dismissFinished } = useTimer();
  if (total === 0 && !finished) return null;

  const pct = total > 0 ? remaining / total : 0;
  const R = 16;
  const C = 2 * Math.PI * R;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] animate-scale-in"
      style={{ top: "calc(3.5rem + env(safe-area-inset-top) + 0.4rem)" }}
    >
      <div
        onClick={onOpen}
        className={`flex items-center gap-3 pl-2 pr-1 py-1.5 rounded-full border border-border shadow-lg cursor-pointer ${finished ? "bg-destructive/90 animate-pulse" : "bg-card/95 backdrop-blur"}`}
      >
        <div className="relative" style={{ width: 38, height: 38 }}>
          <svg width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r={R} fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
            <circle
              cx="19" cy="19" r={R} fill="none"
              stroke={finished ? "hsl(var(--destructive-foreground))" : "hsl(var(--primary))"}
              strokeWidth="2" strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              transform="rotate(-90 19 19)"
              style={{ transition: "stroke-dashoffset 0.3s linear" }}
            />
          </svg>
        </div>
        <span className="text-sm font-light tabular-nums min-w-[52px] text-center">
          {finished ? "Terminé" : fmtTime(remaining)}
        </span>
        {finished ? (
          <button
            onClick={(e) => { e.stopPropagation(); dismissFinished(); }}
            className="h-8 w-8 rounded-full bg-background/20 flex items-center justify-center"
            aria-label="Arrêter l'alarme"
          >
            <X className="h-4 w-4" />
          </button>
        ) : running ? (
          <button
            onClick={(e) => { e.stopPropagation(); pause(); }}
            className="h-8 w-8 rounded-full bg-accent flex items-center justify-center"
            aria-label="Pause"
          >
            <Pause className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); resume(); }}
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            aria-label="Reprendre"
          >
            <Play className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
