import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultRoom } from "@tuanchat/openapi-client/models/ApiResultRoom";
import type { ApiResultRoomListResponse } from "@tuanchat/openapi-client/models/ApiResultRoomListResponse";
import type { ApiResultUserInfoResponse } from "@tuanchat/openapi-client/models/ApiResultUserInfoResponse";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { UserNotificationItem } from "@/components/notification/notificationTypes";
import type { DirectMessageEvent, NewFriendRequestPush } from "./wsModels";

import {
  readFeedbackDesktopEnabledFromLocalStorage,
  readFeedbackInAppEnabledFromLocalStorage,
  readGroupMessagePopupEnabledFromLocalStorage,
} from "@/components/settings/notificationPreferences";
import { showDesktopNotification } from "@/utils/desktopNotification";
import { isRunningInsideNativeAppWebView, postNativeAppNotification } from "@/utils/nativeAppBridge";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { tuanchat } from "./instance";
import {
  DirectMessageToastContent,
  FriendRequestToastContent,
  getActiveGroupRoomId,
  getActivePrivateContactId,
  getDirectMessagePreview,
  getGroupMessagePreview,
  GroupMessageToastContent,
  isCurrentTargetPath,
  normalizeAppTargetPath,
  NotificationToastContent,
} from "./webSocketNotificationContent";

type UseWebSocketNotificationsOptions = {
  queryClient: QueryClient;
  isCurrentTabInForeground: () => boolean;
  shouldShowCrossTabSystemNotification: () => boolean;
  resolveSelfUserId: (fallbackUserId?: number) => number;
};

export function useWebSocketNotifications({
  queryClient,
  isCurrentTabInForeground,
  shouldShowCrossTabSystemNotification,
  resolveSelfUserId,
}: UseWebSocketNotificationsOptions) {
  const notifyNewFriendRequest = useCallback(async (event: NewFriendRequestPush) => {
    const friendReqId = event?.data?.friendReqId;
    const toastId = typeof friendReqId === "number" ? `friend-req-${friendReqId}` : "friend-req";

    try {
      // 优先拉取好友申请列表详情，拿到头像/昵称。
      const res = await tuanchat.friendController.getFriendRequestPage({ pageNo: 1, pageSize: 50 });
      const list = res.data?.list ?? [];
      const req = Array.isArray(list)
        ? list.find(r => (typeof friendReqId === "number" ? r?.id === friendReqId : false))
        : undefined;

      const isReceived = (req?.type ?? "received") === "received";
      const userInfo = isReceived ? req?.fromUser : req?.toUser;
      const displayName = userInfo?.username
        || (isReceived ? (req?.fromId != null ? `用户${req.fromId}` : "某位用户") : (req?.toId != null ? `用户${req.toId}` : "某位用户"));
      const avatar = userInfo?.avatar;
      const verifyMsg = (req?.verifyMsg ?? event?.data?.verifyMsg ?? "").trim();

      if (isRunningInsideNativeAppWebView()) {
        const forwarded = postNativeAppNotification({
          title: `${displayName} 向你发送了好友申请`,
          body: verifyMsg || "点击查看待处理申请",
          targetPath: "/chat/private?tab=pending",
          tag: toastId,
        });
        if (forwarded) {
          return;
        }
      }

      toast.custom(
        t => (
          <div className={t.visible ? "animate-enter" : "animate-leave"}>
            <FriendRequestToastContent
              toastId={t.id}
              displayName={displayName}
              avatar={avatar}
              verifyMsg={verifyMsg}
            />
          </div>
        ),
        {
          id: toastId,
          position: "top-center",
          duration: 8000,
        },
      );
    }
    catch {
      if (isRunningInsideNativeAppWebView()) {
        const forwarded = postNativeAppNotification({
          title: "收到新的好友申请",
          body: "点击查看待处理申请",
          targetPath: "/chat/private?tab=pending",
          tag: toastId,
        });
        if (forwarded) {
          return;
        }
      }

      toast("收到新的好友申请", {
        id: toastId,
        position: "top-center",
        duration: 6000,
      });
    }
  }, []);

  const notifyNewDirectMessage = useCallback(async (message: DirectMessageEvent, selfUserId: number) => {
    if (message?.messageType === 10000) {
      return;
    }

    if (message?.senderId === selfUserId) {
      return;
    }

    const shouldShowSystemNotification = shouldShowCrossTabSystemNotification();
    const activePrivateContactId = getActivePrivateContactId();
    const shouldShowInAppToast = isCurrentTabInForeground()
      && !(activePrivateContactId != null && activePrivateContactId === message.senderId);

    if (!shouldShowSystemNotification && !shouldShowInAppToast) {
      return;
    }

    const toastId = `direct-msg-${message.messageId}`;
    let senderInfo = queryClient.getQueryData<ApiResultUserInfoResponse>(["getUserInfo", message.senderId])?.data;
    const senderNameFromMessage = message.senderUsername?.trim() || "";
    const senderAvatarFromMessage = message.senderAvatarThumbUrl?.trim() || message.senderAvatar?.trim() || "";

    if (!senderInfo && (!senderNameFromMessage || !senderAvatarFromMessage)) {
      try {
        const userResp = await tuanchat.userController.getUserInfo(message.senderId);
        senderInfo = userResp.data;
        queryClient.setQueryData(["getUserInfo", message.senderId], userResp);
      }
      catch {
        // ignore
      }
    }

    const displayName = senderNameFromMessage || senderInfo?.username || `用户${message.senderId}`;
    const avatar = senderAvatarFromMessage || senderInfo?.avatarThumbUrl || senderInfo?.avatar;
    const previewText = getDirectMessagePreview(message);
    const targetPath = `/chat/private/${message.senderId}`;

    if (isRunningInsideNativeAppWebView()) {
      const forwarded = postNativeAppNotification({
        title: `${displayName} 给你发来私信`,
        body: previewText,
        targetPath,
        tag: toastId,
      });
      if (forwarded) {
        return;
      }
    }

    if (shouldShowInAppToast) {
      toast.custom(
        t => (
          <div className={t.visible ? "animate-enter" : "animate-leave"}>
            <DirectMessageToastContent
              toastId={t.id}
              senderId={message.senderId}
              displayName={displayName}
              avatar={avatar}
              previewText={previewText}
            />
          </div>
        ),
        {
          id: toastId,
          position: "top-center",
          duration: 6000,
        },
      );
    }

    if (shouldShowSystemNotification) {
      void showDesktopNotification({
        title: `${displayName} 给你发来私信`,
        body: previewText,
        icon: avatar,
        targetPath,
        tag: toastId,
      });
    }
  }, [isCurrentTabInForeground, queryClient, shouldShowCrossTabSystemNotification]);

  const notifyNewGroupMessage = useCallback(async (chatMessageResponse: ChatMessageResponse) => {
    const message = chatMessageResponse?.message;
    if (!message) {
      return;
    }

    if (!readGroupMessagePopupEnabledFromLocalStorage()) {
      return;
    }

    if (message.status !== 0) {
      return;
    }

    const selfUserId = resolveSelfUserId();
    if (selfUserId > 0 && message.userId === selfUserId) {
      return;
    }

    const shouldShowSystemNotification = shouldShowCrossTabSystemNotification();
    const activeGroupRoomId = getActiveGroupRoomId();
    const shouldShowInAppToast = isCurrentTabInForeground()
      && !(activeGroupRoomId != null && activeGroupRoomId === message.roomId);
    if (!shouldShowSystemNotification && !shouldShowInAppToast) {
      return;
    }

    const toastId = `group-msg-${message.messageId}`;
    let roomName = `群聊${message.roomId}`;
    let roomSpaceId: number | null = null;

    const cachedRoomInfo = queryClient.getQueryData<ApiResultRoom>(["getRoomInfo", message.roomId])?.data;
    if (cachedRoomInfo) {
      roomName = (cachedRoomInfo.name ?? "").trim() || roomName;
      if (typeof cachedRoomInfo.spaceId === "number" && cachedRoomInfo.spaceId > 0) {
        roomSpaceId = cachedRoomInfo.spaceId;
      }
    }

    if (roomSpaceId == null) {
      const roomListQueries = queryClient.getQueriesData<ApiResultRoomListResponse>({ queryKey: ["getUserRooms"] });
      for (const [, queryData] of roomListQueries) {
        const rooms = queryData?.data?.rooms;
        if (!Array.isArray(rooms)) {
          continue;
        }
        const matchedRoom = rooms.find(r => r?.roomId === message.roomId);
        if (!matchedRoom) {
          continue;
        }
        roomName = (matchedRoom.name ?? "").trim() || roomName;
        if (typeof matchedRoom.spaceId === "number" && matchedRoom.spaceId > 0) {
          roomSpaceId = matchedRoom.spaceId;
        }
        break;
      }
    }

    if (roomSpaceId == null) {
      try {
        const roomInfoResp = await tuanchat.roomController.getRoomInfo(message.roomId);
        const roomInfo = roomInfoResp.data;
        if (roomInfo) {
          queryClient.setQueryData(["getRoomInfo", message.roomId], roomInfoResp);
          roomName = (roomInfo.name ?? "").trim() || roomName;
          if (typeof roomInfo.spaceId === "number" && roomInfo.spaceId > 0) {
            roomSpaceId = roomInfo.spaceId;
          }
        }
      }
      catch {
        // ignore
      }
    }

    let senderInfo = queryClient.getQueryData<ApiResultUserInfoResponse>(["getUserInfo", message.userId])?.data;
    if (!senderInfo) {
      try {
        const userResp = await tuanchat.userController.getUserInfo(message.userId);
        senderInfo = userResp.data;
        queryClient.setQueryData(["getUserInfo", message.userId], userResp);
      }
      catch {
        // ignore
      }
    }

    const senderName = senderInfo?.username || `用户${message.userId}`;
    const senderAvatar = senderInfo?.avatar || senderInfo?.avatarThumbUrl;
    const previewText = getGroupMessagePreview(chatMessageResponse);
    const targetPath = roomSpaceId == null ? null : `/chat/${roomSpaceId}/${message.roomId}`;
    const notificationTitle = `${roomName} · ${senderName}`;

    if (isRunningInsideNativeAppWebView()) {
      const forwarded = postNativeAppNotification({
        title: notificationTitle,
        body: previewText,
        targetPath,
        tag: toastId,
      });
      if (forwarded) {
        return;
      }
    }

    if (shouldShowInAppToast) {
      toast.custom(
        t => (
          <div className={t.visible ? "animate-enter" : "animate-leave"}>
            <GroupMessageToastContent
              toastId={t.id}
              targetPath={targetPath}
              roomName={roomName}
              senderName={senderName}
              senderAvatar={senderAvatar}
              previewText={previewText}
            />
          </div>
        ),
        {
          id: toastId,
          position: "top-center",
          duration: 7000,
        },
      );
    }

    if (shouldShowSystemNotification) {
      void showDesktopNotification({
        title: notificationTitle,
        body: previewText,
        icon: senderAvatar,
        targetPath,
        tag: toastId,
      });
    }
  }, [isCurrentTabInForeground, queryClient, resolveSelfUserId, shouldShowCrossTabSystemNotification]);

  const notifyNewUserNotification = useCallback(async (notification: UserNotificationItem) => {
    if (!notification || notification.isRead) {
      return;
    }

    const shouldShowInApp = readFeedbackInAppEnabledFromLocalStorage();
    const shouldShowDesktop = readFeedbackDesktopEnabledFromLocalStorage();
    const shouldShowSystemNotification = shouldShowDesktop && shouldShowCrossTabSystemNotification();
    const isSameTargetInForeground = isCurrentTabInForeground() && isCurrentTargetPath(notification.targetPath);
    const canShowInAppToast = shouldShowInApp && isCurrentTabInForeground() && !isSameTargetInForeground;
    const canShowSystemNotification = shouldShowSystemNotification && !isSameTargetInForeground;

    if (!canShowInAppToast && !canShowSystemNotification) {
      return;
    }

    const toastId = `user-notification-${notification.notificationId}`;
    const normalizedTargetPath = normalizeAppTargetPath(notification.targetPath);

    if (isRunningInsideNativeAppWebView()) {
      const forwarded = postNativeAppNotification({
        title: notification.title,
        body: notification.content,
        targetPath: normalizedTargetPath ?? notification.targetPath,
        tag: toastId,
      });
      if (forwarded) {
        return;
      }
    }

    if (canShowInAppToast) {
      toast.custom(
        t => (
          <div className={t.visible ? "animate-enter" : "animate-leave"}>
            <NotificationToastContent
              toastId={t.id}
              title={notification.title}
              content={notification.content}
              targetPath={normalizedTargetPath}
            />
          </div>
        ),
        {
          id: toastId,
          position: "top-center",
          duration: 7000,
        },
      );
    }

    if (canShowSystemNotification) {
      void showDesktopNotification({
        title: notification.title,
        body: notification.content,
        targetPath: notification.targetPath,
        tag: toastId,
      });
    }
  }, [isCurrentTabInForeground, shouldShowCrossTabSystemNotification]);

  return {
    notifyNewDirectMessage,
    notifyNewFriendRequest,
    notifyNewGroupMessage,
    notifyNewUserNotification,
  };
}
