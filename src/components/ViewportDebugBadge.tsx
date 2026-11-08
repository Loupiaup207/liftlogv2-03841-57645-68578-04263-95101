import { useEffect, useRef, useState } from "react";

export function ViewportDebugBadge() {
  const probe = useRef<HTMLDivElement>(null);
  const [readings, setReadings] = useState({ inner: 0, screen: 0, visual: "n/a", safe: "0px" });

  useEffect(() => {
    const measure = () => {
      setReadings({
        inner: window.innerHeight,
        screen: window.screen.height,
        visual: window.visualViewport ? window.visualViewport.height.toFixed(1) : "n/a",
        safe: probe.current ? getComputedStyle(probe.current).paddingBottom : "0px",
      });
    };
    const viewport = window.visualViewport;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("pageshow", measure);
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("pageshow", measure);
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <>
      <div ref={probe} className="viewport-debug-probe" aria-hidden="true" />
      <output className="viewport-debug-badge" aria-label="Diagnostic viewport">
        window.innerHeight: {readings.inner} · screen.height: {readings.screen}
        <br />
        visualViewport.height: {readings.visual} · env(safe-area-inset-bottom): {readings.safe}
      </output>
    </>
  );
}