import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

// Check if we're on native or web
const isNative = Capacitor.isNativePlatform();

export const setupNotifications = async () => {
  if (isNative) {
    // Native notifications (Capacitor)
    try {
      const permStatus = await LocalNotifications.checkPermissions();
      
      if (permStatus.display === "prompt" || permStatus.display === "prompt-with-rationale") {
        const requestResult = await LocalNotifications.requestPermissions();
        return requestResult.display === "granted";
      }
      
      return permStatus.display === "granted";
    } catch (error) {
      console.error("Error setting up native notifications:", error);
      return false;
    }
  } else {
    // Web notifications (PWA)
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }
};

// Store the interval ID globally so we can clear it
let notificationInterval: number | null = null;

export const scheduleWorkoutReminder = async (time: string) => {
  try {
    // Parse time (format: HH:MM)
    const [hours, minutes] = time.split(":").map(Number);

    if (isNative) {
      // Native notifications (Capacitor)
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

      const now = new Date();
      const scheduledTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0
      );

      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1,
            title: "C'est l'heure de s'entraîner! 💪",
            body: "N'oubliez pas votre séance d'entraînement",
            schedule: {
              at: scheduledTime,
              repeats: true,
              every: "day",
            },
            sound: undefined,
            attachments: undefined,
            actionTypeId: "",
            extra: null,
          },
        ],
      });

      console.log("Native notification scheduled for:", scheduledTime);
    } else {
      // Web notifications (PWA)
      // Clear any existing interval
      if (notificationInterval) {
        clearInterval(notificationInterval);
      }

      // Store the time in localStorage
      localStorage.setItem("workoutReminderTime", time);

      // Check every minute if it's time to send notification
      const checkAndNotify = () => {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        if (currentHours === hours && currentMinutes === minutes) {
          // Send notification
          if (Notification.permission === "granted") {
            new Notification("C'est l'heure de s'entraîner! 💪", {
              body: "N'oubliez pas votre séance d'entraînement",
              icon: "/icon-512.png",
              badge: "/icon-512.png",
            });
          }
        }
      };

      // Check immediately
      checkAndNotify();

      // Then check every minute
      notificationInterval = window.setInterval(checkAndNotify, 60000);

      console.log("Web notification scheduled for:", time);
    }
  } catch (error) {
    console.error("Error scheduling notification:", error);
    throw error;
  }
};

export const cancelWorkoutReminder = async () => {
  try {
    if (isNative) {
      // Cancel native notifications
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    } else {
      // Cancel web notifications
      if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
      }
      localStorage.removeItem("workoutReminderTime");
    }
    console.log("Workout reminder cancelled");
  } catch (error) {
    console.error("Error cancelling notification:", error);
  }
};

// Initialize web notifications on app load
export const initializeWebNotifications = () => {
  if (!isNative && typeof window !== "undefined") {
    const savedTime = localStorage.getItem("workoutReminderTime");
    if (savedTime) {
      // Re-schedule the notification
      scheduleWorkoutReminder(savedTime).catch(console.error);
    }
  }
};
