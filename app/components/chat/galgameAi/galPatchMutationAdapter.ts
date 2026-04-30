import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";

import type { GalMessageView, GalPatchProposal } from "./authoringTypes";

type GalPatchMutableField
  = | "messageType"
    | "roleId"
    | "customRoleName"
    | "avatarId"
    | "content"
    | "annotations"
    | "webgal"
    | "position"
    | "extra";

export type GalPatchMutationPlan = {
  insertMessages: ChatMessageRequest[];
  updateMessages: Message[];
  deleteMessageIds: number[];
};

const MUTABLE_FIELDS: GalPatchMutableField[] = [
  "messageType",
  "roleId",
  "customRoleName",
  "avatarId",
  "content",
  "annotations",
  "webgal",
  "position",
  "extra",
];

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

function applyProjectedField(message: Message, projected: GalMessageView, field: GalPatchMutableField): Message {
  switch (field) {
    case "messageType":
      return { ...message, messageType: projected.messageType };
    case "roleId":
      return { ...message, roleId: toNumberId(projected.roleId) };
    case "customRoleName":
      return { ...message, customRoleName: projected.customRoleName };
    case "avatarId":
      return { ...message, avatarId: toOptionalNumberId(projected.avatarId) };
    case "content":
      return { ...message, content: projected.content };
    case "annotations":
      return { ...message, annotations: projected.annotations };
    case "webgal":
      return { ...message, webgal: projected.webgal };
    case "position":
      return { ...message, position: projected.position };
    case "extra":
      return { ...message, extra: projected.extra as Message["extra"] };
  }
}

function mergeUpdateMessage(original: Message, projected: GalMessageView, fields: GalPatchMutableField[]): Message {
  return fields.reduce((message, field) => applyProjectedField(message, projected, field), original);
}

function stableStringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

function getFieldValue(message: GalMessageView, field: GalPatchMutableField) {
  return message[field];
}

function isFieldEqual(left: GalMessageView, right: GalMessageView, field: GalPatchMutableField) {
  return stableStringify(getFieldValue(left, field)) === stableStringify(getFieldValue(right, field));
}

function getProjectedChangedFields(base: GalMessageView, projected: GalMessageView): GalPatchMutableField[] {
  return MUTABLE_FIELDS.filter(field => !isFieldEqual(base, projected, field));
}

export function buildGalPatchMutationPlan(params: {
  proposal: GalPatchProposal;
  currentMessages: Message[];
}): GalPatchMutationPlan {
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
    const base = baseById.get(projected.messageId);
    if (!base) {
      continue;
    }
    const changedFields = getProjectedChangedFields(base, projected);
    if (changedFields.length === 0) {
      continue;
    }
    const original = originalById.get(projected.messageId);
    if (original) {
      updateMessages.push(mergeUpdateMessage(original, projected, changedFields));
    }
  }

  for (const base of params.proposal.baseSnapshot) {
    if (!projectedById.has(base.messageId)) {
      const id = Number(base.messageId);
      if (Number.isFinite(id) && originalById.has(base.messageId)) {
        deleteMessageIds.push(id);
      }
    }
  }

  return {
    insertMessages,
    updateMessages,
    deleteMessageIds,
  };
}
