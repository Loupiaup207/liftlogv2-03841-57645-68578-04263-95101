import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/queryClient";

// Corrige l'espace vide en bas au premier chargement de la PWA iOS :
// on force un recalcul de la hauteur réelle du viewport après le premier rendu.
const setAppHeight = () => {
  const h = window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${h}px`);
};

setAppHeight();
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", setAppHeight);
window.addEventListener("pageshow", setAppHeight);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

// Recalcul forcé juste après le premier paint (iOS renvoie une hauteur erronée au boot)
requestAnimationFrame(() => {
  setAppHeight();
  requestAnimationFrame(setAppHeight);
});
window.addEventListener("load", () => {
  setAppHeight();
  setTimeout(setAppHeight, 100);
  setTimeout(setAppHeight, 300);
});

