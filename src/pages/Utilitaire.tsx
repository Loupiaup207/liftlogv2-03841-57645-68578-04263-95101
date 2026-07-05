import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Trash2, Timer, Calculator, Plus, X } from "lucide-react";
import { useTimer, fmtTime, fmtPreset } from "@/contexts/TimerContext";
import { WheelColumn } from "@/components/WheelColumn";

type SubTab = "chrono" | "calc";

const Utilitaire = () => {
  const [sub, setSub] = useState<SubTab>("chrono");

  return (
    <div className="px-4 sm:px-6 pb-8">
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
  const { total, remaining, running, finished, start, pause, resume, reset, dismissFinished, presets, addPreset, removePreset } = useTimer();
  const editing = total === 0 && !finished;

  const [h, setH] = useState(0);
  const [m, setM] = useState(0);
  const [s, setS] = useState(0);
  const [manageMode, setManageMode] = useState(false);

  const secondsFromWheel = h * 3600 + m * 60 + s;

  const R = 118;
  const C = 2 * Math.PI * R;
  const pct = total > 0 ? remaining / total : 1;

  const applyPreset = (secs: number) => {
    setH(Math.floor(secs / 3600));
    setM(Math.floor((secs % 3600) / 60));
    setS(secs % 60);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {editing ? (
        <div className="flex items-center justify-center gap-2 py-4">
          <WheelColumn value={h} max={23} onChange={setH} label="h" />
          <WheelColumn value={m} max={59} onChange={setM} label="min" />
          <WheelColumn value={s} max={59} onChange={setS} label="s" />
        </div>
      ) : (
        <div className="relative" style={{ width: 280, height: 280 }}>
          <svg width="280" height="280" viewBox="0 0 280 280" className="animate-fade-in">
            <circle cx="140" cy="140" r={R} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
            <circle
              cx="140" cy="140" r={R} fill="none"
              stroke={finished ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              transform="rotate(-90 140 140)"
              style={{ transition: running ? "stroke-dashoffset 0.95s linear" : "stroke-dashoffset 0.3s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-5xl font-extralight tracking-wider tabular-nums ${finished ? "animate-pulse" : ""}`}>
              {fmtTime(remaining)}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">
              {finished ? "Terminé" : running ? "En cours" : "En pause"}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {editing ? (
          <Button
            size="lg" className="rounded-full h-14 w-14 p-0"
            disabled={secondsFromWheel === 0}
            onClick={() => start(secondsFromWheel)}
          >
            <Play className="h-5 w-5" />
          </Button>
        ) : finished ? (
          <Button size="lg" className="rounded-full h-14 w-14 p-0" onClick={dismissFinished}>
            <X className="h-5 w-5" />
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
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Préréglages</p>
            <div className="flex gap-1">
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setManageMode((v) => !v)}
              >
                {manageMode ? "OK" : "Modifier"}
              </Button>
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={secondsFromWheel === 0}
                onClick={() => addPreset(secondsFromWheel)}
              >
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {presets.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Aucun préréglage — règle un temps et appuie sur Ajouter</p>
            )}
            {presets.map((p) => (
              <div key={p} className="relative">
                <Button
                  variant="minimal" size="sm"
                  className="h-8 text-[11px] pr-6"
                  onClick={() => applyPreset(p)}
                >
                  {fmtPreset(p)}
                </Button>
                {manageMode && (
                  <button
                    onClick={() => removePreset(p)}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    aria-label="Supprimer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
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
