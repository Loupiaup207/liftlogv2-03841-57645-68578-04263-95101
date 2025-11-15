import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [oauthUnavailableOpen, setOauthUnavailableOpen] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (showResetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast({
          title: "Email envoyé!",
          description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe.",
        });
        setShowResetPassword(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        toast({ title: "Connexion réussie!" });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;
        toast({ 
          title: "Compte créé!", 
          description: "Vous pouvez maintenant vous connecter." 
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Affiche le dialog d'indisponibilité pour l'instant
    setOauthUnavailableOpen(true);
  };

  const handleAppleSignIn = async () => {
    // Affiche le dialog d'indisponibilité pour l'instant
    setOauthUnavailableOpen(true);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background p-6 overflow-hidden">
      <Card className={`w-full max-w-md p-8 space-y-6 animate-fade-in ${!isLogin ? 'bg-white text-black' : ''}`}>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-light tracking-widest">LIFTLOG</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Label htmlFor="email" className={!isLogin ? 'text-black' : ''}>Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              className={!isLogin 
                ? 'bg-gray-50 border-gray-300 text-black placeholder:text-gray-500 focus-visible:ring-gray-400 focus-visible:border-gray-400' 
                : 'focus-visible:ring-white focus-visible:border-white'}
            />
          </div>

          {!showResetPassword && (
            <div>
              <Label htmlFor="password" className={!isLogin ? 'text-black' : ''}>Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className={!isLogin 
                  ? 'bg-gray-50 border-gray-300 text-black placeholder:text-gray-500 focus-visible:ring-gray-400 focus-visible:border-gray-400' 
                  : 'focus-visible:ring-white focus-visible:border-white'}
              />
            </div>
          )}

          {isLogin && !showResetPassword && (
            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Mot de passe oublié ?
            </button>
          )}

          <Button 
            type="submit" 
            className={`w-full ${!isLogin ? 'bg-zinc-900 hover:bg-zinc-800 text-white' : ''}`}
            disabled={loading}
          >
            {loading 
              ? "Chargement..." 
              : showResetPassword 
                ? "Envoyer l'email" 
                : isLogin 
                  ? "Se connecter" 
                  : "S'inscrire"}
          </Button>
        </form>

         {/* OAuth section */}
        <div className="space-y-2">
          {!showResetPassword && (
            <>
              <div className="relative -mt-2"> {/* Ajout de -mt-2 pour remonter */}
                <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                OU
              </span>
            </div>


              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${!isLogin ? 'text-white' : ''}`}
                  onClick={handleGoogleSignIn}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuer avec Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${!isLogin ? 'text-white' : ''}`}
                  onClick={handleAppleSignIn}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continuer avec Apple
                </Button>
              </div>
            </>
          )}

          {showResetPassword ? (
            <Button
              variant="ghost"
              className="w-full transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => {
                setShowResetPassword(false);
                setIsLogin(true);
              }}
            >
              Retour à la connexion
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </Button>
          )}
        </div>

        {/* Texte conditions d'utilisation */}
        <p className={`text-xs text-center ${!isLogin ? 'text-gray-600' : 'text-muted-foreground'}`}>
          En vous {isLogin ? "connectant" : "inscrivant"}, vous acceptez nos{" "}
          <button
            type="button"
            onClick={() => setLegalDialogOpen("terms")}
            className="underline hover:opacity-75 transition-opacity font-semibold"
          >
            conditions d'utilisation
          </button>
        </p>

        {/* Dialogs */}
        {/* ...Dialog content... */}

        {/* Dialog d'indisponibilité OAuth */}
        <Dialog open={oauthUnavailableOpen} onOpenChange={setOauthUnavailableOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl bg-card">
            <DialogHeader>
              <DialogTitle>Indisponible</DialogTitle>
              <DialogDescription>
                L'authentification via Google / Apple n'est pas disponible pour le moment. Réessayez plus tard.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setOauthUnavailableOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Conditions d'utilisation */}
        <Dialog open={legalDialogOpen === "terms"} onOpenChange={(open) => setLegalDialogOpen(open ? "terms" : null)}>
          <DialogContent className="max-h-[80vh] overflow-y-auto rounded-2xl bg-card">
            <DialogHeader>
              <DialogTitle>Conditions d'utilisation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p>
                Bienvenue sur LIFTLOG. En utilisant cette application, vous acceptez de respecter ces conditions d'utilisation.
              </p>
              <h3 className="font-semibold">1. Utilisation de l'application</h3>
              <p>
                LIFTLOG est fourni à titre de service personnel de suivi des entraînements. Vous acceptez d'utiliser l'application uniquement à des fins légales et personnelles.
              </p>
              <h3 className="font-semibold">2. Responsabilité</h3>
              <p>
                L'application est fournie "telle quelle". Nous ne sommes pas responsables des blessures ou dommages résultant de l'utilisation de l'application ou des données qu'elle contient.
              </p>
              <h3 className="font-semibold">3. Données personnelles</h3>
              <p>
                Vos données d'entraînement sont stockées de manière sécurisée. Veuillez consulter notre politique de confidentialité pour plus de détails.
              </p>
              <h3 className="font-semibold">4. Modifications</h3>
              <p>
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet immédiatement après leur publication.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setLegalDialogOpen(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default Auth;
