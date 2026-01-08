import type { Room } from "../../../../api";

import type { SpaceDetailTab } from "@/components/chat/space/spaceHeaderBar";
import React, { useMemo, useRef, useState } from "react";
import RoomButton from "@/components/chat/shared/components/roomButton";
import SpaceHeaderBar from "@/components/chat/space/spaceHeaderBar";
import LeftChatList from "@/components/privateChat/LeftChatList";
import { ChevronDown, Setting } from "@/icons";

export interface ChatRoomListPanelProps {
  isPrivateChatMode: boolean;

  activeSpaceId: number | null;
  activeSpaceName?: string;
  activeSpaceIsArchived?: boolean;
  isSpaceOwner: boolean;

  rooms: Room[];
  roomOrderIds?: number[];
  onReorderRoomIds?: (nextRoomIds: number[]) => void;
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
  activeSpaceIsArchived,
  isSpaceOwner,
  rooms,
  roomOrderIds,
  onReorderRoomIds,
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
  const isDraggingRef = useRef(false);
  const [draggingRoomId, setDraggingRoomId] = useState<number | null>(null);
  const [draftOrderIds, setDraftOrderIds] = useState<number[] | null>(null);

  const roomsInSpace = useMemo(() => {
    return rooms.filter(room => room.spaceId === activeSpaceId);
  }, [activeSpaceId, rooms]);

  const currentIds = useMemo(() => {
    if (Array.isArray(roomOrderIds) && roomOrderIds.length > 0) {
      return roomOrderIds;
    }
    return roomsInSpace
      .map(r => r.roomId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [roomOrderIds, roomsInSpace]);

  const renderRooms = useMemo(() => {
    const ids = draftOrderIds ?? currentIds;
    if (!ids.length)
      return roomsInSpace;

    const byId = new Map<number, Room>();
    for (const r of roomsInSpace) {
      if (typeof r.roomId === "number") {
        byId.set(r.roomId, r);
      }
    }

    const ordered: Room[] = [];
    for (const id of ids) {
      const found = byId.get(id);
      if (found)
        ordered.push(found);
    }

    // 兜底：把任何未出现在 ids 的 room 追加在末尾
    for (const r of roomsInSpace) {
      const id = r.roomId;
      if (typeof id === "number" && !ids.includes(id)) {
        ordered.push(r);
      }
    }

    return ordered;
  }, [currentIds, draftOrderIds, roomsInSpace]);

  const reorderDraft = (sourceId: number, targetId: number, insertAfter: boolean) => {
    if (sourceId === targetId)
      return;
    const base = draftOrderIds ?? currentIds;
    const fromIndex = base.indexOf(sourceId);
    const toIndex = base.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1)
      return;

    const next = [...base];
    next.splice(fromIndex, 1);
    const nextToIndex = next.indexOf(targetId);
    const insertIndex = insertAfter ? nextToIndex + 1 : nextToIndex;
    next.splice(insertIndex, 0, sourceId);
    setDraftOrderIds(next);
  };

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
                    isArchived={activeSpaceIsArchived}
                    isSpaceOwner={isSpaceOwner}
                    onOpenSpaceDetailPanel={onOpenSpaceDetailPanel}
                    onInviteMember={onInviteMember}
                  />
                  <div className="h-px bg-base-300"></div>
                </>
              )}

              <div className="flex flex-col gap-2 py-2 px-1 overflow-auto w-full">
                {renderRooms.map((room) => {
                  return (
                    <React.Fragment key={room.roomId}>
                      <div
                        className={`flex items-center gap-1 group w-full ${onReorderRoomIds ? "cursor-grab active:cursor-grabbing" : ""}`}
                        data-room-id={room.roomId}
                        draggable={Boolean(onReorderRoomIds)}
                        onDragStart={(e) => {
                          if (!onReorderRoomIds)
                            return;
                          const rid = room.roomId;
                          if (typeof rid !== "number")
                            return;

                          isDraggingRef.current = true;
                          setDraggingRoomId(rid);
                          setDraftOrderIds(currentIds);

                          e.dataTransfer.effectAllowed = "move";
                          try {
                            e.dataTransfer.setData("text/plain", String(rid));
                          }
                          catch {
                            // ignore
                          }
                        }}
                        onDragOver={(e) => {
                          if (!onReorderRoomIds)
                            return;
                          if (draggingRoomId == null)
                            return;
                          const tid = room.roomId;
                          if (typeof tid !== "number")
                            return;
                          if (tid === draggingRoomId)
                            return;

                          e.preventDefault();
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          const insertAfter = e.clientY > rect.top + rect.height / 2;
                          reorderDraft(draggingRoomId, tid, insertAfter);
                        }}
                        onDrop={(e) => {
                          if (!onReorderRoomIds)
                            return;
                          e.preventDefault();
                          if (draftOrderIds && draftOrderIds.length > 0) {
                            onReorderRoomIds(draftOrderIds);
                          }
                          setDraggingRoomId(null);
                          setDraftOrderIds(null);
                          setTimeout(() => {
                            isDraggingRef.current = false;
                          }, 0);
                        }}
                        onDragEnd={() => {
                          if (!onReorderRoomIds)
                            return;
                          if (draftOrderIds && draftOrderIds.length > 0) {
                            onReorderRoomIds(draftOrderIds);
                          }
                          setDraggingRoomId(null);
                          setDraftOrderIds(null);
                          setTimeout(() => {
                            isDraggingRef.current = false;
                          }, 0);
                        }}
                      >
                        <RoomButton
                          room={room}
                          unreadMessageNumber={unreadMessagesNumber[room.roomId ?? -1]}
                          onclick={() => {
                            if (isDraggingRef.current) {
                              return;
                            }
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
                                <span className="flex-1 text-left">房间资料</span>
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
