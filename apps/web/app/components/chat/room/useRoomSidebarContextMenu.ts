import { useCallback, useState } from "react";

import type { SidebarTreeContextMenuState } from "./sidebarTreeOverlays";

type UseRoomSidebarContextMenuResult = {
  contextMenu: SidebarTreeContextMenuState;
  setContextMenu: (next: SidebarTreeContextMenuState) => void;
  closeContextMenu: () => void;
};

export default function useRoomSidebarContextMenu(): UseRoomSidebarContextMenuResult {
  const [contextMenu, setContextMenu] = useState<SidebarTreeContextMenuState>(null);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    setContextMenu,
    closeContextMenu,
  };
}
