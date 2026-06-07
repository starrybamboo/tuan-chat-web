type WindowTimerBindingTarget = Pick<
  Window,
  "clearInterval" | "clearTimeout" | "setInterval" | "setTimeout"
> & {
  __tcWindowTimersBound?: boolean;
};

type WindowTimerKey = "clearInterval" | "clearTimeout" | "setInterval" | "setTimeout";

function bindTimerFunction<K extends WindowTimerKey>(
  target: WindowTimerBindingTarget,
  key: K,
): WindowTimerBindingTarget[K] {
  return target[key].bind(target) as WindowTimerBindingTarget[K];
}

/**
 * Safari requires Window timer APIs to be called with Window as this.
 * Some bundled dependencies cache them as bare functions, so bind them before app imports run.
 */
export function installBoundWindowTimers(target?: WindowTimerBindingTarget): void {
  const resolvedTarget = target ?? (typeof window === "undefined"
    ? undefined
    : window as unknown as WindowTimerBindingTarget);
  if (!resolvedTarget)
    return;

  if (resolvedTarget.__tcWindowTimersBound)
    return;

  resolvedTarget.setTimeout = bindTimerFunction(resolvedTarget, "setTimeout");
  resolvedTarget.clearTimeout = bindTimerFunction(resolvedTarget, "clearTimeout");
  resolvedTarget.setInterval = bindTimerFunction(resolvedTarget, "setInterval");
  resolvedTarget.clearInterval = bindTimerFunction(resolvedTarget, "clearInterval");
  resolvedTarget.__tcWindowTimersBound = true;
}

installBoundWindowTimers();
