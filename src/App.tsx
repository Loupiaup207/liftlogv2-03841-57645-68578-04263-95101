import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Workout from "./pages/Workout";
import Nutrition from "./pages/Nutrition";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { PageTransition } from "./components/PageTransition";
import { initializeWebNotifications } from "./lib/notifications";

import { queryClient } from "./lib/queryClient";
import { TimerProvider } from "./contexts/TimerContext";
import { ViewportDebugBadge } from "./components/ViewportDebugBadge";

const App = () => {
  useEffect(() => {
    const root = document.documentElement;
    let blurTimer: number | undefined;
    const isEditable = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
      return target instanceof HTMLInputElement &&
        !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "hidden"].includes(target.type);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!isEditable(event.target)) return;
      window.clearTimeout(blurTimer);
      root.classList.add("kb-open");
    };
    const onFocusOut = () => {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        if (!isEditable(document.activeElement)) root.classList.remove("kb-open");
      }, 100);
    };
    root.classList.toggle("kb-open", isEditable(document.activeElement));
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.clearTimeout(blurTimer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      root.classList.remove("kb-open");
    };
  }, []);

  useEffect(() => {
    // Initialize web notifications on app load
    initializeWebNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <ViewportDebugBadge />
          <Toaster />
          <Sonner />
          <TimerProvider>
            <BrowserRouter>
              <PageTransition>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/workout/:id" element={<Workout />} />
                  <Route path="/nutrition" element={<Nutrition />} />
                  <Route path="/profile" element={<Profile />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PageTransition>
            </BrowserRouter>
          </TimerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
