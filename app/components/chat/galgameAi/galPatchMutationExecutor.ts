import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoomMessageStreamPatchOperation } from "@tuanchat/openapi-client/models/RoomMessageStreamPatchOperation";

import type { GalPatchMutationPlan } from "./galPatchMutationAdapter";

export type GalPatchMutationExecutorDeps = {
  patchMessages: (operations: RoomMessageStreamPatchOperation[]) => Promise<Message[]>;
};

export type GalPatchMutationApplyResult = {
  inserted: number;
  updated: number;
  deleted: number;
};

function toPatchMessageItem(message: ChatMessageRequest | Message): NonNullable<RoomMessageStreamPatchOperation["message"]> {
  const replayMessageId = "replayMessageId" in message && typeof message.replayMessageId === "number"
    ? message.replayMessageId
    : "replyMessageId" in message && typeof message.replyMessageId === "number"
      ? message.replyMessageId
      : undefined;

  return {
    messageType: message.messageType,
    content: message.content ?? "",
    ...(Array.isArray(message.annotations) ? { annotations: message.annotations } : {}),
    ...(message.extra !== undefined ? { extra: message.extra } : {}),
    ...(message.webgal !== undefined ? { webgal: message.webgal } : {}),
    ...(typeof message.roleId === "number" ? { roleId: message.roleId } : {}),
    ...(typeof message.avatarId === "number" ? { avatarId: message.avatarId } : {}),
    ...(typeof message.customRoleName === "string" ? { customRoleName: message.customRoleName } : {}),
    ...(typeof replayMessageId === "number" ? { replayMessageId } : {}),
    ...(typeof message.position === "number" ? { position: message.position } : {}),
  };
}

export async function executeGalPatchMutationPlan(
  plan: GalPatchMutationPlan,
  deps: GalPatchMutationExecutorDeps,
): Promise<GalPatchMutationApplyResult> {
  const result: GalPatchMutationApplyResult = {
    inserted: 0,
    updated: 0,
    deleted: 0,
  };

  const operations: RoomMessageStreamPatchOperation[] = [
    ...plan.updateMessages.map(message => ({
      op: "update",
      messageId: message.messageId,
      message: toPatchMessageItem(message),
    })),
    ...plan.deleteMessageIds.map(messageId => ({
      op: "delete",
      messageId,
    })),
    ...plan.insertMessages.map(message => ({
      op: "insert",
      message: toPatchMessageItem(message),
    })),
  ];

  if (operations.length > 0) {
    const patchedMessages = await deps.patchMessages(operations);
    if (patchedMessages.length !== operations.length) {
      throw new Error("批量变更消息数量与 proposal 不一致");
    }
    result.updated = plan.updateMessages.length;
    result.deleted = plan.deleteMessageIds.length;
    result.inserted = plan.insertMessages.length;
  }

  return result;
}
