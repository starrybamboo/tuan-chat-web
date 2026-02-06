import type { Room } from "api";
import type { RoomSettingTab, SpaceDetailTab } from "@/components/chat/chatPage.types";

import type { MinimalDocMeta, SidebarTree } from "@/components/chat/room/sidebarTree";
import React from "react";
import ChatRoomListPanel from "@/components/chat/room/chatRoomListPanel";

interface ChatPageSidePanelContentProps {
  isPrivateChatMode: boolean;
  activeSpaceId: number | null;
  onToggleLeftDrawer?: () => void;
  isLeftDrawerOpen?: boolean;

  onCloseLeftDrawer: () => void;

  currentUserId: number | null;
  activeSpaceName?: string;
  activeSpaceIsArchived?: boolean;
  isSpaceOwner: boolean;
  isKPInSpace: boolean;
  rooms: Room[];
  roomOrderIds?: number[];
  onReorderRoomIds?: (nextRoomIds: number[]) => void;
  sidebarTree?: SidebarTree | null;
  docMetas?: MinimalDocMeta[];
  onSelectDoc: (docId: string) => void;
  onSaveSidebarTree?: (tree: SidebarTree) => void;
  onResetSidebarTreeToDefault?: () => void;
  activeRoomId: number | null;
  activeDocId?: string | null;
  unreadMessagesNumber: Record<number, number>;
  onContextMenu: (e: React.MouseEvent) => void;
  onInviteMember: () => void;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab) => void;
  onSelectRoom: (roomId: number) => void;
  onOpenRoomSetting: (roomId: number, tab?: RoomSettingTab) => void;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  onOpenCreateInCategory: (categoryId: string) => void;
}

export default function ChatPageSidePanelContent({
  isPrivateChatMode,
  activeSpaceId,
  onToggleLeftDrawer,
  isLeftDrawerOpen,
  onCloseLeftDrawer,
  currentUserId,
  activeSpaceName,
  activeSpaceIsArchived,
  isSpaceOwner,
  isKPInSpace,
  rooms,
  roomOrderIds,
  onReorderRoomIds,
  sidebarTree,
  docMetas,
  onSelectDoc,
  onSaveSidebarTree,
  onResetSidebarTreeToDefault,
  activeRoomId,
  activeDocId,
  unreadMessagesNumber,
  onContextMenu,
  onInviteMember,
  onOpenSpaceDetailPanel,
  onSelectRoom,
  onOpenRoomSetting,
  setIsOpenLeftDrawer,
  onOpenCreateInCategory,
}: ChatPageSidePanelContentProps) {
  return (
    <ChatRoomListPanel
      isPrivateChatMode={isPrivateChatMode}
      currentUserId={currentUserId}
      activeSpaceId={activeSpaceId}
      activeSpaceName={activeSpaceName}
      activeSpaceIsArchived={activeSpaceIsArchived}
      isSpaceOwner={isSpaceOwner}
      isKPInSpace={isKPInSpace}
      rooms={rooms}
      roomOrderIds={roomOrderIds}
      onReorderRoomIds={onReorderRoomIds}
      sidebarTree={sidebarTree}
      onSaveSidebarTree={onSaveSidebarTree}
      onResetSidebarTreeToDefault={onResetSidebarTreeToDefault}
      docMetas={docMetas}
      onSelectDoc={onSelectDoc}
      activeRoomId={activeRoomId}
      activeDocId={activeDocId}
      unreadMessagesNumber={unreadMessagesNumber}
      onContextMenu={onContextMenu}
      onInviteMember={onInviteMember}
      onOpenSpaceDetailPanel={onOpenSpaceDetailPanel}
      onSelectRoom={onSelectRoom}
      onCloseLeftDrawer={onCloseLeftDrawer}
      onToggleLeftDrawer={onToggleLeftDrawer}
      isLeftDrawerOpen={isLeftDrawerOpen}
      onOpenRoomSetting={onOpenRoomSetting}
      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
      onOpenCreateInCategory={onOpenCreateInCategory}
    />
  );
}
