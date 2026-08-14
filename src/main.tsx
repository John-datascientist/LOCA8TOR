import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error overlay — shows ANY uncaught error or promise rejection as an
// on-screen banner, not just the ones React's own error boundaries can catch
// (those only cover errors thrown during React's render/commit; this also
// catches errors from requestAnimationFrame callbacks, the service worker,
// and anything else outside React's tree). Exists specifically so bugs
// reported by phone-only users with no dev-tools access become
// screenshot-able instead of just "the page went blank".
(function initErrorOverlay() {
  const errors: string[] = [];
  let overlay: HTMLDivElement | null = null;

  function render() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loca8tor-error-overlay';
      overlay.style.cssText = [
        'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:2147483647',
        'background:#7f1d1d', 'color:#fff', 'padding:10px 14px',
        'font:11px/1.4 monospace', 'max-height:45vh', 'overflow:auto',
        'white-space:pre-wrap', 'word-break:break-word', 'border-top:3px solid #fff',
      ].join(';');
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = '';
    const title = document.createElement('div');
    title.textContent = `⚠️ ${errors.length} error(s) — screenshot this and send to support`;
    title.style.cssText = 'font-weight:bold;font-family:sans-serif;font-size:12px;margin-bottom:6px;';
    overlay.appendChild(title);
    errors.forEach((e) => {
      const line = document.createElement('div');
      line.textContent = e;
      line.style.cssText = 'margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.2);';
      overlay!.appendChild(line);
    });
    const btn = document.createElement('button');
    btn.textContent = 'Dismiss';
    btn.style.cssText = 'background:#fff;color:#7f1d1d;border:none;padding:6px 14px;border-radius:4px;font-weight:bold;font-family:sans-serif;font-size:12px;';
    btn.onclick = () => { overlay?.remove(); overlay = null; errors.length = 0; };
    overlay.appendChild(btn);
  }

  function addError(message: string) {
    errors.unshift(message);
    if (errors.length > 5) errors.length = 5;
    render();
  }

  window.addEventListener('error', (e) => {
    addError(`${e.message}${e.filename ? `\nat ${e.filename}:${e.lineno}:${e.colno}` : ''}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const msg = reason instanceof Error ? `${reason.message}\n${reason.stack || ''}` : String(reason);
    addError(`Unhandled promise rejection: ${msg}`);
  });
})();

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
