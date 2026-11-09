# Architecture rules
- Keep only focus-driven `kb-open` handling in App; never compensate viewport height or reset scroll when the keyboard opens.
- Keep the route transition wrapper full-height; overlay main content and bottom navigation in a shared shell grid cell without fixed nav positioning, so only main content scrolls and keyboard focus cannot resize the shell.
- Keep temporary viewport diagnostics in a read-only badge mounted once by App; measure the bottom safe area with a hidden probe without changing layout.