import type { GalDocumentFingerprint, GalMessageView, GalPatchMessageInput, GalPatchProposal, GalPatchValidationContext, GalPatchValidationError, GalStoryDiff, GalStoryPatch, GalStoryPatchOperation } from "./authoringTypes";

import { buildGalDocumentFingerprint, GAL_NARRATOR } from "./authoringProjection";

type SnapshotIndex = {
  byId: Map<string, GalMessageView>;
  ordered: GalMessageView[];
};

const CONTENT_FIELDS = new Set(["content"]);
const METADATA_FIELDS = new Set(["messageType", "purpose", "roleId", "customRoleName", "avatarId", "annotations", "webgal", "extra"]);

function indexSnapshot(messages: GalMessageView[]): SnapshotIndex {
  return {
    byId: new Map(messages.map(message => [message.messageId, message])),
    ordered: [...messages].sort((a, b) => a.position - b.position),
  };
}

function cloneMessage(message: GalMessageView): GalMessageView {
  return {
    ...message,
    annotations: [...message.annotations],
    ...(message.webgal ? { webgal: { ...message.webgal } } : {}),
    ...(message.extra ? { extra: { ...message.extra } } : {}),
  };
}

function normalizeRoleId(roleId: string | undefined) {
  return roleId === "0" ? GAL_NARRATOR.roleId : roleId;
}

function hasRole(context: GalPatchValidationContext, roleId: string | undefined) {
  const normalizedRoleId = normalizeRoleId(roleId);
  if (!normalizedRoleId || normalizedRoleId === context.narrator.roleId) {
    return true;
  }
  return context.roles.some(role => role.roleId === normalizedRoleId);
}

function getRole(context: GalPatchValidationContext, roleId: string | undefined) {
  const normalizedRoleId = normalizeRoleId(roleId);
  return context.roles.find(role => role.roleId === normalizedRoleId);
}

function hasAvatar(context: GalPatchValidationContext, roleId: string | undefined, avatarId: string | undefined) {
  if (!avatarId) {
    return true;
  }
  const normalizedRoleId = normalizeRoleId(roleId);
  if (!normalizedRoleId || normalizedRoleId === context.narrator.roleId) {
    return false;
  }
  const role = getRole(context, normalizedRoleId);
  return role?.avatarId === avatarId || role?.avatarVariants.some(avatar => avatar.avatarId === avatarId) === true;
}

function validateAnnotations(context: GalPatchValidationContext, annotations: string[], operationIndex: number): GalPatchValidationError[] {
  const knownIds = new Set(context.annotations.map(annotation => annotation.id));
  return annotations
    .filter(id => !knownIds.has(id))
    .map(id => ({
      code: "unknown_annotation",
      message: `annotation 不存在: ${id}`,
      operationIndex,
    }));
}

function validatePatchMessageInput(
  input: GalPatchMessageInput,
  context: GalPatchValidationContext,
  operationIndex: number,
): GalPatchValidationError[] {
  const errors: GalPatchValidationError[] = [];
  const roleId = normalizeRoleId(input.roleId);
  if (!hasRole(context, roleId)) {
    errors.push({
      code: "unknown_role",
      message: `角色不属于当前房间: ${input.roleId}`,
      operationIndex,
    });
  }
  if (!hasAvatar(context, roleId, input.avatarId)) {
    errors.push({
      code: "unknown_avatar",
      message: `avatarId 不属于该角色: ${input.avatarId}`,
      operationIndex,
    });
  }
  if (input.annotations) {
    errors.push(...validateAnnotations(context, input.annotations, operationIndex));
  }
  return errors;
}

function validateOperation(
  operation: GalStoryPatchOperation,
  index: number,
  snapshot: SnapshotIndex,
  context: GalPatchValidationContext,
): GalPatchValidationError[] {
  const errors: GalPatchValidationError[] = [];
  const assertMessageExists = (messageId: string | undefined, fieldLabel: string) => {
    if (!messageId || !snapshot.byId.has(messageId)) {
      errors.push({
        code: "message_not_found",
        message: `${fieldLabel} 不存在或不属于当前房间: ${messageId ?? ""}`,
        operationIndex: index,
        messageId,
      });
    }
  };

  switch (operation.op) {
    case "replace_content":
    case "delete":
    case "update_annotations":
    case "update_role":
    case "update_avatar":
    case "replace_message":
      assertMessageExists(operation.messageId, "messageId");
      break;
    case "insert_before":
      assertMessageExists(operation.beforeMessageId, "beforeMessageId");
      break;
    case "insert_after":
      assertMessageExists(operation.afterMessageId, "afterMessageId");
      break;
    case "move":
      assertMessageExists(operation.messageId, "messageId");
      if (operation.beforeMessageId) {
        assertMessageExists(operation.beforeMessageId, "beforeMessageId");
      }
      if (operation.afterMessageId) {
        assertMessageExists(operation.afterMessageId, "afterMessageId");
      }
      if (!operation.beforeMessageId && !operation.afterMessageId) {
        errors.push({
          code: "missing_move_anchor",
          message: "move 必须提供 beforeMessageId 或 afterMessageId",
          operationIndex: index,
          messageId: operation.messageId,
        });
      }
      break;
  }

  if (operation.op === "insert_before" || operation.op === "insert_after" || operation.op === "replace_message") {
    errors.push(...validatePatchMessageInput(operation.message, context, index));
  }
  if (operation.op === "update_annotations") {
    errors.push(...validateAnnotations(context, operation.annotations, index));
  }
  if (operation.op === "update_role") {
    const current = snapshot.byId.get(operation.messageId);
    const roleId = normalizeRoleId(operation.roleId);
    if (!hasRole(context, roleId)) {
      errors.push({
        code: "unknown_role",
        message: `角色不属于当前房间: ${operation.roleId}`,
        operationIndex: index,
        messageId: operation.messageId,
      });
    }
    if (current?.avatarId && !hasAvatar(context, roleId, current.avatarId)) {
      errors.push({
        code: "avatar_role_mismatch",
        message: `当前 avatarId 不属于目标角色: ${current.avatarId}`,
        operationIndex: index,
        messageId: operation.messageId,
      });
    }
  }
  if (operation.op === "update_avatar") {
    const current = snapshot.byId.get(operation.messageId);
    if (!hasAvatar(context, current?.roleId, operation.avatarId)) {
      errors.push({
        code: "unknown_avatar",
        message: `avatarId 不属于该角色: ${operation.avatarId}`,
        operationIndex: index,
        messageId: operation.messageId,
      });
    }
  }

  return errors;
}

export function validateGalStoryPatch(
  baseSnapshot: GalMessageView[],
  patch: GalStoryPatch,
  context: GalPatchValidationContext,
): GalPatchValidationError[] {
  const snapshot = indexSnapshot(baseSnapshot);
  return patch.operations.flatMap((operation, index) => validateOperation(operation, index, snapshot, context));
}

function buildMessageFromInput(
  input: GalPatchMessageInput,
  params: {
    messageId: string;
    roomId: string;
    position: number;
  },
): GalMessageView {
  const roleId = normalizeRoleId(input.roleId);
  return {
    messageId: params.messageId,
    position: params.position,
    roomId: params.roomId,
    messageType: input.messageType,
    purpose: input.purpose ?? "unknown",
    ...(roleId ? { roleId } : {}),
    ...(input.customRoleName ? { customRoleName: input.customRoleName } : {}),
    ...(input.avatarId ? { avatarId: input.avatarId } : {}),
    content: input.content ?? "",
    annotations: input.annotations ?? [],
    ...(input.webgal ? { webgal: { ...input.webgal } } : {}),
    ...(input.extra ? { extra: { ...input.extra } } : {}),
  };
}

function getInsertPosition(ordered: GalMessageView[], anchorId: string, side: "before" | "after") {
  const index = ordered.findIndex(message => message.messageId === anchorId);
  const anchor = ordered[index];
  if (!anchor) {
    return 0;
  }
  if (side === "before") {
    const previous = ordered[index - 1];
    return previous ? (previous.position + anchor.position) / 2 : anchor.position - 1;
  }
  const next = ordered[index + 1];
  return next ? (anchor.position + next.position) / 2 : anchor.position + 1;
}

function applyOperation(messages: GalMessageView[], operation: GalStoryPatchOperation, index: number, roomId: string) {
  const ordered = [...messages].sort((a, b) => a.position - b.position);
  switch (operation.op) {
    case "replace_content":
      return messages.map(message => message.messageId === operation.messageId ? { ...message, content: operation.content } : message);
    case "insert_before": {
      const position = getInsertPosition(ordered, operation.beforeMessageId, "before");
      return [...messages, buildMessageFromInput(operation.message, {
        messageId: `new:${index}`,
        roomId,
        position,
      })];
    }
    case "insert_after": {
      const position = getInsertPosition(ordered, operation.afterMessageId, "after");
      return [...messages, buildMessageFromInput(operation.message, {
        messageId: `new:${index}`,
        roomId,
        position,
      })];
    }
    case "delete":
      return messages.filter(message => message.messageId !== operation.messageId);
    case "move": {
      const anchorId = operation.beforeMessageId ?? operation.afterMessageId;
      const side = operation.beforeMessageId ? "before" : "after";
      if (!anchorId) {
        return messages;
      }
      const moving = messages.find(message => message.messageId === operation.messageId);
      const withoutMoving = messages.filter(message => message.messageId !== operation.messageId);
      if (!moving) {
        return messages;
      }
      const position = getInsertPosition(withoutMoving.sort((a, b) => a.position - b.position), anchorId, side);
      return [...withoutMoving, { ...moving, position }];
    }
    case "update_annotations":
      return messages.map(message => message.messageId === operation.messageId ? { ...message, annotations: [...operation.annotations] } : message);
    case "update_role": {
      const roleId = normalizeRoleId(operation.roleId);
      return messages.map(message => message.messageId === operation.messageId
        ? {
            ...message,
            roleId,
            ...(operation.customRoleName ? { customRoleName: operation.customRoleName } : { customRoleName: undefined }),
          }
        : message);
    }
    case "update_avatar":
      return messages.map(message => message.messageId === operation.messageId ? { ...message, avatarId: operation.avatarId } : message);
    case "replace_message":
      return messages.map(message => message.messageId === operation.messageId
        ? buildMessageFromInput(operation.message, {
            messageId: message.messageId,
            roomId: message.roomId,
            position: message.position,
          })
        : message);
  }
}

function stableStringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

function changedFields(before: GalMessageView, after: GalMessageView) {
  const fields: string[] = [];
  const keys: Array<keyof GalMessageView> = ["messageType", "purpose", "roleId", "customRoleName", "avatarId", "content", "annotations", "webgal", "extra"];
  for (const key of keys) {
    if (stableStringify(before[key]) !== stableStringify(after[key])) {
      fields.push(key);
    }
  }
  return fields;
}

export function buildGalStoryDiff(baseSnapshot: GalMessageView[], projectedSnapshot: GalMessageView[]): GalStoryDiff {
  const base = indexSnapshot(baseSnapshot);
  const projected = indexSnapshot(projectedSnapshot);
  const items: GalStoryDiff["items"] = [];

  for (const before of base.ordered) {
    const after = projected.byId.get(before.messageId);
    if (!after) {
      items.push({ kind: "deleted", before });
      continue;
    }
    if (before.position !== after.position) {
      items.push({ kind: "moved", before, after });
    }
    const fields = changedFields(before, after);
    if (fields.length > 0) {
      items.push({ kind: "modified", before, after, fields });
    }
  }

  for (const after of projected.ordered) {
    if (!base.byId.has(after.messageId)) {
      items.push({ kind: "added", message: after });
    }
  }

  return { items };
}

export function summarizeGalStoryDiff(diff: GalStoryDiff) {
  return {
    added: diff.items.filter(item => item.kind === "added").length,
    deleted: diff.items.filter(item => item.kind === "deleted").length,
    modified: diff.items.filter(item => item.kind === "modified").length,
    moved: diff.items.filter(item => item.kind === "moved").length,
    metadataChanged: diff.items.filter(item =>
      item.kind === "modified"
      && item.fields.some(field => METADATA_FIELDS.has(field))
      && !item.fields.every(field => CONTENT_FIELDS.has(field)),
    ).length,
  };
}

export function applyGalStoryPatch(
  baseSnapshot: GalMessageView[],
  patch: GalStoryPatch,
  context: GalPatchValidationContext,
) {
  const validationErrors = validateGalStoryPatch(baseSnapshot, patch, context);
  if (validationErrors.length > 0) {
    return {
      projectedSnapshot: baseSnapshot.map(cloneMessage),
      diff: { items: [] },
      summary: { added: 0, deleted: 0, modified: 0, moved: 0, metadataChanged: 0 },
      validationErrors,
    };
  }

  const projectedSnapshot = patch.operations.reduce(
    (messages, operation, index) => applyOperation(messages, operation, index, context.roomId),
    baseSnapshot.map(cloneMessage),
  ).sort((a, b) => a.position - b.position);
  const diff = buildGalStoryDiff(baseSnapshot, projectedSnapshot);
  return {
    projectedSnapshot,
    diff,
    summary: summarizeGalStoryDiff(diff),
    validationErrors,
  };
}

export function createGalPatchProposal(params: {
  proposalId: string;
  spaceId: string;
  roomId: string;
  baseSnapshot: GalMessageView[];
  patch: GalStoryPatch;
  context: GalPatchValidationContext;
  now?: Date;
}): GalPatchProposal {
  const result = applyGalStoryPatch(params.baseSnapshot, params.patch, params.context);
  const nowIso = (params.now ?? new Date()).toISOString();
  return {
    proposalId: params.proposalId,
    spaceId: params.spaceId,
    roomId: params.roomId,
    source: "ai",
    status: "draft",
    baseFingerprint: buildGalDocumentFingerprint(params.baseSnapshot) satisfies GalDocumentFingerprint,
    baseSnapshot: params.baseSnapshot.map(cloneMessage),
    patch: params.patch,
    projectedSnapshot: result.projectedSnapshot,
    diff: result.diff,
    summary: result.summary,
    validationErrors: result.validationErrors,
    createTime: nowIso,
    updateTime: nowIso,
  };
}
