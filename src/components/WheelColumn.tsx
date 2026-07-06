import { useEffect, useRef } from "react";

type Props = {
  value: number;
  max: number; // inclusive
  onChange: (n: number) => void;
  label: string;
};

const ITEM_H = 44;
const VISIBLE = 5; // odd

export const WheelColumn = ({ value, max, onChange, label }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastVibRef = useRef<number>(-1);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = value * ITEM_H;
  }, []); // initial mount only

  useEffect(() => {
    if (!ref.current) return;
    const cur = Math.round(ref.current.scrollTop / ITEM_H);
    if (cur !== value) ref.current.scrollTop = value * ITEM_H;
  }, [value]);

  const handleScroll = () => {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(max, idx));
    if (clamped !== lastVibRef.current) {
      lastVibRef.current = clamped;
      try { navigator.vibrate?.(4); } catch {}
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (!ref.current) return;
      // snap
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      onChange(clamped);
    }, 90);
  };

  const pad = (VISIBLE - 1) / 2 * ITEM_H;

  return (
    <div className="relative" style={{ height: VISIBLE * ITEM_H, width: 92 }}>
      {/* highlight band */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-lg bg-accent/40"
        style={{ height: ITEM_H }}
      />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll no-scrollbar"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
      >
        <div style={{ height: pad }} />
        {Array.from({ length: max + 1 }, (_, i) => {
          const distance = Math.abs(i - value);
          const opacity = Math.max(0.15, 1 - distance * 0.25);
          const scale = i === value ? 1 : 0.9;
          return (
            <div
              key={i}
              style={{ height: ITEM_H, scrollSnapAlign: "center", opacity, transform: `scale(${scale})` }}
              className="flex items-center justify-end pr-3 text-3xl font-light tabular-nums transition-opacity"
            >
              {String(i).padStart(2, "0")}
            </div>
          );
        })}
        <div style={{ height: pad }} />
      </div>
      {/* label */}
      <div
        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-1 text-sm text-foreground/80"
        style={{ height: ITEM_H, display: "flex", alignItems: "center" }}
      >
        {label}
      </div>
    </div>
  );
};
