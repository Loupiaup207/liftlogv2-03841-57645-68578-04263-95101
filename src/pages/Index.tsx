import { Button } from "@/components/ui/button";
import { BarChart3, BookOpen, CalendarDays, History, Home as HomeIcon, User, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Library from "./Library";
import Nutrition from "./Nutrition";
import Activity from "./Activity";
import Statistics from "./Statistics";
import Profile from "./Profile";
import Utilitaire from "./Utilitaire";
import Sessions from "./Sessions";
import Home from "./Home";
import { useToast } from "@/hooks/use-toast";
import { FloatingTimer } from "@/components/FloatingTimer";
 
type Tab = "home" | "library" | "activity" | "statistics" | "profile" | "nutrition" | "utilitaire" | "sessions";

const TRAINING_TABS: Tab[] = ["library", "sessions", "statistics", "activity"];
const TRAINING_LABELS: Record<string, string> = {
  library: "Librairie",
  sessions: "Séances",
  statistics: "Stats",
  activity: "Activité",
};
const TRAINING_ICONS: Record<string, any> = {
  library: BookOpen,
  sessions: CalendarDays,
  statistics: BarChart3,
  activity: History,
};
const SWIPE_TABS: Tab[] = ["home", "library", "nutrition"];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [trainingTab, setTrainingTab] = useState<Tab>("library");
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
    const current: Tab = TRAINING_TABS.includes(activeTab) ? "library" : activeTab;
    const idx = SWIPE_TABS.indexOf(current);
    if (idx === -1) return;
    if (dx < 0 && idx < SWIPE_TABS.length - 1) goToTab(SWIPE_TABS[idx + 1], "left");
    else if (dx > 0 && idx > 0) goToTab(SWIPE_TABS[idx - 1], "right");
  };

 
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

  // Dispatch tab-open event so pages can re-animate charts each time they become visible
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("liftlog:tab-open", { detail: activeTab }));
  }, [activeTab]);
 
  if (!user) return null;
 
  const isTraining = TRAINING_TABS.includes(activeTab);
  const hideTopNav = activeTab === "profile" || activeTab === "utilitaire";
  const topHeight = hideTopNav
    ? "calc(3.5rem + env(safe-area-inset-top))"
    : "calc(7rem + env(safe-area-inset-top))";

  return (
    <div className="app-shell h-full min-h-0 overflow-hidden bg-background">

      {/* Header */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 40, height: "calc(3.5rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--background))" }}>
          <h1 className="text-xl font-light tracking-widest text-foreground">LIFTLOG</h1>
      </div>

      {/* Top Nav */}
      {!hideTopNav && (
          <div style={{ position: "fixed", top: "calc(3.5rem + env(safe-area-inset-top))", left: 0, right: 0, zIndex: 50, background: "hsl(var(--background))", padding: "0.4rem 0.5rem" }}>
          <div className="mx-auto flex max-w-[430px] gap-1">
              {([["home", "Home"], ["library", "Training"], ["nutrition", "Nutrition"]] as [Tab, string][]).map(([tab, label]) => {
                const active = tab === "library" ? isTraining : activeTab === tab;
                return (
                <Button key={tab} variant="minimal" className={`flex-1 h-10 rounded-lg min-w-0 px-1 ${active ? "bg-accent" : ""}`} onClick={() => {
                  const target: Tab = tab === "library" ? trainingTab : tab;
                  const curIdx = SWIPE_TABS.indexOf(isTraining ? "library" : activeTab);
                  const nextIdx = SWIPE_TABS.indexOf(tab);
                  goToTab(target, curIdx === -1 || nextIdx === -1 ? undefined : nextIdx > curIdx ? "left" : "right");
                }}>
                <span className="text-xs font-light tracking-wide uppercase truncate">{label}</span>
              </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main */}
      <main className="app-main min-h-0 overflow-y-auto" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ marginTop: topHeight, WebkitOverflowScrolling: "touch" }}>
        <div className="app-scroll-content">
          <div className={activeTab === "home" ? swipeAnim : "hidden"}>
            <Home onNavigate={(t) => {
              if (t === "training") goToTab(trainingTab, "left");
              else if (t === "nutrition") goToTab("nutrition", "left");
              else { setTrainingTab(t as Tab); goToTab(t as Tab, "left"); }
            }} />
          </div>
          <div className={activeTab === "library" ? swipeAnim : "hidden"}><Library /></div>
          <div className={activeTab === "activity" ? swipeAnim : "hidden"}><Activity /></div>
          <div className={activeTab === "statistics" ? swipeAnim : "hidden"}><Statistics /></div>
          <div className={activeTab === "nutrition" ? swipeAnim : "hidden"}><Nutrition /></div>
          <div className={activeTab === "sessions" ? swipeAnim : "hidden"}><Sessions /></div>
          <div className={activeTab === "utilitaire" ? swipeAnim : "hidden"}><Utilitaire /></div>
          <div className={activeTab === "profile" ? swipeAnim : "hidden"}><Profile /></div>
        </div>
      </main>

      {/* Floating mini timer (visible sur tous les onglets sauf Utilitaire) */}
      {activeTab !== "utilitaire" && <FloatingTimer onOpen={() => goToTab("utilitaire")} />}

      {/* Shared grid cell overlays content without fixed viewport positioning. */}
      <nav aria-label="Navigation principale" className="bottom-nav-container z-30 transition-opacity duration-200">
        <div className="bottom-nav-bar bg-card/80 border border-border/60 backdrop-blur-xl">
          {isTraining ? (
            <div className="flex justify-between items-center h-full px-3 animate-slide-from-right">

              {TRAINING_TABS.map((tab) => {
                const Icon = TRAINING_ICONS[tab];
                return (
                  <Button
                    key={tab}
                    variant="ghost"
                    className={`flex flex-col items-center justify-center h-full px-2 py-0.5 transition-colors duration-200 ${activeTab === tab ? "text-primary ring-2 ring-primary/40 rounded-lg" : "text-muted-foreground"}`}
                    onClick={() => { setTrainingTab(tab); goToTab(tab); }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[9px] leading-none mt-0">{TRAINING_LABELS[tab]}</span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-between items-center h-full px-3">
              <Button
                variant="ghost"
                className={`flex flex-col items-center justify-center h-full px-2 py-0.5 transition-colors duration-200 ${activeTab === "home" ? "text-primary ring-2 ring-primary/40 rounded-lg" : "text-muted-foreground"}`}
                onClick={() => goToTab("home", "right")}
              >
                <HomeIcon className="h-4 w-4" />
                <span className="text-[9px] leading-none mt-0">Accueil</span>
              </Button>

              <Button
                variant="ghost"
                className={`flex flex-col items-center justify-center h-full px-2 py-0.5 transition-colors duration-200 ${activeTab === "utilitaire" ? "text-primary ring-2 ring-primary/40 rounded-lg" : "text-muted-foreground"}`}
                onClick={() => goToTab("utilitaire")}
              >
                <Wrench className="h-4 w-4" />
                <span className="text-[9px] leading-none mt-0">Utilitaire</span>
              </Button>

              <Button
                variant="ghost"
                className={`flex flex-col items-center justify-center h-full px-2 py-0.5 transition-colors duration-200 ${activeTab === "profile" ? "text-primary ring-2 ring-primary/40 rounded-lg" : "text-muted-foreground"}`}
                onClick={() => goToTab("profile", "left")}
              >
                <User className="h-4 w-4" />
                <span className="text-[9px] leading-none mt-0">Profil</span>
              </Button>
            </div>
          )}
        </div>
      </nav>
    </div>

  );
};
 
export default Index;