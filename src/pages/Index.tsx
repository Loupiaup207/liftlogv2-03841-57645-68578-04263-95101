import { Button } from "@/components/ui/button";
import { Dumbbell, User } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Library from "./Library";
import Activity from "./Activity";
import Statistics from "./Statistics";
import Profile from "./Profile";
import { useToast } from "@/hooks/use-toast";
 
type Tab = "library" | "activity" | "statistics" | "profile";
 
// Hook qui retourne la vraie hauteur du viewport en temps réel
const useViewportHeight = () => {
  const [vh, setVh] = useState(window.innerHeight);
 
  const update = useCallback(() => {
    setVh(window.innerHeight);
    // Met aussi à jour la variable CSS --vh utilisable partout
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
  }, []);
 
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", () => {
      // Délai nécessaire sur iOS — le navigateur met ~300ms à recalculer
      setTimeout(update, 300);
    });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [update]);
 
  return vh;
};
 
const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const vh = useViewportHeight();
 
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
 
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
 
    return () => subscription.unsubscribe();
  }, [navigate]);
 
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Déconnexion réussie" });
  };
 
  if (!user) return null;
 
  const topHeight = activeTab !== "profile"
    ? "calc(8rem + env(safe-area-inset-top))"
    : "calc(4rem + env(safe-area-inset-top))";
 
  const bottomNavHeight = "calc(3.5rem + env(safe-area-inset-bottom))";
 
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: `${vh}px`,
        overflow: "hidden",
        background: "hsl(var(--background))",
      }}
    >
      {/* Header LIFTLOG */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          height: "calc(4rem + env(safe-area-inset-top))",
          paddingTop: "env(safe-area-inset-top)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid hsl(var(--border))",
          background: "hsl(var(--background))",
        }}
      >
        <h1 className="text-2xl font-light tracking-widest text-foreground">
          LIFTLOG
        </h1>
      </div>
 
      {/* Top Nav Tabs */}
      {activeTab !== "profile" && (
        <div
          style={{
            position: "fixed",
            top: "calc(4rem + env(safe-area-inset-top))",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "hsl(var(--background))",
            padding: "0.5rem 1rem",
          }}
        >
          <div className="flex gap-2">
            <Button
              variant="minimal"
              className={`flex-1 h-12 rounded-lg ${activeTab === "library" ? "bg-accent" : ""}`}
              onClick={() => setActiveTab("library")}
            >
              <span className="text-xs font-light tracking-wider uppercase">Librairie</span>
            </Button>
            <Button
              variant="minimal"
              className={`flex-1 h-12 rounded-lg ${activeTab === "statistics" ? "bg-accent" : ""}`}
              onClick={() => setActiveTab("statistics")}
            >
              <span className="text-xs font-light tracking-wider uppercase">Stats</span>
            </Button>
            <Button
              variant="minimal"
              className={`flex-1 h-12 rounded-lg ${activeTab === "activity" ? "bg-accent" : ""}`}
              onClick={() => setActiveTab("activity")}
            >
              <span className="text-xs font-light tracking-wider uppercase">Activité</span>
            </Button>
          </div>
        </div>
      )}
 
      {/* Contenu scrollable */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          marginTop: topHeight,
          marginBottom: bottomNavHeight,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className={activeTab === "library" ? "" : "hidden"}>
          <Library />
        </div>
        <div className={activeTab === "activity" ? "" : "hidden"}>
          <Activity />
        </div>
        <div className={activeTab === "statistics" ? "" : "hidden"}>
          <Statistics />
        </div>
        <div className={activeTab === "profile" ? "" : "hidden"}>
          <Profile />
        </div>
      </main>
 
      {/* Bottom Nav */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "hsl(var(--card))",
          borderTop: "1px solid hsl(var(--border))",
        }}
      >
        <div className="flex justify-around items-center py-3 px-4">
          <Button
            variant="ghost"
            size="icon"
            className={`flex flex-col gap-0.5 h-auto py-1.5 ${activeTab !== "profile" ? "text-primary" : ""}`}
            onClick={() => setActiveTab("library")}
          >
            <Dumbbell className="h-5 w-5" />
            <span className="text-[10px]">Training</span>
          </Button>
 
          <Button
            variant="ghost"
            size="icon"
            className={`flex flex-col gap-0.5 h-auto py-1.5 ${activeTab === "profile" ? "text-primary" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px]">Profil</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
 
export default Index;
 