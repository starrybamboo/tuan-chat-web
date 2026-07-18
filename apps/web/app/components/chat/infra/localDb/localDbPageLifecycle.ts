type VisibilityDocument = {
  addEventListener: (type: "visibilitychange", listener: () => void) => void;
  removeEventListener: (type: "visibilitychange", listener: () => void) => void;
  visibilityState: DocumentVisibilityState;
};

/** 尚未持有数据库的隐藏页面，重新可见后才允许发起所有权竞争。 */
export function waitForVisibleDocument(
  target: VisibilityDocument | undefined,
  signal: AbortSignal,
): Promise<void> {
  if (!target || target.visibilityState !== "hidden") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener("visibilitychange", handleVisibilityChange);
      signal.removeEventListener("abort", handleAbort);
    };
    const handleAbort = () => {
      cleanup();
      reject(signal.reason);
    };
    const handleVisibilityChange = () => {
      if (target.visibilityState === "hidden") {
        return;
      }
      cleanup();
      resolve();
    };

    if (signal.aborted) {
      handleAbort();
      return;
    }
    target.addEventListener("visibilitychange", handleVisibilityChange);
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}
