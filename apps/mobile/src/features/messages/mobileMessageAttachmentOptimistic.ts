import type { MessageDraft } from "@tuanchat/domain/message-draft";
import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import type {
  MobileMessageAttachment,
  MobileMessageAttachmentKind,
} from "./mobileMessageAttachment";

import { MOBILE_MESSAGE_ATTACHMENT_KIND } from "./mobileMessageAttachment";

type SendMessageContext = {
  avatarId?: number;
  customRoleName?: string;
  replayMessageId?: number;
  roleId?: number;
};

type UploadedMobileMessageAttachments = {
  failedAttachments: Array<{ attachment: MobileMessageAttachment }>;
};

type LocalAttachmentPreviewMeta = {
  attachmentId: string;
  kind: MobileMessageAttachmentKind;
  localUri: string;
  uploadState: "uploading";
};

export type MobileAttachmentOptimisticMessage = ChatMessageResponse & {
  message: ChatMessageResponse["message"] & {
    extra: ChatMessageResponse["message"]["extra"] & {
      tcLocalAttachmentPreview?: LocalAttachmentPreviewMeta;
    };
  };
};

function buildBaseRequest(
  attachment: MobileMessageAttachment,
  roomId: number,
  context: SendMessageContext,
  content: string,
): Pick<ChatMessageRequest, "avatarId" | "content" | "customRoleName" | "extra" | "messageType" | "replayMessageId" | "roleId" | "roomId"> {
  return {
    avatarId: context.avatarId,
    content,
    customRoleName: context.customRoleName,
    extra: {
      tcLocalAttachmentPreview: {
        attachmentId: attachment.id,
        kind: attachment.kind,
        localUri: attachment.uri,
        uploadState: "uploading",
      },
    } as ChatMessageRequest["extra"],
    messageType: MESSAGE_TYPE.TEXT,
    replayMessageId: context.replayMessageId,
    roleId: context.roleId,
    roomId,
  };
}

function buildImageRequest(
  attachment: MobileMessageAttachment,
  roomId: number,
  context: SendMessageContext,
  content: string,
): ChatMessageRequest | null {
  if (attachment.kind !== MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE || !attachment.width || !attachment.height) {
    return null;
  }
  const base = buildBaseRequest(attachment, roomId, context, content);
  return {
    ...base,
    messageType: MESSAGE_TYPE.IMG,
    extra: {
      ...base.extra,
      imageMessage: {
        source: {
          kind: "external",
          url: attachment.uri,
          provider: "mobile-local",
        },
        fileName: attachment.fileName,
        width: attachment.width,
        height: attachment.height,
        size: attachment.size,
        background: false,
      },
    } as ChatMessageRequest["extra"],
  };
}

function buildVideoRequest(
  attachment: MobileMessageAttachment,
  roomId: number,
  context: SendMessageContext,
  content: string,
): ChatMessageRequest | null {
  if (attachment.kind !== MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO) {
    return null;
  }
  const base = buildBaseRequest(attachment, roomId, context, content);
  return {
    ...base,
    messageType: MESSAGE_TYPE.VIDEO,
    extra: {
      ...base.extra,
      videoMessage: {
        source: {
          kind: "external",
          url: attachment.uri,
          provider: "mobile-local",
        },
        fileName: attachment.fileName,
        size: attachment.size,
      },
    } as ChatMessageRequest["extra"],
  };
}

function buildOptimisticAttachmentRequest(
  attachment: MobileMessageAttachment,
  roomId: number,
  context: SendMessageContext,
  content: string,
): ChatMessageRequest | null {
  switch (attachment.kind) {
    case MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE:
      return buildImageRequest(attachment, roomId, context, content);
    case MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO:
      return buildVideoRequest(attachment, roomId, context, content);
    default:
      return null;
  }
}

export function buildOptimisticAttachmentRequests(
  attachments: readonly MobileMessageAttachment[],
  params: {
    context: SendMessageContext;
    inputText: string;
    roomId: number;
  },
): ChatMessageRequest[] {
  let textContent = params.inputText.trim();
  const orderedAttachments = [
    ...attachments.filter(attachment => attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE),
    ...attachments.filter(attachment => attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO),
  ];
  return orderedAttachments.flatMap((attachment) => {
    const request = buildOptimisticAttachmentRequest(
      attachment,
      params.roomId,
      params.context,
      textContent,
    );
    if (request) {
      textContent = "";
      return [request];
    }
    return [];
  });
}

function getOptimisticAttachmentId(message: ChatMessageResponse): string | null {
  const preview = (message.message.extra as { tcLocalAttachmentPreview?: LocalAttachmentPreviewMeta } | undefined)?.tcLocalAttachmentPreview;
  return typeof preview?.attachmentId === "string" ? preview.attachmentId : null;
}

export function filterOptimisticMessagesForUploadedAttachments<T extends ChatMessageResponse>(
  optimisticMessages: readonly T[],
  uploaded: UploadedMobileMessageAttachments,
): T[] {
  const failedIds = new Set(uploaded.failedAttachments.map(item => item.attachment.id));
  return optimisticMessages.filter((message) => {
    const attachmentId = getOptimisticAttachmentId(message);
    return attachmentId != null && !failedIds.has(attachmentId);
  });
}

function canDraftUseAttachmentOptimistic(draft: MessageDraft): boolean {
  return draft.messageType === MESSAGE_TYPE.IMG || draft.messageType === MESSAGE_TYPE.VIDEO;
}

export function alignOptimisticMessagesToMediaDrafts<T extends ChatMessageResponse>(
  optimisticMessages: readonly T[],
  drafts: readonly MessageDraft[],
): Array<T | undefined> {
  let nextOptimisticIndex = 0;
  return drafts.map((draft) => {
    if (!canDraftUseAttachmentOptimistic(draft)) {
      return undefined;
    }
    const optimistic = optimisticMessages[nextOptimisticIndex];
    nextOptimisticIndex += 1;
    return optimistic;
  });
}
