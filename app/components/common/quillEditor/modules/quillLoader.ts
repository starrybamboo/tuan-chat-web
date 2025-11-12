import type { Logger } from "../utils/logger";

import { createLogger } from "../utils/logger";
import { registerBlots } from "./quillBlots";

let quillPromise: Promise<any> | null = null;
let warmedUp = false;

/**
 * Load Quill lazily and ensure custom blots are registered (idempotent).
 */
export function preloadQuill(log?: Logger): Promise<any> | null {
  const logger = log ?? createLogger("CORE/Loader", { domainKey: "CORE" });
  if (typeof window === "undefined") {
    logger.warn("preloadQuill skipped: SSR");
    return null;
  }
  if (!quillPromise) {
    logger.info("preloadQuill: importing quill module");
    quillPromise = import("quill").then((mod) => {
      const Q = (mod as any)?.default ?? mod;
      try {
        registerBlots(Q, logger.child("Blots"));
      }
      catch (e) {
        logger.warn("registerBlots in preload failed", { error: String(e) });
      }
      return mod;
    });
  }
  return quillPromise;
}

/**
 * Warmup on idle to reduce first-open latency.
 */
export function warmupQuill(log?: Logger): void {
  const logger = log ?? createLogger("CORE/Loader", { domainKey: "CORE" });
  if (typeof window === "undefined") {
    return;
  }
  if (warmedUp) {
    return;
  }
  warmedUp = true;
  const ric: ((cb: () => void) => void) | undefined = (window as any).requestIdleCallback;
  if (ric) {
    ric(() => preloadQuill(logger));
  }
  else {
    setTimeout(() => preloadQuill(logger), 0);
  }
}

// Auto warm on module load (browser only), mirrors previous behavior
if (typeof window !== "undefined") {
  try {
    warmupQuill();
  }
  catch {
    // ignore
  }
}
