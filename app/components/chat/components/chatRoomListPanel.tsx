import type { Room } from "api";

import SpaceHeaderBar from "@/components/chat/components/spaceHeaderBar";
import RoomButton from "@/components/chat/smallComponents/roomButton";
import LeftChatList from "@/components/privateChat/Left​​ChatList​​";
import { Setting } from "@/icons";
import React from "react";

export interface ChatRoomListPanelProps {
  isPrivateChatMode: boolean;

  activeSpaceId: number | null;
  activeSpaceName?: string;
  isSpaceOwner: boolean;

  rooms: Room[];
  activeRoomId: number | null;
  unreadMessagesNumber: Record<number, number>;

  onContextMenu: (e: React.MouseEvent) => void;
  onInviteMember: () => void;
  onOpenSpaceDetailPanel: (tab: "members" | "render" | "workflow" | "setting") => void;

  onSelectRoom: (roomId: number) => void;
  onCloseLeftDrawer: () => void;
  onOpenRoomSetting: (roomId: number | null) => void;

  setIsOpenLeftDrawer: (isOpen: boolean) => void;

  onCreateRoom: () => void;
}

export default function ChatRoomListPanel({
  isPrivateChatMode,
  activeSpaceId,
  activeSpaceName,
  isSpaceOwner,
  rooms,
  activeRoomId,
  unreadMessagesNumber,
  onContextMenu,
  onInviteMember,
  onOpenSpaceDetailPanel,
  onSelectRoom,
  onCloseLeftDrawer,
  onOpenRoomSetting,
  setIsOpenLeftDrawer,
  onCreateRoom,
}: ChatRoomListPanelProps) {
  return (
    <div
      className="flex flex-col gap-2 py-2 w-full md:w-[360px] h-full flex-1 bg-base-200/40 min-h-0"
      onContextMenu={onContextMenu}
    >
      {isPrivateChatMode
        ? (
            <LeftChatList
              setIsOpenLeftDrawer={setIsOpenLeftDrawer}
            />
          )
        : (
            <>
              {activeSpaceId && (
                <>
                  <SpaceHeaderBar
                    spaceName={activeSpaceName}
                    isSpaceOwner={isSpaceOwner}
                    onOpenSpaceDetailPanel={onOpenSpaceDetailPanel}
                    onInviteMember={onInviteMember}
                  />
                  <div className="h-px bg-base-300"></div>
                </>
              )}

              <div className="flex flex-col gap-2 py-2 px-1 overflow-auto w-full">
                {rooms.filter(room => room.spaceId === activeSpaceId).map(room => (
                  <div className="flex items-center gap-1 group w-full" key={room.roomId} data-room-id={room.roomId}>
                    <RoomButton
                      room={room}
                      unreadMessageNumber={unreadMessagesNumber[room.roomId ?? -1]}
                      onclick={() => {
                        onSelectRoom(room.roomId ?? -1);
                        onCloseLeftDrawer();
                      }}
                      isActive={activeRoomId === room.roomId}
                    >
                    </RoomButton>
                    {/* 设置按钮 - 在所有房间都显示（当前房间和悬浮房间） */}
                    <div
                      className="tooltip tooltip-left opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      data-tip="房间设置"
                    >
                      <Setting
                        className="size-6 cursor-pointer hover:text-info hover:bg-base-300 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 仅传入真实 roomId，使用 null 表示关闭/未选择
                          onOpenRoomSetting(room.roomId ?? null);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {activeSpaceId !== null && isSpaceOwner && (
                <button
                  className="btn btn-dash btn-info flex mx-2"
                  type="button"
                  onClick={onCreateRoom}
                >
                  创建房间
                </button>
              )}
            </>
          )}
    </div>
  );
}
