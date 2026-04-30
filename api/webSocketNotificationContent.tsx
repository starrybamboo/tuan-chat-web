import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import toast from "react-hot-toast";
import { useNavigate } from "react-router";

import type { DirectMessageEvent } from "./wsModels";
import { MessageType } from "./wsModels";

export function FriendRequestToastContent({
  toastId,
  displayName,
  avatar,
  verifyMsg,
}: {
  toastId: string;
  displayName: string;
  avatar?: string;
  verifyMsg?: string;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="w-[320px] max-w-[90vw] rounded-lg border border-base-300 bg-base-100 p-3 shadow-xl"
      role="button"
      tabIndex={0}
      onClick={() => {
        toast.dismiss(toastId);
        navigate("/chat/private?tab=pending");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toast.dismiss(toastId);
          navigate("/chat/private?tab=pending");
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className="avatar">
          <div className="w-10 rounded-full">
            {avatar
              ? <img src={avatar} alt={displayName} />
              : <div className="w-10 h-10 rounded-full bg-base-200" />}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">
            {displayName}
            <span className="opacity-70"> 向你发送了好友申请</span>
          </div>
          {verifyMsg
            ? <div className="text-xs opacity-70 truncate mt-0.5">{verifyMsg}</div>
            : null}
        </div>
      </div>
    </div>
  );
}

export function DirectMessageToastContent({
  toastId,
  senderId,
  displayName,
  avatar,
  previewText,
}: {
  toastId: string;
  senderId: number;
  displayName: string;
  avatar?: string;
  previewText: string;
}) {
  const navigate = useNavigate();

  const jumpToPrivateChat = () => {
    toast.dismiss(toastId);
    navigate(`/chat/private/${senderId}`);
  };

  return (
    <div
      className="w-[320px] max-w-[90vw] rounded-lg border border-base-300 bg-base-100 p-3 shadow-xl"
      role="button"
      tabIndex={0}
      onClick={jumpToPrivateChat}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          jumpToPrivateChat();
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className="avatar">
          <div className="w-10 rounded-full">
            {avatar
              ? <img src={avatar} alt={displayName} />
              : <div className="w-10 h-10 rounded-full bg-base-200" />}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">
            {displayName}
            <span className="opacity-70"> 给你发来私信</span>
          </div>
          <div className="text-xs opacity-70 truncate mt-0.5">{previewText}</div>
        </div>
      </div>
    </div>
  );
}

export function GroupMessageToastContent({
  toastId,
  targetPath,
  roomName,
  senderName,
  senderAvatar,
  previewText,
}: {
  toastId: string;
  targetPath: string | null;
  roomName: string;
  senderName: string;
  senderAvatar?: string;
  previewText: string;
}) {
  const navigate = useNavigate();

  const jumpToGroupChat = () => {
    toast.dismiss(toastId);
    if (targetPath) {
      navigate(targetPath);
    }
  };

  return (
    <div
      className="w-[360px] max-w-[90vw] rounded-lg border border-base-300 bg-base-100 p-3 shadow-xl"
      role="button"
      tabIndex={0}
      onClick={jumpToGroupChat}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          jumpToGroupChat();
        }
      }}
    >
      <div className="text-xs font-medium opacity-70 truncate">{roomName}</div>
      <div className="mt-2 flex items-center gap-3">
        <div className="avatar">
          <div className="w-9 rounded-full">
            {senderAvatar
              ? <img src={senderAvatar} alt={senderName} />
              : <div className="w-9 h-9 rounded-full bg-base-200" />}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">
            {senderName}
            <span className="opacity-70"> 在群聊中发来新消息</span>
          </div>
          <div className="text-xs opacity-70 truncate mt-0.5">{previewText}</div>
        </div>
      </div>
    </div>
  );
}

export function NotificationToastContent({
  toastId,
  title,
  content,
  targetPath,
}: {
  toastId: string;
  title: string;
  content: string;
  targetPath: string | null;
}) {
  const navigate = useNavigate();

  const jumpToNotificationTarget = () => {
    toast.dismiss(toastId);
    if (targetPath) {
      navigate(targetPath);
    }
  };

  return (
    <div
      className="w-[360px] max-w-[90vw] rounded-lg border border-base-300 bg-base-100 p-3 shadow-xl"
      role="button"
      tabIndex={0}
      onClick={jumpToNotificationTarget}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          jumpToNotificationTarget();
        }
      }}
    >
      <div className="text-sm font-semibold truncate">{title}</div>
      <div className="mt-1 text-sm opacity-75 line-clamp-2">{content}</div>
    </div>
  );
}

export function getDirectMessagePreview(message: DirectMessageEvent): string {
  const content = (message?.content ?? "").trim();

  if (content.length > 0) {
    return content;
  }

  if (message?.messageType === MessageType.IMG) {
    return "[图片]";
  }
  if (message?.messageType === MessageType.FILE) {
    return "[文件]";
  }
  if (message?.messageType === MessageType.SOUND) {
    return "[音频]";
  }
  if (message?.messageType === MessageType.VIDEO) {
    return "[视频]";
  }
  return "[新消息]";
}

export function getGroupMessagePreview(chatMessageResponse: ChatMessageResponse): string {
  const message = chatMessageResponse?.message;
  const content = (message?.content ?? "").trim();

  if (content.length > 0) {
    return content;
  }

  if (message?.messageType === MessageType.IMG) {
    return "[图片]";
  }
  if (message?.messageType === MessageType.FILE) {
    return "[文件]";
  }
  if (message?.messageType === MessageType.SOUND) {
    return "[音频]";
  }
  if (message?.messageType === MessageType.VIDEO) {
    return "[视频]";
  }
  if (message?.messageType === MessageType.DICE) {
    return "[骰子消息]";
  }
  if (message?.messageType === MessageType.EFFECT) {
    return "[特效消息]";
  }
  if (message?.messageType === MessageType.ROOM_JUMP) {
    return "[群聊跳转]";
  }
  return "[新消息]";
}

export function getActivePrivateContactId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const match = window.location.pathname.match(/^\/chat\/private\/(\d+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeAppTargetPath(targetPath?: string | null): string | null {
  if (typeof targetPath !== "string") {
    return null;
  }
  const normalized = targetPath.trim();
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return null;
  }
  return normalized;
}

export function isCurrentTargetPath(targetPath?: string | null): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const normalized = normalizeAppTargetPath(targetPath);
  if (!normalized) {
    return false;
  }
  return window.location.pathname === normalized;
}

export function getActiveGroupRoomId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const match = window.location.pathname.match(/^\/chat\/([^/]+)\/(\d+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  const spaceIdOrMode = match[1];
  if (spaceIdOrMode === "private") {
    return null;
  }

  const roomId = Number(match[2]);
  return Number.isFinite(roomId) && roomId > 0 ? roomId : null;
}
