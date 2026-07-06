import { useTimer, fmtTime } from "@/contexts/TimerContext";
import { Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = { onOpen: () => void };

type Pos = { x: number; y: number };

const STORAGE_KEY = "floating_timer_pos";

export const FloatingTimer = ({ onOpen }: Props) => {
  const { total, remaining, running, finished, pause, resume, dismissFinished } = useTimer();
  const [pos, setPos] = useState<Pos | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean; pointerId: number } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  const defaultTop = () => {
    // approximate: 3.5rem header + safe area + 0.4rem
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const safe = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat") || "0") || 0;
    return rem * 3.5 + safe + rem * 0.4;
  };

  useEffect(() => {
    if (pos) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
    }
  }, [pos]);

  // Clamp on resize
  useEffect(() => {
    const clamp = () => {
      if (!pos || !elRef.current) return;
      const rect = elRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      setPos((p) => p ? { x: Math.max(8, Math.min(p.x, maxX)), y: Math.max(8, Math.min(p.y, maxY)) } : p);
    };
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [pos]);

  if (total === 0 && !finished) return null;

  const pct = total > 0 ? remaining / total : 0;
  const R = 16;
  const C = 2 * Math.PI * R;

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const origX = pos?.x ?? rect.left;
    const origY = pos?.y ?? rect.top;
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      origX, origY, moved: false, pointerId: e.pointerId,
    };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    d.moved = true;
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    setPos({
      x: Math.max(8, Math.min(d.origX + dx, maxX)),
      y: Math.max(8, Math.min(d.origY + dy, maxY)),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d) return;
    const wasMoved = d.moved;
    dragState.current = null;
    try { elRef.current?.releasePointerCapture(e.pointerId); } catch {}
    if (!wasMoved) onOpen();
  };

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, touchAction: "none" }
    : { left: "50%", top: `calc(3.5rem + env(safe-area-inset-top) + 0.4rem)`, transform: "translateX(-50%)", touchAction: "none" };

  return (
    <div
      ref={elRef}
      className="fixed z-[60] animate-scale-in select-none"
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className={`flex items-center gap-3 pl-2 pr-1 py-1.5 rounded-full border border-border shadow-lg cursor-grab active:cursor-grabbing ${finished ? "bg-destructive/90 animate-pulse" : "bg-card/95 backdrop-blur"}`}
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
