import type { RoleAbility } from "@tuanchat/openapi-client/models/RoleAbility";

import type { StateEventAtom, StateEventCombatValue, StateEventScope } from "../state-event";
import type {
  ActiveStateInstance,
  BuildCombatStateRuntimeParams,
  BuildStateRuntimeParams,
  CombatColumn,
  CombatMapToken,
  CombatParticipant,
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
import { buildCombatInitiativeBatchPrimaryText } from "./combatInitiativeBatch";

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

function isScopedStateAtom(atom: StateEventAtom): atom is Extract<StateEventAtom, { scope: StateEventScope }> {
  return "scope" in atom;
}

function formatCombatAtomPrimary(atom: Exclude<StateEventAtom, Extract<StateEventAtom, { scope: StateEventScope }> | { type: "nextTurn" }>): string {
  if (atom.type === "combatRoundEnd") {
    return "结束战斗";
  }
  if (atom.type === "combatParticipantUpsert") {
    const name = atom.name ?? atom.participantId;
    if (typeof atom.initiative === "number") {
      return `先攻 ${name} = ${formatStateNumericValue(atom.initiative)}`;
    }
    return `更新先攻参与者 ${name}`;
  }
  if (atom.type === "combatParticipantRemove") {
    return `移除先攻参与者 ${atom.participantId}`;
  }
  if (atom.type === "combatOrderSet") {
    return "调整先攻顺序";
  }
  if (atom.type === "combatActiveParticipantSet") {
    return atom.participantId ? `当前行动者 ${atom.participantId}` : "清空当前行动者";
  }
  if (atom.type === "combatColumnUpsert") {
    return `更新战斗列 ${atom.label}`;
  }
  if (atom.type === "combatColumnRemove") {
    return `移除战斗列 ${atom.key}`;
  }
  if (atom.type === "combatMapTokenUpsert") {
    return `地图角色 #${atom.roleId} 移动到 第 ${atom.rowIndex + 1} 行 · 第 ${atom.colIndex + 1} 列`;
  }
  if (atom.type === "combatMapTokenRemove") {
    return `移除地图角色 #${atom.roleId}`;
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
      if (isScopedStateAtom(atom)) {
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

      if (atom.type === "combatRoundEnd") {
        const previousTurn = turn;
        turn = 0;
        primaryCandidates.push("结束战斗");
        detailLines.push(`结束战斗 · 回合 ${previousTurn} -> 0`);
        return;
      }

      if (atom.type !== "nextTurn") {
        primaryCandidates.push(formatCombatAtomPrimary(atom));
        detailLines.push(formatStateEventAtomDetail(atom));
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

    const combatBatchPrimaryText = buildCombatInitiativeBatchPrimaryText(normalizedExtra);
    messageSummariesByMessageId[message.messageId] = combatBatchPrimaryText
      ? {
          primaryText: combatBatchPrimaryText,
          detailLines,
        }
      : buildSummary(primaryCandidates, [...scopeLabels], detailLines);
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

type MutableCombatParticipant = {
  participantId: string;
  name?: string;
  roleId?: number;
  initiative?: number;
  values: Record<string, StateEventCombatValue>;
};

function cloneCombatValues(values: Record<string, StateEventCombatValue> | undefined): Record<string, StateEventCombatValue> {
  return values ? { ...values } : {};
}

function mergeCombatValues(
  current: Record<string, StateEventCombatValue>,
  patch: Record<string, StateEventCombatValue> | undefined,
): Record<string, StateEventCombatValue> {
  if (!patch) {
    return current;
  }
  return {
    ...current,
    ...patch,
  };
}

function getFallbackParticipantName(participant: MutableCombatParticipant): string {
  if (participant.name?.trim()) {
    return participant.name.trim();
  }
  if (typeof participant.roleId === "number") {
    return `角色 #${participant.roleId}`;
  }
  return participant.participantId;
}

function sortParticipantsByInitiative(left: MutableCombatParticipant, right: MutableCombatParticipant): number {
  const initiativeDiff = (right.initiative ?? 0) - (left.initiative ?? 0);
  if (initiativeDiff !== 0) {
    return initiativeDiff;
  }
  const nameDiff = getFallbackParticipantName(left).localeCompare(getFallbackParticipantName(right), "zh-CN");
  if (nameDiff !== 0) {
    return nameDiff;
  }
  return left.participantId.localeCompare(right.participantId, "zh-CN");
}

function buildOrderedParticipantIds(
  participantsById: ReadonlyMap<string, MutableCombatParticipant>,
  explicitOrder: string[],
): string[] {
  const seen = new Set<string>();
  const orderedIds: string[] = [];
  explicitOrder.forEach((participantId) => {
    if (!participantsById.has(participantId) || seen.has(participantId)) {
      return;
    }
    seen.add(participantId);
    orderedIds.push(participantId);
  });

  const remaining = [...participantsById.values()]
    .filter(participant => !seen.has(participant.participantId))
    .sort(sortParticipantsByInitiative);
  remaining.forEach((participant) => {
    seen.add(participant.participantId);
    orderedIds.push(participant.participantId);
  });
  return orderedIds;
}

function materializeCombatParticipant(
  participant: MutableCombatParticipant,
  stateRuntime: StateRuntime,
): CombatParticipant {
  const roleId = participant.roleId;
  const baseValues = typeof roleId === "number"
    ? cloneValueMap(stateRuntime.baseDisplayValues.rolesByRoleId[roleId] ?? {})
    : {};
  const derivedValues = typeof roleId === "number"
    ? cloneValueMap(stateRuntime.derivedDisplayValues.rolesByRoleId[roleId] ?? {})
    : {};
  const activeStates = typeof roleId === "number"
    ? stateRuntime.activeStates.filter(state => state.scope.kind === STATE_EVENT_SCOPE_KIND.ROLE && state.scope.roleId === roleId)
    : [];
  return {
    participantId: participant.participantId,
    name: getFallbackParticipantName(participant),
    ...(typeof roleId === "number" ? { roleId } : {}),
    initiative: participant.initiative ?? 0,
    values: cloneCombatValues(participant.values),
    baseValues,
    derivedValues,
    activeStates,
  };
}

export function buildCombatStateRuntime(params: BuildCombatStateRuntimeParams): CombatStateRuntime {
  const stateRuntime = buildStateRuntime(params);
  const effectiveMessages = params.messages.filter(message => message.status !== 1 && message.messageType === MESSAGE_TYPE.STATE_EVENT);
  const mutableParticipantsById = new Map<string, MutableCombatParticipant>();
  const columnsByKey = new Map<string, CombatColumn>();
  const mapTokensByRoleId = new Map<number, CombatMapToken>();
  let explicitOrder: string[] = [];
  let activeParticipantId: string | null = null;
  let hasMapState = false;

  effectiveMessages.forEach((message) => {
    const normalizedExtra = getNormalizedStateEventExtra(message.extra);
    if (!normalizedExtra) {
      return;
    }

    normalizedExtra.events.forEach((atom) => {
      if (atom.type === "combatParticipantUpsert") {
        const current = mutableParticipantsById.get(atom.participantId);
        const next: MutableCombatParticipant = {
          participantId: atom.participantId,
          name: atom.name ?? current?.name,
          roleId: atom.roleId ?? current?.roleId,
          initiative: typeof atom.initiative === "number" ? atom.initiative : current?.initiative,
          values: mergeCombatValues(current?.values ?? {}, atom.values),
        };
        mutableParticipantsById.set(atom.participantId, next);
        if (!explicitOrder.includes(atom.participantId)) {
          explicitOrder = [...explicitOrder, atom.participantId];
        }
        return;
      }

      if (atom.type === "combatParticipantRemove") {
        mutableParticipantsById.delete(atom.participantId);
        explicitOrder = explicitOrder.filter(participantId => participantId !== atom.participantId);
        if (activeParticipantId === atom.participantId) {
          activeParticipantId = null;
        }
        return;
      }

      if (atom.type === "combatOrderSet") {
        explicitOrder = atom.participantIds;
        return;
      }

      if (atom.type === "combatRoundEnd") {
        mutableParticipantsById.clear();
        explicitOrder = [];
        activeParticipantId = null;
        return;
      }

      if (atom.type === "combatActiveParticipantSet") {
        activeParticipantId = atom.participantId ?? null;
        return;
      }

      if (atom.type === "combatColumnUpsert") {
        columnsByKey.set(atom.key, {
          key: atom.key,
          label: atom.label,
          source: atom.source,
          ...(atom.attrKey ? { attrKey: atom.attrKey } : {}),
          ...(atom.stateKey ? { stateKey: atom.stateKey } : {}),
        });
        return;
      }

      if (atom.type === "combatColumnRemove") {
        columnsByKey.delete(atom.key);
        return;
      }

      if (atom.type === "combatMapTokenUpsert") {
        hasMapState = true;
        mapTokensByRoleId.set(atom.roleId, {
          roleId: atom.roleId,
          rowIndex: atom.rowIndex,
          colIndex: atom.colIndex,
        });
        return;
      }

      if (atom.type === "combatMapTokenRemove") {
        hasMapState = true;
        mapTokensByRoleId.delete(atom.roleId);
      }
    });
  });

  const orderedParticipantIds = buildOrderedParticipantIds(mutableParticipantsById, explicitOrder);
  const participants = orderedParticipantIds
    .map(participantId => mutableParticipantsById.get(participantId))
    .filter((participant): participant is MutableCombatParticipant => Boolean(participant))
    .map(participant => materializeCombatParticipant(participant, stateRuntime));
  const participantsById = Object.fromEntries(participants.map(participant => [participant.participantId, participant]));
  const columns = [...columnsByKey.values()];
  const mapTokens = [...mapTokensByRoleId.values()].sort((left, right) => left.roleId - right.roleId);

  return {
    ...stateRuntime,
    participants,
    participantsById,
    columns,
    columnsByKey: Object.fromEntries(columns.map(column => [column.key, column])),
    activeParticipantId: activeParticipantId && participantsById[activeParticipantId] ? activeParticipantId : null,
    mapTokens,
    mapTokensByRoleId: Object.fromEntries(mapTokens.map(token => [token.roleId, token])),
    hasMapState,
  };
}
