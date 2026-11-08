import { useEffect } from "react";

const isEditable = (target: EventTarget | null): target is HTMLElement => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement &&
    !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "hidden"].includes(target.type);
};

export function useIOSViewportFix() {
  useEffect(() => {
    const root = document.documentElement;
    const standalone = window.matchMedia("(display-mode: standalone)");
    const iosNavigator = navigator as Navigator & { standalone?: boolean };
    let blurTimer: number | undefined;
    let frame: number | undefined;

    const resetScroll = () => {
      window.scrollTo(0, 0);
      root.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    const syncStandalone = () => {
      root.classList.toggle("standalone", standalone.matches || iosNavigator.standalone === true);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!isEditable(event.target)) return;
      window.clearTimeout(blurTimer);
      root.classList.add("kb-open");
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(resetScroll);
    };
    const onFocusOut = () => {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        if (isEditable(document.activeElement)) return;
        root.classList.remove("kb-open");
        resetScroll();
      }, 100);
    };
    const onPageShow = () => {
      syncStandalone();
      root.classList.toggle("kb-open", isEditable(document.activeElement));
      resetScroll();
    };

    onPageShow();
    standalone.addEventListener("change", syncStandalone);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      window.clearTimeout(blurTimer);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      standalone.removeEventListener("change", syncStandalone);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      root.classList.remove("kb-open", "standalone");
    };
  }, []);
}