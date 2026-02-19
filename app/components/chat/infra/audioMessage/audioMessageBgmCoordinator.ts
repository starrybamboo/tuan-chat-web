export type BgmMessageController = {
  id: string;
  roomId: number;
  messageId: number;
  playFromStart: () => Promise<void>;
  stop: () => void;
  isPlaying: () => boolean;
  getVolumeRatio: () => number;
  setVolumeRatio: (volume: number) => void;
};

type RoomRuntimeState = {
  transitionToken: number;
  activeControllerId?: string;
};

const controllersById = new Map<string, BgmMessageController>();
const roomRuntimeByRoomId = new Map<number, RoomRuntimeState>();

const BGM_FADE_OUT_MS = 180;
const BGM_FADE_IN_MS = 260;
const BGM_STOP_FADE_OUT_MS = 120;

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
    // 轻微 ease-out，避免音量变化听起来太硬。
    const eased = 1 - (1 - progress) ** 2;
    const next = safeFrom + (safeTo - safeFrom) * eased;
    controller.setVolumeRatio(next);
    if (progress >= 1) {
      return;
    }
  }
}

export function createBgmControllerId(roomId: number, messageId: number) {
  return `bgm-msg:${roomId}:${messageId}`;
}

export function registerBgmMessageController(controller: BgmMessageController) {
  controllersById.set(controller.id, controller);
}

export function unregisterBgmMessageController(params: { roomId: number; messageId: number }) {
  const { roomId, messageId } = params;
  const controllerId = createBgmControllerId(roomId, messageId);
  const runtime = roomRuntimeByRoomId.get(roomId);
  if (runtime?.activeControllerId === controllerId) {
    runtime.activeControllerId = undefined;
  }
  controllersById.delete(controllerId);
}

export async function requestPlayBgmMessage(roomId: number, messageId: number) {
  const targetId = createBgmControllerId(roomId, messageId);
  const target = controllersById.get(targetId);
  if (!target) {
    return;
  }

  const runtime = getRoomRuntime(roomId);
  const token = beginRoomTransition(roomId);
  const currentId = runtime.activeControllerId;
  const current = currentId ? controllersById.get(currentId) : undefined;

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
  catch {
    return;
  }

  if (isTransitionStale(roomId, token)) {
    target.stop();
    return;
  }

  runtime.activeControllerId = targetId;
  await fadeControllerVolume(
    target,
    target.getVolumeRatio(),
    1,
    BGM_FADE_IN_MS,
    () => isTransitionStale(roomId, token),
  );
}

export async function requestStopRoomBgm(roomId: number) {
  const runtime = roomRuntimeByRoomId.get(roomId);
  if (!runtime?.activeControllerId) {
    return;
  }

  const token = beginRoomTransition(roomId);
  const active = controllersById.get(runtime.activeControllerId);
  runtime.activeControllerId = undefined;
  if (!active) {
    return;
  }

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
}

export function markBgmMessageStopped(roomId: number, messageId: number) {
  const runtime = roomRuntimeByRoomId.get(roomId);
  if (!runtime?.activeControllerId) {
    return;
  }
  const controllerId = createBgmControllerId(roomId, messageId);
  if (runtime.activeControllerId === controllerId) {
    runtime.activeControllerId = undefined;
  }
}
