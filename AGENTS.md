# Architecture rules
- Keep only focus-driven `kb-open` handling in App; never compensate viewport height or reset scroll when the keyboard opens.
- Keep the route transition wrapper full-height and the active bottom navigation in the app shell's flex flow, so only main content scrolls.
- Keep temporary viewport diagnostics in a read-only badge mounted once by App; measure the bottom safe area with a hidden probe without changing layout.