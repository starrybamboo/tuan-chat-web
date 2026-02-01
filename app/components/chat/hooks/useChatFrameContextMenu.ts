import type { MouseEvent } from "react";

import { useCallback, useEffect, useState } from "react";

type ChatFrameContextMenuState = { x: number; y: number; messageId: number } | null;

export default function useChatFrameContextMenu() {
  const [contextMenu, setContextMenu] = useState<ChatFrameContextMenuState>(null);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const messageElement = target.closest("[data-message-id]");
    setContextMenu({ x: e.clientX, y: e.clientY, messageId: Number(messageElement?.getAttribute("data-message-id")) });
  }, []);

  useEffect(() => {
    if (contextMenu) {
      window.addEventListener("click", closeContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeContextMenu);
    };
  }, [closeContextMenu, contextMenu]);

  return {
    contextMenu,
    closeContextMenu,
    handleContextMenu,
  };
}
