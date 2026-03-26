type GuardToken = symbol;

let installed = false;
let handler: ((event: Event) => void) | null = null;
const activeTokens = new Set<GuardToken>();

function shouldGuardSelection(target: EventTarget | null) {
  if (!(target instanceof Element))
    return false;

  return Boolean(
    target.closest(
      ".slash-menu, affine-slash-menu, inner-slash-menu, affine-slash-menu-widget",
    ),
  );
}

function ensureInstalled() {
  if (installed || typeof document === "undefined")
    return;

  handler = (event: Event) => {
    if (activeTokens.size > 0 && shouldGuardSelection(event.target)) {
      event.preventDefault();
    }
  };

  document.addEventListener("pointerdown", handler, true);
  document.addEventListener("mousedown", handler, true);
  document.addEventListener("touchstart", handler, true);
  installed = true;
}

function teardownIfIdle() {
  if (!installed || activeTokens.size > 0 || typeof document === "undefined" || !handler)
    return;

  document.removeEventListener("pointerdown", handler, true);
  document.removeEventListener("mousedown", handler, true);
  document.removeEventListener("touchstart", handler, true);
  handler = null;
  installed = false;
}

export function registerBlocksuiteSlashMenuSelectionGuard(): () => void {
  const token = Symbol("blocksuite-slash-menu-selection-guard");
  activeTokens.add(token);
  ensureInstalled();

  return () => {
    activeTokens.delete(token);
    teardownIfIdle();
  };
}
