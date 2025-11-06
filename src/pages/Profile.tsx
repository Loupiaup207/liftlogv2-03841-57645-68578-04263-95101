import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dumbbell, User, LogOut, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WorkoutReminderSettings } from "@/components/WorkoutReminderSettings";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { preferences, loading, updatePreferences } = useUserPreferences();
  const { theme, setTheme } = useTheme();
  const [userEmail, setUserEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [bodyweight, setBodyweight] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (preferences?.current_bodyweight) {
      setBodyweight(preferences.current_bodyweight.toString());
    }
  }, [preferences]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Déconnexion réussie" });
    navigate("/auth");
  };

  const handleUpdateProfile = async () => {
    try {
      if (newEmail) {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;
        toast({ title: "Email mis à jour avec succès" });
        setUserEmail(newEmail);
      }
      
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast({ title: "Mot de passe mis à jour avec succès" });
      }
      
      setNewEmail("");
      setNewPassword("");
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateBodyweight = async () => {
    if (!bodyweight) return;
    
    try {
      const weight = parseFloat(bodyweight);
      if (isNaN(weight)) {
        toast({
          title: "Erreur",
          description: "Veuillez entrer un poids valide",
          variant: "destructive",
        });
        return;
      }

      await updatePreferences({ current_bodyweight: weight });
      
      // Log the bodyweight
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("bodyweight_logs").insert({
          user_id: user.id,
          weight: weight,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
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
            <h2 className="text-sm font-light text-muted-foreground">{userEmail}</h2>
          </div>
        </Card>

        <Card className="p-4 bg-card mb-3">
          <h3 className="text-sm font-light tracking-wider mb-3">PARAMÈTRES</h3>
          <div className="space-y-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-sm h-9">
                  Modifier le profil
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifier le profil</DialogTitle>
                  <DialogDescription>
                    Modifiez votre email ou mot de passe
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Nouvel email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={userEmail}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Nouveau mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleUpdateProfile}>
                    Enregistrer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="space-y-2">
              <Label htmlFor="bodyweight" className="text-sm">
                Poids de corps (kg)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="bodyweight"
                  type="number"
                  step="0.1"
                  placeholder="75.0"
                  value={bodyweight}
                  onChange={(e) => setBodyweight(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleUpdateBodyweight} size="sm">
                  Mettre à jour
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="theme-toggle" className="text-sm">
                Mode sombre
              </Label>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch
                  id="theme-toggle"
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </Card>

        <WorkoutReminderSettings />

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
