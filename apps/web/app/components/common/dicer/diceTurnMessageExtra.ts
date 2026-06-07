import type { DicerMessageVisibility } from "@/components/common/dicer/commandMessageVisibility";

import { buildMessageExtraForRequest } from "@/types/messageDraft";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

export type DiceTurnReplyPayload = {
  avatarId?: number;
  content: string;
  customRoleName?: string;
  roleId?: number;
  visibility: DicerMessageVisibility;
};

export function buildDiceTurnMessageExtra(command: string, replies: DiceTurnReplyPayload[]) {
  return buildMessageExtraForRequest(MESSAGE_TYPE.DICE, {
    diceTurn: {
      command,
      replies: replies.map(reply => ({
        content: reply.content,
        ...(reply.visibility === "kp_and_sender" ? { hidden: true } : {}),
        ...(typeof reply.roleId === "number" && reply.roleId > 0 ? { roleId: reply.roleId } : {}),
        ...(typeof reply.avatarId === "number" && reply.avatarId > 0 ? { avatarId: reply.avatarId } : {}),
        ...(reply.customRoleName ? { customRoleName: reply.customRoleName } : {}),
      })),
    },
  });
}
