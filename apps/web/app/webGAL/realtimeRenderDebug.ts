type RealtimeRenderDebugGlobal = typeof globalThis & {
  __TUANCHAT_DEBUG_WEBGAL__?: boolean | string;
};

export function isRealtimeRenderDebugEnabled(): boolean {
  const debugFlag = (globalThis as RealtimeRenderDebugGlobal).__TUANCHAT_DEBUG_WEBGAL__;
  return Boolean(import.meta.env?.DEV || debugFlag === true || debugFlag === "1");
}

export function debugRealtimeRender(message?: unknown, ...optionalParams: unknown[]): void {
  if (!isRealtimeRenderDebugEnabled()) {
    return;
  }
  console.warn(message, ...optionalParams);
}
