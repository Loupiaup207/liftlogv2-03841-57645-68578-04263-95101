# Architecture rules
- Keep viewport and keyboard lifecycle handling in `useIOSViewportFix`, called once by App, so route changes cannot install competing listeners.
- Keep the route transition wrapper full-height and the active bottom navigation in the app shell's flex flow, so only main content scrolls.