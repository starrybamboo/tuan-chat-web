import type { StateEventAtom, StateEventScope, StateEventStackMode, StateStatusModifierOp } from "@tuanchat/domain/state-event";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import {
  formatStateEventAtomDetail,
  formatStateKeyLabel,
  formatStateNumericValue,
  formatStateScopeLabel,
  getNormalizedStateEventExtra,
  STATE_EVENT_SCOPE_KIND,
  STATE_EVENT_STACK_MODE,
  STATE_EVENT_STATUS_MODIFIER_OP,
  STATE_EVENT_VAR_OP,
} from "@tuanchat/domain/state-event";

export type StateDefinitionModifier = {
  key: string;
  op: StateStatusModifierOp;
  value: number;
};

export type StateDefinition = {
  durationTurns?: number;
  modifiers: StateDefinitionModifier[];
  name: string;
  stackMode: StateEventStackMode;
  statusId: string;
};

export type StateDefinitionResolver = {
  resolveById: (statusId: string) => StateDefinition | null;
  resolveLatestByName: (statusName: string) => StateDefinition | null;
};

export type StateValueMap = Record<string, number>;

export type StateDisplayValues = {
  rolesByRoleId: Record<number, StateValueMap>;
  room: StateValueMap;
};

export type ActiveStateInstance = {
  durationTurns?: number;
  instanceId: string;
  modifiers: StateDefinition["modifiers"];
  remainingTurns?: number;
  scope: StateEventScope;
  sourceMessageId: number;
  stackMode: StateEventStackMode;
  statusId: string;
  statusName: string;
};

export type UnresolvedState = {
  messageId: number;
  reason: string;
  scope: StateEventScope;
  statusId: string;
};

export type StateEventMessageSummary = {
  detailLines: string[];
  primaryText: string;
  secondaryText?: string;
};

export type StateRuntime = {
  activeStates: ActiveStateInstance[];
  baseDisplayValues: StateDisplayValues;
  derivedDisplayValues: StateDisplayValues;
  messageSummariesByMessageId: Record<number, StateEventMessageSummary>;
  roleVarsByRoleId: Record<number, StateValueMap>;
  roomVars: StateValueMap;
  turn: number;
  unresolvedStates: UnresolvedState[];
};

export type BuildStateRuntimeParams = {
  fallbackRoleAbilitiesByRoleId?: Record<number, RoleAbility | null | undefined>;
  messages: Array<Pick<Message, "content" | "extra" | "messageId" | "messageType" | "status">>;
  resolver?: StateDefinitionResolver;
};

export const EMPTY_STATE_DEFINITION_RESOLVER: StateDefinitionResolver = {
  resolveById: () => null,
  resolveLatestByName: () => null,
};

function cloneValueMap(value: StateValueMap): StateValueMap {
  return { ...value };
}

function cloneRoleVarsMap(value: Record<number, StateValueMap>): Record<number, StateValueMap> {
  return Object.fromEntries(Object.entries(value).map(([roleId, vars]) => [Number(roleId), cloneValueMap(vars)]));
}

function ensureRoleVars(roleVarsByRoleId: Record<number, StateValueMap>, roleId: number): StateValueMap {
  if (!roleVarsByRoleId[roleId]) {
    roleVarsByRoleId[roleId] = {};
  }
  return roleVarsByRoleId[roleId];
}

function ensureRoleKeySet(roleKeySets: Map<number, Set<string>>, roleId: number): Set<string> {
  const existing = roleKeySets.get(roleId);
  if (existing) {
    return existing;
  }
  const next = new Set<string>();
  roleKeySets.set(roleId, next);
  return next;
}

function readNumericRecordValue(record: Record<string, string> | undefined, key: string): number | undefined {
  const raw = record?.[key];
  if (typeof raw !== "string") {
    return undefined;
  }
  const normalized = Number(raw);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function collectNumericRecordKeys(record: Record<string, string> | undefined): string[] {
  if (!record) {
    return [];
  }

  return Object.keys(record).filter(key => typeof readNumericRecordValue(record, key) === "number");
}

export function getFallbackRoleAbilityValue(roleAbility: RoleAbility | null | undefined, key: string): number | undefined {
  return readNumericRecordValue(roleAbility?.basic, key)
    ?? readNumericRecordValue(roleAbility?.ability, key)
    ?? readNumericRecordValue(roleAbility?.skill, key);
}

function collectFallbackRoleAbilityKeys(roleAbility: RoleAbility | null | undefined): string[] {
  const keys = new Set<string>();
  collectNumericRecordKeys(roleAbility?.basic).forEach(key => keys.add(key));
  collectNumericRecordKeys(roleAbility?.ability).forEach(key => keys.add(key));
  collectNumericRecordKeys(roleAbility?.skill).forEach(key => keys.add(key));
  return [...keys];
}

function readScopeBaseValue(
  scope: StateEventScope,
  key: string,
  roomVars: StateValueMap,
  roleVarsByRoleId: Record<number, StateValueMap>,
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>,
): number {
  if (scope.kind === STATE_EVENT_SCOPE_KIND.ROOM) {
    return roomVars[key] ?? 0;
  }
  const roleVars = roleVarsByRoleId[scope.roleId];
  if (roleVars && typeof roleVars[key] === "number") {
    return roleVars[key];
  }
  return getFallbackRoleAbilityValue(fallbackRoleAbilitiesByRoleId[scope.roleId], key) ?? 0;
}

function scopeEquals(left: StateEventScope, right: StateEventScope): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === STATE_EVENT_SCOPE_KIND.ROOM) {
    return true;
  }
  return left.roleId === (right.kind === STATE_EVENT_SCOPE_KIND.ROLE ? right.roleId : undefined);
}

function buildSummary(primaryCandidates: string[], scopeLabels: string[], detailLines: string[]): StateEventMessageSummary {
  const primaryText = primaryCandidates.length === 1
    ? primaryCandidates[0]
    : `执行了 ${primaryCandidates.length} 个状态事件`;
  const secondaryParts: string[] = [];
  if (scopeLabels.length === 1) {
    secondaryParts.push(scopeLabels[0]);
  }
  else if (scopeLabels.length > 1) {
    secondaryParts.push(scopeLabels.join(" / "));
  }
  if (primaryCandidates.length > 1) {
    secondaryParts.push(primaryCandidates.join("；"));
  }
  return {
    primaryText,
    ...(secondaryParts.length > 0 ? { secondaryText: secondaryParts.join(" · ") } : {}),
    detailLines,
  };
}

function createStateInstance(
  definition: StateDefinition,
  atom: Extract<StateEventAtom, { type: "statusApply" }>,
  messageId: number,
  index: number,
): ActiveStateInstance {
  const durationTurns = atom.durationTurns ?? definition.durationTurns;
  return {
    durationTurns,
    instanceId: `${messageId}:${index}:${definition.statusId}`,
    modifiers: definition.modifiers,
    remainingTurns: durationTurns,
    scope: atom.scope,
    sourceMessageId: messageId,
    stackMode: definition.stackMode,
    statusId: definition.statusId,
    statusName: definition.name,
  };
}

function applyStateDefinition(
  activeStates: ActiveStateInstance[],
  definition: StateDefinition,
  atom: Extract<StateEventAtom, { type: "statusApply" }>,
  messageId: number,
  atomIndex: number,
): { actionLabel: string; activeStates: ActiveStateInstance[] } {
  const matching = activeStates.filter(state => state.statusName === definition.name && scopeEquals(state.scope, atom.scope));
  const nextInstance = createStateInstance(definition, atom, messageId, atomIndex);

  if (definition.stackMode === STATE_EVENT_STACK_MODE.STACK) {
    return {
      actionLabel: "施加",
      activeStates: [...activeStates, nextInstance],
    };
  }

  if (definition.stackMode === STATE_EVENT_STACK_MODE.REFRESH && matching.length > 0) {
    return {
      actionLabel: "刷新",
      activeStates: activeStates.map((state) => {
        if (state.statusName !== definition.name || !scopeEquals(state.scope, atom.scope)) {
          return state;
        }
        return {
          ...state,
          durationTurns: nextInstance.durationTurns,
          modifiers: definition.modifiers,
          remainingTurns: nextInstance.remainingTurns,
          sourceMessageId: messageId,
          stackMode: definition.stackMode,
          statusId: definition.statusId,
        };
      }),
    };
  }

  return {
    actionLabel: matching.length > 0 ? "替换" : "施加",
    activeStates: [
      ...activeStates.filter(state => state.statusName !== definition.name || !scopeEquals(state.scope, atom.scope)),
      nextInstance,
    ],
  };
}

function applyStateModifiers(baseValue: number, states: ActiveStateInstance[], key: string): number {
  let nextValue = baseValue;
  const percentModifiers: number[] = [];
  let overrideValue: number | undefined;

  states.forEach((state) => {
    state.modifiers
      .filter(modifier => modifier.key === key)
      .forEach((modifier) => {
        if (modifier.op === STATE_EVENT_STATUS_MODIFIER_OP.ADD) {
          nextValue += modifier.value;
        }
        else if (modifier.op === STATE_EVENT_STATUS_MODIFIER_OP.SUB) {
          nextValue -= modifier.value;
        }
        else if (modifier.op === STATE_EVENT_STATUS_MODIFIER_OP.MUL_PERCENT) {
          percentModifiers.push(modifier.value);
        }
        else if (modifier.op === STATE_EVENT_STATUS_MODIFIER_OP.OVERRIDE) {
          overrideValue = modifier.value;
        }
      });
  });

  percentModifiers.forEach((modifier) => {
    nextValue *= modifier / 100;
  });

  if (typeof overrideValue === "number") {
    nextValue = overrideValue;
  }

  return nextValue;
}

export function buildStateRuntime({
  fallbackRoleAbilitiesByRoleId = {},
  messages,
  resolver = EMPTY_STATE_DEFINITION_RESOLVER,
}: BuildStateRuntimeParams): StateRuntime {
  const sortedMessages = [...messages]
    .filter(message => message.status !== 1)
    .sort((left, right) => (left.messageId ?? 0) - (right.messageId ?? 0));

  let turn = 1;
  const roomVars: StateValueMap = {};
  const roleVarsByRoleId: Record<number, StateValueMap> = {};
  let activeStates: ActiveStateInstance[] = [];
  const unresolvedStates: UnresolvedState[] = [];
  const roleKeySets = new Map<number, Set<string>>();
  const messageSummariesByMessageId: Record<number, StateEventMessageSummary> = {};

  sortedMessages.forEach((message) => {
    if (message.messageType !== MESSAGE_TYPE.STATE_EVENT || !message.messageId) {
      return;
    }

    const normalized = getNormalizedStateEventExtra(message.extra);
    if (!normalized) {
      return;
    }

    const primaryCandidates: string[] = [];
    const scopeLabels = new Set<string>();
    const detailLines: string[] = [];

    normalized.events.forEach((event, eventIndex) => {
      detailLines.push(formatStateEventAtomDetail(event));
      if (event.type === "nextTurn") {
        turn += 1;
        activeStates = activeStates
          .map((state) => {
            if (typeof state.remainingTurns !== "number") {
              return state;
            }
            return {
              ...state,
              remainingTurns: state.remainingTurns - 1,
            };
          })
          .filter((state) => {
            return typeof state.remainingTurns !== "number" || state.remainingTurns > 0;
          });
        primaryCandidates.push("推进回合");
        return;
      }

      scopeLabels.add(formatStateScopeLabel(event.scope));

      if (event.type === "varOp") {
        const targetVars = event.scope.kind === STATE_EVENT_SCOPE_KIND.ROOM
          ? roomVars
          : ensureRoleVars(roleVarsByRoleId, event.scope.roleId);
        const roleKeySet = event.scope.kind === STATE_EVENT_SCOPE_KIND.ROLE
          ? ensureRoleKeySet(roleKeySets, event.scope.roleId)
          : null;
        const currentValue = readScopeBaseValue(event.scope, event.key, roomVars, roleVarsByRoleId, fallbackRoleAbilitiesByRoleId);

        if (event.op === STATE_EVENT_VAR_OP.SET) {
          targetVars[event.key] = event.value;
        }
        else if (event.op === STATE_EVENT_VAR_OP.ADD) {
          targetVars[event.key] = currentValue + event.value;
        }
        else {
          targetVars[event.key] = currentValue - event.value;
        }

        roleKeySet?.add(event.key);
        primaryCandidates.push(`${formatStateKeyLabel(event.key)} 更新`);
        return;
      }

      if (event.type === "statusApply") {
        const definition = resolver.resolveById(event.statusId);
        if (!definition) {
          unresolvedStates.push({
            messageId: message.messageId!,
            reason: "未找到状态定义",
            scope: event.scope,
            statusId: event.statusId,
          });
          primaryCandidates.push(`施加 ${event.statusId}`);
          return;
        }
        const result = applyStateDefinition(activeStates, definition, event, message.messageId!, eventIndex);
        activeStates = result.activeStates;
        primaryCandidates.push(`${result.actionLabel} ${definition.name}`);
        return;
      }

      const definition = resolver.resolveLatestByName(event.statusName);
      if (!definition) {
        unresolvedStates.push({
          messageId: message.messageId!,
          reason: "未找到状态定义",
          scope: event.scope,
          statusId: event.statusName,
        });
        primaryCandidates.push(`移除 ${event.statusName}`);
        return;
      }
      activeStates = activeStates.filter(state => state.statusName !== definition.name || !scopeEquals(state.scope, event.scope));
      primaryCandidates.push(`移除 ${definition.name}`);
    });

    messageSummariesByMessageId[message.messageId] = buildSummary(primaryCandidates, [...scopeLabels], detailLines);
  });

  const roleIds = new Set<number>([
    ...Object.keys(roleVarsByRoleId).map(value => Number(value)),
    ...Object.keys(fallbackRoleAbilitiesByRoleId).map(value => Number(value)),
  ]);
  activeStates.forEach((state) => {
    if (state.scope.kind === STATE_EVENT_SCOPE_KIND.ROLE) {
      roleIds.add(state.scope.roleId);
    }
  });

  const baseDisplayValues: StateDisplayValues = {
    rolesByRoleId: {},
    room: cloneValueMap(roomVars),
  };
  const derivedDisplayValues: StateDisplayValues = {
    rolesByRoleId: {},
    room: cloneValueMap(roomVars),
  };

  Object.keys(roomVars).forEach((key) => {
    const roomScopedStates = activeStates.filter(state => state.scope.kind === STATE_EVENT_SCOPE_KIND.ROOM);
    derivedDisplayValues.room[key] = applyStateModifiers(roomVars[key] ?? 0, roomScopedStates, key);
  });

  [...roleIds].forEach((roleId) => {
    const keys = new Set<string>([
      ...Object.keys(roleVarsByRoleId[roleId] ?? {}),
      ...collectFallbackRoleAbilityKeys(fallbackRoleAbilitiesByRoleId[roleId]),
      ...(roleKeySets.get(roleId) ? [...roleKeySets.get(roleId)!] : []),
    ]);
    const roleScopedStates = activeStates.filter(state => state.scope.kind === STATE_EVENT_SCOPE_KIND.ROLE && state.scope.roleId === roleId);

    baseDisplayValues.rolesByRoleId[roleId] = {};
    derivedDisplayValues.rolesByRoleId[roleId] = {};

    [...keys].forEach((key) => {
      const baseValue = roleVarsByRoleId[roleId]?.[key]
        ?? getFallbackRoleAbilityValue(fallbackRoleAbilitiesByRoleId[roleId], key)
        ?? 0;
      baseDisplayValues.rolesByRoleId[roleId][key] = baseValue;
      derivedDisplayValues.rolesByRoleId[roleId][key] = applyStateModifiers(baseValue, roleScopedStates, key);
    });
  });

  return {
    activeStates,
    baseDisplayValues,
    derivedDisplayValues,
    messageSummariesByMessageId,
    roleVarsByRoleId: cloneRoleVarsMap(roleVarsByRoleId),
    roomVars: cloneValueMap(roomVars),
    turn,
    unresolvedStates,
  };
}

export function compareStateValueText(baseValue: number, displayValue: number) {
  if (baseValue === displayValue) {
    return formatStateNumericValue(displayValue);
  }
  return `${formatStateNumericValue(baseValue)}→${formatStateNumericValue(displayValue)}`;
}
