import type { PropsWithChildren } from "react";
import type { ChatMessageResponse, RoleAbility } from "../../../../api";
import type { StateDefinitionResolver } from "./stateDefinitionResolver";

import type { StateRuntime } from "./stateRuntime";
import { useQueries } from "@tanstack/react-query";
import React from "react";
import { getNormalizedStateEventExtra } from "@/types/stateEvent";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { tuanchat } from "../../../../api/instance";
import { EMPTY_STATE_DEFINITION_RESOLVER } from "./stateDefinitionResolver";
import { buildStateRuntime } from "./stateRuntime";

export type StateRuntimeContextValue = StateRuntime & {
  currentRoleId: number;
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>;
  isAbilityLoading: boolean;
};

const StateRuntimeContext = React.createContext<StateRuntimeContextValue | null>(null);

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
      if (event.type !== "nextTurn" && event.scope.kind === "role") {
        roleIds.add(event.scope.roleId);
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
  visibleRoleIds = [],
  resolver = EMPTY_STATE_DEFINITION_RESOLVER,
}: StateRuntimeProviderProps) {
  const roleIds = React.useMemo(
    () => collectReferencedRoleIds(messages, currentRoleId, visibleRoleIds),
    [currentRoleId, messages, visibleRoleIds],
  );
  const abilityQueries = useQueries({
    queries: roleIds.map(roleId => ({
      queryKey: ["roleAbilityByRule", roleId, ruleId],
      enabled: roleId > 0 && ruleId > 0,
      staleTime: 60_000,
      retry: (failureCount: number, error: any) => {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          return false;
        }
        return failureCount < 2;
      },
      queryFn: async (): Promise<RoleAbility | null> => {
        try {
          const response = await tuanchat.abilityController.getByRuleAndRole(ruleId, roleId);
          return response.data ?? null;
        }
        catch (error: any) {
          const statusCode = error?.response?.status || error?.status;
          if (statusCode && statusCode >= 400 && statusCode < 500) {
            return null;
          }
          throw error;
        }
      },
    })),
  });

  const fallbackRoleAbilitiesByRoleId = React.useMemo(() => {
    const next: Record<number, RoleAbility | null | undefined> = {};
    roleIds.forEach((roleId, index) => {
      next[roleId] = abilityQueries[index]?.data;
    });
    return next;
  }, [abilityQueries, roleIds]);

  const runtime = React.useMemo(() => buildStateRuntime({
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
    isAbilityLoading: abilityQueries.some(query => query.isLoading),
  }), [abilityQueries, currentRoleId, fallbackRoleAbilitiesByRoleId, runtime]);

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
