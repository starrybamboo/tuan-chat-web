import type { QueryClient } from "@tanstack/react-query";
import { appToast } from "@/components/common/appToast/appToast";

import { getMessagePreviewText } from "@tuanchat/domain/message-preview";
import { useCallback } from "react";

import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { RoomUiStoreApi } from "@/components/chat/stores/roomUiStore";
import type { ClueRefDragPayload } from "@/components/chat/utils/clueRef";
import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import type { ImportChatRequestMessage } from "@/components/chat/utils/importChatMessageRequestBuilder";
import type { RoomRefDragPayload } from "@/components/chat/utils/roomRef";

import { recordDocCardShareObservation } from "@/components/chat/infra/doc/shared/docCardShareObservability";
import { buildDocCardReferencePayload } from "@/components/chat/message/docCard/docCardMedia";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { buildImportedChatMessageRequests } from "@/components/chat/utils/importChatMessageRequestBuilder";
import { IMPORT_SPECIAL_ROLE_ID } from "@/components/chat/utils/importChatText";
import UTILS from "@/components/common/dicer/utils/utils";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageRequest, ChatMessageResponse, RoleAvatar, RoomMessageMutationMeta } from "../../../../api";

import { fetchRoleAvatarsWithCache } from "../../../../api/hooks/RoleAndAvatarHooks";
import { MessageType } from "../../../../api/wsModels";

type UseRoomImportActionsParams = {
  roomId: number;
  spaceId: number;
  isSpaceOwner: boolean;
  curRoleId: number;
  notMember: boolean;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  roomContext: RoomContextType;
  sendMessageWithInsert: (message: ChatMessageRequest) => Promise<ChatMessageResponse["message"] | null>;
  sendMessageBatch: (messages: ChatMessageRequest[], options?: { mutationMeta?: RoomMessageMutationMeta }) => Promise<ChatMessageResponse["message"][]>;
  ensureRuntimeAvatarIdForRole: (roleId: number) => Promise<number>;
  queryClient?: QueryClient;
  roomUiStoreApi: RoomUiStoreApi;
};

type UseRoomImportActionsResult = {
  handleImportChatText: (messages: ImportChatRequestMessage[], onProgress?: (sent: number, total: number) => void) => Promise<void>;
  handleSendClueCard: (payload: ClueRefDragPayload) => Promise<void>;
  handleSendDocCard: (payload: DocRefDragPayload) => Promise<void>;
  handleSendRoomJump: (payload: RoomRefDragPayload) => Promise<void>;
};

function parseDocRoomId(docId: string): number | null {
  if (!/^\d+$/.test(docId)) {
    return null;
  }
  const roomId = Number(docId);
  return Number.isFinite(roomId) && roomId > 0 ? roomId : null;
}

function isSendableDocRef(docId: string): boolean {
  return parseDocRoomId(docId) != null;
}

export default function useRoomImportActions({
  roomId,
  spaceId,
  isSpaceOwner,
  curRoleId,
  notMember,
  isSubmitting,
  setIsSubmitting,
  roomContext,
  sendMessageWithInsert,
  sendMessageBatch,
  ensureRuntimeAvatarIdForRole,
  queryClient,
  roomUiStoreApi,
}: UseRoomImportActionsParams): UseRoomImportActionsResult {
  const handleImportChatText = useCallback(async (
    messages: ImportChatRequestMessage[],
    onProgress?: (sent: number, total: number) => void,
  ) => {
    if (isSubmitting) {
      appToast.error("正在提交中，请稍后");
      return;
    }
    if (!messages.length) {
      appToast.error("没有可导入的消息");
      return;
    }

    const ui = roomUiStoreApi.getState();
    const prevInsertAfter = ui.insertAfterMessageId;
    const prevReply = ui.replyMessage;

    ui.setInsertAfterMessageId(undefined);
    ui.setReplyMessage(undefined);

    setIsSubmitting(true);
    try {
      const isSpectator = notMember;
      const draftCustomRoleNameMap = useRoomPreferenceStore.getState().draftCustomRoleNameMap;

      const resolvedAvatarIdByRole = new Map<number, number>();
      const ensureAvatarIdForRole = async (roleId: number): Promise<number> => {
        if (roleId <= 0) {
          return -1;
        }
        const cached = resolvedAvatarIdByRole.get(roleId);
        if (cached != null) {
          return cached;
        }

        const ensured = await ensureRuntimeAvatarIdForRole(roleId);
        resolvedAvatarIdByRole.set(roleId, ensured);
        return ensured;
      };

      let dicerRoleId: number | null = null;
      let dicerAvatarId: number | null = null;
      let dicerAvatars: RoleAvatar[] = [];

      const ensureDicerSender = async () => {
        if (dicerRoleId != null && dicerAvatarId != null) {
          return;
        }
        const resolvedDicerRoleId = await UTILS.getDicerRoleId(
          roomContext,
          queryClient ? { queryClient } : undefined,
        );
        dicerRoleId = resolvedDicerRoleId;
        const ensured = await ensureAvatarIdForRole(resolvedDicerRoleId);
        dicerAvatarId = ensured > 0 ? ensured : -1;
        if (queryClient) {
          dicerAvatars = (await fetchRoleAvatarsWithCache(queryClient, resolvedDicerRoleId).catch(() => null))?.data ?? [];
        }
      };

      const uniqueRoleIds = isSpectator
        ? []
        : Array.from(new Set(
            messages
              .map(m => m.roleId)
              .filter(roleId => roleId > 0),
          ));
      for (const roleId of uniqueRoleIds) {
        await ensureAvatarIdForRole(roleId);
      }

      if (!isSpectator && messages.some(m => m.roleId === IMPORT_SPECIAL_ROLE_ID.DICER || m.diceTurn)) {
        await ensureDicerSender();
      }

      const requests = buildImportedChatMessageRequests(messages, {
        roomId,
        isSpectator,
        dicerRoleId,
        dicerAvatarId,
        dicerAvatars,
        draftCustomRoleNameMap,
        resolveAvatarId: roleId => resolvedAvatarIdByRole.get(roleId) ?? -1,
      });

      const createdMessages = await sendMessageBatch(requests, {
        mutationMeta: {
          operationCause: "normal",
          sourceSurface: "import",
        },
      });
      if (createdMessages.length !== requests.length) {
        throw new Error("导入消息失败");
      }
      onProgress?.(createdMessages.length, requests.length);
    }
    finally {
      roomUiStoreApi.getState().setInsertAfterMessageId(prevInsertAfter);
      roomUiStoreApi.getState().setReplyMessage(prevReply);
      setIsSubmitting(false);
    }
  }, [
    ensureRuntimeAvatarIdForRole,
    isSubmitting,
    notMember,
    queryClient,
    roomContext,
    roomId,
    roomUiStoreApi,
    sendMessageBatch,
    setIsSubmitting,
  ]);

  const handleSendClueCard = useCallback(async (payload: ClueRefDragPayload) => {
    const snapshot = payload?.snapshot;
    if (!snapshot || typeof snapshot.messageType !== "number" || !Number.isFinite(snapshot.messageType) || snapshot.messageType <= 0) {
      appToast.error("未检测到可用线索");
      return;
    }

    const isKP = isSpaceOwner;
    const isNarrator = curRoleId <= 0;

    if (isNarrator && !isKP && !notMember) {
      appToast.error("旁白仅主持可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      appToast.error("正在提交中，请稍后");
      return;
    }

    const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);
    const cluePreviewText = getMessagePreviewText({
      messageType: Math.floor(snapshot.messageType),
      content: typeof snapshot.content === "string" ? snapshot.content : "",
      ...(snapshot.extra !== undefined ? { extra: snapshot.extra as ChatMessageResponse["message"]["extra"] } : {}),
      status: 0,
    } as ChatMessageResponse["message"]);

    const request: ChatMessageRequest = {
      roomId,
      roleId: curRoleId,
      avatarId: resolvedAvatarId,
      content: cluePreviewText,
      messageType: MESSAGE_TYPE.CLUE_CARD,
      extra: {
        clueMessage: {
          snapshot: {
            messageType: Math.floor(snapshot.messageType),
            content: typeof snapshot.content === "string" ? snapshot.content : "",
            ...(snapshot.extra !== undefined ? { extra: snapshot.extra } : {}),
          },
        },
      } as any,
    };

    await sendMessageWithInsert(request);
  }, [
    curRoleId,
    ensureRuntimeAvatarIdForRole,
    isSpaceOwner,
    isSubmitting,
    notMember,
    roomId,
    roomUiStoreApi,
    sendMessageWithInsert,
  ]);

  const handleSendDocCard = useCallback(async (payload: DocRefDragPayload) => {
    const payloadRoomId = typeof payload?.roomId === "number" && Number.isFinite(payload.roomId) && payload.roomId > 0
      ? payload.roomId
      : undefined;
    const docId = payloadRoomId ? String(payloadRoomId) : String(payload?.docId ?? "").trim();
    const requestedDocCard = buildDocCardReferencePayload({
      docId,
      ...(payloadRoomId ? { roomId: payloadRoomId } : {}),
      ...(payload?.spaceId ? { spaceId: payload.spaceId } : {}),
      title: payload?.title,
      imageFileId: payload?.imageFileId,
      originalImageFileId: payload?.originalImageFileId,
      imageMediaType: payload?.imageMediaType,
      excerpt: payload?.excerpt,
    });

    recordDocCardShareObservation("share-requested", {
      docId,
      spaceId,
      payloadSpaceId: requestedDocCard.spaceId,
      hasExcerpt: Boolean(requestedDocCard.excerpt?.trim()),
      hasTitle: Boolean(requestedDocCard.title?.trim()),
      hasImageFileId: Boolean(requestedDocCard.imageFileId),
    });
    if (!docId) {
      appToast.error("未检测到可用文档");
      return;
    }

    const docRoomId = parseDocRoomId(docId);
    if (!docRoomId || !isSendableDocRef(docId)) {
      appToast.error("仅支持发送共享文档或我的文档");
      return;
    }

    if (!spaceId || spaceId <= 0) {
      appToast.error("未找到当前空间，无法发送文档");
      return;
    }
    const sourceSpaceId = typeof requestedDocCard.spaceId === "number" && requestedDocCard.spaceId > 0
      ? requestedDocCard.spaceId
      : spaceId;

    const isKP = isSpaceOwner;
    const isNarrator = curRoleId <= 0;

    if (isNarrator && !isKP && !notMember) {
      appToast.error("旁白仅主持可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      appToast.error("正在提交中，请稍后");
      return;
    }

    const excerpt = typeof requestedDocCard.excerpt === "string" ? requestedDocCard.excerpt.trim() : "";

    const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);
    const docCard = buildDocCardReferencePayload({
      ...requestedDocCard,
      docId,
      roomId: docRoomId,
      spaceId: sourceSpaceId,
      excerpt,
    });

    const request: ChatMessageRequest = {
      roomId,
      roleId: curRoleId,
      avatarId: resolvedAvatarId,
      content: "",
      messageType: MESSAGE_TYPE.DOC_CARD,
      extra: {
        docCard,
      } as any,
    };

    recordDocCardShareObservation("share-message-send-start", {
      docId,
      roomId,
      spaceId,
      roleId: curRoleId,
    });

    try {
      const createdDocCard = await sendMessageWithInsert(request);
      if (!createdDocCard) {
        recordDocCardShareObservation("share-message-send-failed", {
          docId,
          roomId,
          spaceId,
          roleId: curRoleId,
          error: "message-not-created",
        });
        return;
      }
      recordDocCardShareObservation("share-message-send-success", {
        docId,
        roomId,
        spaceId,
        roleId: curRoleId,
        messageId: createdDocCard.messageId,
      });
    }
    catch (error) {
      recordDocCardShareObservation("share-message-send-failed", {
        docId,
        roomId,
        spaceId,
        roleId: curRoleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }, [
    curRoleId,
    ensureRuntimeAvatarIdForRole,
    isSpaceOwner,
    isSubmitting,
    notMember,
    roomId,
    roomUiStoreApi,
    sendMessageWithInsert,
    spaceId,
  ]);

  const handleSendRoomJump = useCallback(async (payload: RoomRefDragPayload) => {
    const targetRoomId = Number(payload?.roomId);
    if (!Number.isFinite(targetRoomId) || targetRoomId <= 0) {
      appToast.error("未检测到可用群聊");
      return;
    }

    if (!spaceId || spaceId <= 0) {
      appToast.error("当前不在空间群聊，无法发送群聊跳转");
      return;
    }
    const targetSpaceId = typeof payload?.spaceId === "number" && payload.spaceId > 0
      ? payload.spaceId
      : spaceId;

    const isKP = isSpaceOwner;
    const isNarrator = curRoleId <= 0;

    if (isNarrator && !isKP && !notMember) {
      appToast.error("旁白仅主持可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      appToast.error("正在提交中，请稍后");
      return;
    }

    const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);

    const request: ChatMessageRequest = {
      roomId,
      roleId: curRoleId,
      avatarId: resolvedAvatarId,
      content: "",
      messageType: MessageType.ROOM_JUMP,
      extra: {
        roomJump: {
          spaceId: targetSpaceId,
          roomId: targetRoomId,
          ...(payload.roomName ? { roomName: payload.roomName } : {}),
          ...(payload.categoryName ? { categoryName: payload.categoryName } : {}),
        },
      } as any,
    };

    await sendMessageWithInsert(request);
  }, [
    curRoleId,
    ensureRuntimeAvatarIdForRole,
    isSpaceOwner,
    isSubmitting,
    notMember,
    roomId,
    roomUiStoreApi,
    sendMessageWithInsert,
    spaceId,
  ]);

  return {
    handleImportChatText,
    handleSendClueCard,
    handleSendDocCard,
    handleSendRoomJump,
  };
}
