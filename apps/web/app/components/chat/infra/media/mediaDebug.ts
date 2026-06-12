const GLOBAL_FLAG_KEY = "__TC_MEDIA_DEBUG__";
const BRIDGE_INSTALLED_KEY = "__TC_MEDIA_DEBUG_BRIDGE_INSTALLED__";
const BRIDGE_STATUS_FN_KEY = "__TC_MEDIA_DEBUG_STATUS__";
const BRIDGE_ENABLE_FN_KEY = "__TC_ENABLE_MEDIA_DEBUG__";
const BRIDGE_DISABLE_FN_KEY = "__TC_DISABLE_MEDIA_DEBUG__";

type DebugPayload = Record<string, unknown> | undefined;

export function mediaDebug(scope: string, event: string, payload?: DebugPayload): void {
  void scope;
  void event;
  void payload;
}

export function installMediaDebugBridge(): void {
  if (typeof window === "undefined")
    return;

  const w = window as any;
  if (w[BRIDGE_INSTALLED_KEY]) {
    return;
  }
  w[BRIDGE_INSTALLED_KEY] = true;

  w[BRIDGE_STATUS_FN_KEY] = () => false;
  w[BRIDGE_ENABLE_FN_KEY] = () => false;
  w[BRIDGE_DISABLE_FN_KEY] = () => false;
  w[GLOBAL_FLAG_KEY] = false;
}
