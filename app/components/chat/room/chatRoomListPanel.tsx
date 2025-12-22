import type { SpaceDetailTab } from "@/components/chat/space/spaceHeaderBar";

import type { Room } from "../../../../api";
import RoomButton from "@/components/chat/shared/components/roomButton";
import SpaceHeaderBar from "@/components/chat/space/spaceHeaderBar";
import LeftChatList from "@/components/privateChat/LeftChatList";
import { ChevronDown, Setting } from "@/icons";
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
  onOpenSpaceDetailPanel: (tab: SpaceDetailTab) => void;

  onSelectRoom: (roomId: number) => void;
  onCloseLeftDrawer: () => void;
  onOpenRoomSetting: (roomId: number | null, tab?: "role" | "setting") => void;

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
  const roomsInSpace = rooms.filter(room => room.spaceId === activeSpaceId);

  return (
    <div
      className="flex flex-col gap-2 py-2 w-full h-full flex-1 bg-base-200/40 min-h-0 min-w-0"
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
                {roomsInSpace.map((room) => {
                  return (
                    <React.Fragment key={room.roomId}>
                      <div className="flex items-center gap-1 group w-full" data-room-id={room.roomId}>
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
                        {/* 房间操作菜单 - 交互参考 SpaceHeaderBar 的 dropdown */}
                        <div className="dropdown dropdown-left opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <div className="tooltip tooltip-left" data-tip="房间操作">
                            <button
                              type="button"
                              tabIndex={0}
                              className="btn btn-ghost btn-sm btn-square"
                              aria-label="房间操作"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <ChevronDown className="size-5 opacity-70" />
                            </button>
                          </div>

                          <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box shadow-xl border border-base-300 z-40 w-44 p-2">
                            <li>
                              <button
                                type="button"
                                className="gap-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenRoomSetting(room.roomId ?? null, "setting");
                                  (document.activeElement as HTMLElement | null)?.blur?.();
                                }}
                              >
                                <Setting className="size-4 opacity-70" />
                                <span className="flex-1 text-left">房间信息</span>
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
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
