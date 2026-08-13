import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA installability (production only)
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreviewHost = window.location.hostname.endsWith(".vercel.app");

if ('serviceWorker' in navigator && !isInIframe && !isPreviewHost) {
  // Cache-bust the SW file itself so browsers don't keep serving an old sw.js
  // for up to 24h (the default HTTP cache TTL for service workers).
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
    // Check for a new SW every time the tab regains focus.
    const checkForUpdate = () => reg.update().catch(() => {});
    window.addEventListener('focus', checkForUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  }).catch(() => {});

  // When the new SW takes control, reload once so the page runs the new build.
  let hasReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });

  // Also reload when the SW explicitly tells us a new version is active.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED' && !hasReloaded) {
      hasReloaded = true;
      window.location.reload();
    }
  });
} else if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
}
