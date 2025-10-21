import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { setupNotifications, scheduleWorkoutReminder, cancelWorkoutReminder } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

export const WorkoutReminderSettings = () => {
  const { preferences, loading, updatePreferences } = useUserPreferences();
  const { toast } = useToast();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("18:00");

  useEffect(() => {
    if (preferences) {
      setReminderEnabled(preferences.reminder_enabled);
      setReminderTime(preferences.workout_reminder_time || "18:00");
    }
  }, [preferences]);

  const handleToggleReminder = async (checked: boolean) => {
    setReminderEnabled(checked);

    if (checked) {
      const hasPermission = await setupNotifications();
      
      if (!hasPermission) {
        toast({
          title: "Permission refusée",
          description: "Veuillez autoriser les notifications dans les paramètres",
          variant: "destructive",
        });
        setReminderEnabled(false);
        return;
      }

      try {
        await scheduleWorkoutReminder(reminderTime);
        await updatePreferences({
          reminder_enabled: true,
          workout_reminder_time: reminderTime,
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de programmer la notification",
          variant: "destructive",
        });
        setReminderEnabled(false);
      }
    } else {
      await cancelWorkoutReminder();
      await updatePreferences({
        reminder_enabled: false,
      });
    }
  };

  const handleUpdateTime = async () => {
    if (reminderEnabled) {
      try {
        await scheduleWorkoutReminder(reminderTime);
        await updatePreferences({
          workout_reminder_time: reminderTime,
        });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour l'heure",
          variant: "destructive",
        });
      }
    } else {
      await updatePreferences({
        workout_reminder_time: reminderTime,
      });
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Card className="p-4 bg-card mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-light tracking-wider">RAPPEL D'ENTRAÎNEMENT</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="reminder-toggle" className="text-sm">
            Activer les rappels quotidiens
          </Label>
          <Switch
            id="reminder-toggle"
            checked={reminderEnabled}
            onCheckedChange={handleToggleReminder}
          />
        </div>

        {reminderEnabled && (
          <div className="space-y-2">
            <Label htmlFor="reminder-time" className="text-sm">
              Heure du rappel
            </Label>
            <div className="flex gap-2">
              <Input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleUpdateTime} size="sm">
                Mettre à jour
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
