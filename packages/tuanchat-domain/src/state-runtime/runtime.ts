import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import type { StateEventAtom, StateEventScope } from "../state-event";
import type {
  ActiveStateInstance,
  BuildCombatStateRuntimeParams,
  BuildStateRuntimeParams,
  CombatMapConfig,
  CombatMapToken,
  CombatStateRuntime,
  StateDefinition,
  StateDefinitionResolver,
  StateDisplayValues,
  StateEventMessageSummary,
  StateRuntime,
  StateValueMap,
  UnresolvedState,
} from "./types";

import { MESSAGE_TYPE } from "../messageType";
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
} from "../state-event";

type StateEventVarOpAtom = Extract<StateEventAtom, { type: "varOp" }>;
type StateEventRoleVarOpAtom = StateEventVarOpAtom & { scope: { kind: typeof STATE_EVENT_SCOPE_KIND.ROLE; roleId: number } };
type StateEventVarOpSnapshot = StateEventVarOpAtom & { afterValue: number; beforeValue: number };
type RoleVarOpTimelineItem = {
  atom: StateEventRoleVarOpAtom;
  atomIndex: number;
  messageId: number;
};

export class EmptyStateDefinitionResolver implements StateDefinitionResolver {
  resolveById(): StateDefinition | null {
    return null;
  }

  resolveLatestByName(): StateDefinition | null {
    return null;
  }
}

export class MemoryStateDefinitionResolver implements StateDefinitionResolver {
  private readonly definitionsById = new Map<string, StateDefinition>();
  private readonly definitionsByName = new Map<string, StateDefinition[]>();

  constructor(definitions: StateDefinition[]) {
    definitions.forEach((definition) => {
      this.definitionsById.set(definition.statusId, definition);
      const list = this.definitionsByName.get(definition.name) ?? [];
      list.push(definition);
      this.definitionsByName.set(definition.name, list);
    });
  }

  resolveById(statusId: string): StateDefinition | null {
    return this.definitionsById.get(statusId) ?? null;
  }

  resolveLatestByName(statusName: string): StateDefinition | null {
    const list = this.definitionsByName.get(statusName);
    return list?.[list.length - 1] ?? null;
  }
}

export const EMPTY_STATE_DEFINITION_RESOLVER: StateDefinitionResolver = new EmptyStateDefinitionResolver();

export function createStateDefinition(definition: Omit<StateDefinition, "stackMode"> & {
  stackMode?: StateDefinition["stackMode"];
}): StateDefinition {
  return {
    ...definition,
    stackMode: definition.stackMode ?? STATE_EVENT_STACK_MODE.REPLACE,
  };
}

function cloneValueMap(value: StateValueMap): StateValueMap {
  return { ...value };
}

function cloneRoleVarsMap(value: Record<number, StateValueMap>): Record<number, StateValueMap> {
  return Object.fromEntries(Object.entries(value).map(([roleId, vars]) => [Number(roleId), cloneValueMap(vars)]));
}

function cloneRoleKeySets(value: Map<number, Set<string>>): Record<number, string[]> {
  return Object.fromEntries([...value.entries()].map(([roleId, keys]) => [
    roleId,
    [...keys].sort((left, right) => left.localeCompare(right, "zh-CN")),
  ]));
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
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>,
): number {
  if (scope.kind === STATE_EVENT_SCOPE_KIND.ROOM) {
    return roomVars[key] ?? 0;
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

function buildSummary(
  primaryCandidates: string[],
  scopeLabels: string[],
  detailLines: string[],
): StateEventMessageSummary {
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

function isScopedStateAtom(atom: StateEventAtom): atom is Extract<StateEventAtom, { scope: StateEventScope }> {
  return "scope" in atom;
}

function formatVarOpRecordPrimary(atom: Extract<StateEventAtom, { type: "varOp" }>): string {
  const opLabel = atom.op === STATE_EVENT_VAR_OP.SET
    ? "="
    : atom.op === STATE_EVENT_VAR_OP.ADD
      ? "+"
      : "-";
  return `${formatStateKeyLabel(atom.key)} ${opLabel} ${formatStateNumericValue(atom.value)}`;
}

function formatVarOpSnapshotPrimary(atom: StateEventVarOpSnapshot): string {
  return `${formatStateKeyLabel(atom.key)} ${formatStateNumericValue(atom.beforeValue)} -> ${formatStateNumericValue(atom.afterValue)}`;
}

function applyVarOpValue(beforeValue: number, atom: StateEventVarOpAtom): number {
  if (atom.op === STATE_EVENT_VAR_OP.SET) {
    return atom.value;
  }
  if (atom.op === STATE_EVENT_VAR_OP.ADD) {
    return beforeValue + atom.value;
  }
  return beforeValue - atom.value;
}

function reverseVarOpValue(afterValue: number, atom: StateEventVarOpAtom): number {
  if (atom.op === STATE_EVENT_VAR_OP.SET) {
    return typeof atom.beforeValue === "number" ? atom.beforeValue : 0;
  }
  if (atom.op === STATE_EVENT_VAR_OP.ADD) {
    return afterValue - atom.value;
  }
  return afterValue + atom.value;
}

function stateScopeKey(scope: StateEventScope): string {
  return scope.kind === STATE_EVENT_SCOPE_KIND.ROOM ? "room" : `role:${scope.roleId}`;
}

function getTimelineValue(timelineValues: Map<string, number>, scope: StateEventScope, key: string): number | undefined {
  return timelineValues.get(`${stateScopeKey(scope)}:${key}`);
}

function setTimelineValue(timelineValues: Map<string, number>, scope: StateEventScope, key: string, value: number): void {
  timelineValues.set(`${stateScopeKey(scope)}:${key}`, value);
}

function snapshotKey(messageId: number, atomIndex: number): string {
  return `${messageId}:${atomIndex}`;
}

function isRoleVarOpAtom(atom: StateEventAtom): atom is StateEventRoleVarOpAtom {
  return atom.type === "varOp" && atom.scope.kind === STATE_EVENT_SCOPE_KIND.ROLE;
}

function collectRoleVarOpTimelineItems(messages: BuildStateRuntimeParams["messages"]): RoleVarOpTimelineItem[] {
  return messages.flatMap((message) => {
    const normalizedExtra = getNormalizedStateEventExtra(message.extra);
    if (!normalizedExtra) {
      return [];
    }
    return normalizedExtra.events.flatMap((atom, atomIndex) => (
      isRoleVarOpAtom(atom)
        ? [{ atom, atomIndex, messageId: message.messageId }]
        : []
    ));
  });
}

function applyForwardRoleVarOpSnapshots(items: RoleVarOpTimelineItem[]): Map<string, StateEventVarOpSnapshot> {
  const timelineValues = new Map<string, number>();
  const snapshots = new Map<string, StateEventVarOpSnapshot>();

  items.forEach(({ atom, atomIndex, messageId }) => {
    const explicitBefore = atom.beforeValue;
    const explicitAfter = atom.afterValue;
    const currentValue = getTimelineValue(timelineValues, atom.scope, atom.key);
    let beforeValue: number | undefined;
    let afterValue: number | undefined;
    if (typeof explicitBefore === "number" && typeof explicitAfter === "number") {
      beforeValue = explicitBefore;
      afterValue = explicitAfter;
    }
    else if (typeof currentValue === "number") {
      beforeValue = currentValue;
      afterValue = applyVarOpValue(beforeValue, atom);
    }
    else if (atom.op === STATE_EVENT_VAR_OP.SET) {
      beforeValue = 0;
      afterValue = atom.value;
    }

    if (typeof beforeValue !== "number" || typeof afterValue !== "number") {
      return;
    }
    snapshots.set(snapshotKey(messageId, atomIndex), {
      ...atom,
      beforeValue,
      afterValue,
    });
    setTimelineValue(timelineValues, atom.scope, atom.key, afterValue);
  });

  return snapshots;
}

function collectReverseTimelineValues(
  items: RoleVarOpTimelineItem[],
  snapshots: Map<string, StateEventVarOpSnapshot>,
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>,
): Map<string, number> {
  const values = new Map<string, number>();
  items.forEach(({ atom, atomIndex, messageId }) => {
    const fallbackValue = getFallbackRoleAbilityValue(fallbackRoleAbilitiesByRoleId[atom.scope.roleId], atom.key);
    if (typeof fallbackValue === "number") {
      setTimelineValue(values, atom.scope, atom.key, fallbackValue);
      return;
    }
    const snapshot = snapshots.get(snapshotKey(messageId, atomIndex));
    if (snapshot) {
      setTimelineValue(values, atom.scope, atom.key, snapshot.afterValue);
    }
  });
  return values;
}

function inferRoleVarOpSnapshots(
  events: BuildStateRuntimeParams["messages"],
  fallbackRoleAbilitiesByRoleId: Record<number, RoleAbility | null | undefined>,
): Map<string, StateEventVarOpSnapshot> {
  const roleVarOps = collectRoleVarOpTimelineItems(events);
  const inferred = applyForwardRoleVarOpSnapshots(roleVarOps);
  const timelineValues = collectReverseTimelineValues(roleVarOps, inferred, fallbackRoleAbilitiesByRoleId);

  for (let index = roleVarOps.length - 1; index >= 0; index -= 1) {
    const { atom, atomIndex, messageId } = roleVarOps[index];
    const key = snapshotKey(messageId, atomIndex);
    const existingSnapshot = inferred.get(key);
    if (existingSnapshot) {
      setTimelineValue(timelineValues, atom.scope, atom.key, existingSnapshot.beforeValue);
      continue;
    }
    const afterValue = getTimelineValue(timelineValues, atom.scope, atom.key);
    if (typeof afterValue !== "number") {
      continue;
    }
    const beforeValue = reverseVarOpValue(afterValue, atom);
    const resolvedAfterValue = applyVarOpValue(beforeValue, atom);
    inferred.set(key, {
      ...atom,
      beforeValue,
      afterValue: resolvedAfterValue,
    });
    setTimelineValue(timelineValues, atom.scope, atom.key, beforeValue);
  }

  return inferred;
}

function formatCombatAtomPrimary(atom: Exclude<StateEventAtom, Extract<StateEventAtom, { scope: StateEventScope }> | { type: "nextTurn" }>): string {
  if (atom.type === "combatRoundStart") {
    return "进入战斗轮";
  }
  if (atom.type === "combatRoundEnd") {
    return "结束战斗";
  }
  if (atom.type === "mapTokenUpsert") {
    return `地图角色 #${atom.roleId} 移动到 第 ${atom.rowIndex + 1} 行 · 第 ${atom.colIndex + 1} 列`;
  }
  if (atom.type === "mapTokenRemove") {
    return `移除地图角色 #${atom.roleId}`;
  }
  if (atom.type === "mapConfigUpsert") {
    return `更新地图配置 ${atom.gridRows}×${atom.gridCols}`;
  }
  if (atom.type === "mapConfigClear") {
    return "清空地图配置";
  }
  return "战斗事件";
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
    collectFallbackRoleAbilityKeys(fallbackRoleAbilitiesByRoleId[roleId]).forEach(key => keys.add(key));
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

export function compareStateValueText(baseValue: number, displayValue: number): string {
  if (baseValue === displayValue) {
    return formatStateNumericValue(displayValue);
  }
  return `${formatStateNumericValue(baseValue)}→${formatStateNumericValue(displayValue)}`;
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
  const recordedRoleValueKeysByRoleId = new Map<number, Set<string>>();
  const unresolvedStates: UnresolvedState[] = [];
  const messageSummariesByMessageId: Record<number, StateEventMessageSummary> = {};
  const inferredRoleVarOpSnapshots = inferRoleVarOpSnapshots(effectiveMessages, fallbackRoleAbilitiesByRoleId);
  let activeStates: ActiveStateInstance[] = [];
  let turn = 0;
  let combatRoundActive = false;

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
      if (isScopedStateAtom(atom)) {
        scopeLabels.add(collectScopeLabel(atom.scope));
      }

      if (atom.type === "varOp") {
        if (atom.scope.kind !== STATE_EVENT_SCOPE_KIND.ROOM) {
          ensureRoleKeySet(observedRoleKeysByRoleId, atom.scope.roleId).add(atom.key);
          ensureRoleKeySet(recordedRoleValueKeysByRoleId, atom.scope.roleId).add(atom.key);
          const inferredSnapshot = inferredRoleVarOpSnapshots.get(snapshotKey(message.messageId, atomIndex));
          primaryCandidates.push(inferredSnapshot
            ? formatVarOpSnapshotPrimary(inferredSnapshot)
            : formatVarOpRecordPrimary(atom));
          detailLines.push(formatStateEventAtomDetail(inferredSnapshot ?? atom));
          return;
        }

        observedRoomKeys.add(atom.key);
        const beforeValue = readScopeBaseValue(atom.scope, atom.key, roomVars, fallbackRoleAbilitiesByRoleId);
        const afterValue = atom.op === STATE_EVENT_VAR_OP.SET
          ? atom.value
          : atom.op === STATE_EVENT_VAR_OP.ADD
            ? beforeValue + atom.value
            : beforeValue - atom.value;
        roomVars[atom.key] = afterValue;
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

      if (atom.type === "combatRoundEnd") {
        const previousTurn = turn;
        combatRoundActive = false;
        turn = 0;
        primaryCandidates.push("结束战斗");
        detailLines.push(`结束战斗 · 回合 ${previousTurn} -> 0`);
        return;
      }

      if (atom.type === "combatRoundStart") {
        combatRoundActive = true;
        primaryCandidates.push("进入战斗轮");
        detailLines.push(`进入战斗轮 · 当前回合 ${turn}`);
        return;
      }

      if (atom.type !== "nextTurn") {
        primaryCandidates.push(formatCombatAtomPrimary(atom));
        detailLines.push(formatStateEventAtomDetail(atom));
        return;
      }

      if (!combatRoundActive) {
        primaryCandidates.push("未开始战斗");
        detailLines.push("未开始战斗，忽略下一回合");
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
    combatRoundActive,
    roomVars: cloneValueMap(roomVars),
    roleVarsByRoleId: cloneRoleVarsMap(roleVarsByRoleId),
    recordedRoleValueKeysByRoleId: cloneRoleKeySets(recordedRoleValueKeysByRoleId),
    activeStates: [...activeStates],
    baseDisplayValues,
    derivedDisplayValues,
    unresolvedStates,
    messageSummariesByMessageId,
  };
}

export function buildCombatStateRuntime(params: BuildCombatStateRuntimeParams): CombatStateRuntime {
  const stateRuntime = buildStateRuntime(params);
  const effectiveMessages = params.messages.filter(message => message.status !== 1 && message.messageType === MESSAGE_TYPE.STATE_EVENT);
  const mapTokensByRoleId = new Map<number, CombatMapToken>();
  let mapConfig: CombatMapConfig | null = null;
  let hasMapConfigState = false;
  let hasMapState = false;

  effectiveMessages.forEach((message) => {
    const normalizedExtra = getNormalizedStateEventExtra(message.extra);
    if (!normalizedExtra) {
      return;
    }

    normalizedExtra.events.forEach((atom) => {
      if (atom.type === "mapTokenUpsert") {
        hasMapState = true;
        mapTokensByRoleId.set(atom.roleId, {
          roleId: atom.roleId,
          rowIndex: atom.rowIndex,
          colIndex: atom.colIndex,
        });
        return;
      }

      if (atom.type === "mapTokenRemove") {
        hasMapState = true;
        mapTokensByRoleId.delete(atom.roleId);
        return;
      }

      if (atom.type === "mapConfigUpsert") {
        hasMapState = true;
        hasMapConfigState = true;
        mapConfig = {
          mapFileId: atom.mapFileId,
          ...(atom.imageUrl ? { imageUrl: atom.imageUrl } : {}),
          gridRows: atom.gridRows,
          gridCols: atom.gridCols,
          gridColor: atom.gridColor,
        };
        if (atom.clearTokens) {
          mapTokensByRoleId.clear();
          return;
        }
        mapTokensByRoleId.forEach((token, roleId) => {
          if (token.rowIndex >= atom.gridRows || token.colIndex >= atom.gridCols) {
            mapTokensByRoleId.delete(roleId);
          }
        });
        return;
      }

      if (atom.type === "mapConfigClear") {
        hasMapState = true;
        hasMapConfigState = true;
        mapConfig = null;
        mapTokensByRoleId.clear();
      }
    });
  });

  const mapTokens = [...mapTokensByRoleId.values()].sort((left, right) => left.roleId - right.roleId);

  return {
    ...stateRuntime,
    participants: [],
    participantsById: {},
    mapConfig,
    mapTokens,
    mapTokensByRoleId: Object.fromEntries(mapTokens.map(token => [token.roleId, token])),
    hasMapConfigState,
    hasMapState,
  };
}
