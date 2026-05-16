import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, LogOut, Moon, Sun, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WorkoutReminderSettings } from "@/components/WorkoutReminderSettings";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
 
const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { preferences, loading, updatePreferences } = useUserPreferences();
  const { theme, setTheme } = useTheme();
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem("liftlog_user_email") || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [bodyweight, setBodyweight] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState<string | null>(null);
 
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        localStorage.setItem("liftlog_user_email", user.email);
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
    localStorage.removeItem("liftlog_user_email");
    toast({ title: "Déconnexion réussie" });
    navigate("/auth");
  };
 
  const handleDeleteAccount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
 
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
 
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }
 
      toast({ title: "Compte supprimé", description: "Votre compte a été supprimé avec succès" });
      navigate("/auth");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };
 
  const handleUpdateProfile = async () => {
    try {
      if (!oldPassword) {
        toast({ title: "Erreur", description: "Veuillez entrer votre ancien mot de passe", variant: "destructive" });
        return;
      }
      if (!newPassword) {
        toast({ title: "Erreur", description: "Veuillez entrer un nouveau mot de passe", variant: "destructive" });
        return;
      }
 
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Utilisateur non trouvé");
 
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
 
      if (signInError) {
        toast({ title: "Erreur", description: "L'ancien mot de passe est incorrect", variant: "destructive" });
        return;
      }
 
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
 
      toast({ title: "Mot de passe mis à jour avec succès" });
      setOldPassword("");
      setNewPassword("");
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };
 
  const handleUpdateBodyweight = async () => {
    if (!bodyweight) return;
    try {
      const weight = parseFloat(bodyweight);
      if (isNaN(weight)) {
        toast({ title: "Erreur", description: "Veuillez entrer un poids valide", variant: "destructive" });
        return;
      }
      await updatePreferences({ current_bodyweight: weight });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("bodyweight_logs").insert({ user_id: user.id, weight });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };
 
  // Contenu seul — pas de layout, pas de bottom nav (gérés par Index.tsx)
  return (
    <div className="px-4 pb-6 space-y-3 pt-4">
      <h1 className="text-xl font-light tracking-widest text-foreground mb-4">PROFIL</h1>
 
      <Card className="p-4 bg-card">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-accent mx-auto mb-3 flex items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-light text-muted-foreground">{userEmail}</h2>
        </div>
      </Card>
 
      <Card className="p-4 bg-card">
        <h3 className="text-sm font-light tracking-wider mb-3">PARAMÈTRES</h3>
        <div className="space-y-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-sm h-9">
                Modifier le mot de passe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl bg-card">
              <DialogHeader>
                <DialogTitle>Modifier le mot de passe</DialogTitle>
                <DialogDescription>Entrez votre ancien et nouveau mot de passe</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="old-password">Ancien mot de passe</Label>
                  <Input id="old-password" type="password" placeholder="••••••••" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input id="new-password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateProfile}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
 
          <div className="space-y-2">
            <Label htmlFor="bodyweight" className="text-sm">Poids de corps (kg)</Label>
            <div className="flex gap-2">
              <Input
                id="bodyweight"
                type="text"
                inputMode="decimal"
                placeholder="75.0"
                value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleUpdateBodyweight} size="sm">Mettre à jour</Button>
            </div>
          </div>
 
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-toggle" className="text-sm">Mode sombre</Label>
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
 
      <Button variant="destructive" className="w-full h-10" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Déconnexion
      </Button>
 
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full h-10 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer le compte
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes vos données (entraînements, exercices, statistiques) seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
 
      {/* Legal Section */}
      <Card className="p-4 bg-card">
        <h3 className="text-sm font-light tracking-wider mb-3">INFORMATIONS LÉGALES</h3>
        <div className="space-y-2">
          <Dialog open={legalDialogOpen === "terms"} onOpenChange={(open) => setLegalDialogOpen(open ? "terms" : null)}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-sm h-9">Conditions d'utilisation</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto rounded-2xl bg-card">
              <DialogHeader><DialogTitle>Conditions d'utilisation</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>En utilisant cette application, vous acceptez les conditions suivantes :</p>
                <h4 className="font-semibold text-foreground">1. Utilisation de l'application</h4>
                <p>L'application LIFTLOG est destinée à un usage personnel pour le suivi de vos entraînements sportifs.</p>
                <h4 className="font-semibold text-foreground">2. Données personnelles</h4>
                <p>Vos données d'entraînement sont stockées de manière sécurisée et ne sont pas partagées avec des tiers.</p>
                <h4 className="font-semibold text-foreground">3. Responsabilité</h4>
                <p>L'utilisation de l'application se fait sous votre responsabilité. Consultez un professionnel avant de commencer un programme d'entraînement.</p>
              </div>
            </DialogContent>
          </Dialog>
 
          <Dialog open={legalDialogOpen === "privacy"} onOpenChange={(open) => setLegalDialogOpen(open ? "privacy" : null)}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-sm h-9">Politique de confidentialité</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto rounded-2xl bg-card">
              <DialogHeader><DialogTitle>Politique de confidentialité</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground">
                <h4 className="font-semibold text-foreground">Collecte des données</h4>
                <p>Nous collectons uniquement les informations nécessaires au fonctionnement de l'application : email, données d'entraînement, poids corporel.</p>
                <h4 className="font-semibold text-foreground">Utilisation des données</h4>
                <p>Vos données sont utilisées exclusivement pour vous fournir les fonctionnalités de l'application.</p>
                <h4 className="font-semibold text-foreground">Sécurité</h4>
                <p>Nous mettons en œuvre des mesures de sécurité pour protéger vos données personnelles.</p>
                <h4 className="font-semibold text-foreground">Vos droits</h4>
                <p>Vous pouvez à tout moment accéder, modifier ou supprimer vos données en nous contactant.</p>
              </div>
            </DialogContent>
          </Dialog>
 
          <Dialog open={legalDialogOpen === "legal"} onOpenChange={(open) => setLegalDialogOpen(open ? "legal" : null)}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-sm h-9">Mentions légales</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto rounded-2xl bg-card">
              <DialogHeader><DialogTitle>Mentions légales</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground">
                <h4 className="font-semibold text-foreground">Éditeur</h4>
                <p>Loupiaup</p>
                <h4 className="font-semibold text-foreground">Hébergement</h4>
                <p>L'application LiftLog est hébergée sur des serveurs sécurisés utilisant des technologies de protection avancées.</p>
                <h4 className="font-semibold text-foreground">Propriété intellectuelle</h4>
                <p>L'application LiftLog et tous ses éléments associés sont la propriété exclusive de Loupiaup.</p>
              </div>
            </DialogContent>
          </Dialog>
 
          <Dialog open={legalDialogOpen === "contact"} onOpenChange={(open) => setLegalDialogOpen(open ? "contact" : null)}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-sm h-9">Contact</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl bg-card">
              <DialogHeader><DialogTitle>Nous contacter</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>Pour toute question ou demande concernant l'application :</p>
                <p className="text-foreground">Email : support@liftlog.fr<br />Discord : loupiaup207</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  );
};
 
export default Profile;