# Tasks
- [x] Remove viewport compensation and duplicate bottom navigation spacing.
- [x] Add a temporary live viewport/safe-area diagnostic badge without other interface changes.
- [x] Verify the badge and keyboard class on desktop/mobile login; authenticated nav remains blocked below.
- [x] Stabilize the iOS PWA frame and centralize keyboard handling.
- [x] Move bottom navigation into normal flex flow and replace screen-height classes.
- [x] Check Drawer/Sheet usage without modifying them; verify desktop/mobile frame and focus/blur on the public login page.
- [ ] Verify authenticated bottom navigation end-to-end: blocked because no test session matches the requesting user; sign in in the preview.
- [ ] Confirm keyboard overlay in an actual iOS 18 installed PWA: requires an iOS device; Chromium cannot reproduce WebKit keyboard behavior.