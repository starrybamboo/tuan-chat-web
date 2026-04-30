import type { Message } from "@tuanchat/openapi-client/models/Message";

import type { GalPatchMutationPlan } from "./galPatchMutationAdapter";

export type GalPatchMutationExecutorDeps = {
  sendMessages: (messages: GalPatchMutationPlan["insertMessages"]) => Promise<Message[]>;
  updateMessage: (message: Message) => Promise<Message | null | undefined>;
  deleteMessage: (messageId: number) => Promise<Message | null | undefined>;
};

export type GalPatchMutationApplyResult = {
  inserted: number;
  updated: number;
  deleted: number;
};

export async function executeGalPatchMutationPlan(
  plan: GalPatchMutationPlan,
  deps: GalPatchMutationExecutorDeps,
): Promise<GalPatchMutationApplyResult> {
  const result: GalPatchMutationApplyResult = {
    inserted: 0,
    updated: 0,
    deleted: 0,
  };

  for (const message of plan.updateMessages) {
    await deps.updateMessage(message);
    result.updated += 1;
  }

  for (const messageId of plan.deleteMessageIds) {
    await deps.deleteMessage(messageId);
    result.deleted += 1;
  }

  if (plan.insertMessages.length > 0) {
    const createdMessages = await deps.sendMessages(plan.insertMessages);
    if (createdMessages.length !== plan.insertMessages.length) {
      throw new Error("批量新增消息数量与 proposal 不一致");
    }
    result.inserted = createdMessages.length;
  }

  return result;
}
