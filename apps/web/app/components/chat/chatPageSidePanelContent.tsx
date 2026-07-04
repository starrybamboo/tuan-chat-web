import type { SpaceMaterialPackageResponse } from "@tuanchat/openapi-client/models/SpaceMaterialPackageResponse";

import React from "react";

import type { ActiveMaterialSelection, OpenSpaceDetailPanelOptions, RoomSettingTab, SelectRoomOptions, SpaceDetailTab } from "@/components/chat/chatPage.types";
import type { MinimalDocMeta, SidebarTree } from "@/components/chat/room/sidebarTree";
import type { Room } from "api";

import LeftChatList from "@/components/privateChat/LeftChatList";

const LazyChatRoomListPanel = React.lazy(() => import("@/components/chat/room/chatRoomListPanel"));

function SkeletonLine({ className }: { className: string }) {
  return <div className={`
    chat-skeleton-line
    ${className}
  `} />;
}

type ChatPageSidePanelContentProps = {
  isPrivateChatMode: boolean;
  activeSpaceId: number | null;

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
  isSidebarTreeReady?: boolean;
  sidebarTreeRemoteUpdateKey?: string | null;
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
  onOpenRoomContextMenu: (roomId: number, position: { x: number; y: number }) => void;
  onInviteMember: () => void;
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab, options?: OpenSpaceDetailPanelOptions) => void;
  onSelectRoom: (roomId: number, options?: SelectRoomOptions) => void;
  onOpenRoomSetting: (roomId: number, tab?: RoomSettingTab) => void;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  onOpenCreateInCategory: (categoryId: string) => void;
}

function SidePanelLoadingFallback() {
  return (
    <div className="
      flex size-full min-w-0 flex-col overflow-hidden bg-base-200
      text-base-content/15
    ">
      <div className="
        flex h-12 shrink-0 items-center gap-2 border-b border-base-300/70 px-3
      ">
        <SkeletonLine className="size-7 rounded-md" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <SkeletonLine className="h-3.5 w-8/12" />
          <SkeletonLine className="h-2.5 w-5/12" />
        </div>
        <SkeletonLine className="size-7 rounded-md" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4">
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <SkeletonLine className="size-4 rounded" />
            <SkeletonLine className="h-3.5 w-28" />
          </div>
          <div className="space-y-2">
            {["w-10/12", "w-7/12", "w-8/12", "w-6/12"].map((width, index) => (
              <div key={`side-room-skeleton-${index}`} className="
                flex items-center gap-2 rounded-lg px-2 py-1.5
              ">
                <SkeletonLine className="size-8 shrink-0 rounded-md" />
                <SkeletonLine className={`
                  h-4
                  ${width}
                `} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-3 border-t border-base-300/60 pt-4">
          <div className="flex items-center gap-2 px-1">
            <SkeletonLine className="size-4 rounded" />
            <SkeletonLine className="h-3.5 w-20" />
          </div>
          <div className="space-y-2">
            {["w-9/12", "w-6/12"].map((width, index) => (
              <div key={`side-material-skeleton-${index}`} className="
                flex items-center gap-2 rounded-lg px-2 py-1.5
              ">
                <SkeletonLine className="size-7 shrink-0 rounded-md" />
                <SkeletonLine className={`
                  h-3.5
                  ${width}
                `} />
              </div>
            ))}
          </div>
        </div>
      </div>
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
