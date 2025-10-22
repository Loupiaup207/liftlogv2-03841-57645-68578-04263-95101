import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, User, LogOut, Download, UserCircle, Settings, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WorkoutReminderSettings } from "@/components/WorkoutReminderSettings";
import { usePWA } from "@/hooks/usePWA";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isInstallable, isInstalled, installPWA } = usePWA();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Déconnexion réussie" });
    navigate("/auth");
  };

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      toast({ 
        title: "Installation réussie", 
        description: "L'application est maintenant installée sur votre appareil" 
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="p-4 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}>
        <h1 className="text-xl font-light tracking-widest text-foreground">
          PROFIL
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        <Card className="p-6 bg-card mb-4">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center border-2 border-primary/20">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-lg font-medium">Utilisateur</h2>
          </div>
        </Card>

        <WorkoutReminderSettings />

        {!isInstalled && isInstallable && (
          <Card className="p-4 bg-card mb-4 border-primary/30">
            <h3 className="text-sm font-medium tracking-wider mb-3 flex items-center gap-2">
              <Download className="h-4 w-4" />
              INSTALLATION
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Installez l'application pour y accéder rapidement et profiter d'une expérience hors ligne optimale.
            </p>
            <Button 
              variant="default" 
              className="w-full h-11 font-medium"
              onClick={handleInstall}
            >
              <Download className="h-4 w-4 mr-2" />
              Installer l'application
            </Button>
          </Card>
        )}

        {isInstalled && (
          <Card className="p-4 bg-card mb-4 border-green-500/30">
            <h3 className="text-sm font-medium tracking-wider mb-2 flex items-center gap-2">
              <Download className="h-4 w-4 text-green-500" />
              APPLICATION INSTALLÉE
            </h3>
            <p className="text-xs text-muted-foreground">
              ✅ L'application est installée et fonctionne hors ligne
            </p>
          </Card>
        )}

        <Card className="p-4 bg-card mb-4">
          <h3 className="text-sm font-medium tracking-wider mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            PARAMÈTRES
          </h3>
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 text-sm font-normal hover:bg-accent transition-colors"
            >
              <UserCircle className="h-5 w-5 mr-3 text-muted-foreground" />
              Modifier le profil
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12 text-sm font-normal hover:bg-accent transition-colors"
            >
              <Settings className="h-5 w-5 mr-3 text-muted-foreground" />
              Préférences
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-between h-12 text-sm font-normal hover:bg-accent transition-colors"
            >
              <div className="flex items-center">
                <Bell className="h-5 w-5 mr-3 text-muted-foreground" />
                Notifications
              </div>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                BETA
              </Badge>
            </Button>
          </div>
        </Card>

        <Button 
          variant="destructive" 
          className="w-full h-11 font-medium"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </main>

      {/* Fixed Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-card border-t border-border flex justify-around items-center py-3 px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
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
