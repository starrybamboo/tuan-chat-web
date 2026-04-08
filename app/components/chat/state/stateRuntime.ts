import type { Message, RoleAbility } from "../../../../api";
import type { StateDefinition, StateDefinitionResolver } from "./stateDefinitionResolver";
import type { StateEventAtom, StateEventScope, StateEventStackMode } from "@/types/stateEvent";

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
} from "@/types/stateEvent";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

export type StateValueMap = Record<string, number>;

export type StateDisplayValues = {
  room: StateValueMap;
  rolesByRoleId: Record<number, StateValueMap>;
};

export type ActiveStateInstance = {
  instanceId: string;
  sourceMessageId: number;
  scope: StateEventScope;
  statusId: string;
  statusName: string;
  durationTurns?: number;
  remainingTurns?: number;
  stackMode: StateEventStackMode;
  modifiers: StateDefinition["modifiers"];
};

export type UnresolvedState = {
  messageId: number;
  statusId: string;
  scope: StateEventScope;
  reason: string;
};

export type StateEventMessageSummary = {
  primaryText: string;
  secondaryText?: string;
  detailLines: string[];
};

export type StateRuntime = {
  turn: number;
  roomVars: StateValueMap;
  roleVarsByRoleId: Record<number, StateValueMap>;
  activeStates: ActiveStateInstance[];
  baseDisplayValues: StateDisplayValues;
  derivedDisplayValues: StateDisplayValues;
  unresolvedStates: UnresolvedState[];
  messageSummariesByMessageId: Record<number, StateEventMessageSummary>;
};

export type BuildStateRuntimeParams = {
  messages: Array<Pick<Message, "messageId" | "messageType" | "content" | "status" | "extra">>;
  fallbackRoleAbilitiesByRoleId?: Record<number, RoleAbility | null | undefined>;
  resolver?: StateDefinitionResolver;
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

export function getFallbackRoleAbilityValue(roleAbility: RoleAbility | null | undefined, key: string): number | undefined {
  return readNumericRecordValue(roleAbility?.basic, key)
    ?? readNumericRecordValue(roleAbility?.ability, key)
    ?? readNumericRecordValue(roleAbility?.skill, key);
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

function collectScopeLabel(scope: StateEventScope): string {
  return formatStateScopeLabel(scope);
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
    instanceId: `${messageId}:${index}:${definition.statusId}`,
    sourceMessageId: messageId,
    scope: atom.scope,
    statusId: definition.statusId,
    statusName: definition.name,
    durationTurns,
    remainingTurns: durationTurns,
    stackMode: definition.stackMode,
    modifiers: definition.modifiers,
  };
}

function applyStateDefinition(
  activeStates: ActiveStateInstance[],
  definition: StateDefinition,
  atom: Extract<StateEventAtom, { type: "statusApply" }>,
  messageId: number,
  atomIndex: number,
): { activeStates: ActiveStateInstance[]; actionLabel: string } {
  const matching = activeStates.filter(state => state.statusName === definition.name && scopeEquals(state.scope, atom.scope));
  const nextInstance = createStateInstance(definition, atom, messageId, atomIndex);

  if (definition.stackMode === STATE_EVENT_STACK_MODE.STACK) {
    return {
      activeStates: [...activeStates, nextInstance],
      actionLabel: "施加",
    };
  }

  if (definition.stackMode === STATE_EVENT_STACK_MODE.REFRESH && matching.length > 0) {
    const nextStates = activeStates.map((state) => {
      if (state.statusName !== definition.name || !scopeEquals(state.scope, atom.scope)) {
        return state;
      }
      return {
        ...state,
        sourceMessageId: messageId,
        statusId: definition.statusId,
        durationTurns: nextInstance.durationTurns,
        remainingTurns: nextInstance.remainingTurns,
        modifiers: definition.modifiers,
        stackMode: definition.stackMode,
      };
    });
    return {
      activeStates: nextStates,
      actionLabel: "刷新",
    };
  }

  return {
    activeStates: [
      ...activeStates.filter(state => state.statusName !== definition.name || !scopeEquals(state.scope, atom.scope)),
      nextInstance,
    ],
    actionLabel: matching.length > 0 ? "替换" : "施加",
  };
}

function collectDisplayKeys(
  vars: StateValueMap,
  states: ActiveStateInstance[],
): string[] {
  const keys = new Set<string>(Object.keys(vars));
  states.forEach((state) => {
    state.modifiers.forEach((modifier) => {
      keys.add(modifier.key);
    });
  });
  return [...keys].sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function applyStateModifiers(baseValue: number, states: ActiveStateInstance[], key: string): number {
  let nextValue = baseValue;
  const percentModifiers: number[] = [];
  let overrideValue: number | undefined;

  states.forEach((state) => {
    state.modifiers.forEach((modifier) => {
      if (modifier.key !== key) {
        return;
      }
      if (modifier.op === STATE_EVENT_STATUS_MODIFIER_OP.ADD) {
        nextValue += modifier.value;
        return;
      }
      if (modifier.op === STATE_EVENT_STATUS_MODIFIER_OP.SUB) {
        nextValue -= modifier.value;
        return;
      }
      if (modifier.op === STATE_EVENT_STATUS_MODIFIER_OP.MUL_PERCENT) {
        percentModifiers.push(modifier.value);
        return;
      }
      if (modifier.op === STATE_EVENT_STATUS_MODIFIER_OP.OVERRIDE) {
        overrideValue = modifier.value;
      }
    });
  });

  percentModifiers.forEach((modifier) => {
    nextValue *= (100 + modifier) / 100;
  });

  if (typeof overrideValue === "number") {
    nextValue = overrideValue;
  }

  return nextValue;
}

function buildDisplayValues(params: {
  roomVars: StateValueMap;
  roleVarsByRoleId: Record<number, StateValueMap>;
  activeStates: ActiveStateInstance[];
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>;
  observedRoomKeys: ReadonlySet<string>;
  observedRoleKeysByRoleId: ReadonlyMap<number, ReadonlySet<string>>;
}): { baseDisplayValues: StateDisplayValues; derivedDisplayValues: StateDisplayValues } {
  const {
    roomVars,
    roleVarsByRoleId,
    activeStates,
    fallbackRoleAbilitiesByRoleId,
    observedRoomKeys,
    observedRoleKeysByRoleId,
  } = params;
  const roomStates = activeStates.filter(state => state.scope.kind === STATE_EVENT_SCOPE_KIND.ROOM);
  const roleIds = new Set<number>([
    ...Object.keys(roleVarsByRoleId).map(item => Number(item)),
    ...Object.keys(fallbackRoleAbilitiesByRoleId).map(item => Number(item)),
  ]);
  activeStates.forEach((state) => {
    if (state.scope.kind === STATE_EVENT_SCOPE_KIND.ROLE) {
      roleIds.add(state.scope.roleId);
    }
  });

  const baseDisplayValues: StateDisplayValues = {
    room: {},
    rolesByRoleId: {},
  };
  const derivedDisplayValues: StateDisplayValues = {
    room: {},
    rolesByRoleId: {},
  };

  collectDisplayKeys(roomVars, roomStates).forEach((key) => {
    const baseValue = roomVars[key] ?? 0;
    baseDisplayValues.room[key] = baseValue;
    derivedDisplayValues.room[key] = applyStateModifiers(baseValue, roomStates, key);
  });
  observedRoomKeys.forEach((key) => {
    if (typeof baseDisplayValues.room[key] === "number") {
      return;
    }
    const baseValue = roomVars[key] ?? 0;
    baseDisplayValues.room[key] = baseValue;
    derivedDisplayValues.room[key] = applyStateModifiers(baseValue, roomStates, key);
  });

  roleIds.forEach((roleId) => {
    const roleVars = roleVarsByRoleId[roleId] ?? {};
    const roleStates = activeStates.filter(state => state.scope.kind === STATE_EVENT_SCOPE_KIND.ROLE && state.scope.roleId === roleId);
    const keys = new Set<string>(collectDisplayKeys(roleVars, roleStates));
    observedRoleKeysByRoleId.get(roleId)?.forEach(key => keys.add(key));
    const sortedKeys = [...keys].sort((left, right) => left.localeCompare(right, "zh-CN"));
    if (sortedKeys.length === 0) {
      return;
    }
    const baseValues: StateValueMap = {};
    const derivedValues: StateValueMap = {};
    sortedKeys.forEach((key) => {
      const baseValue = typeof roleVars[key] === "number"
        ? roleVars[key]
        : (getFallbackRoleAbilityValue(fallbackRoleAbilitiesByRoleId[roleId], key) ?? 0);
      baseValues[key] = baseValue;
      derivedValues[key] = applyStateModifiers(baseValue, roleStates, key);
    });
    baseDisplayValues.rolesByRoleId[roleId] = baseValues;
    derivedDisplayValues.rolesByRoleId[roleId] = derivedValues;
  });

  return {
    baseDisplayValues,
    derivedDisplayValues,
  };
}

export function buildStateRuntime({
  messages,
  fallbackRoleAbilitiesByRoleId = {},
  resolver,
}: BuildStateRuntimeParams): StateRuntime {
  const effectiveMessages = messages.filter(message => message.status !== 1 && message.messageType === MESSAGE_TYPE.STATE_EVENT);
  const roomVars: StateValueMap = {};
  const roleVarsByRoleId: Record<number, StateValueMap> = {};
  const observedRoomKeys = new Set<string>();
  const observedRoleKeysByRoleId = new Map<number, Set<string>>();
  const unresolvedStates: UnresolvedState[] = [];
  const messageSummariesByMessageId: Record<number, StateEventMessageSummary> = {};
  let activeStates: ActiveStateInstance[] = [];
  let turn = 0;

  effectiveMessages.forEach((message) => {
    const normalizedExtra = getNormalizedStateEventExtra(message.extra);
    if (!normalizedExtra) {
      messageSummariesByMessageId[message.messageId] = {
        primaryText: "状态事件格式无效",
        detailLines: ["消息缺少可解析的 stateEvent 结构。"],
      };
      return;
    }

    const primaryCandidates: string[] = [];
    const scopeLabels = new Set<string>();
    const detailLines: string[] = [];

    normalizedExtra.events.forEach((atom, atomIndex) => {
      if (atom.type !== "nextTurn") {
        scopeLabels.add(collectScopeLabel(atom.scope));
      }

      if (atom.type === "varOp") {
        if (atom.scope.kind === STATE_EVENT_SCOPE_KIND.ROOM) {
          observedRoomKeys.add(atom.key);
        }
        else {
          ensureRoleKeySet(observedRoleKeysByRoleId, atom.scope.roleId).add(atom.key);
        }
        const beforeValue = readScopeBaseValue(atom.scope, atom.key, roomVars, roleVarsByRoleId, fallbackRoleAbilitiesByRoleId);
        const afterValue = atom.op === STATE_EVENT_VAR_OP.SET
          ? atom.value
          : atom.op === STATE_EVENT_VAR_OP.ADD
            ? beforeValue + atom.value
            : beforeValue - atom.value;
        if (atom.scope.kind === STATE_EVENT_SCOPE_KIND.ROOM) {
          roomVars[atom.key] = afterValue;
        }
        else {
          ensureRoleVars(roleVarsByRoleId, atom.scope.roleId)[atom.key] = afterValue;
        }
        primaryCandidates.push(`${formatStateKeyLabel(atom.key)} ${formatStateNumericValue(beforeValue)} -> ${formatStateNumericValue(afterValue)}`);
        detailLines.push(`${formatStateEventAtomDetail(atom)} · ${formatStateNumericValue(beforeValue)} -> ${formatStateNumericValue(afterValue)}`);
        return;
      }

      if (atom.type === "statusApply") {
        const definition = resolver?.resolveById(atom.statusId) ?? null;
        if (!definition) {
          unresolvedStates.push({
            messageId: message.messageId,
            statusId: atom.statusId,
            scope: atom.scope,
            reason: "未找到对应的状态定义",
          });
          primaryCandidates.push(`未解析状态 ${atom.statusId}`);
          detailLines.push(`${formatStateEventAtomDetail(atom)} · 未解析`);
          return;
        }
        definition.modifiers.forEach((modifier) => {
          if (atom.scope.kind === STATE_EVENT_SCOPE_KIND.ROOM) {
            observedRoomKeys.add(modifier.key);
          }
          else {
            ensureRoleKeySet(observedRoleKeysByRoleId, atom.scope.roleId).add(modifier.key);
          }
        });

        const applyResult = applyStateDefinition(activeStates, definition, atom, message.messageId, atomIndex);
        activeStates = applyResult.activeStates;
        const durationLabel = typeof (atom.durationTurns ?? definition.durationTurns) === "number"
          ? `（${atom.durationTurns ?? definition.durationTurns} 回合）`
          : "";
        primaryCandidates.push(`${applyResult.actionLabel}状态 ${definition.name}${durationLabel}`);
        detailLines.push(`${formatStateEventAtomDetail(atom)} · ${applyResult.actionLabel}为 ${definition.name}${durationLabel}`);
        return;
      }

      if (atom.type === "statusRemove") {
        const beforeCount = activeStates.length;
        activeStates = activeStates.filter(state => !(state.statusName === atom.statusName && scopeEquals(state.scope, atom.scope)));
        const removedCount = beforeCount - activeStates.length;
        primaryCandidates.push(removedCount > 0 ? `移除状态 ${atom.statusName} ×${removedCount}` : `移除状态 ${atom.statusName}`);
        detailLines.push(`${formatStateEventAtomDetail(atom)} · ${removedCount > 0 ? `已移除 ${removedCount} 个状态` : "未命中任何激活状态"}`);
        return;
      }

      const previousTurn = turn;
      turn += 1;
      const expiredStates: ActiveStateInstance[] = [];
      activeStates = activeStates
        .map((state) => {
          if (typeof state.remainingTurns !== "number") {
            return state;
          }
          const nextTurns = state.remainingTurns - 1;
          if (nextTurns <= 0) {
            expiredStates.push(state);
            return null;
          }
          return {
            ...state,
            remainingTurns: nextTurns,
          };
        })
        .filter((state): state is ActiveStateInstance => Boolean(state));
      primaryCandidates.push(`回合 ${previousTurn} -> ${turn}`);
      detailLines.push(`推进回合：${previousTurn} -> ${turn}`);
      if (expiredStates.length > 0) {
        const expiredLabel = expiredStates.map(state => state.statusName).join("、");
        detailLines.push(`失效状态：${expiredLabel}`);
      }
    });

    messageSummariesByMessageId[message.messageId] = buildSummary(primaryCandidates, [...scopeLabels], detailLines);
  });

  const { baseDisplayValues, derivedDisplayValues } = buildDisplayValues({
    roomVars,
    roleVarsByRoleId,
    activeStates,
    fallbackRoleAbilitiesByRoleId,
    observedRoomKeys,
    observedRoleKeysByRoleId,
  });

  return {
    turn,
    roomVars: cloneValueMap(roomVars),
    roleVarsByRoleId: cloneRoleVarsMap(roleVarsByRoleId),
    activeStates: [...activeStates],
    baseDisplayValues,
    derivedDisplayValues,
    unresolvedStates,
    messageSummariesByMessageId,
  };
}
