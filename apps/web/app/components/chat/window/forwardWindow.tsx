import { Check, X } from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";

import type { ForwardMode } from "@/components/chat/hooks/useChatFrameMessageActions";

import { Button } from "@/components/common/Button";
import { formControlShellClassName, TextInput } from "@/components/common/FormField";
import { CountBadge } from "@/components/common/StatusPrimitives";
import { IconButton } from "@/components/common/IconButton";
import { MediaImage } from "@/components/common/mediaImage";
import { imageLowUrl, imageLowUrlFromUrl } from "@/utils/media/mediaUrl";

import type { ChatMessageResponse } from "../../../../api";

import {
  useGetUserRoomsQuery,
} from "../../../../api/hooks/chatQueryHooks";

/**
 * 转发窗口组件
 * @param selectedMessages - 已选中的待转发消息
 * @param onForward - 执行转发的回调函数
 */
function ForwardWindow({
  selectedMessages,
  onForward,
  currentSpaceId,
  currentSpaceName,
}: {
  selectedMessages: ChatMessageResponse[];
  onForward: (roomIds: number[], mode: ForwardMode) => Promise<boolean>;
  currentSpaceId: number;
  currentSpaceName?: string;
}) {
  const [forwardMode, setForwardMode] = useState<ForwardMode>("merged");
  const [roomKeyword, setRoomKeyword] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<number>>(() => new Set());
  const [isForwarding, setIsForwarding] = useState(false);

  const effectiveSpaceId = currentSpaceId > 0 ? currentSpaceId : -1;
  const userRoomsQuery = useGetUserRoomsQuery(effectiveSpaceId);
  // 获取当前空间的房间列表
  const currentRooms = useMemo(() => userRoomsQuery.data?.data?.rooms ?? [], [userRoomsQuery.data?.data?.rooms]);

  const filteredRooms = useMemo(() => {
    const keyword = roomKeyword.trim().toLowerCase();
    if (!keyword)
      return currentRooms;
    return currentRooms.filter((room) => {
      const roomName = (room.name || "").toLowerCase();
      return roomName.includes(keyword);
    });
  }, [currentRooms, roomKeyword]);

  const selectedSpaceName = currentSpaceName || "当前空间";

  const selectedRooms = useMemo(() => {
    return currentRooms.filter(room => room.roomId && selectedRoomIds.has(room.roomId));
  }, [currentRooms, selectedRoomIds]);

  const selectedRoomIdsInOrder = useMemo(() => {
    return selectedRooms
      .map(room => room.roomId)
      .filter((roomId): roomId is number => typeof roomId === "number" && roomId > 0);
  }, [selectedRooms]);

  const resolveRoomDisplayName = useCallback((roomId: number, fallbackName?: string) => {
    return fallbackName || (roomId > 0 ? `房间 ${roomId}` : "未命名房间");
  }, []);

  const resolveRoomAvatar = useCallback((_roomId: number, avatarFileId?: number, fallbackImageUrl?: string) => {
    return imageLowUrlFromUrl(fallbackImageUrl || imageLowUrl(avatarFileId))
      || "/favicon.ico";
  }, []);

  const toggleRoomSelection = useCallback((roomId: number) => {
    if (roomId <= 0 || isForwarding) {
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
  }, [isForwarding]);

  const clearSelectedRooms = useCallback(() => {
    if (isForwarding)
      return;
    setSelectedRoomIds(new Set());
  }, [isForwarding]);

  const selectFilteredRooms = useCallback(() => {
    if (isForwarding)
      return;
    setSelectedRoomIds((current) => {
      const next = new Set(current);
      for (const room of filteredRooms) {
        const roomId = room.roomId ?? -1;
        if (roomId > 0) {
          next.add(roomId);
        }
      }
      return next;
    });
  }, [filteredRooms, isForwarding]);

  const handleForwardSelectedRooms = async () => {
    if (selectedRoomIdsInOrder.length === 0 || isForwarding) {
      return;
    }
    setIsForwarding(true);
    const success = await onForward(selectedRoomIdsInOrder, forwardMode);
    if (!success) {
      setIsForwarding(false);
    }
  };

  const selectedTargetCount = selectedRoomIdsInOrder.length;
  const canForward = selectedTargetCount > 0 && !isForwarding;

  return (
    <div className="
      flex max-h-[min(88vh,780px)] w-[min(94vw,980px)] flex-col overflow-hidden
      p-0
    ">
      <div className="flex items-center justify-between gap-3">
        <div className="
          px-6 pt-6
          md:px-7 md:pt-7
        ">
          <h2 className="text-lg font-semibold">转发消息</h2>
          <p className="text-sm text-base-content/60 mt-1">
            选择目标房间后统一发送
          </p>
        </div>
        <div className="
          px-6 pt-6
          md:px-7 md:pt-7
        ">
          <CountBadge tone="info" className="min-h-8 min-w-8 px-3 text-base">
            {selectedMessages.length}
            {" "}
            条已选
          </CountBadge>
        </div>
      </div>

      <div className="
        min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-5
        md:px-7
      ">
        <div className="
          flex flex-col gap-3
          md:flex-row md:items-center md:justify-between
        ">
          <div
            className="
            inline-flex w-fit rounded-lg border border-base-300 bg-base-200/50
            p-1
          "
            role="radiogroup"
            aria-label="转发模式"
          >
            <button
              type="button"
              role="radio"
              className={`
                rounded-md px-3 py-1.5 text-sm font-medium transition
                ${
                forwardMode === "merged"
                  ? "bg-info text-info-content shadow-sm"
                  : `
                    text-base-content/70
                    hover:bg-base-100/70
                  `
              }
              `}
              onClick={() => setForwardMode("merged")}
              aria-checked={forwardMode === "merged"}
            >
              合并转发
            </button>
            <button
              type="button"
              role="radio"
              className={`
                rounded-md px-3 py-1.5 text-sm font-medium transition
                ${
                forwardMode === "separate"
                  ? "bg-info text-info-content shadow-sm"
                  : `
                    text-base-content/70
                    hover:bg-base-100/70
                  `
              }
              `}
              onClick={() => setForwardMode("separate")}
              aria-checked={forwardMode === "separate"}
            >
              逐条转发
            </button>
          </div>
          <div className="
            text-xs text-base-content/55
            md:text-right
          ">
            <div>
              {forwardMode === "merged"
                ? "合并为 1 条转发消息"
                : `逐条发送 ${selectedMessages.length} 条消息`}
            </div>
            <div className="mt-0.5">{selectedSpaceName}</div>
          </div>
        </div>

        <div className="
          mt-4 grid min-h-0 gap-4
          md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]
        ">
          <section className="min-h-0 rounded-lg border border-base-300">
            <div className="border-b border-base-300 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">选择房间</div>
                  <div className="mt-0.5 text-xs text-base-content/50">
                    {filteredRooms.length}
                    {" "}
                    个可选
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={selectFilteredRooms}
                  disabled={filteredRooms.length === 0 || isForwarding}
                >
                  全选
                </Button>
              </div>
              <label
                aria-label="搜索目标房间"
                className={formControlShellClassName({ className: "mt-3 w-full gap-2 px-2" })}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 opacity-70"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
                <TextInput
                  appearance="bare"
                  type="search"
                  autoComplete="off"
                  aria-label="搜索房间"
                  aria-controls="forward-room-list"
                  value={roomKeyword}
                  onChange={event => setRoomKeyword(event.target.value)}
                  placeholder="搜索房间"
                  disabled={effectiveSpaceId <= 0}
                />
              </label>
            </div>

            <div id="forward-room-list" className="max-h-80 min-h-60 overflow-auto p-2">
              {effectiveSpaceId <= 0 && (
                <div className="
                  rounded-lg border border-dashed border-base-300 px-4 py-8
                  text-sm text-base-content/60 text-center
                ">
                  当前空间无效，无法转发
                </div>
              )}
              {effectiveSpaceId > 0 && filteredRooms.length === 0 && (
                <div className="
                  rounded-lg border border-dashed border-base-300 px-4 py-8
                  text-sm text-base-content/60 text-center
                ">
                  {currentRooms.length === 0
                    ? "当前空间下暂无房间"
                    : "没有匹配的房间"}
                </div>
              )}
              <div className="space-y-1">
                {filteredRooms.map((room) => {
                  const roomId = room.roomId ?? -1;
                  const displayName = resolveRoomDisplayName(roomId, room.name);
                  const avatar = resolveRoomAvatar(roomId, room.avatarFileId);
                  const isSelected = selectedRoomIds.has(roomId);

                  return (
                    <button
                      key={roomId}
                      type="button"
                      className={`
                        w-full rounded-md px-2.5 py-2 flex items-center
                        justify-between gap-3 text-left transition
                        disabled:opacity-60
                        ${
                        isSelected
                          ? "bg-info/10"
                          : "hover:bg-base-200/70"
                      }
                      `}
                      onClick={() => toggleRoomSelection(roomId)}
                      disabled={roomId <= 0 || isForwarding}
                      aria-pressed={isSelected}
                      aria-label={`选择转发目标房间 ${displayName}${isSelected ? "，已选择" : ""}`}
                      title={displayName}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`
                            flex size-5 shrink-0 items-center justify-center
                            rounded border text-[11px]
                            ${
                            isSelected
                              ? "border-info bg-info text-info-content"
                              : "border-base-content/25 text-transparent"
                          }
                          `}
                          aria-hidden="true"
                        >
                          <Check size={13} weight="regular" />
                        </span>
                        <div className="relative inline-flex align-middle">
                          <div className="size-9 overflow-hidden rounded-md">
                            <MediaImage
                              src={avatar}
                              alt={displayName}
                              fallbackSrc="/favicon.ico"
                              className="size-full object-cover"
                            />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{displayName}</div>
                          <div className="truncate text-xs text-base-content/50">{selectedSpaceName}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="
            min-h-0 rounded-lg border border-base-300 bg-base-200/25
          ">
            <div className="
              flex items-center justify-between gap-3 border-b border-base-300
              p-3
            ">
              <div>
                <div className="text-sm font-medium">已选目标</div>
                <div className="mt-0.5 text-xs text-base-content/50">
                  {selectedTargetCount}
                  {" "}
                  个房间
                </div>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={clearSelectedRooms}
                disabled={selectedTargetCount === 0 || isForwarding}
              >
                清空
              </Button>
            </div>

            <div className="max-h-80 min-h-60 overflow-auto p-2">
              {selectedRooms.length === 0
                ? (
                    <div className="
                      flex h-44 items-center justify-center rounded-lg border
                      border-dashed border-base-300 px-4 text-center text-sm
                      text-base-content/55
                    ">
                      从左侧选择要转发到的房间
                    </div>
                  )
                : (
                    <div className="space-y-1">
                      {selectedRooms.map((room) => {
                        const roomId = room.roomId ?? -1;
                        const displayName = resolveRoomDisplayName(roomId, room.name);
                        const avatar = resolveRoomAvatar(roomId, room.avatarFileId);

                        return (
                          <div
                            key={roomId}
                            className="
                              flex items-center justify-between gap-2 rounded-md
                              bg-base-100 px-2.5 py-2
                            "
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="relative inline-flex align-middle">
                                <div className="size-8 overflow-hidden rounded-md">
                                  <MediaImage
                                    src={avatar}
                                    alt={displayName}
                                    fallbackSrc="/favicon.ico"
                                    className="size-full object-cover"
                                  />
                                </div>
                              </div>
                              <div className="
                                min-w-0 truncate text-sm font-medium
                              ">{displayName}</div>
                            </div>
                            <IconButton
                              variant="ghost"
                              size="xs"
                              shape="square"
                              className="shrink-0"
                              onClick={() => toggleRoomSelection(roomId)}
                              disabled={isForwarding}
                              label={`移除 ${displayName}`}
                              icon={<X size={14} weight="regular" />}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
            </div>
          </section>
        </div>
      </div>

      <div className="
        border-t border-base-300 bg-base-100/95 px-6 py-4
        supports-backdrop-filter:backdrop-blur-md
        md:px-7
      ">
        <div className="
          flex flex-col gap-3
          md:flex-row md:items-center md:justify-between
        ">
          <div className="min-w-0 text-sm">
            <div className="font-medium">
              {selectedTargetCount > 0
                ? `将转发到 ${selectedTargetCount} 个房间`
                : "请选择目标房间"}
            </div>
            {selectedTargetCount > 0 && (
              <div className="mt-1 truncate text-xs text-base-content/55">
                {selectedRooms.map((room) => {
                  const roomId = room.roomId ?? -1;
                  return resolveRoomDisplayName(roomId, room.name);
                }).join("、")}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="清空已选择的转发目标房间"
              onClick={clearSelectedRooms}
              disabled={selectedTargetCount === 0 || isForwarding}
            >
              清空
            </Button>
            <Button
              variant="info"
              size="sm"
              className="min-w-32"
              loading={isForwarding}
              onClick={handleForwardSelectedRooms}
              disabled={!canForward}
            >
              {selectedTargetCount > 0
                ? `发送到 ${selectedTargetCount} 个房间`
                : "发送"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForwardWindow;
