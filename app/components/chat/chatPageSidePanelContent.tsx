import type { Room } from "api";
import type { SpaceMaterialPackageResponse } from "@tuanchat/openapi-client/models/SpaceMaterialPackageResponse";
import type { ActiveMaterialSelection, OpenSpaceDetailPanelOptions, RoomSettingTab, SpaceDetailTab } from "@/components/chat/chatPage.types";
import type { MinimalDocMeta, SidebarTree } from "@/components/chat/room/sidebarTree";
import React from "react";
import LeftChatList from "@/components/privateChat/LeftChatList";

const LazyChatRoomListPanel = React.lazy(() => import("@/components/chat/room/chatRoomListPanel"));

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
  canViewDocs: boolean;
  rooms: Room[];
  roomOrderIds?: number[];
  onReorderRoomIds?: (nextRoomIds: number[]) => void;
  sidebarTree?: SidebarTree | null;
  docMetas?: MinimalDocMeta[];
  materialPackages?: SpaceMaterialPackageResponse[];
  onSelectDoc: (docId: string) => void;
  onDeleteDoc?: (docId: string) => void;
  onSaveSidebarTree?: (tree: SidebarTree) => void;
  onResetSidebarTreeToDefault?: () => void;
  activeRoomId: number | null;
  activeDocId?: string | null;
  activeMaterialSelection?: ActiveMaterialSelection;
  unreadMessagesNumber: Record<number, number>;
  onContextMenu: (e: React.MouseEvent, roomId?: number | null) => void;
  onInviteMember: () => void;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab, options?: OpenSpaceDetailPanelOptions) => void;
  onSelectRoom: (roomId: number) => void;
  onOpenRoomSetting: (roomId: number, tab?: RoomSettingTab) => void;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  onOpenCreateInCategory: (categoryId: string) => void;
}

function SidePanelLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-base-200 text-sm text-base-content/60">
      <span className="loading loading-spinner loading-md"></span>
      <span className="ml-2">正在加载侧栏...</span>
    </div>
  );
}

export default function ChatPageSidePanelContent(props: ChatPageSidePanelContentProps) {
  if (props.isPrivateChatMode) {
    return <LeftChatList setIsOpenLeftDrawer={props.setIsOpenLeftDrawer} />;
  }

  return (
    <React.Suspense fallback={<SidePanelLoadingFallback />}>
      <LazyChatRoomListPanel {...props} />
    </React.Suspense>
  );
}

