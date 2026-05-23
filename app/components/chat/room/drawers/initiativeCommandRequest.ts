import type { StateEventAtom } from "@/types/stateEvent";
import type { AbilityRecord } from "@tuanchat/domain/ability-extractors";

import { buildUiStateEventExtra, toApiMessageExtraWithStateEvent } from "@/types/stateEvent";
import { rollDndInitiative } from "@tuanchat/domain/ability-extractors";

import type { ChatMessageRequest } from "../../../../../api";
import type { InitiativeAbilityQuery, InitiativeRoleRef } from "./initiativeListDerived";
import type { Initiative } from "./initiativeListTypes";

import { MessageType } from "../../../../../api/wsModels";
import { buildInitiativeOrderSetAtom } from "./initiativeListEvents";

export const ALL_INITIATIVE_COMBAT_CONTENT = "战斗开始：全员先攻";
export const END_COMBAT_CONTENT = "战斗结束：清空先攻";

const RULE_MISMATCH_ERROR = "导入失败：请检查角色卡规则与空间设置的规则是否一致";

type BuildAllInitiativeRollEventsParams = {
  abilityQueries: InitiativeAbilityQuery[];
  currentList: Initiative[];
  importableRoles: InitiativeRoleRef[];
  ruleId?: number;
};

type BuildAllInitiativeCombatMessageRequestParams = BuildAllInitiativeRollEventsParams & {
  avatarId?: number;
  roleId?: number;
  roomId: number;
};

type BuildEndCombatMessageRequestParams = {
  avatarId?: number;
  roleId?: number;
  roomId: number;
};

function resolveRuleAbilityRecord(query: InitiativeAbilityQuery, ruleId: number | undefined): AbilityRecord | null {
  const res = query?.data;
  if (!res?.success || !Array.isArray(res.data) || !ruleId) {
    return null;
  }

  const matched = res.data.find(item => item.ruleId === ruleId) ?? null;
  if (!matched && res.data.length > 0) {
    throw new Error(RULE_MISMATCH_ERROR);
  }
  return matched;
}

export function buildAllInitiativeRollEvents({
  abilityQueries,
  currentList,
  importableRoles,
  ruleId,
}: BuildAllInitiativeRollEventsParams): StateEventAtom[] {
  if (importableRoles.length === 0) {
    throw new Error("暂无可投掷先攻的角色");
  }

  const rolledRoleIds = new Set(importableRoles.map(role => role.roleId));
  const retainedParticipants = currentList.filter(item => (
    typeof item.roleId !== "number" || !rolledRoleIds.has(item.roleId)
  ));

  const rolledParticipants = importableRoles.map((role, index): Initiative & { roleId: number } => {
    const abilityRecord = resolveRuleAbilityRecord(abilityQueries[index], ruleId);
    const roll = rollDndInitiative(abilityRecord);
    return {
      participantId: `role:${role.roleId}`,
      roleId: role.roleId,
      name: role.roleName?.trim() || `角色${role.roleId}`,
      value: roll.total,
    };
  });

  return [
    ...rolledParticipants.map((participant): StateEventAtom => ({
      type: "combatParticipantUpsert",
      participantId: participant.participantId,
      roleId: participant.roleId,
      name: participant.name,
      initiative: participant.value,
    })),
    buildInitiativeOrderSetAtom([...retainedParticipants, ...rolledParticipants]),
  ];
}

export function buildAllInitiativeCombatMessageRequest(params: BuildAllInitiativeCombatMessageRequestParams): ChatMessageRequest {
  const events = buildAllInitiativeRollEvents(params);
  return {
    roomId: params.roomId,
    roleId: params.roleId ?? -1,
    avatarId: params.avatarId ?? -1,
    content: ALL_INITIATIVE_COMBAT_CONTENT,
    messageType: MessageType.STATE_EVENT,
    extra: toApiMessageExtraWithStateEvent(buildUiStateEventExtra(events)),
  };
}

export function buildEndCombatMessageRequest(params: BuildEndCombatMessageRequestParams): ChatMessageRequest {
  return {
    roomId: params.roomId,
    roleId: params.roleId ?? -1,
    avatarId: params.avatarId ?? -1,
    content: END_COMBAT_CONTENT,
    messageType: MessageType.STATE_EVENT,
    extra: toApiMessageExtraWithStateEvent(buildUiStateEventExtra([{ type: "combatRoundEnd" }])),
  };
}
