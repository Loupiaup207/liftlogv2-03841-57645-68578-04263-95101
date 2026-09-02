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

// Détecte le mode standalone iOS PWA et met à jour la safe-area dynamique.
function isStandalonePWA() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
}

const updateStandaloneSafeArea = () => {
  if (isStandalonePWA()) {
    document.body.classList.add("pwa-standalone");
    // Lire env(safe-area-inset-bottom) via un élément temporaire (certains
    // navigateurs ne renvoient pas cette valeur sur :root directement).
    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.paddingBottom = "env(safe-area-inset-bottom)";
    document.body.appendChild(probe);
    const computedBottom = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    document.body.removeChild(probe);
    document.documentElement.style.setProperty("--safe-bottom", `${computedBottom}px`);
  } else {
    document.body.classList.remove("pwa-standalone");
    document.documentElement.style.setProperty("--safe-bottom", "0px");
  }
};

setAppHeight();
updateStandaloneSafeArea();
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", setAppHeight);
window.addEventListener("pageshow", () => {
  setAppHeight();
  updateStandaloneSafeArea();
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

// Recalcul forcé juste après le premier paint (iOS renvoie une hauteur erronée au boot)
requestAnimationFrame(() => {
  setAppHeight();
  updateStandaloneSafeArea();
  requestAnimationFrame(() => {
    setAppHeight();
    updateStandaloneSafeArea();
  });
});
window.addEventListener("load", () => {
  setAppHeight();
  updateStandaloneSafeArea();
  setTimeout(() => { setAppHeight(); updateStandaloneSafeArea(); }, 100);
  setTimeout(() => { setAppHeight(); updateStandaloneSafeArea(); }, 300);
});

