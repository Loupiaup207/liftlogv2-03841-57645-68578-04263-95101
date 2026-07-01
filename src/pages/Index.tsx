import { Button } from "@/components/ui/button";
import { Dumbbell, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Library from "./Library";
import Nutrition from "./Nutrition";
import Activity from "./Activity";
import Statistics from "./Statistics";
import Profile from "./Profile";
import { useToast } from "@/hooks/use-toast";
 
type Tab = "library" | "activity" | "statistics" | "profile" | "nutrition";

const SWIPE_TABS: Tab[] = ["library", "statistics", "activity", "nutrition"];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [swipeAnim, setSwipeAnim] = useState<string>("");
  const touchRef = (typeof window !== "undefined") ? ((window as any).__touchRef ||= { current: null as null | { x: number; y: number; t: number } }) : { current: null };
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const goToTab = (target: Tab, dir?: "left" | "right") => {
    if (target === activeTab) return;
    if (dir) {
      setSwipeAnim(dir === "left" ? "animate-slide-from-right" : "animate-slide-from-left");
      window.setTimeout(() => setSwipeAnim(""), 300);
    }
    setActiveTab(target);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    touchRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (activeTab === "profile") return;
    const idx = SWIPE_TABS.indexOf(activeTab);
    if (idx === -1) return;
    if (dx < 0 && idx < SWIPE_TABS.length - 1) goToTab(SWIPE_TABS[idx + 1], "left");
    else if (dx > 0 && idx > 0) goToTab(SWIPE_TABS[idx - 1], "right");
  };

 
  // Fix iOS PWA viewport height — use visualViewport when available and
  // recalc on several events (resize/orientation/pageshow/focus/visibility).
  useEffect(() => {
    const doc = document.documentElement;

    const computeHeight = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      doc.style.setProperty("--app-height", `${Math.round(vh)}px`);
    };

    // Call immediately and a couple of times after to catch async layout shifts
    computeHeight();
    const t1 = window.setTimeout(computeHeight, 250);
    const t2 = window.setTimeout(computeHeight, 750);

    const handleOrientationChange = () => {
      // iOS sometimes needs a small delay
      setTimeout(computeHeight, 400);
    };

    window.addEventListener("resize", computeHeight);
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("pageshow", computeHeight);
    window.addEventListener("focus", computeHeight);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) computeHeight(); });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", computeHeight);
      window.visualViewport.addEventListener("scroll", computeHeight);
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", computeHeight);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("pageshow", computeHeight);
      window.removeEventListener("focus", computeHeight);
      document.removeEventListener("visibilitychange", () => { if (!document.hidden) computeHeight(); });
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", computeHeight);
        window.visualViewport.removeEventListener("scroll", computeHeight);
      }
    };
  }, []);
 
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
 
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });
 
    return () => subscription.unsubscribe();
  }, [navigate]);
 
  if (!user) return null;
 
  const topHeight = activeTab !== "profile"
      ? "calc(7rem + env(safe-area-inset-top))"
      : "calc(3.5rem + env(safe-area-inset-top))";
 
  return (
    <div style={{ height: "var(--app-height, 100vh)", display: "flex", flexDirection: "column", overflow: "hidden", background: "hsl(var(--background))" }}>
 
      {/* Header */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 40, height: "calc(3.5rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--background))" }}>
          <h1 className="text-xl font-light tracking-widest text-foreground">LIFTLOG</h1>
      </div>
 
      {/* Top Nav */}
      {activeTab !== "profile" && (
          <div style={{ position: "fixed", top: "calc(3.5rem + env(safe-area-inset-top))", left: 0, right: 0, zIndex: 50, background: "hsl(var(--background))", padding: "0.4rem 1rem" }}>
          <div className="flex gap-2">
              {(["library", "statistics", "activity", "nutrition"] as Tab[]).map((tab) => (
                <Button key={tab} variant="minimal" className={`flex-1 h-10 rounded-lg ${activeTab === tab ? "bg-accent" : ""}`} onClick={() => {
                  const curIdx = SWIPE_TABS.indexOf(activeTab);
                  const nextIdx = SWIPE_TABS.indexOf(tab);
                  goToTab(tab, curIdx === -1 || nextIdx === -1 ? undefined : nextIdx > curIdx ? "left" : "right");
                }}>

                <span className="text-xs font-light tracking-wider uppercase">
                  {tab === "library" ? "Librairie" : tab === "statistics" ? "Stats" : tab === "nutrition" ? "Nutrition" : "Activité"}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
 
      {/* Main */}
      <main onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ flex: 1, overflowY: "auto", marginTop: topHeight, paddingBottom: "calc(4rem + env(safe-area-inset-bottom))", WebkitOverflowScrolling: "touch" }}>
        <div key={activeTab} className={swipeAnim}>
          <div className={activeTab === "library" ? "" : "hidden"}><Library /></div>
          <div className={activeTab === "activity" ? "" : "hidden"}><Activity /></div>
          <div className={activeTab === "statistics" ? "" : "hidden"}><Statistics /></div>
          <div className={activeTab === "nutrition" ? "" : "hidden"}><Nutrition /></div>
          <div className={activeTab === "profile" ? "" : "hidden"}><Profile /></div>
        </div>
      </main>

      {/* Bottom Nav */}
        <div className="bottom-nav-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, height: "calc(3rem + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)", background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
          <div className="flex justify-between items-end h-full px-10 pb-1">
            <Button
              variant="ghost"
              className={`flex flex-col items-center justify-center h-full px-3 py-1 transition-colors duration-200 ${activeTab !== "profile" ? "text-primary ring-2 ring-primary/40 rounded-lg" : "text-muted-foreground"}`}
              onClick={() => goToTab(activeTab === "profile" ? "library" : activeTab, "right")}
            >
              <Dumbbell className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Training</span>
            </Button>

            <Button
              variant="ghost"
              className={`flex flex-col items-center justify-center h-full px-3 py-1 transition-colors duration-200 ${activeTab === "profile" ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => goToTab("profile", "left")}
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Profil</span>
            </Button>
          </div>
        </div>
    </div>

  );
};
 
export default Index;
 