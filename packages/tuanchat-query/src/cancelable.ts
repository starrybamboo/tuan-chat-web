type CancelableRequest<T> = Promise<T> & { cancel?: () => void };

export function bindCancelablePromiseToSignal<T>(
  promise: CancelableRequest<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    promise.cancel?.();
    throw new DOMException("Request aborted", "AbortError");
  }

  const cancel = typeof promise.cancel === "function"
    ? () => promise.cancel?.()
    : undefined;
  if (cancel) {
    signal.addEventListener("abort", cancel, { once: true });
  }

  return promise.finally(() => {
    if (cancel) {
      signal.removeEventListener("abort", cancel);
    }
  });
}
