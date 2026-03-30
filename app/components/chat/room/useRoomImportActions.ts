import { useCallback } from "react";
import { toast } from "react-hot-toast";

import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { RoomUiStoreApi } from "@/components/chat/stores/roomUiStore";
import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import type { MaterialItemDragPayload } from "@/components/chat/utils/materialItemDrag";
import type { RoomRefDragPayload } from "@/components/chat/utils/roomRef";
import type { FigurePosition } from "@/types/voiceRenderTypes";

import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { extractDocExcerptFromStore } from "@/components/chat/infra/blocksuite/document/docExcerpt";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { IMPORT_SPECIAL_ROLE_ID } from "@/components/chat/utils/importChatText";
import { buildOutOfCharacterSpeechContent } from "@/components/chat/utils/outOfCharacterSpeech";
import UTILS from "@/components/common/dicer/utils/utils";
import { setFigurePositionAnnotation } from "@/types/messageAnnotations";
import { buildChatMessageRequestFromDraft } from "@/types/messageDraft";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageRequest, ChatMessageResponse } from "../../../../api";

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
  sendMessageBatch: (messages: ChatMessageRequest[]) => Promise<ChatMessageResponse["message"][]>;
  ensureRuntimeAvatarIdForRole: (roleId: number) => Promise<number>;
  roomUiStoreApi: RoomUiStoreApi;
};

type ImportMessageItem = {
  roleId: number;
  content: string;
  speakerName?: string;
  figurePosition?: Exclude<FigurePosition, undefined>;
};

type UseRoomImportActionsResult = {
  handleImportChatText: (messages: ImportMessageItem[], onProgress?: (sent: number, total: number) => void) => Promise<void>;
  handleSendDocCard: (payload: DocRefDragPayload) => Promise<void>;
  handleSendMaterialItem: (payload: MaterialItemDragPayload) => Promise<void>;
  handleSendRoomJump: (payload: RoomRefDragPayload) => Promise<void>;
};

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
  roomUiStoreApi,
}: UseRoomImportActionsParams): UseRoomImportActionsResult {
  const handleImportChatText = useCallback(async (
    messages: ImportMessageItem[],
    onProgress?: (sent: number, total: number) => void,
  ) => {
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
      return;
    }
    if (!messages.length) {
      toast.error("没有可导入的消息");
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
      const { threadRootMessageId, composerTarget } = roomUiStoreApi.getState();
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

      const ensureDicerSender = async () => {
        if (dicerRoleId != null && dicerAvatarId != null) {
          return;
        }
        const resolvedDicerRoleId = await UTILS.getDicerRoleId(roomContext);
        dicerRoleId = resolvedDicerRoleId;
        const ensured = await ensureAvatarIdForRole(resolvedDicerRoleId);
        dicerAvatarId = ensured > 0 ? ensured : 0;
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

      if (!isSpectator && messages.some(m => m.roleId === IMPORT_SPECIAL_ROLE_ID.DICER)) {
        await ensureDicerSender();
      }

      const total = messages.length;
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        let roleId = msg.roleId;
        let avatarId = -1;
        let messageType = MessageType.TEXT;
        let extra: Record<string, unknown> = {};
        const figurePosition = msg.figurePosition;

        if (isSpectator) {
          roleId = -1;
        }
        else if (roleId === IMPORT_SPECIAL_ROLE_ID.DICER) {
          await ensureDicerSender();
          roleId = dicerRoleId ?? roleId;
          avatarId = dicerAvatarId ?? 0;
          messageType = MessageType.DICE;
          extra = { result: msg.content };
        }
        else {
          avatarId = roleId <= 0 ? -1 : await ensureAvatarIdForRole(roleId);
        }

        const request: ChatMessageRequest = {
          roomId,
          roleId,
          avatarId,
          content: isSpectator
            ? (buildOutOfCharacterSpeechContent(msg.content) ?? "")
            : msg.content,
          messageType,
          extra,
        };

        if (composerTarget === "thread" && threadRootMessageId) {
          request.threadId = threadRootMessageId;
        }

        if (!isSpectator) {
          const importedSpeakerName = (msg.speakerName ?? "").trim();
          if (importedSpeakerName) {
            request.customRoleName = importedSpeakerName;
          }
          else {
            const draftCustomRoleName = draftCustomRoleNameMap[roleId];
            if (draftCustomRoleName?.trim()) {
              request.customRoleName = draftCustomRoleName.trim();
            }
          }
        }

        if (!isSpectator && messageType === MessageType.TEXT && roleId > 0 && figurePosition) {
          request.annotations = setFigurePositionAnnotation(request.annotations, figurePosition);
        }

        const createdMessage = await sendMessageWithInsert(request);
        if (!createdMessage) {
          break;
        }
        onProgress?.(i + 1, total);

        if (total >= 30) {
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
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
    roomContext,
    roomId,
    roomUiStoreApi,
    sendMessageWithInsert,
    setIsSubmitting,
  ]);

  const handleSendDocCard = useCallback(async (payload: DocRefDragPayload) => {
    const docId = String(payload?.docId ?? "").trim();
    if (!docId) {
      toast.error("未检测到可用文档");
      return;
    }

    if (!parseDescriptionDocId(docId)) {
      toast.error("仅支持发送空间文档（我的文档/描述文档）");
      return;
    }

    if (!spaceId || spaceId <= 0) {
      toast.error("未找到当前空间，无法发送文档");
      return;
    }

    if (payload?.spaceId && payload.spaceId !== spaceId) {
      toast.error("仅支持在同一空间分享文档");
      return;
    }

    const isKP = isSpaceOwner;
    const isNarrator = curRoleId <= 0;

    if (isNarrator && !isKP && !notMember) {
      toast.error("旁白仅主持可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
      return;
    }

    let excerpt = typeof payload?.excerpt === "string" ? payload.excerpt.trim() : "";
    if (!excerpt) {
      try {
        const { getOrCreateSpaceDoc } = await import("@/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry");

        const store = getOrCreateSpaceDoc({ spaceId, docId }) as any;
        try {
          store?.load?.();
        }
        catch {
          // ignore
        }

        excerpt = extractDocExcerptFromStore(store, { maxChars: 220 });
      }
      catch {
        // ignore
      }
    }

    const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);

    const request: ChatMessageRequest = {
      roomId,
      roleId: curRoleId,
      avatarId: resolvedAvatarId,
      content: "",
      messageType: MESSAGE_TYPE.DOC_CARD,
      extra: {
        docCard: {
          docId,
          spaceId,
          ...(payload?.title ? { title: payload.title } : {}),
          ...(payload?.imageUrl ? { imageUrl: payload.imageUrl } : {}),
          ...(excerpt ? { excerpt } : {}),
        },
      } as any,
    };

    const { threadRootMessageId, composerTarget } = roomUiStoreApi.getState();
    if (composerTarget === "thread" && threadRootMessageId) {
      request.threadId = threadRootMessageId;
    }

    const createdDocCard = await sendMessageWithInsert(request);
    if (!createdDocCard) {
      return;
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

  const handleSendMaterialItem = useCallback(async (payload: MaterialItemDragPayload) => {
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    if (messages.length === 0) {
      toast.error("当前素材条目没有可发送的消息");
      return;
    }
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
      return;
    }

    const ui = roomUiStoreApi.getState();
    const prevInsertAfter = ui.insertAfterMessageId;
    const prevReply = ui.replyMessage;
    ui.setInsertAfterMessageId(undefined);
    ui.setReplyMessage(undefined);

    setIsSubmitting(true);
    try {
      const { threadRootMessageId, composerTarget } = roomUiStoreApi.getState();
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

      const uniqueRoleIds = Array.from(new Set(
        messages
          .map(message => Number(message.roleId))
          .filter(roleId => Number.isFinite(roleId) && roleId > 0),
      ));
      for (const roleId of uniqueRoleIds) {
        await ensureAvatarIdForRole(roleId);
      }

      const requests: ChatMessageRequest[] = [];
      for (const materialMessage of messages) {
        const explicitRoleId = Number(materialMessage.roleId);
        const hasExplicitNarratorRoleId = Number.isFinite(explicitRoleId) && explicitRoleId < 0;
        const hasExplicitPositiveRoleId = Number.isFinite(explicitRoleId) && explicitRoleId > 0;
        const roleId = notMember
          ? -1
          : ((hasExplicitPositiveRoleId || hasExplicitNarratorRoleId) ? explicitRoleId : curRoleId);
        const avatarId = roleId > 0
          ? (typeof materialMessage.avatarId === "number" && materialMessage.avatarId > 0
              ? materialMessage.avatarId
              : await ensureAvatarIdForRole(roleId))
          : -1;

        if (roleId <= 0 && !isSpaceOwner && !notMember) {
          toast.error("旁白仅主持可用，请先选择/拉入你的角色");
          return;
        }

        const customRoleName = typeof materialMessage.customRoleName === "string"
          ? materialMessage.customRoleName.trim()
          : "";
        const fallbackCustomRoleName = roleId > 0
          ? draftCustomRoleNameMap[roleId]?.trim()
          : undefined;
        const request = buildChatMessageRequestFromDraft(materialMessage, {
          roomId,
          roleId,
          avatarId,
          customRoleName: customRoleName || fallbackCustomRoleName,
        });

        if (composerTarget === "thread" && threadRootMessageId) {
          request.threadId = threadRootMessageId;
        }
        requests.push(request);
      }

      const createdMessages = await sendMessageBatch(requests);
      if (createdMessages.length !== requests.length) {
        return;
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "发送素材失败";
      toast.error(message);
    }
    finally {
      roomUiStoreApi.getState().setInsertAfterMessageId(prevInsertAfter);
      roomUiStoreApi.getState().setReplyMessage(prevReply);
      setIsSubmitting(false);
    }
  }, [
    curRoleId,
    ensureRuntimeAvatarIdForRole,
    isSpaceOwner,
    isSubmitting,
    notMember,
    roomId,
    roomUiStoreApi,
    sendMessageBatch,
    setIsSubmitting,
  ]);

  const handleSendRoomJump = useCallback(async (payload: RoomRefDragPayload) => {
    const targetRoomId = Number(payload?.roomId);
    if (!Number.isFinite(targetRoomId) || targetRoomId <= 0) {
      toast.error("未检测到可用群聊");
      return;
    }

    if (!spaceId || spaceId <= 0) {
      toast.error("当前不在空间群聊，无法发送群聊跳转");
      return;
    }

    if (payload?.spaceId && payload.spaceId !== spaceId) {
      toast.error("仅支持在同一空间引用群聊");
      return;
    }

    const isKP = isSpaceOwner;
    const isNarrator = curRoleId <= 0;

    if (isNarrator && !isKP && !notMember) {
      toast.error("旁白仅主持可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
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
          spaceId,
          roomId: targetRoomId,
          ...(payload.roomName ? { roomName: payload.roomName } : {}),
          ...(payload.categoryName ? { categoryName: payload.categoryName } : {}),
        },
      } as any,
    };

    const { threadRootMessageId, composerTarget } = roomUiStoreApi.getState();
    if (composerTarget === "thread" && threadRootMessageId) {
      request.threadId = threadRootMessageId;
    }

    const createdRoomJump = await sendMessageWithInsert(request);
    if (!createdRoomJump) {
      return;
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

  return {
    handleImportChatText,
    handleSendDocCard,
    handleSendMaterialItem,
    handleSendRoomJump,
  };
}
