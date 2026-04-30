export type RoomFigureRenderState = {
  fileName: string;
  transform: string;
};

export type RoomRenderStateSnapshot = {
  figureStates: Array<[string, RoomFigureRenderState]>;
  lastFigureSlotId: string | null;
  miniAvatarVisible: boolean;
  spriteState: string[];
};

export type MessageLineRange = {
  startLine: number;
  endLine: number;
};

export type RoomRenderStateStores = {
  currentSpriteStateMap: Map<number, Set<string>>;
  lastFigureSlotIdMap: Map<number, string>;
  messageLineMap: Map<string, MessageLineRange>;
  messageRenderStateSnapshotMap: Map<string, RoomRenderStateSnapshot>;
  renderedFigureStateMap: Map<number, Map<string, RoomFigureRenderState>>;
  renderedMiniAvatarVisibleMap: Map<number, boolean>;
};

export function buildMessageStateKey(roomId: number, messageId: number): string {
  return `${roomId}_${messageId}`;
}

export function captureRoomRenderStateSnapshot(
  stores: RoomRenderStateStores,
  roomId: number,
): RoomRenderStateSnapshot {
  const renderedFigureState = stores.renderedFigureStateMap.get(roomId);
  return {
    figureStates: renderedFigureState
      ? Array.from(renderedFigureState.entries()).map(([slotId, state]) => [slotId, { ...state }])
      : [],
    lastFigureSlotId: stores.lastFigureSlotIdMap.get(roomId) ?? null,
    miniAvatarVisible: stores.renderedMiniAvatarVisibleMap.get(roomId) === true,
    spriteState: Array.from(stores.currentSpriteStateMap.get(roomId) ?? []),
  };
}

export function applyRoomRenderStateSnapshot(
  stores: RoomRenderStateStores,
  roomId: number,
  snapshot?: RoomRenderStateSnapshot,
): void {
  if (!snapshot) {
    stores.renderedFigureStateMap.set(roomId, new Map());
    stores.lastFigureSlotIdMap.delete(roomId);
    stores.renderedMiniAvatarVisibleMap.delete(roomId);
    stores.currentSpriteStateMap.set(roomId, new Set());
    return;
  }

  stores.renderedFigureStateMap.set(
    roomId,
    new Map(snapshot.figureStates.map(([slotId, state]) => [slotId, { ...state }])),
  );
  if (snapshot.lastFigureSlotId) {
    stores.lastFigureSlotIdMap.set(roomId, snapshot.lastFigureSlotId);
  }
  else {
    stores.lastFigureSlotIdMap.delete(roomId);
  }
  stores.renderedMiniAvatarVisibleMap.set(roomId, snapshot.miniAvatarVisible);
  stores.currentSpriteStateMap.set(roomId, new Set(snapshot.spriteState));
}

export function recordMessageRenderStateSnapshot(
  stores: RoomRenderStateStores,
  roomId: number,
  messageId: number,
): void {
  stores.messageRenderStateSnapshotMap.set(
    buildMessageStateKey(roomId, messageId),
    captureRoomRenderStateSnapshot(stores, roomId),
  );
}

export function getMessageRenderStateSnapshot(
  stores: RoomRenderStateStores,
  roomId: number,
  messageId: number,
): RoomRenderStateSnapshot | undefined {
  return stores.messageRenderStateSnapshotMap.get(buildMessageStateKey(roomId, messageId));
}

export function clearMessageRenderStateSnapshotsForRoom(
  stores: RoomRenderStateStores,
  roomId: number,
): void {
  const roomPrefix = `${roomId}_`;
  for (const key of Array.from(stores.messageRenderStateSnapshotMap.keys())) {
    if (key.startsWith(roomPrefix)) {
      stores.messageRenderStateSnapshotMap.delete(key);
    }
  }
}

export function pruneRoomStateFromLine(
  stores: RoomRenderStateStores,
  roomId: number,
  startLine: number,
): void {
  const roomPrefix = `${roomId}_`;
  for (const [key, range] of Array.from(stores.messageLineMap.entries())) {
    if (!key.startsWith(roomPrefix) || range.startLine < startLine) {
      continue;
    }
    stores.messageLineMap.delete(key);
    stores.messageRenderStateSnapshotMap.delete(key);
  }
}
