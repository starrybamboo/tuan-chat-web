import type { ChatMessageResponse } from "../../../../api";
import type { ForwardMode } from "@/components/chat/hooks/useChatFrameMessageActions";
import React, { useEffect, useMemo, useState } from "react";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import {
  useGetUserRoomsQuery,
  useGetUserSpacesQuery,
} from "../../../../api/hooks/chatQueryHooks";

/**
 * 转发窗口组件
 * @param selectedMessages - 已选中的待转发消息
 * @param onForward - 执行转发的回调函数
 */
function ForwardWindow({
  selectedMessages,
  onForward,
}: {
  selectedMessages: ChatMessageResponse[];
  onForward: (roomId: number, mode: ForwardMode) => Promise<boolean>;
}) {
  const headers = useEntityHeaderOverrideStore(state => state.headers);
  const [forwardMode, setForwardMode] = useState<ForwardMode>("merged");
  const [roomKeyword, setRoomKeyword] = useState("");

  // 获取空间和房间数据
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);

  // 状态：当前选中的空间ID
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  // 状态：当前正在提交转发的房间ID
  const [forwardingRoomId, setForwardingRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (spaces.length === 0) {
      setSelectedSpaceId(null);
      return;
    }
    const hasSelectedSpace = selectedSpaceId !== null && spaces.some(space => space.spaceId === selectedSpaceId);
    if (hasSelectedSpace)
      return;
    const firstAvailableSpace = spaces.find(space => typeof space.spaceId === "number" && space.spaceId > 0);
    setSelectedSpaceId(firstAvailableSpace?.spaceId ?? null);
  }, [selectedSpaceId, spaces]);

  const userRoomsQuery = useGetUserRoomsQuery(selectedSpaceId ?? -1);
  // 获取当前选中空间的房间列表
  const currentRooms = useMemo(() => userRoomsQuery.data?.data?.rooms ?? [], [userRoomsQuery.data?.data?.rooms]);

  const filteredRooms = useMemo(() => {
    const keyword = roomKeyword.trim().toLowerCase();
    if (!keyword)
      return currentRooms;
    return currentRooms.filter((room) => {
      const roomId = room.roomId ?? -1;
      const roomName = (headers[`room:${roomId}`]?.title || room.name || "").toLowerCase();
      return roomName.includes(keyword);
    });
  }, [currentRooms, headers, roomKeyword]);

  const selectedSpaceName = useMemo(() => {
    if (selectedSpaceId === null)
      return "";
    const targetSpace = spaces.find(space => space.spaceId === selectedSpaceId);
    if (!targetSpace)
      return "";
    return headers[`space:${selectedSpaceId}`]?.title || targetSpace.name || "未命名空间";
  }, [headers, selectedSpaceId, spaces]);

  const handleForwardRoom = async (roomId: number) => {
    if (roomId <= 0 || forwardingRoomId !== null)
      return;
    setForwardingRoomId(roomId);
    try {
      await onForward(roomId, forwardMode);
    }
    finally {
      setForwardingRoomId(null);
    }
  };

  const isForwarding = forwardingRoomId !== null;
  const previewMessages = selectedMessages.slice(0, 5);

  return (
    <div className="w-[min(92vw,900px)] p-6 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">转发消息</h2>
          <p className="text-sm text-base-content/60 mt-1">
            选择转发模式，然后选择目标房间发送
          </p>
        </div>
        <div className="badge badge-info badge-lg">
          {selectedMessages.length}
          {" "}
          条已选
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          className={`rounded-xl border p-4 text-left transition ${
            forwardMode === "merged"
              ? "border-info bg-info/10 shadow-sm"
              : "border-base-300 hover:border-base-content/30 hover:bg-base-200/40"
          }`}
          onClick={() => setForwardMode("merged")}
        >
          <div className="font-semibold text-sm">合并转发</div>
          <div className="text-xs text-base-content/60 mt-1">
            将已选消息打包成 1 条转发消息
          </div>
        </button>
        <button
          type="button"
          className={`rounded-xl border p-4 text-left transition ${
            forwardMode === "separate"
              ? "border-info bg-info/10 shadow-sm"
              : "border-base-300 hover:border-base-content/30 hover:bg-base-200/40"
          }`}
          onClick={() => setForwardMode("separate")}
        >
          <div className="font-semibold text-sm">逐条转发</div>
          <div className="text-xs text-base-content/60 mt-1">
            按顺序逐条发送到目标房间（共
            {" "}
            {selectedMessages.length}
            {" "}
            条）
          </div>
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-base-300 bg-base-200/40 p-4">
        <div className="text-sm font-medium">已选消息预览</div>
        <div className="mt-2 space-y-2 max-h-36 overflow-auto pr-1">
          {previewMessages.map(item => (
            <div key={item.message.messageId} className="rounded-lg bg-base-100/70 px-3 py-2">
              <PreviewMessage message={item.message} />
            </div>
          ))}
          {selectedMessages.length > previewMessages.length && (
            <div className="text-xs text-base-content/60">
              还有
              {" "}
              {selectedMessages.length - previewMessages.length}
              {" "}
              条消息未展示
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-base-300 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-medium">选择目标房间</div>
          <label className="input input-bordered input-sm w-full md:w-72">
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
            <input
              type="text"
              value={roomKeyword}
              onChange={event => setRoomKeyword(event.target.value)}
              placeholder="搜索房间"
              disabled={selectedSpaceId === null}
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {spaces.map((space, index) => {
            const spaceId = space.spaceId ?? -1;
            const displayName = headers[`space:${spaceId}`]?.title || space.name || "未命名空间";
            const isActive = selectedSpaceId === spaceId;
            return (
              <button
                key={spaceId > 0 ? spaceId : `space-${index}`}
                type="button"
                className={`btn btn-sm whitespace-nowrap rounded-full ${
                  isActive ? "btn-info text-info-content" : "btn-ghost border border-base-300"
                }`}
                onClick={() => setSelectedSpaceId(spaceId)}
                disabled={spaceId <= 0 || isForwarding}
              >
                {displayName}
              </button>
            );
          })}
          {spaces.length === 0 && (
            <div className="text-sm text-base-content/50 py-1">暂无可用空间</div>
          )}
        </div>

        <div className="mt-3 max-h-72 overflow-auto pr-1 space-y-2">
          {selectedSpaceId === null && (
            <div className="rounded-lg border border-dashed border-base-300 px-4 py-8 text-sm text-base-content/60 text-center">
              请先选择一个空间
            </div>
          )}
          {selectedSpaceId !== null && filteredRooms.length === 0 && (
            <div className="rounded-lg border border-dashed border-base-300 px-4 py-8 text-sm text-base-content/60 text-center">
              {currentRooms.length === 0
                ? "该空间下暂无房间"
                : "没有匹配的房间"}
            </div>
          )}
          {filteredRooms.map((room) => {
            const roomId = room.roomId ?? -1;
            const displayName = headers[`room:${roomId}`]?.title || room.name || "未命名房间";
            const avatar = headers[`room:${roomId}`]?.imageUrl || room.avatar || "/favicon.ico";
            const isCurrentRoomForwarding = forwardingRoomId === roomId;

            return (
              <button
                key={roomId}
                type="button"
                className="w-full rounded-xl border border-base-300 px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:border-info/70 hover:bg-base-200/40 transition disabled:opacity-60"
                onClick={() => handleForwardRoom(roomId)}
                disabled={roomId <= 0 || isForwarding}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="avatar">
                    <div className="mask mask-squircle size-10">
                      <img
                        src={avatar}
                        alt={displayName}
                        onError={(event) => {
                          const img = event.currentTarget;
                          if (img.dataset.fallbackApplied)
                            return;
                          img.dataset.fallbackApplied = "1";
                          img.src = "/favicon.ico";
                        }}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{displayName}</div>
                    <div className="text-xs text-base-content/60 truncate">{selectedSpaceName}</div>
                  </div>
                </div>
                <div className="shrink-0 text-xs font-semibold text-info">
                  {isCurrentRoomForwarding
                    ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      )
                    : (
                        "发送"
                      )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ForwardWindow;
