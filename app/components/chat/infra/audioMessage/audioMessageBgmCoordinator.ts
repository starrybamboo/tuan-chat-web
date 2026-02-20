export type BgmMessageController = {
  id: string;
  roomId: number;
  messageId: number;
  play: () => Promise<void>;
  playFromStart: () => Promise<void>;
  stop: () => void;
  isPlaying: () => boolean;
  getVolumeRatio: () => number;
  setVolumeRatio: (volume: number) => void;
  getCurrentTimeSec?: () => number;
  setCurrentTimeSec?: (timeSec: number) => void;
};

type ControllerSourceKind = "visual" | "fallback";

type ActiveSource = {
  kind: ControllerSourceKind;
  id: string;
};

type RoomRuntimeState = {
  transitionToken: number;
  activeSource?: ActiveSource;
};

type ControllerLookup = {
  kind: ControllerSourceKind;
  controller: BgmMessageController;
};

type FallbackControllerEntry = {
  controller: BgmMessageController;
  url: string;
  audio: HTMLAudioElement;
  lastUsedAtMs: number;
};

const visualControllersById = new Map<string, BgmMessageController>();
const fallbackControllersById = new Map<string, FallbackControllerEntry>();
const roomRuntimeByRoomId = new Map<number, RoomRuntimeState>();

const BGM_FADE_OUT_MS = 180;
const BGM_FADE_IN_MS = 260;
const BGM_STOP_FADE_OUT_MS = 120;
const MAX_FALLBACK_CONTROLLERS = 40;

function logBgmAuto(event: string, payload?: Record<string, unknown>) {
  void event;
  void payload;
}

function clampVolume(volume: number) {
  if (!Number.isFinite(volume)) {
    return 1;
  }
  return Math.max(0, Math.min(1, volume));
}

function getRoomRuntime(roomId: number) {
  let runtime = roomRuntimeByRoomId.get(roomId);
  if (!runtime) {
    runtime = { transitionToken: 0 };
    roomRuntimeByRoomId.set(roomId, runtime);
  }
  return runtime;
}

function beginRoomTransition(roomId: number) {
  const runtime = getRoomRuntime(roomId);
  runtime.transitionToken += 1;
  return runtime.transitionToken;
}

function isTransitionStale(roomId: number, token: number) {
  const runtime = roomRuntimeByRoomId.get(roomId);
  if (!runtime) {
    return true;
  }
  return runtime.transitionToken !== token;
}

function waitNextFrame(): Promise<number> {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    return new Promise(resolve => setTimeout(() => resolve(Date.now()), 16));
  }
  return new Promise(resolve => window.requestAnimationFrame(resolve));
}

async function fadeControllerVolume(
  controller: BgmMessageController,
  from: number,
  to: number,
  durationMs: number,
  isCancelled: () => boolean,
) {
  const safeFrom = clampVolume(from);
  const safeTo = clampVolume(to);

  if (durationMs <= 0 || safeFrom === safeTo) {
    if (!isCancelled()) {
      controller.setVolumeRatio(safeTo);
    }
    return;
  }

  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  controller.setVolumeRatio(safeFrom);

  while (true) {
    if (isCancelled()) {
      return;
    }
    const now = await waitNextFrame();
    if (isCancelled()) {
      return;
    }
    const elapsed = Math.max(0, now - start);
    const progress = Math.min(1, elapsed / durationMs);
    const eased = 1 - (1 - progress) ** 2;
    const next = safeFrom + (safeTo - safeFrom) * eased;
    controller.setVolumeRatio(next);
    if (progress >= 1) {
      return;
    }
  }
}

function disposeFallbackEntry(entry: FallbackControllerEntry) {
  try {
    entry.audio.pause();
  }
  catch {
    // ignore
  }
  try {
    entry.audio.src = "";
    entry.audio.load();
  }
  catch {
    // ignore
  }
}

function pruneFallbackControllers() {
  if (fallbackControllersById.size <= MAX_FALLBACK_CONTROLLERS) {
    return;
  }
  const entries = Array.from(fallbackControllersById.entries())
    .map(([id, entry]) => ({ id, entry }))
    .sort((a, b) => a.entry.lastUsedAtMs - b.entry.lastUsedAtMs);

  for (const { id, entry } of entries) {
    if (fallbackControllersById.size <= MAX_FALLBACK_CONTROLLERS) {
      break;
    }
    if (entry.controller.isPlaying()) {
      continue;
    }
    fallbackControllersById.delete(id);
    disposeFallbackEntry(entry);
  }
}

function resolveControllerById(id: string): ControllerLookup | undefined {
  const visual = visualControllersById.get(id);
  if (visual) {
    return { kind: "visual", controller: visual };
  }
  const fallback = fallbackControllersById.get(id);
  if (fallback) {
    return { kind: "fallback", controller: fallback.controller };
  }
  return undefined;
}

function resolveCurrentController(roomId: number): ControllerLookup | undefined {
  const runtime = roomRuntimeByRoomId.get(roomId);
  if (runtime?.activeSource) {
    const found = resolveControllerById(runtime.activeSource.id);
    if (found && found.kind === runtime.activeSource.kind) {
      return found;
    }
  }

  for (const controller of visualControllersById.values()) {
    if (controller.roomId === roomId && controller.isPlaying()) {
      return { kind: "visual", controller };
    }
  }
  for (const entry of fallbackControllersById.values()) {
    if (entry.controller.roomId === roomId && entry.controller.isPlaying()) {
      return { kind: "fallback", controller: entry.controller };
    }
  }
  return undefined;
}

function ensureFallbackController(params: { roomId: number; messageId: number; url: string }) {
  const { roomId, messageId, url } = params;
  const controllerId = createBgmControllerId(roomId, messageId);
  const existing = fallbackControllersById.get(controllerId);

  if (existing) {
    existing.lastUsedAtMs = Date.now();
    if (existing.url === url) {
      logBgmAuto("fallback-hit", { roomId, messageId, controllerId });
      return existing.controller;
    }
    disposeFallbackEntry(existing);
    fallbackControllersById.delete(controllerId);
  }

  const audio = new Audio();
  audio.preload = "metadata";
  audio.loop = false;
  audio.crossOrigin = "anonymous";
  audio.src = url;

  let volumeRatio = 1;
  const controller: BgmMessageController = {
    id: controllerId,
    roomId,
    messageId,
    play: async () => {
      audio.loop = false;
      audio.volume = clampVolume(volumeRatio);
      await audio.play();
    },
    playFromStart: async () => {
      try {
        audio.currentTime = 0;
      }
      catch {
        // ignore
      }
      audio.loop = false;
      audio.volume = clampVolume(volumeRatio);
      await audio.play();
    },
    stop: () => {
      try {
        audio.pause();
      }
      catch {
        // ignore
      }
      try {
        audio.currentTime = 0;
      }
      catch {
        // ignore
      }
    },
    isPlaying: () => !audio.paused,
    getVolumeRatio: () => volumeRatio,
    setVolumeRatio: (nextVolume) => {
      volumeRatio = clampVolume(nextVolume);
      try {
        audio.volume = volumeRatio;
      }
      catch {
        // ignore
      }
    },
    getCurrentTimeSec: () => {
      const t = audio.currentTime;
      return Number.isFinite(t) ? Math.max(0, t) : 0;
    },
    setCurrentTimeSec: (timeSec) => {
      const t = Number.isFinite(timeSec) ? Math.max(0, timeSec) : 0;
      try {
        audio.currentTime = t;
      }
      catch {
        // ignore
      }
    },
  };

  fallbackControllersById.set(controllerId, {
    controller,
    url,
    audio,
    lastUsedAtMs: Date.now(),
  });
  logBgmAuto("fallback-create", { roomId, messageId, controllerId, url });
  pruneFallbackControllers();
  return controller;
}

export function createBgmControllerId(roomId: number, messageId: number) {
  return `bgm-msg:${roomId}:${messageId}`;
}

export function registerBgmMessageController(controller: BgmMessageController) {
  visualControllersById.set(controller.id, controller);
}

export function unregisterBgmMessageController(params: { roomId: number; messageId: number }) {
  const { roomId, messageId } = params;
  const controllerId = createBgmControllerId(roomId, messageId);
  const runtime = roomRuntimeByRoomId.get(roomId);
  if (runtime?.activeSource?.kind === "visual" && runtime.activeSource.id === controllerId) {
    runtime.activeSource = undefined;
  }
  visualControllersById.delete(controllerId);
}

export function isBgmMessagePlaying(roomId: number, messageId: number) {
  const targetId = createBgmControllerId(roomId, messageId);
  const current = resolveCurrentController(roomId);
  return Boolean(current?.controller.id === targetId && current.controller.isPlaying());
}

export async function requestPlayBgmMessage(roomId: number, messageId: number) {
  const targetId = createBgmControllerId(roomId, messageId);
  const targetLookup = resolveControllerById(targetId);
  if (!targetLookup) {
    logBgmAuto("play-skip-no-target", { roomId, messageId });
    return;
  }
  const target = targetLookup.controller;

  const runtime = getRoomRuntime(roomId);
  const token = beginRoomTransition(roomId);
  const currentLookup = resolveCurrentController(roomId);
  const current = currentLookup?.controller;
  if (current && current.id === targetId && current.isPlaying()) {
    logBgmAuto("play-skip-already-playing", { roomId, messageId });
    return;
  }

  if (current && current.id !== targetId && current.isPlaying()) {
    await fadeControllerVolume(
      current,
      current.getVolumeRatio(),
      0,
      BGM_FADE_OUT_MS,
      () => isTransitionStale(roomId, token),
    );
    if (isTransitionStale(roomId, token)) {
      return;
    }
    current.stop();
  }

  if (isTransitionStale(roomId, token)) {
    return;
  }

  target.setVolumeRatio(0);
  try {
    await target.playFromStart();
  }
  catch (error) {
    logBgmAuto("play-failed", {
      roomId,
      messageId,
      sourceKind: targetLookup.kind,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (isTransitionStale(roomId, token)) {
    target.stop();
    return;
  }

  runtime.activeSource = { kind: targetLookup.kind, id: targetId };
  logBgmAuto("play-started", { roomId, messageId, sourceKind: targetLookup.kind });
  await fadeControllerVolume(
    target,
    target.getVolumeRatio(),
    1,
    BGM_FADE_IN_MS,
    () => isTransitionStale(roomId, token),
  );
}

export async function requestPlayBgmMessageWithUrl(roomId: number, messageId: number, url: string) {
  if (!url) {
    return;
  }
  ensureFallbackController({ roomId, messageId, url });
  logBgmAuto("play-with-url", { roomId, messageId, url });
  await requestPlayBgmMessage(roomId, messageId);
}

export async function handoverBgmPlaybackToFallback(
  roomId: number,
  messageId: number,
  url: string,
  snapshot?: { currentTimeSec?: number; volumeRatio?: number },
) {
  if (!url) {
    return;
  }
  const targetId = createBgmControllerId(roomId, messageId);
  const currentLookup = resolveCurrentController(roomId);
  const current = currentLookup?.controller;
  if (!current || current.id !== targetId || !current.isPlaying()) {
    return;
  }

  const fallback = ensureFallbackController({ roomId, messageId, url });
  const volumeRatio = typeof snapshot?.volumeRatio === "number"
    ? snapshot.volumeRatio
    : current.getVolumeRatio();
  fallback.setVolumeRatio(volumeRatio);
  const timeSec = typeof snapshot?.currentTimeSec === "number"
    ? snapshot.currentTimeSec
    : current.getCurrentTimeSec?.();
  if (typeof timeSec === "number" && Number.isFinite(timeSec) && timeSec > 0) {
    fallback.setCurrentTimeSec?.(timeSec);
  }

  try {
    await fallback.play();
  }
  catch (error) {
    logBgmAuto("handover-failed", {
      roomId,
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const runtime = getRoomRuntime(roomId);
  runtime.activeSource = { kind: "fallback", id: targetId };
  current.stop();
  logBgmAuto("handover-success", {
    roomId,
    messageId,
    timeSec: typeof timeSec === "number" && Number.isFinite(timeSec) ? timeSec : undefined,
    volumeRatio,
  });
}

export async function requestStopRoomBgm(roomId: number) {
  const active = resolveCurrentController(roomId)?.controller;
  if (!active) {
    logBgmAuto("stop-skip-no-active", { roomId });
    return;
  }

  const token = beginRoomTransition(roomId);
  const runtime = getRoomRuntime(roomId);
  runtime.activeSource = undefined;

  await fadeControllerVolume(
    active,
    active.getVolumeRatio(),
    0,
    BGM_STOP_FADE_OUT_MS,
    () => isTransitionStale(roomId, token),
  );
  if (isTransitionStale(roomId, token)) {
    return;
  }
  active.stop();
  logBgmAuto("stop-done", { roomId });
}

export function markBgmMessageStopped(roomId: number, messageId: number) {
  const runtime = roomRuntimeByRoomId.get(roomId);
  if (!runtime?.activeSource) {
    return;
  }
  const controllerId = createBgmControllerId(roomId, messageId);
  if (runtime.activeSource.id === controllerId) {
    runtime.activeSource = undefined;
  }
}
