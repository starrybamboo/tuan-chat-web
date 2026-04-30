import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import type { GalMessageView, GalPatchProposal } from "./authoringTypes";

export type GalProposalMessagePreview = {
  messages: ChatMessageResponse[];
  baseMessageByPreviewId: Map<number, ChatMessageResponse>;
};

function toNumberId(value: string | undefined, fallback: number) {
  if (!value || value === "narrator") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPreviewMessageId(messageId: string, fallbackIndex: number) {
  if (messageId.startsWith("new:")) {
    const suffix = Number(messageId.slice("new:".length));
    return Number.isFinite(suffix) ? -100_000 - suffix : -100_000 - fallbackIndex;
  }
  return toNumberId(messageId, -100_000 - fallbackIndex);
}

function toMessageFromView(view: GalMessageView, fallbackIndex: number, base?: Message): Message {
  const messageId = getPreviewMessageId(view.messageId, fallbackIndex);
  return {
    messageId,
    syncId: base?.syncId ?? messageId,
    roomId: toNumberId(view.roomId, base?.roomId ?? 0),
    userId: base?.userId ?? 0,
    roleId: view.roleId === "narrator" ? 0 : toNumberId(view.roleId, base?.roleId ?? 0),
    content: view.content,
    customRoleName: view.customRoleName,
    annotations: view.annotations,
    avatarId: view.avatarId ? toNumberId(view.avatarId, base?.avatarId ?? 0) : undefined,
    webgal: view.webgal,
    status: base?.status ?? 0,
    messageType: view.messageType,
    threadId: base?.threadId,
    position: view.position,
    extra: view.extra as Message["extra"],
    inheritedArchiveMessageId: base?.inheritedArchiveMessageId,
    versionState: base?.versionState,
    createTime: base?.createTime,
    updateTime: base?.updateTime,
  };
}

function toResponse(message: Message): ChatMessageResponse {
  return { message };
}

function hasTextChange(base: GalMessageView | undefined, projected: GalMessageView | undefined) {
  return (base?.content ?? "") !== (projected?.content ?? "");
}

function currentTextDiffersFromBase(current: Message | undefined, base: GalMessageView | undefined) {
  if (!current || !base) {
    return false;
  }
  return (current.content ?? "") !== (base.content ?? "");
}

export function buildGalProposalMessagePreview(params: {
  historyMessages: ChatMessageResponse[];
  proposal: GalPatchProposal | null | undefined;
}): GalProposalMessagePreview | null {
  const proposal = params.proposal;
  if (!proposal || proposal.status !== "draft" || proposal.validationErrors.length > 0) {
    return null;
  }

  const originalById = new Map(params.historyMessages.map(response => [String(response.message.messageId), response]));
  const baseById = new Map(proposal.baseSnapshot.map(message => [message.messageId, message]));
  const projectedById = new Map(proposal.projectedSnapshot.map(message => [message.messageId, message]));
  const baseMessageByPreviewId = new Map<number, ChatMessageResponse>();

  const projectedResponses = proposal.projectedSnapshot.map((projected, index) => {
    const original = originalById.get(projected.messageId)?.message;
    const response = toResponse(toMessageFromView(projected, index, original));
    const base = baseById.get(projected.messageId);
    if (!base) {
      baseMessageByPreviewId.set(response.message.messageId, toResponse({
        ...response.message,
        content: "",
      }));
    }
    else if (hasTextChange(base, projected)) {
      baseMessageByPreviewId.set(
        response.message.messageId,
        original && currentTextDiffersFromBase(original, base)
          ? toResponse(original)
          : toResponse(toMessageFromView(base, index, original)),
      );
    }
    return response;
  });

  const deletedResponses = proposal.baseSnapshot
    .filter(base => !projectedById.has(base.messageId))
    .map((base, index) => {
      const original = originalById.get(base.messageId)?.message;
      const beforeMessage = original ?? toMessageFromView(base, proposal.projectedSnapshot.length + index, original);
      const deletedPreview = toResponse({
        ...beforeMessage,
        content: "",
      });
      baseMessageByPreviewId.set(
        deletedPreview.message.messageId,
        toResponse(beforeMessage),
      );
      return deletedPreview;
    });

  return {
    messages: [...projectedResponses, ...deletedResponses]
      .sort((a, b) => {
        if (a.message.position !== b.message.position) {
          return a.message.position - b.message.position;
        }
        return a.message.messageId - b.message.messageId;
      }),
    baseMessageByPreviewId,
  };
}
