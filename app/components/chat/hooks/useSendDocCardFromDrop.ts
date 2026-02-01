import { useCallback } from "react";
import toast from "react-hot-toast";

import type { DocRefDragPayload } from "@/components/chat/utils/docRef";

import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageRequest } from "../../../api";

type UseSendDocCardFromDropParams = {
  roomId: number;
  spaceId: number;
  curRoleId: number;
  curAvatarId: number;
  curMemberType?: number;
  isSpaceOwner: boolean;
  onSendDocCard?: (payload: DocRefDragPayload) => Promise<void> | void;
  send: (message: ChatMessageRequest) => void;
};

export default function useSendDocCardFromDrop({
  roomId,
  spaceId,
  curRoleId,
  curAvatarId,
  curMemberType,
  isSpaceOwner,
  onSendDocCard,
  send,
}: UseSendDocCardFromDropParams) {
  return useCallback(async (payload: DocRefDragPayload) => {
    if (onSendDocCard) {
      try {
        await onSendDocCard(payload);
      }
      catch {
        toast.error("发送文档失败");
      }
      return;
    }

    const docId = String(payload?.docId ?? "").trim();
    if (!docId) {
      toast.error("未检测到可用文档");
      return;
    }

    if (!parseDescriptionDocId(docId)) {
      toast.error("仅支持发送空间文档（我的文档/描述文档）");
      return;
    }

    if (payload?.spaceId && payload.spaceId !== spaceId) {
      toast.error("仅支持在同一空间分享文档");
      return;
    }

    const notMember = (curMemberType ?? 3) >= 3;
    const isNarrator = curRoleId <= 0;

    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isNarrator && !isSpaceOwner) {
      toast.error("旁白仅KP可用，请先选择/拉入你的角色");
      return;
    }

    const request: ChatMessageRequest = {
      roomId,
      roleId: curRoleId,
      avatarId: curAvatarId,
      content: "",
      messageType: MESSAGE_TYPE.DOC_CARD,
      extra: {
        docCard: {
          docId,
          ...(spaceId > 0 ? { spaceId } : {}),
          ...(payload?.title ? { title: payload.title } : {}),
          ...(payload?.imageUrl ? { imageUrl: payload.imageUrl } : {}),
        },
      } as any,
    };

    const { threadRootMessageId, composerTarget } = useRoomUiStore.getState();
    if (composerTarget === "thread" && threadRootMessageId) {
      request.threadId = threadRootMessageId;
    }

    send(request);
  }, [curAvatarId, curMemberType, curRoleId, isSpaceOwner, onSendDocCard, roomId, send, spaceId]);
}
