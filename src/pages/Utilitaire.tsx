import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Trash2, Timer, Calculator } from "lucide-react";

type SubTab = "chrono" | "calc";

const Utilitaire = () => {
  const [sub, setSub] = useState<SubTab>("chrono");

  return (
    <div className="px-4 sm:px-6 pb-8">
      {/* Top sub-nav — same style as training top nav */}
      <div className="flex gap-1 mb-6">
        {(["chrono", "calc"] as SubTab[]).map((s) => (
          <Button
            key={s}
            variant="minimal"
            className={`flex-1 h-10 rounded-lg min-w-0 px-1 ${sub === s ? "bg-accent" : ""}`}
            onClick={() => setSub(s)}
          >
            <span className="text-xs font-light tracking-wide uppercase truncate flex items-center gap-1.5">
              {s === "chrono" ? <><Timer className="h-3.5 w-3.5" /> Chronomètre</> : <><Calculator className="h-3.5 w-3.5" /> Calculatrice</>}
            </span>
          </Button>
        ))}
      </div>

      {sub === "chrono" ? <Chrono /> : <Calc />}
    </div>
  );
};

/* -------------------- Chronomètre -------------------- */

const Chrono = () => {
  const [total, setTotal] = useState(0); // seconds total set
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(true);
  const [hh, setHh] = useState("00");
  const [mm, setMm] = useState("00");
  const [ss, setSs] = useState("00");
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try { navigator.vibrate([300, 120, 300, 120, 500]); } catch {}
          }
          try {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AC) {
              const ctx = new AC();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = "sine";
              o.frequency.value = 880;
              o.connect(g); g.connect(ctx.destination);
              g.gain.setValueAtTime(0.001, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
              g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
              o.start();
              o.stop(ctx.currentTime + 1.3);
            }
          } catch {}
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const clampNum = (v: string, max: number) => {
    const n = parseInt(v.replace(/\D/g, "").slice(0, 2)) || 0;
    return String(Math.min(n, max)).padStart(2, "0");
  };

  const commitAndStart = () => {
    const t = (parseInt(hh) || 0) * 3600 + (parseInt(mm) || 0) * 60 + (parseInt(ss) || 0);
    if (t <= 0) return;
    setTotal(t);
    setRemaining(t);
    setEditing(false);
    setRunning(true);
  };

  const resume = () => setRunning(true);
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setRemaining(0);
    setTotal(0);
    setEditing(true);
  };

  const R = 118;
  const C = 2 * Math.PI * R;
  const pct = total > 0 ? remaining / total : 1;

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const two = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${two(h)}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
  };

  const presets = [
    { l: "30 s", s: 30 },
    { l: "1 min", s: 60 },
    { l: "2 min", s: 120 },
    { l: "3 min", s: 180 },
    { l: "5 min", s: 300 },
    { l: "10 min", s: 600 },
  ];

  const applyPreset = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const se = secs % 60;
    setHh(String(h).padStart(2, "0"));
    setMm(String(m).padStart(2, "0"));
    setSs(String(se).padStart(2, "0"));
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: 280, height: 280 }}>
        <svg width="280" height="280" viewBox="0 0 280 280" className="animate-fade-in">
          <circle cx="140" cy="140" r={R} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <circle
            cx="140"
            cy="140"
            r={R}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            transform="rotate(-90 140 140)"
            style={{ transition: running ? "stroke-dashoffset 0.95s linear" : "stroke-dashoffset 0.3s ease" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {editing ? (
            <div className="flex items-center gap-1 tabular-nums">
              <input
                type="text"
                inputMode="numeric"
                value={hh}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setHh(clampNum(e.target.value, 23))}
                className="w-14 h-14 text-3xl font-extralight text-center bg-transparent border-none outline-none focus:bg-accent/30 rounded-md"
              />
              <span className="text-3xl font-extralight text-muted-foreground">:</span>
              <input
                type="text"
                inputMode="numeric"
                value={mm}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setMm(clampNum(e.target.value, 59))}
                className="w-14 h-14 text-3xl font-extralight text-center bg-transparent border-none outline-none focus:bg-accent/30 rounded-md"
              />
              <span className="text-3xl font-extralight text-muted-foreground">:</span>
              <input
                type="text"
                inputMode="numeric"
                value={ss}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setSs(clampNum(e.target.value, 59))}
                className="w-14 h-14 text-3xl font-extralight text-center bg-transparent border-none outline-none focus:bg-accent/30 rounded-md"
              />
            </div>
          ) : (
            <div className="text-5xl font-extralight tracking-wider tabular-nums">{fmt(remaining)}</div>
          )}
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">
            {editing ? "hh : mm : ss" : running ? "En cours" : remaining === 0 ? "Terminé" : "En pause"}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        {editing || remaining === 0 ? (
          <Button
            size="lg"
            className="rounded-full h-14 w-14 p-0"
            onClick={editing ? commitAndStart : reset}
          >
            {editing ? <Play className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
          </Button>
        ) : (
          <>
            {running ? (
              <Button size="lg" variant="minimal" className="rounded-full h-14 w-14 p-0" onClick={pause}>
                <Pause className="h-5 w-5" />
              </Button>
            ) : (
              <Button size="lg" className="rounded-full h-14 w-14 p-0" onClick={resume}>
                <Play className="h-5 w-5" />
              </Button>
            )}
            <Button size="lg" variant="minimal" className="rounded-full h-14 w-14 p-0" onClick={reset}>
              <RotateCcw className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {editing && (
        <div className="flex flex-wrap gap-2 justify-center max-w-xs">
          {presets.map((p) => (
            <Button key={p.l} variant="minimal" size="sm" className="h-8 text-[11px]" onClick={() => applyPreset(p.s)}>
              {p.l}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

/* -------------------- Calculatrice -------------------- */

type CalcEntry = { expr: string; result: string };

const Calc = () => {
  const [expr, setExpr] = useState("");
  const [display, setDisplay] = useState("0");
  const [history, setHistory] = useState<CalcEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem("calc_history") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem("calc_history", JSON.stringify(history.slice(0, 50))); } catch {}
  }, [history]);

  const press = (k: string) => {
    if (k === "C") { setExpr(""); setDisplay("0"); return; }
    if (k === "⌫") { const n = expr.slice(0, -1); setExpr(n); setDisplay(n || "0"); return; }
    if (k === "=") {
      if (!expr) return;
      try {
        const safe = expr
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/[^0-9+\-*/.()%\s]/g, "");
        // eslint-disable-next-line no-new-func
        const res = Function(`"use strict"; return (${safe})`)();
        if (!Number.isFinite(res)) { setDisplay("Erreur"); return; }
        const rStr = String(+Number(res).toFixed(10));
        setHistory((h) => [{ expr, result: rStr }, ...h].slice(0, 50));
        setDisplay(rStr);
        setExpr(rStr);
      } catch {
        setDisplay("Erreur");
      }
      return;
    }
    const isOp = ["+", "-", "×", "÷", "%", "."].includes(k);
    const last = expr.slice(-1);
    // avoid two operators in a row (except minus)
    if (isOp && k !== "-" && k !== "." && ["+", "-", "×", "÷"].includes(last)) {
      const n = expr.slice(0, -1) + k;
      setExpr(n); setDisplay(n);
      return;
    }
    const n = expr + k;
    setExpr(n);
    setDisplay(n);
  };

  const rows: string[][] = [
    ["C", "⌫", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "="],
  ];

  const btnClass = (k: string) => {
    const isOp = ["÷", "×", "-", "+"].includes(k);
    const isEq = k === "=";
    const isTop = ["C", "⌫", "%"].includes(k);
    if (isEq) return "h-14 text-xl bg-primary text-primary-foreground hover:bg-primary/90 col-span-2";
    if (isOp) return "h-14 text-xl bg-accent";
    if (isTop) return "h-14 text-base text-muted-foreground";
    return "h-14 text-xl";
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card">
        <div className="min-h-[72px] flex items-end justify-end overflow-hidden">
          <p className="text-4xl font-extralight tracking-wide break-all text-right tabular-nums">{display}</p>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        {rows.flat().map((k, i) => (
          <Button
            key={`${k}-${i}`}
            variant="minimal"
            className={btnClass(k)}
            onClick={() => press(k)}
          >
            {k}
          </Button>
        ))}
      </div>

      <Card className="p-3 bg-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Historique</p>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setHistory([])}>
              <Trash2 className="h-3 w-3 mr-1" /> Effacer
            </Button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun calcul</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setExpr(h.result); setDisplay(h.result); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
              >
                <p className="text-[11px] text-muted-foreground truncate">{h.expr}</p>
                <p className="text-sm font-light">= {h.result}</p>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Utilitaire;
