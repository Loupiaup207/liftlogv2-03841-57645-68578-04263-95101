import { Button } from "@/components/ui/button";
import { LogOut, Dumbbell, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Library from "./Library";
import Activity from "./Activity";
import Statistics from "./Statistics";
import { useToast } from "@/hooks/use-toast";

type Tab = "library" | "activity" | "statistics";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Titre Liftlog - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-background px-4 pt-14 pb-2">
        <h1 className="text-2xl font-light tracking-widest text-foreground text-center">
          LIFTLOG
        </h1>
      </div>

      {/* Navigation Buttons - Fixed */}
      <nav className="fixed top-[92px] left-0 right-0 z-50 bg-background flex gap-2 px-4 py-2">
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
      </nav>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto mt-[156px]">
        <div className={activeTab === "library" ? "" : "hidden"}>
          <Library />
        </div>
        <div className={activeTab === "activity" ? "" : "hidden"}>
          <Activity />
        </div>
        <div className={activeTab === "statistics" ? "" : "hidden"}>
          <Statistics />
        </div>
      </main>

      {/* Logo + Logout */}
      <footer className="pb-4 pt-3 px-4">
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-card border-t border-border flex justify-around items-center py-3 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="flex flex-col gap-0.5 h-auto py-1.5 text-primary"
        >
          <Dumbbell className="h-5 w-5" />
          <span className="text-[10px]">Training</span>
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="flex flex-col gap-0.5 h-auto py-1.5"
          onClick={() => navigate("/profile")}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px]">Profil</span>
        </Button>
      </nav>
    </div>
  );
};

export default Index;
