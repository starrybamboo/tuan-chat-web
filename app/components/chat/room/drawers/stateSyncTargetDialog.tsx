import type { Room } from "../../../../../api";

import { Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import React from "react";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { imageLowUrl, imageLowUrlFromUrl } from "@/utils/mediaUrl";
import { useGetUserRoomsQuery } from "../../../../../api/hooks/chatQueryHooks";

interface StateSyncTargetDialogProps {
  currentRoomId: number;
  eventCount: number;
  isOpen: boolean;
  onClose: () => void;
  onSync: (targetRoomIds: number[]) => Promise<boolean>;
  spaceId: number;
}

function getRoomId(room: Room): number {
  return typeof room.roomId === "number" ? room.roomId : -1;
}

export default function StateSyncTargetDialog({
  currentRoomId,
  eventCount,
  isOpen,
  onClose,
  onSync,
  spaceId,
}: StateSyncTargetDialogProps) {
  const headers = useEntityHeaderOverrideStore(state => state.headers);
  const [keyword, setKeyword] = React.useState("");
  const [selectedRoomIds, setSelectedRoomIds] = React.useState<Set<number>>(() => new Set());
  const [isSyncing, setIsSyncing] = React.useState(false);
  const userRoomsQuery = useGetUserRoomsQuery(spaceId > 0 ? spaceId : -1);

  React.useEffect(() => {
    if (!isOpen) {
      setKeyword("");
      setSelectedRoomIds(new Set());
      setIsSyncing(false);
    }
  }, [isOpen]);

  const rooms = React.useMemo(() => {
    return (userRoomsQuery.data?.data?.rooms ?? [])
      .filter(room => getRoomId(room) > 0 && getRoomId(room) !== currentRoomId);
  }, [currentRoomId, userRoomsQuery.data?.data?.rooms]);

  const filteredRooms = React.useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return rooms;
    }
    return rooms.filter((room) => {
      const roomId = getRoomId(room);
      const title = (headers[`room:${roomId}`]?.title || room.name || "").toLowerCase();
      return title.includes(normalizedKeyword);
    });
  }, [headers, keyword, rooms]);

  const selectedRooms = React.useMemo(
    () => rooms.filter(room => selectedRoomIds.has(getRoomId(room))),
    [rooms, selectedRoomIds],
  );

  const selectedRoomIdsInOrder = React.useMemo(
    () => selectedRooms.map(getRoomId).filter(roomId => roomId > 0),
    [selectedRooms],
  );

  const resolveRoomDisplayName = React.useCallback((room: Room) => {
    const roomId = getRoomId(room);
    return headers[`room:${roomId}`]?.title || room.name || `房间 #${roomId}`;
  }, [headers]);

  const resolveRoomAvatar = React.useCallback((room: Room) => {
    const roomId = getRoomId(room);
    const header = headers[`room:${roomId}`];
    return imageLowUrl(header?.imageFileId)
      || imageLowUrlFromUrl(header?.imageUrl || imageLowUrl(room.avatarFileId))
      || "/favicon.ico";
  }, [headers]);

  const toggleRoom = React.useCallback((roomId: number) => {
    if (isSyncing || roomId <= 0) {
      return;
    }
    setSelectedRoomIds((current) => {
      const next = new Set(current);
      if (next.has(roomId)) {
        next.delete(roomId);
      }
      else {
        next.add(roomId);
      }
      return next;
    });
  }, [isSyncing]);

  const selectFilteredRooms = React.useCallback(() => {
    if (isSyncing) {
      return;
    }
    setSelectedRoomIds((current) => {
      const next = new Set(current);
      filteredRooms.forEach((room) => {
        const roomId = getRoomId(room);
        if (roomId > 0) {
          next.add(roomId);
        }
      });
      return next;
    });
  }, [filteredRooms, isSyncing]);

  const clearSelectedRooms = React.useCallback(() => {
    if (!isSyncing) {
      setSelectedRoomIds(new Set());
    }
  }, [isSyncing]);

  const handleSync = React.useCallback(async () => {
    if (selectedRoomIdsInOrder.length === 0 || isSyncing) {
      return;
    }
    setIsSyncing(true);
    const success = await onSync(selectedRoomIdsInOrder);
    if (success) {
      onClose();
      return;
    }
    setIsSyncing(false);
  }, [isSyncing, onClose, onSync, selectedRoomIdsInOrder]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-content/35 p-4">
      <div className="flex max-h-[88vh] w-[min(94vw,860px)] flex-col overflow-hidden rounded-md border border-base-300 bg-base-100 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-base-300 px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold">导入状态到房间</div>
            <div className="mt-0.5 text-xs text-base-content/50">
              {eventCount}
              {" "}
              个状态项
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            disabled={isSyncing}
            aria-label="关闭状态同步弹窗"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
          <section className="min-h-0 rounded-md border border-base-300">
            <div className="border-b border-base-300 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">目标房间</div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={selectFilteredRooms}
                  disabled={filteredRooms.length === 0 || isSyncing}
                >
                  全选
                </button>
              </div>
              <label className="mt-3 flex h-9 items-center gap-2 rounded-md border border-base-300 bg-base-100 px-3 text-sm focus-within:border-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/20">
                <MagnifyingGlass className="size-4 text-base-content/45" />
                <input
                  type="text"
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  placeholder="搜索房间"
                  disabled={isSyncing}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/40"
                />
              </label>
            </div>

            <div className="max-h-[42vh] min-h-64 overflow-auto p-2">
              {filteredRooms.length === 0
                ? (
                    <div className="flex h-44 items-center justify-center rounded-md border border-dashed border-base-300 px-4 text-center text-sm text-base-content/55">
                      没有可选房间
                    </div>
                  )
                : (
                    <div className="space-y-1">
                      {filteredRooms.map((room) => {
                        const roomId = getRoomId(room);
                        const displayName = resolveRoomDisplayName(room);
                        const isSelected = selectedRoomIds.has(roomId);
                        return (
                          <button
                            key={roomId}
                            type="button"
                            className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition ${
                              isSelected ? "bg-primary/10" : "hover:bg-base-200/70"
                            }`}
                            onClick={() => toggleRoom(roomId)}
                            disabled={isSyncing}
                            aria-pressed={isSelected}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span className={`flex size-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-content"
                                  : "border-base-content/25 text-transparent"
                              }`}
                              >
                                <Check size={13} weight="bold" />
                              </span>
                              <span className="avatar">
                                <span className="mask mask-squircle size-9">
                                  <img
                                    src={resolveRoomAvatar(room)}
                                    alt={displayName}
                                    onError={(event) => {
                                      const img = event.currentTarget;
                                      if (img.dataset.fallbackApplied) {
                                        return;
                                      }
                                      img.dataset.fallbackApplied = "1";
                                      img.src = "/favicon.ico";
                                    }}
                                  />
                                </span>
                              </span>
                              <span className="min-w-0 truncate text-sm font-medium">{displayName}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
            </div>
          </section>

          <section className="min-h-0 rounded-md border border-base-300 bg-base-200/25">
            <div className="flex items-center justify-between gap-2 border-b border-base-300 p-3">
              <div className="text-sm font-medium">
                已选
                {" "}
                {selectedRooms.length}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={clearSelectedRooms}
                disabled={selectedRooms.length === 0 || isSyncing}
              >
                清空
              </button>
            </div>

            <div className="max-h-[42vh] min-h-64 overflow-auto p-2">
              {selectedRooms.length === 0
                ? (
                    <div className="flex h-44 items-center justify-center rounded-md border border-dashed border-base-300 px-4 text-center text-sm text-base-content/55">
                      从左侧选择房间
                    </div>
                  )
                : (
                    <div className="space-y-1">
                      {selectedRooms.map(room => (
                        <div
                          key={getRoomId(room)}
                          className="flex items-center justify-between gap-2 rounded-md bg-base-100 px-2.5 py-2"
                        >
                          <span className="min-w-0 truncate text-sm font-medium">{resolveRoomDisplayName(room)}</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-square"
                            onClick={() => toggleRoom(getRoomId(room))}
                            disabled={isSyncing}
                            aria-label={`移除 ${resolveRoomDisplayName(room)}`}
                          >
                            <X size={14} weight="bold" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-base-300 px-5 py-4">
          <div className="min-w-0 truncate text-sm text-base-content/60">
            {selectedRooms.length > 0
              ? selectedRooms.map(resolveRoomDisplayName).join("、")
              : "请选择目标房间"}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm min-w-32"
            onClick={() => {
              void handleSync();
            }}
            disabled={selectedRoomIdsInOrder.length === 0 || isSyncing}
          >
            {isSyncing && <span className="loading loading-spinner loading-xs" />}
            {selectedRoomIdsInOrder.length > 0
              ? `导入到 ${selectedRoomIdsInOrder.length} 个房间`
              : "导入"}
          </button>
        </div>
      </div>
    </div>
  );
}
