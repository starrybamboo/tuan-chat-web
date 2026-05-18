import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useMemo } from "react";

import { buildStateRuntime, EMPTY_STATE_DEFINITION_RESOLVER } from "@tuanchat/domain/state-runtime";
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
  });
  return [...roleIds].sort((left, right) => left - right);
}

/**
 * 基于当前房间消息和角色能力构建移动端状态运行时。
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
    return buildStateRuntime({
      fallbackRoleAbilitiesByRoleId,
      messages,
      resolver: EMPTY_STATE_DEFINITION_RESOLVER,
    });
  }, [fallbackRoleAbilitiesByRoleId, messages]);

  return {
    ...runtime,
    currentRoleId: currentRoleId ?? -1,
    fallbackRoleAbilitiesByRoleId,
    isAbilityLoading: isLoading,
  };
}
