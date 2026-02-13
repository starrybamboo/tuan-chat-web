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
  handleContextMenu: (event: MouseEvent<Element>) => void;
  handleSpaceContextMenu: (event: MouseEvent<Element>) => void;
  closeContextMenu: () => void;
  closeSpaceContextMenu: () => void;
};

export default function useChatPageContextMenus(): UseChatPageContextMenusResult {
  const [contextMenu, setContextMenu] = useState<ChatContextMenuState | null>(null);
  const [spaceContextMenu, setSpaceContextMenu] = useState<SpaceContextMenuState | null>(null);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const closeSpaceContextMenu = useCallback(() => {
    setSpaceContextMenu(null);
  }, []);

  const handleContextMenu = useCallback((event: MouseEvent<Element>) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    const messageElement = target.closest("[data-room-id]");
    setContextMenu({ x: event.clientX, y: event.clientY, roomId: Number(messageElement?.getAttribute("data-room-id")) });
  }, []);

  const handleSpaceContextMenu = useCallback((event: MouseEvent<Element>) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    const spaceElement = target.closest("[data-space-id]");
    const rawSpaceId = spaceElement?.getAttribute("data-space-id");
    if (!rawSpaceId)
      return;
    setSpaceContextMenu({ x: event.clientX, y: event.clientY, spaceId: Number(rawSpaceId) });
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
