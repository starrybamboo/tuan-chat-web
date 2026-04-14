import type { MouseEvent } from "react";

import { useCallback, useEffect, useState } from "react";

type ChatContextMenuState = {
  x: number;
  y: number;
  roomId: number;
};

type SpaceContextMenuState = {
  x: number;
  y: number;
  spaceId: number;
};

type UseChatPageContextMenusResult = {
  contextMenu: ChatContextMenuState | null;
  spaceContextMenu: SpaceContextMenuState | null;
  handleContextMenu: (event: MouseEvent<Element>, roomId?: number | null) => void;
  handleSpaceContextMenu: (event: MouseEvent<Element>) => void;
  closeContextMenu: () => void;
  closeSpaceContextMenu: () => void;
};

type ElementLike = {
  closest?: (selector: string) => ElementLike | null | undefined;
  getAttribute?: (name: string) => string | null | undefined;
};

function readNumericDataId(target: ElementLike | null | undefined, attributeName: string) {
  const rawValue = target?.getAttribute?.(attributeName);
  const normalizedValue = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!normalizedValue)
    return null;
  const numericValue = Number(normalizedValue);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

export function resolveRoomIdFromContextMenuEvent(source: { target: unknown; currentTarget: unknown }) {
  const target = source.target as ElementLike | null;
  const currentTarget = source.currentTarget as ElementLike | null;
  const matchedTarget = target?.closest?.("[data-room-id]") ?? null;
  return readNumericDataId(matchedTarget, "data-room-id") ?? readNumericDataId(currentTarget, "data-room-id");
}

function resolveSpaceIdFromContextMenuEvent(source: { target: unknown; currentTarget: unknown }) {
  const target = source.target as ElementLike | null;
  const currentTarget = source.currentTarget as ElementLike | null;
  const matchedTarget = target?.closest?.("[data-space-id]") ?? null;
  return readNumericDataId(matchedTarget, "data-space-id") ?? readNumericDataId(currentTarget, "data-space-id");
}

export default function useChatPageContextMenus(): UseChatPageContextMenusResult {
  const [contextMenu, setContextMenu] = useState<ChatContextMenuState | null>(null);
  const [spaceContextMenu, setSpaceContextMenu] = useState<SpaceContextMenuState | null>(null);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const closeSpaceContextMenu = useCallback(() => {
    setSpaceContextMenu(null);
  }, []);

  const handleContextMenu = useCallback((event: MouseEvent<Element>, roomId?: number | null) => {
    event.preventDefault();
    const resolvedRoomId = Number.isFinite(roomId) ? Number(roomId) : resolveRoomIdFromContextMenuEvent(event);
    if (resolvedRoomId == null) {
      setContextMenu(null);
      return;
    }
    setContextMenu({ x: event.clientX, y: event.clientY, roomId: resolvedRoomId });
  }, []);

  const handleSpaceContextMenu = useCallback((event: MouseEvent<Element>) => {
    event.preventDefault();
    const spaceId = resolveSpaceIdFromContextMenuEvent(event);
    if (spaceId == null)
      return;
    setSpaceContextMenu({ x: event.clientX, y: event.clientY, spaceId });
  }, []);

  useEffect(() => {
    if (contextMenu) {
      window.addEventListener("click", closeContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeContextMenu);
    };
  }, [closeContextMenu, contextMenu]);

  useEffect(() => {
    if (spaceContextMenu) {
      window.addEventListener("click", closeSpaceContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeSpaceContextMenu);
    };
  }, [closeSpaceContextMenu, spaceContextMenu]);

  return {
    contextMenu,
    spaceContextMenu,
    handleContextMenu,
    handleSpaceContextMenu,
    closeContextMenu,
    closeSpaceContextMenu,
  };
}
