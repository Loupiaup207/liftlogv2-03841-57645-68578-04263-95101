import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dumbbell, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WorkoutReminderSettings } from "@/components/WorkoutReminderSettings";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Déconnexion réussie" });
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20 pt-12">
      {/* Header */}
      <header className="p-4 pb-2">
        <h1 className="text-xl font-light tracking-widest text-foreground">
          PROFIL
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4">
        <Card className="p-4 bg-card mb-3">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent mx-auto mb-3 flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-light">Utilisateur</h2>
          </div>
        </Card>

        <WorkoutReminderSettings />

        <Card className="p-4 bg-card mb-3">
          <h3 className="text-sm font-light tracking-wider mb-3">PARAMÈTRES</h3>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-sm h-9">
              Modifier le profil
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm h-9">
              Préférences
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm h-9">
              Notifications
            </Button>
          </div>
        </Card>

        <Button 
          variant="destructive" 
          className="w-full h-10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-card border-t border-border flex justify-around items-center py-3 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="flex flex-col gap-0.5 h-auto py-1.5"
          onClick={() => navigate("/")}
        >
          <Dumbbell className="h-5 w-5" />
          <span className="text-[10px]">Training</span>
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="flex flex-col gap-0.5 h-auto py-1.5 text-primary"
        >
          <User className="h-5 w-5" />
          <span className="text-[10px]">Profil</span>
        </Button>
      </nav>
    </div>
  );
};

export default Profile;
