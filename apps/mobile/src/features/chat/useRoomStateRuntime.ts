import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { getNormalizedStateEventExtra } from "@tuanchat/domain/state-event";
import { buildCombatStateRuntime, EMPTY_STATE_DEFINITION_RESOLVER } from "@tuanchat/domain/state-runtime";
import { useMemo } from "react";

import { useRoleAbilitiesByRule } from "./useRoleAbilitiesByRule";

function collectReferencedRoleIds(messages: Message[], currentRoleId: number | null, roomRoles: UserRole[]) {
  const roleIds = new Set<number>();
  if (currentRoleId && currentRoleId > 0) {
    roleIds.add(currentRoleId);
  }
  roomRoles.forEach((role) => {
    if (role.roleId > 0) {
      roleIds.add(role.roleId);
    }
  });
  messages.forEach((message) => {
    if (typeof message.roleId === "number" && message.roleId > 0) {
      roleIds.add(message.roleId);
    }
    if (message.status === 1 || message.messageType !== MESSAGE_TYPE.STATE_EVENT) {
      return;
    }
    const stateEvent = getNormalizedStateEventExtra(message.extra);
    stateEvent?.events.forEach((event) => {
      if ("scope" in event && event.scope.kind === "role") {
        roleIds.add(event.scope.roleId);
      }
      if ((event.type === "mapTokenUpsert" || event.type === "mapTokenRemove") && typeof event.roleId === "number") {
        roleIds.add(event.roleId);
      }
    });
  });
  return [...roleIds].sort((left, right) => left - right);
}

/**
 * 基于当前房间消息和角色能力构建移动端统一战斗状态运行时。
 */
export function useRoomStateRuntime(params: {
  currentRoleId: number | null;
  messages: Message[];
  roomRoles: UserRole[];
  ruleId: number | null | undefined;
}) {
  const { currentRoleId, messages, roomRoles, ruleId } = params;

  const referencedRoleIds = useMemo(() => {
    return collectReferencedRoleIds(messages, currentRoleId, roomRoles);
  }, [currentRoleId, messages, roomRoles]);

  const { abilityByRoleId, isLoading } = useRoleAbilitiesByRule(referencedRoleIds, ruleId);

  const fallbackRoleAbilitiesByRoleId = useMemo(() => {
    return Object.fromEntries(referencedRoleIds.map(roleId => [roleId, abilityByRoleId.get(roleId) ?? null]));
  }, [abilityByRoleId, referencedRoleIds]);

  const runtime = useMemo(() => {
    return buildCombatStateRuntime({
      fallbackRoleAbilitiesByRoleId,
      messages,
      resolver: EMPTY_STATE_DEFINITION_RESOLVER,
    });
  }, [fallbackRoleAbilitiesByRoleId, messages]);

  return useMemo(() => ({
    ...runtime,
    currentRoleId: currentRoleId ?? -1,
    fallbackRoleAbilitiesByRoleId,
    isAbilityLoading: isLoading,
  }), [currentRoleId, fallbackRoleAbilitiesByRoleId, isLoading, runtime]);
}

export type RoomStateRuntimeValue = ReturnType<typeof useRoomStateRuntime>;
