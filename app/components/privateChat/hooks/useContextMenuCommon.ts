import { useState } from "react";

export function useContextMenuCommon() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: number } | null>(null);

  const openContextMenu = (x: number, y: number, id: number) => {
    setContextMenu({ x, y, id });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
  };
}
