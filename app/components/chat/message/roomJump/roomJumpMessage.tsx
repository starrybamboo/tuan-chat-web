import type { ChatMessageResponse } from "../../../../../api";

import React, { use, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router";
import { RoomContext } from "@/components/chat/core/roomContext";
import { extractRoomJumpPayload } from "@/components/chat/utils/roomJump";
import { useGetUserRoomsQuery } from "../../../../../api/hooks/chatQueryHooks";
import { ChatCircleIcon, ArrowRightIcon } from "@phosphor-icons/react";

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
  const roomsInSpace = roomsQuery.data?.data?.rooms ?? [];

  const resolvedTarget = useMemo<ResolveTargetResult>(() => {
    if (!payload) {
      return { roomId: null, reason: "无效的群聊跳转消息" };
    }
    if (!targetSpaceId) {
      return { roomId: null, reason: "缺少空间信息，无法跳转" };
    }

    const normalizedRoomName = normalizeName(payload.roomName);
    if (roomsQuery.isSuccess) {
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
  }, [payload, roomsInSpace, roomsQuery.isSuccess, targetSpaceId]);

  const disabledReason = !payload
    ? "无效的群聊跳转消息"
    : (!targetSpaceId ? "缺少空间信息，无法跳转" : "");
  const isDisabled = Boolean(disabledReason || !targetRoomId);
  const isCurrentRoom = Boolean(
    targetSpaceId
    && resolvedTarget.roomId
    && currentSpaceId === targetSpaceId
    && currentRoomId === resolvedTarget.roomId,
  );
  const canDirectJump = !isDisabled && Boolean(resolvedTarget.roomId);
  const isResolutionMissing = !isDisabled && !resolvedTarget.roomId;
  const title = payload?.label || payload?.roomName || (targetRoomId ? `群聊 #${targetRoomId}` : "群聊");
  const targetRoom = useMemo(() => {
    if (!payload || !roomsInSpace.length) {
      return null;
    }
    if (resolvedTarget.roomId) {
      const roomByResolved = roomsInSpace.find(room => room.roomId === resolvedTarget.roomId);
      if (roomByResolved) {
        return roomByResolved;
      }
    }
    if (payload.roomId) {
      const roomByPayloadId = roomsInSpace.find(room => room.roomId === payload.roomId);
      if (roomByPayloadId) {
        return roomByPayloadId;
      }
    }
    const normalizedPayloadRoomName = normalizeName(payload.roomName);
    if (normalizedPayloadRoomName) {
      return roomsInSpace.find(room => normalizeName(room.name) === normalizedPayloadRoomName) ?? null;
    }
    return null;
  }, [payload, resolvedTarget.roomId, roomsInSpace]);
  const displayRoomName = targetRoom?.name?.trim() || payload?.roomName || (targetRoomId ? `群聊 #${targetRoomId}` : "未知群聊");
  const displaySpaceName = payload?.spaceName?.trim() || (targetSpaceId ? `空间 #${targetSpaceId}` : "未知空间");
  const categoryLabel = payload?.categoryName?.trim() || "";
  const displayAvatar = targetRoom?.avatar?.trim() || "/favicon.ico";
  const titleDiffersFromRoomName = title.trim() !== displayRoomName.trim();
  const actionHint = isDisabled
    ? (disabledReason || "无法跳转")
    : (canDirectJump
        ? (isCurrentRoom ? "已在当前群聊" : "点击进入群聊")
        : (resolvedTarget.reason || "未找到目标群聊"));

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
    <div className="flex w-full max-w-sm py-1">
      <button
        type="button"
        className={`group relative isolate flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 ${
          canDirectJump
            ? "border-info/20 bg-gradient-to-r from-base-200/80 to-base-100/80 hover:border-info/40 hover:shadow-md hover:-translate-y-0.5"
            : isResolutionMissing
              ? "border-warning/30 bg-gradient-to-r from-warning/5 to-base-100/80 hover:border-warning/50"
              : "border-base-content/10 bg-base-200/50 opacity-70 cursor-not-allowed"
        }`}
        onClick={handleJump}
        title={isDisabled ? (disabledReason || "无法跳转") : "点击跳转到目标群聊"}
      >
        {canDirectJump && (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_60%)]" />
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`mask mask-squircle size-11 overflow-hidden border ${canDirectJump ? "border-info/20" : "border-base-content/10"}`}>
            <img
              src={displayAvatar}
              alt={displayRoomName}
              draggable={false}
              className="h-full w-full object-cover"
              onError={(event) => {
                const img = event.currentTarget;
                if (img.dataset.fallbackApplied) return;
                img.dataset.fallbackApplied = "1";
                img.src = "/favicon.ico";
              }}
            />
          </div>
          <div className={`absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-2 border-base-100 ${canDirectJump ? "bg-info text-info-content" : "bg-base-300 text-base-content/70"}`}>
            <ChatCircleIcon weight="fill" className="size-2.5" />
          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-base-content/60">
            <span className="truncate">{displaySpaceName}</span>
            {categoryLabel && (
              <>
                <span>·</span>
                <span className="truncate">{categoryLabel}</span>
              </>
            )}
          </div>
          <div className="truncate text-[14px] font-medium text-base-content/90">
            {title}
          </div>
          {titleDiffersFromRoomName && (
            <div className="truncate text-[11px] text-base-content/50">
              群聊: {displayRoomName}
            </div>
          )}
        </div>

        {/* Action Button / Status */}
        <div className="shrink-0 pl-1">
          {canDirectJump ? (
            <div className="flex size-7 items-center justify-center rounded-full bg-info/10 text-info transition-colors group-hover:bg-info group-hover:text-info-content">
              <ArrowRightIcon weight="bold" className="size-3.5" />
            </div>
          ) : (
            <span className="text-[11px] text-base-content/50">{actionHint}</span>
          )}
        </div>
      </button>
    </div>
  );
}

const RoomJumpMessage = React.memo(RoomJumpMessageImpl);
export default RoomJumpMessage;
