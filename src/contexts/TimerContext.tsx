import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";

type TimerState = {
  total: number;
  remaining: number;
  running: boolean;
  finished: boolean;
  presets: number[];
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  dismissFinished: () => void;
  addPreset: (seconds: number) => void;
  removePreset: (seconds: number) => void;
};

const TimerCtx = createContext<TimerState | null>(null);

const DEFAULT_PRESETS = [30, 60, 120, 180, 300, 600];

const beep = () => {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.0);
    o.start();
    o.stop(ctx.currentTime + 1.1);
  } catch {}
};

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [presets, setPresets] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("timer_presets");
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_PRESETS;
  });
  const tickRef = useRef<number | null>(null);
  const alarmRef = useRef<number | null>(null);
  const endAtRef = useRef<number>(0);

  // persist presets
  useEffect(() => {
    try { localStorage.setItem("timer_presets", JSON.stringify(presets)); } catch {}
  }, [presets]);

  // countdown tick using absolute end time (survives tab throttling)
  useEffect(() => {
    if (!running) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    tickRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        setFinished(true);
      }
    }, 250);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running]);

  // repeating alarm (vibration + beep) until dismissed
  useEffect(() => {
    if (!finished) {
      if (alarmRef.current) { clearInterval(alarmRef.current); alarmRef.current = null; }
      return;
    }
    const pulse = () => {
      try { navigator.vibrate?.([400, 150, 400, 150, 600]); } catch {}
      beep();
    };
    pulse();
    alarmRef.current = window.setInterval(pulse, 1800);
    return () => { if (alarmRef.current) clearInterval(alarmRef.current); };
  }, [finished]);

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setTotal(seconds);
    setRemaining(seconds);
    setFinished(false);
    endAtRef.current = Date.now() + seconds * 1000;
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    setRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (remaining <= 0) return;
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);

  const reset = useCallback(() => {
    setRunning(false);
    setFinished(false);
    setRemaining(0);
    setTotal(0);
  }, []);

  const dismissFinished = useCallback(() => {
    setFinished(false);
    setRemaining(0);
    setTotal(0);
    try { navigator.vibrate?.(0); } catch {}
  }, []);

  const addPreset = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setPresets((p) => (p.includes(seconds) ? p : [...p, seconds].sort((a, b) => a - b)));
  }, []);

  const removePreset = useCallback((seconds: number) => {
    setPresets((p) => p.filter((s) => s !== seconds));
  }, []);

  return (
    <TimerCtx.Provider value={{ total, remaining, running, finished, presets, start, pause, resume, reset, dismissFinished, addPreset, removePreset }}>
      {children}
    </TimerCtx.Provider>
  );
};

export const useTimer = () => {
  const ctx = useContext(TimerCtx);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
};

export const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${two(h)}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
};

export const fmtPreset = (s: number) => {
  if (s < 60) return `${s} s`;
  if (s % 60 === 0 && s < 3600) return `${s / 60} min`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0 && m === 0 && sec === 0) return `${h} h`;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
};
