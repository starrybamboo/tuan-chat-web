import { useCallback } from "react";
import { toast } from "react-hot-toast";

import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { DocRefDragPayload } from "@/components/chat/utils/docRef";

import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { extractDocExcerptFromStore } from "@/components/chat/infra/blocksuite/docExcerpt";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { IMPORT_SPECIAL_ROLE_ID } from "@/components/chat/utils/importChatText";
import UTILS from "@/components/common/dicer/utils/utils";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageRequest } from "../../../../api";

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
  sendMessageWithInsert: (message: ChatMessageRequest) => Promise<void>;
  ensureRuntimeAvatarIdForRole: (roleId: number) => Promise<number>;
};

type ImportMessageItem = {
  roleId: number;
  content: string;
  speakerName?: string;
  figurePosition?: "left" | "center" | "right";
};

type UseRoomImportActionsResult = {
  handleImportChatText: (messages: ImportMessageItem[], onProgress?: (sent: number, total: number) => void) => Promise<void>;
  handleSendDocCard: (payload: DocRefDragPayload) => Promise<void>;
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
  ensureRuntimeAvatarIdForRole,
}: UseRoomImportActionsParams): UseRoomImportActionsResult {
  const handleImportChatText = useCallback(async (
    messages: ImportMessageItem[],
    onProgress?: (sent: number, total: number) => void,
  ) => {
    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
      return;
    }
    if (!messages.length) {
      toast.error("没有可导入的消息");
      return;
    }

    const ui = useRoomUiStore.getState();
    const prevInsertAfter = ui.insertAfterMessageId;
    const prevReply = ui.replyMessage;

    ui.setInsertAfterMessageId(undefined);
    ui.setReplyMessage(undefined);

    setIsSubmitting(true);
    try {
      const { threadRootMessageId, composerTarget } = useRoomUiStore.getState();
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

      const uniqueRoleIds = Array.from(new Set(
        messages
          .map(m => m.roleId)
          .filter(roleId => roleId > 0),
      ));
      for (const roleId of uniqueRoleIds) {
        await ensureAvatarIdForRole(roleId);
      }

      if (messages.some(m => m.roleId === IMPORT_SPECIAL_ROLE_ID.DICER)) {
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

        if (roleId === IMPORT_SPECIAL_ROLE_ID.DICER) {
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
          content: msg.content,
          messageType,
          extra,
        };

        if (composerTarget === "thread" && threadRootMessageId) {
          request.threadId = threadRootMessageId;
        }

        const importedSpeakerName = (msg.speakerName ?? "").trim();
        if (importedSpeakerName) {
          request.webgal = {
            ...(request.webgal as any),
            customRoleName: importedSpeakerName,
          } as any;
        }
        else {
          const draftCustomRoleName = draftCustomRoleNameMap[roleId];
          if (draftCustomRoleName?.trim()) {
            request.webgal = {
              ...(request.webgal as any),
              customRoleName: draftCustomRoleName.trim(),
            } as any;
          }
        }

        if (messageType === MessageType.TEXT && roleId > 0 && figurePosition) {
          request.webgal = {
            ...(request.webgal as any),
            voiceRenderSettings: {
              ...((request.webgal as any)?.voiceRenderSettings ?? {}),
              figurePosition,
            },
          } as any;
        }

        await sendMessageWithInsert(request);
        onProgress?.(i + 1, total);

        if (total >= 30) {
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }
    }
    finally {
      useRoomUiStore.getState().setInsertAfterMessageId(prevInsertAfter);
      useRoomUiStore.getState().setReplyMessage(prevReply);
      setIsSubmitting(false);
    }
  }, [
    ensureRuntimeAvatarIdForRole,
    isSubmitting,
    notMember,
    roomContext,
    roomId,
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

    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isNarrator && !isKP) {
      toast.error("旁白仅KP可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
      return;
    }

    let excerpt = typeof payload?.excerpt === "string" ? payload.excerpt.trim() : "";
    if (!excerpt) {
      try {
        const { getOrCreateSpaceDoc } = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");

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

    const { threadRootMessageId, composerTarget } = useRoomUiStore.getState();
    if (composerTarget === "thread" && threadRootMessageId) {
      request.threadId = threadRootMessageId;
    }

    await sendMessageWithInsert(request);
  }, [
    curRoleId,
    ensureRuntimeAvatarIdForRole,
    isSpaceOwner,
    isSubmitting,
    notMember,
    roomId,
    sendMessageWithInsert,
    spaceId,
  ]);

  return {
    handleImportChatText,
    handleSendDocCard,
  };
}
