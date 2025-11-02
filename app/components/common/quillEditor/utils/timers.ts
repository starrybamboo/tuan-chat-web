/* Lightweight timing helpers for editor hooks */

export type Debounced<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => void & { cancel: () => void };

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 100,
  leading = false,
): Debounced<T> {
  let t: ReturnType<typeof setTimeout> | null = null;
  let leadingCalled = false;

  const wrapped: any = (...args: Parameters<T>) => {
    if (t) {
      clearTimeout(t);
      t = null;
    }
    if (leading && !leadingCalled) {
      fn(...args);
      leadingCalled = true;
    }
    t = setTimeout(() => {
      if (!leading) {
        fn(...args);
      }
      leadingCalled = false;
      t = null;
    }, wait);
  };

  wrapped.cancel = () => {
    if (t) {
      clearTimeout(t);
      t = null;
    }
    leadingCalled = false;
  };

  return wrapped as Debounced<T>;
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval = 100,
): (...args: Parameters<T>) => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remain = interval - (now - last);
    if (remain <= 0) {
      last = now;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      fn(...args);
    }
    else {
      pending = args;
      if (!timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = null;
          if (pending) {
            fn(...pending);
            pending = null;
          }
        }, remain);
      }
    }
  };
}

export function raf(callback: FrameRequestCallback): number {
  return requestAnimationFrame(callback);
}

export function cancelRaf(id: number): void {
  cancelAnimationFrame(id);
}

export function raf2(callback: () => void): { cancel: () => void } {
  let id1: number | null = null;
  let id2: number | null = null;
  id1 = requestAnimationFrame(() => {
    id2 = requestAnimationFrame(() => {
      callback();
    });
  });
  return {
    cancel: () => {
      if (id1 != null) {
        cancelAnimationFrame(id1);
        id1 = null;
      }
      if (id2 != null) {
        cancelAnimationFrame(id2);
        id2 = null;
      }
    },
  };
}
