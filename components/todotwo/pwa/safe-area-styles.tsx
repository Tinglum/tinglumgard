/**
 * Safe-area insets for the installed app.
 *
 * In standalone mode there is no browser chrome, so the shell's own bars sit
 * directly under the notch and over the home indicator. The fixed bottom
 * navigation in particular ends up half inside the gesture bar on an iPhone.
 *
 * Why a style element rather than app/todotwo/todotwo.css or app-shell.tsx:
 * Phase 7 may only write under components/todotwo/pwa/**, and these rules
 * belong to the installed experience rather than to the shell's own layout.
 * They target the shell by its landmark roles, which is why the selectors look
 * indirect. Fold them into todotwo.css when the shell is next touched.
 *
 * env(safe-area-inset-*) is 0 on every device without an inset, so this is a
 * no-op in a desktop browser and needs no feature query.
 */
const CSS = `
.todotwo-root nav[aria-label="Main menu"].fixed {
  padding-bottom: env(safe-area-inset-bottom);
}

@media (max-width: 767px) {
  .todotwo-root main {
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
    padding-bottom: calc(6rem + env(safe-area-inset-bottom));
  }

  /* The shell header is the topmost element whenever the connection banner is
     absent, so it carries the notch inset itself. */
  .todotwo-root > div > div > header:first-child {
    padding-top: max(0.75rem, env(safe-area-inset-top));
  }
}

/* Tap targets. The shell's completion toggle is 28px of visual circle; this
   gives it a 44px hit area without changing how it looks. */
.todotwo-root button[aria-pressed] {
  position: relative;
}

.todotwo-root button[aria-pressed]::after {
  content: "";
  position: absolute;
  inset: 50% 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
}
`

export function SafeAreaStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />
}
