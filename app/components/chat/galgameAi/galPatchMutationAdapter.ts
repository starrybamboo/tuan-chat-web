import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import type { GalMessageView, GalPatchProposal } from "./authoringTypes";

import { buildGalDocumentFingerprint, projectGalMessages } from "./authoringProjection";

export type GalPatchMutationPlan = {
  conflict: boolean;
  conflictReason?: string;
  insertMessages: ChatMessageRequest[];
  updateMessages: Message[];
  deleteMessageIds: number[];
};

function toNumberId(value: string | undefined) {
  if (!value || value === "narrator") {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumberId(value: string | undefined) {
  if (!value || value === "narrator") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function toInsertRequest(message: GalMessageView): ChatMessageRequest {
  return {
    roomId: Number(message.roomId),
    messageType: message.messageType,
    roleId: toNumberId(message.roleId),
    ...(toOptionalNumberId(message.avatarId) ? { avatarId: toOptionalNumberId(message.avatarId) } : {}),
    content: message.content,
    annotations: message.annotations,
    ...(message.customRoleName ? { customRoleName: message.customRoleName } : {}),
    ...(message.webgal ? { webgal: message.webgal } : {}),
    position: message.position,
    extra: message.extra ?? {},
  };
}

function mergeUpdateMessage(original: Message, projected: GalMessageView): Message {
  return {
    ...original,
    messageType: projected.messageType,
    roleId: toNumberId(projected.roleId),
    avatarId: toOptionalNumberId(projected.avatarId),
    content: projected.content,
    customRoleName: projected.customRoleName,
    annotations: projected.annotations,
    webgal: projected.webgal,
    position: projected.position,
    extra: projected.extra as Message["extra"],
  };
}

function hasProjectedChange(base: GalMessageView | undefined, projected: GalMessageView) {
  if (!base) {
    return false;
  }
  return JSON.stringify({
    messageType: base.messageType,
    roleId: base.roleId,
    customRoleName: base.customRoleName,
    avatarId: base.avatarId,
    content: base.content,
    annotations: base.annotations,
    webgal: base.webgal,
    position: base.position,
    extra: base.extra,
  }) !== JSON.stringify({
    messageType: projected.messageType,
    roleId: projected.roleId,
    customRoleName: projected.customRoleName,
    avatarId: projected.avatarId,
    content: projected.content,
    annotations: projected.annotations,
    webgal: projected.webgal,
    position: projected.position,
    extra: projected.extra,
  });
}

export function buildGalPatchMutationPlan(params: {
  proposal: GalPatchProposal;
  currentMessages: Message[];
}): GalPatchMutationPlan {
  const currentSnapshot = projectGalMessages(params.currentMessages, []);
  const currentFingerprint = buildGalDocumentFingerprint(currentSnapshot);
  if (currentFingerprint.signature !== params.proposal.baseFingerprint.signature) {
    return {
      conflict: true,
      conflictReason: "当前房间消息已变化，需要重新生成或 rebase proposal",
      insertMessages: [],
      updateMessages: [],
      deleteMessageIds: [],
    };
  }

  const baseById = new Map(params.proposal.baseSnapshot.map(message => [message.messageId, message]));
  const projectedById = new Map(params.proposal.projectedSnapshot.map(message => [message.messageId, message]));
  const originalById = new Map(params.currentMessages.map(message => [String(message.messageId), message]));
  const insertMessages: ChatMessageRequest[] = [];
  const updateMessages: Message[] = [];
  const deleteMessageIds: number[] = [];

  for (const projected of params.proposal.projectedSnapshot) {
    if (!baseById.has(projected.messageId)) {
      insertMessages.push(toInsertRequest(projected));
      continue;
    }
    if (!hasProjectedChange(baseById.get(projected.messageId), projected)) {
      continue;
    }
    const original = originalById.get(projected.messageId);
    if (original) {
      updateMessages.push(mergeUpdateMessage(original, projected));
    }
  }

  for (const base of params.proposal.baseSnapshot) {
    if (!projectedById.has(base.messageId)) {
      const id = Number(base.messageId);
      if (Number.isFinite(id)) {
        deleteMessageIds.push(id);
      }
    }
  }

  return {
    conflict: false,
    insertMessages,
    updateMessages,
    deleteMessageIds,
  };
}
