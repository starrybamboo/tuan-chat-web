import type { PropsWithChildren } from "react";

import React from "react";
import { useRoleAbilitiesByRule } from "@tuanchat/query/role-abilities";

import { getNormalizedStateEventExtra } from "@/types/stateEvent";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, RoleAbility } from "../../../../api";
import type { StateDefinitionResolver } from "./stateDefinitionResolver";
import type { CombatStateRuntime } from "./stateRuntime";

import { tuanchat } from "../../../../api/instance";
import { EMPTY_STATE_DEFINITION_RESOLVER } from "./stateDefinitionResolver";
import { buildCombatStateRuntime } from "./stateRuntime";

export type StateRuntimeContextValue = CombatStateRuntime & {
  currentRoleId: number;
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>;
  resolver: StateDefinitionResolver;
  isAbilityLoading: boolean;
};

const StateRuntimeContext = React.createContext<StateRuntimeContextValue | null>(null);
const EMPTY_VISIBLE_ROLE_IDS: number[] = [];

type StateRuntimeProviderProps = PropsWithChildren<{
  messages: ChatMessageResponse[];
  ruleId: number;
  currentRoleId: number;
  visibleRoleIds?: number[];
  resolver?: StateDefinitionResolver;
}>;

function collectReferencedRoleIds(
  messages: ChatMessageResponse[],
  currentRoleId: number,
  visibleRoleIds: number[] = [],
): number[] {
  const roleIds = new Set<number>();
  if (currentRoleId > 0) {
    roleIds.add(currentRoleId);
  }
  visibleRoleIds.forEach((roleId) => {
    if (roleId > 0) {
      roleIds.add(roleId);
    }
  });

  messages.forEach(({ message }) => {
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

export function StateRuntimeProvider({
  children,
  messages,
  ruleId,
  currentRoleId,
  visibleRoleIds = EMPTY_VISIBLE_ROLE_IDS,
  resolver = EMPTY_STATE_DEFINITION_RESOLVER,
}: StateRuntimeProviderProps) {
  const roleIds = React.useMemo(
    () => collectReferencedRoleIds(messages, currentRoleId, visibleRoleIds),
    [currentRoleId, messages, visibleRoleIds],
  );
  const roleAbilitiesQuery = useRoleAbilitiesByRule(tuanchat, roleIds, ruleId);

  const fallbackRoleAbilitiesByRoleId = React.useMemo(() => {
    const next: Record<number, RoleAbility | null | undefined> = {};
    roleIds.forEach((roleId) => {
      next[roleId] = roleAbilitiesQuery.abilityByRoleId.get(roleId);
    });
    return next;
  }, [roleAbilitiesQuery.abilityByRoleId, roleIds]);

  const runtime = React.useMemo(() => buildCombatStateRuntime({
    messages: messages.map(item => item.message),
    fallbackRoleAbilitiesByRoleId,
    resolver,
  }), [fallbackRoleAbilitiesByRoleId, messages, resolver]);

  React.useEffect(() => {
    if (runtime.unresolvedStates.length === 0) {
      return;
    }
    console.warn("[state-runtime] 存在未解析状态", runtime.unresolvedStates);
  }, [runtime.unresolvedStates]);

  const value = React.useMemo<StateRuntimeContextValue>(() => ({
    ...runtime,
    currentRoleId,
    fallbackRoleAbilitiesByRoleId,
    resolver,
    isAbilityLoading: roleAbilitiesQuery.isLoading,
  }), [currentRoleId, fallbackRoleAbilitiesByRoleId, resolver, roleAbilitiesQuery.isLoading, runtime]);

  return (
    <StateRuntimeContext value={value}>
      {children}
    </StateRuntimeContext>
  );
}

export function useStateRuntimeContext(): StateRuntimeContextValue {
  const context = React.use(StateRuntimeContext);
  if (!context) {
    throw new Error("useStateRuntimeContext 必须在 StateRuntimeProvider 内使用");
  }
  return context;
}

export function useOptionalStateRuntimeContext(): StateRuntimeContextValue | null {
  return React.use(StateRuntimeContext);
}
