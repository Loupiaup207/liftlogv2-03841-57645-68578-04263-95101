import { Button } from "@/components/ui/button";
import { Dumbbell, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Library from "./Library";
import Activity from "./Activity";
import Statistics from "./Statistics";
import Profile from "./Profile";
import { useToast } from "@/hooks/use-toast";
 
type Tab = "library" | "activity" | "statistics" | "profile";
 
const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
 
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
              {(["library", "statistics", "activity"] as Tab[]).map((tab) => (
                <Button key={tab} variant="minimal" className={`flex-1 h-10 rounded-lg ${activeTab === tab ? "bg-accent" : ""}`} onClick={() => setActiveTab(tab)}>
                <span className="text-xs font-light tracking-wider uppercase">
                  {tab === "library" ? "Librairie" : tab === "statistics" ? "Stats" : "Activité"}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
 
      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", marginTop: topHeight, paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom))", WebkitOverflowScrolling: "touch" }}>
        <div className={activeTab === "library" ? "" : "hidden"}><Library /></div>
        <div className={activeTab === "activity" ? "" : "hidden"}><Activity /></div>
        <div className={activeTab === "statistics" ? "" : "hidden"}><Statistics /></div>
        <div className={activeTab === "profile" ? "" : "hidden"}><Profile /></div>
      </main>
 
      {/* Bottom Nav */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, paddingBottom: "env(safe-area-inset-bottom)", background: "hsl(var(--card))" }}>
          <div className="flex justify-around items-center py-2 px-4">
            <Button variant="ghost" size="icon" className={`flex flex-col gap-0.5 h-auto py-1 ${activeTab !== "profile" ? "text-primary" : ""}`} onClick={() => setActiveTab("library")}>
              <Dumbbell className="h-4 w-4" />
              <span className="text-[9px]">Training</span>
            </Button>
            <Button variant="ghost" size="icon" className={`flex flex-col gap-0.5 h-auto py-1 ${activeTab === "profile" ? "text-primary" : ""}`} onClick={() => setActiveTab("profile")}>
              <User className="h-4 w-4" />
              <span className="text-[9px]">Profil</span>
            </Button>
          </div>
        </div>
    </div>
  );
};
 
export default Index;
 