import type { ChatMessageResponse } from "../../../../../api";

import React, { use, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router";
import { RoomContext } from "@/components/chat/core/roomContext";
import { extractRoomJumpPayload } from "@/components/chat/utils/roomJump";
import { useGetUserRoomsQuery } from "../../../../../api/hooks/chatQueryHooks";

function normalizeName(value: string | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

interface ResolveTargetResult {
  roomId: number | null;
  reason?: string;
}

function RoomJumpMessageImpl({ messageResponse }: { messageResponse: ChatMessageResponse }) {
  const roomContext = use(RoomContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const payload = useMemo(() => extractRoomJumpPayload(messageResponse.message.extra), [messageResponse.message.extra]);

  const currentSpaceId = roomContext.spaceId ?? undefined;
  const currentRoomId = roomContext.roomId ?? undefined;
  const targetSpaceId = currentSpaceId ?? payload?.spaceId;
  const targetRoomId = payload?.roomId;
  const roomsQuery = useGetUserRoomsQuery(targetSpaceId ?? -1);

  const resolvedTarget = useMemo<ResolveTargetResult>(() => {
    if (!payload) {
      return { roomId: null, reason: "无效的群聊跳转消息" };
    }
    if (!targetSpaceId) {
      return { roomId: null, reason: "缺少空间信息，无法跳转" };
    }

    const normalizedRoomName = normalizeName(payload.roomName);
    if (roomsQuery.isSuccess) {
      const roomsInSpace = roomsQuery.data?.data?.rooms ?? [];
      if (normalizedRoomName) {
        const matchesByName = roomsInSpace.filter(room => normalizeName(room.name) === normalizedRoomName);
        if (matchesByName.length === 1) {
          const matchedRoomId = matchesByName[0]?.roomId;
          return { roomId: typeof matchedRoomId === "number" ? matchedRoomId : null };
        }
        if (matchesByName.length > 1) {
          const roomIdMatch = matchesByName.find(room => room.roomId === payload.roomId);
          if (roomIdMatch) {
            return { roomId: typeof roomIdMatch.roomId === "number" ? roomIdMatch.roomId : null };
          }
          return { roomId: null, reason: "检测到多个同名群聊，请在消息中指定更明确的目标" };
        }
      }

      if (payload.roomId) {
        const fallbackById = roomsInSpace.find(room => room.roomId === payload.roomId);
        if (fallbackById) {
          return { roomId: typeof fallbackById.roomId === "number" ? fallbackById.roomId : null };
        }
      }

      return {
        roomId: null,
        reason: normalizedRoomName
          ? `当前空间未找到群聊「${payload.roomName}」`
          : "当前空间未找到目标群聊",
      };
    }

    // 房间列表尚未加载完成时，先走消息中的 roomId 兜底。
    if (payload.roomId) {
      return { roomId: payload.roomId };
    }

    return { roomId: null, reason: "正在加载群聊列表，请稍后重试" };
  }, [payload, roomsQuery.data?.data?.rooms, roomsQuery.isSuccess, targetSpaceId]);

  const disabledReason = !payload
    ? "无效的群聊跳转消息"
    : (!targetSpaceId ? "缺少空间信息，无法跳转" : "");
  const isDisabled = Boolean(disabledReason || !targetRoomId);
  const title = payload?.label || payload?.roomName || (targetRoomId ? `群聊 #${targetRoomId}` : "群聊");
  const categoryHint = payload?.categoryName ? ` · ${payload.categoryName}` : "";
  const subtitle = payload?.spaceName
    ? `${payload.spaceName}${categoryHint} · ${payload.roomName || `群聊 #${targetRoomId}`}`
    : `空间 #${targetSpaceId ?? "-"}${categoryHint} · 群聊 #${targetRoomId ?? "-"}`;

  const handleJump = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!targetSpaceId) {
      toast.error(disabledReason || "缺少目标空间信息");
      return;
    }
    if (!resolvedTarget.roomId) {
      toast.error(resolvedTarget.reason || "未找到目标群聊");
      return;
    }

    if (currentSpaceId === targetSpaceId && currentRoomId === resolvedTarget.roomId) {
      toast("已在目标群聊", { icon: "ℹ️" });
      return;
    }

    const query = searchParams.toString();
    const targetPath = `/chat/${targetSpaceId}/${resolvedTarget.roomId}${query ? `?${query}` : ""}`;
    navigate(targetPath);
  }, [currentRoomId, currentSpaceId, disabledReason, navigate, resolvedTarget.roomId, resolvedTarget.reason, searchParams, targetSpaceId]);

  return (
    <div className="flex gap-3 p-3 w-full max-w-3xl">
      <button
        type="button"
        className={`w-full text-left rounded-xl border border-base-300 bg-base-100 shadow-sm px-4 py-3 transition ${
          isDisabled ? "opacity-70 cursor-not-allowed" : "hover:shadow-md hover:border-info/60 hover:bg-base-200/60"
        }`}
        onClick={handleJump}
        title={isDisabled ? (disabledReason || "无法跳转") : "点击跳转到目标群聊"}
      >
        <div className="flex items-center gap-2 text-xs text-base-content/70">
          <span className="badge badge-info badge-xs">群聊跳转</span>
          <span className="text-[11px]">{subtitle}</span>
        </div>
        <div className="mt-1 text-sm font-semibold text-base-content/90 break-words">
          {title}
        </div>
        <div className="mt-1 text-[10px] text-base-content/50">
          {isDisabled ? (disabledReason || "无法跳转") : "点击进入群聊"}
        </div>
      </button>
    </div>
  );
}

const RoomJumpMessage = React.memo(RoomJumpMessageImpl);
export default RoomJumpMessage;
