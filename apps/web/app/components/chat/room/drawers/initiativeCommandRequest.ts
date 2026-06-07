import {
  buildEndCombatStateEventExtra,
  buildStartCombatStateEventExtra,
  END_COMBAT_CONTENT,
  START_COMBAT_CONTENT,
} from "@tuanchat/domain/state-command";

import { toApiMessageExtraWithStateEvent } from "@/types/stateEvent";

import type { ChatMessageRequest, UserRole } from "../../../../../api";

import { MessageType } from "../../../../../api/wsModels";

export const ALL_INITIATIVE_COMMAND = ".ri";
export { END_COMBAT_CONTENT, START_COMBAT_CONTENT };

type ExecuteCommand = (payload: {
  command: string;
  mentionedRoles?: UserRole[];
  originMessage?: string;
  replyMessageId?: number;
}) => boolean | void | Promise<boolean | void>;

type ExecuteAllInitiativeRollsParams = {
  executeCommand?: ExecuteCommand;
  roles: UserRole[];
};

type BuildEndCombatMessageRequestParams = {
  avatarId?: number;
  roleId?: number;
  roomId: number;
};

type BuildStartCombatMessageRequestParams = {
  avatarId?: number;
  roleId?: number;
  roomId: number;
};

export async function executeAllInitiativeRolls({
  executeCommand,
  roles,
}: ExecuteAllInitiativeRollsParams): Promise<number> {
  if (!executeCommand) {
    throw new Error("当前房间暂不能投掷全员先攻");
  }

  const rollableRoles = roles.filter(role => typeof role.roleId === "number" && role.roleId > 0);
  if (rollableRoles.length === 0) {
    throw new Error("暂无可投掷先攻的角色");
  }

  await executeCommand({
    command: ALL_INITIATIVE_COMMAND,
    mentionedRoles: rollableRoles,
    originMessage: ALL_INITIATIVE_COMMAND,
  });

  return rollableRoles.length;
}

export function buildEndCombatMessageRequest(params: BuildEndCombatMessageRequestParams): ChatMessageRequest {
  return {
    roomId: params.roomId,
    roleId: params.roleId ?? -1,
    avatarId: params.avatarId ?? -1,
    content: END_COMBAT_CONTENT,
    messageType: MessageType.STATE_EVENT,
    extra: toApiMessageExtraWithStateEvent(buildEndCombatStateEventExtra()),
  };
}

export function buildStartCombatMessageRequest(params: BuildStartCombatMessageRequestParams): ChatMessageRequest {
  return {
    roomId: params.roomId,
    roleId: params.roleId ?? -1,
    avatarId: params.avatarId ?? -1,
    content: START_COMBAT_CONTENT,
    messageType: MessageType.STATE_EVENT,
    extra: toApiMessageExtraWithStateEvent(buildStartCombatStateEventExtra()),
  };
}
