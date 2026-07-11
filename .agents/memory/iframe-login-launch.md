---
name: Iframe login launch quirks
description: Gotchas for the framed Google-login launcher (window.open behavior, iframe test harness)
---
- **Rule:** Never pass `"noopener"` in the `window.open` features string when you need to detect success — per spec it makes `window.open` return `null` even when the tab opens. Open plainly and set `opened.opener = null` manually.
- **Why:** The framed login launcher checked `window.open(url, "_blank", "noopener")` for truthiness; it always got null, fell through to same-tab navigation, and the preview iframe navigated to Google's 403 page instead of showing the waiting state. Caught only by a UI test.
- **How to apply:** Any popup-based flow (login, OAuth, external links) that branches on whether the popup opened must use the manual-opener-null pattern.
- **Testing framed behavior:** a static `public/iframe-harness.html` that iframes `/` lets the Playwright testing subagent exercise iframe-only code paths (window.self !== window.top) end to end.
