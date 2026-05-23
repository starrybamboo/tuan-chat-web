import type { MessageExtra as ApiMessageExtra } from "@tuanchat/openapi-client/models/MessageExtra";
import type { StateEventExtra as ApiStateEventExtra } from "@tuanchat/openapi-client/models/StateEventExtra";
import type { StateEventScope as ApiStateEventScope } from "@tuanchat/openapi-client/models/StateEventScope";
import type { StateEventSource as ApiStateEventSource } from "@tuanchat/openapi-client/models/StateEventSource";

import { buildCombatInitiativeBatchPrimaryText } from "./state-runtime/combatInitiativeBatch";

export const STATE_EVENT_PARSER_VERSION = "state-event-v1";

export const STATE_EVENT_SOURCE_KIND = {
  COMMAND: "command",
  UI: "ui",
} as const;

export const STATE_EVENT_SCOPE_KIND = {
  ROOM: "room",
  ROLE: "role",
} as const;

export const STATE_EVENT_VAR_OP = {
  SET: "set",
  ADD: "add",
  SUB: "sub",
} as const;

export const STATE_EVENT_STACK_MODE = {
  REFRESH: "refresh",
  STACK: "stack",
  REPLACE: "replace",
} as const;

export const STATE_EVENT_STATUS_MODIFIER_OP = {
  ADD: "add",
  SUB: "sub",
  MUL_PERCENT: "mulPercent",
  OVERRIDE: "override",
} as const;

export const STATE_EVENT_COMBAT_COLUMN_SOURCE = {
  MANUAL: "manual",
  ROLE_ATTR: "roleAttr",
  STATE_KEY: "stateKey",
} as const;

export type StateEventSourceKind = typeof STATE_EVENT_SOURCE_KIND[keyof typeof STATE_EVENT_SOURCE_KIND];
export type StateEventScopeKind = typeof STATE_EVENT_SCOPE_KIND[keyof typeof STATE_EVENT_SCOPE_KIND];
export type StateEventVarOpKind = typeof STATE_EVENT_VAR_OP[keyof typeof STATE_EVENT_VAR_OP];
export type StateEventStackMode = typeof STATE_EVENT_STACK_MODE[keyof typeof STATE_EVENT_STACK_MODE];
export type StateStatusModifierOp = typeof STATE_EVENT_STATUS_MODIFIER_OP[keyof typeof STATE_EVENT_STATUS_MODIFIER_OP];
export type StateEventCombatColumnSource = typeof STATE_EVENT_COMBAT_COLUMN_SOURCE[keyof typeof STATE_EVENT_COMBAT_COLUMN_SOURCE];
export type StateEventCombatValue = string | number | null;

export type StateEventSource = {
  kind: StateEventSourceKind;
  commandName?: string;
  parserVersion: string;
};

export type RoomStateEventScope = {
  kind: "room";
};

export type RoleStateEventScope = {
  kind: "role";
  roleId: number;
};

export type StateEventScope = RoomStateEventScope | RoleStateEventScope;

export type StateEventVarOp = {
  type: "varOp";
  scope: StateEventScope;
  key: string;
  op: StateEventVarOpKind;
  value: number;
};

export type StateEventStatusApply = {
  type: "statusApply";
  scope: StateEventScope;
  statusId: string;
  durationTurns?: number;
};

export type StateEventStatusRemove = {
  type: "statusRemove";
  scope: StateEventScope;
  statusName: string;
};

export type StateEventNextTurn = {
  type: "nextTurn";
};

export type StateEventCombatRoundEnd = {
  type: "combatRoundEnd";
};

export type StateEventCombatParticipantUpsert = {
  type: "combatParticipantUpsert";
  participantId: string;
  roleId?: number;
  name?: string;
  initiative?: number;
  values?: Record<string, StateEventCombatValue>;
};

export type StateEventCombatParticipantRemove = {
  type: "combatParticipantRemove";
  participantId: string;
};

export type StateEventCombatOrderSet = {
  type: "combatOrderSet";
  participantIds: string[];
};

export type StateEventCombatActiveParticipantSet = {
  type: "combatActiveParticipantSet";
  participantId?: string;
};

export type StateEventCombatColumnUpsert = {
  type: "combatColumnUpsert";
  key: string;
  label: string;
  source: StateEventCombatColumnSource;
  attrKey?: string;
  stateKey?: string;
};

export type StateEventCombatColumnRemove = {
  type: "combatColumnRemove";
  key: string;
};

export type StateEventCombatMapTokenUpsert = {
  type: "combatMapTokenUpsert";
  roleId: number;
  rowIndex: number;
  colIndex: number;
};

export type StateEventCombatMapTokenRemove = {
  type: "combatMapTokenRemove";
  roleId: number;
};

export type StateEventAtom
  = | StateEventVarOp
    | StateEventStatusApply
    | StateEventStatusRemove
    | StateEventNextTurn
    | StateEventCombatRoundEnd
    | StateEventCombatParticipantUpsert
    | StateEventCombatParticipantRemove
    | StateEventCombatOrderSet
    | StateEventCombatActiveParticipantSet
    | StateEventCombatColumnUpsert
    | StateEventCombatColumnRemove
    | StateEventCombatMapTokenUpsert
    | StateEventCombatMapTokenRemove;

export type StateEventExtra = {
  source: StateEventSource;
  events: StateEventAtom[];
};

export type StateScopeLabelOptions = {
  roleNameById?: Record<number, string | null | undefined>;
  roomLabel?: string;
  fallbackRoleLabel?: (roleId: number) => string;
};

type MessageExtraRecord = Record<string, unknown>;

function toRecord(value: unknown): MessageExtraRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as MessageExtraRecord;
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toPositiveInteger(value: unknown): number | undefined {
  const normalized = toFiniteNumber(value);
  if (typeof normalized !== "number" || normalized <= 0) {
    return undefined;
  }
  return Math.trunc(normalized);
}

function toNonNegativeInteger(value: unknown): number | undefined {
  const normalized = toFiniteNumber(value);
  if (typeof normalized !== "number" || normalized < 0) {
    return undefined;
  }
  return Math.trunc(normalized);
}

function toCombatValueRecord(value: unknown): Record<string, StateEventCombatValue> | undefined {
  const record = toRecord(value);
  if (!record) {
    return undefined;
  }
  const normalized: Record<string, StateEventCombatValue> = {};
  Object.entries(record).forEach(([key, rawValue]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return;
    }
    if (typeof rawValue === "string") {
      normalized[normalizedKey] = rawValue;
      return;
    }
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      normalized[normalizedKey] = rawValue;
      return;
    }
    if (rawValue === null) {
      normalized[normalizedKey] = null;
    }
  });
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeParticipantIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const participantIds: string[] = [];
  const seen = new Set<string>();
  value.forEach((item) => {
    const participantId = toTrimmedString(item);
    if (!participantId || seen.has(participantId)) {
      return;
    }
    seen.add(participantId);
    participantIds.push(participantId);
  });
  return participantIds;
}

function normalizeCombatColumnSource(value: unknown): StateEventCombatColumnSource | undefined {
  const source = toTrimmedString(value);
  if (
    source === STATE_EVENT_COMBAT_COLUMN_SOURCE.MANUAL
    || source === STATE_EVENT_COMBAT_COLUMN_SOURCE.ROLE_ATTR
    || source === STATE_EVENT_COMBAT_COLUMN_SOURCE.STATE_KEY
  ) {
    return source;
  }
  return undefined;
}

function normalizeStateEventSource(rawSource: unknown): StateEventSource | undefined {
  const source = toRecord(rawSource);
  if (!source) {
    return undefined;
  }
  const kind = toTrimmedString(source.kind);
  const parserVersion = toTrimmedString(source.parserVersion);
  if ((kind !== STATE_EVENT_SOURCE_KIND.COMMAND && kind !== STATE_EVENT_SOURCE_KIND.UI) || !parserVersion) {
    return undefined;
  }
  return {
    kind,
    ...(kind === STATE_EVENT_SOURCE_KIND.COMMAND && toTrimmedString(source.commandName)
      ? { commandName: toTrimmedString(source.commandName) }
      : {}),
    parserVersion,
  };
}

export function normalizeStateEventScope(rawScope: unknown): StateEventScope | undefined {
  const scope = toRecord(rawScope);
  if (!scope) {
    return undefined;
  }
  const kind = toTrimmedString(scope.kind);
  if (kind === STATE_EVENT_SCOPE_KIND.ROOM) {
    return { kind: STATE_EVENT_SCOPE_KIND.ROOM };
  }
  if (kind === STATE_EVENT_SCOPE_KIND.ROLE) {
    const roleId = toPositiveInteger(scope.roleId);
    if (!roleId) {
      return undefined;
    }
    return {
      kind: STATE_EVENT_SCOPE_KIND.ROLE,
      roleId,
    };
  }
  return undefined;
}

function normalizeStateEventAtom(rawAtom: unknown): StateEventAtom | undefined {
  const atom = toRecord(rawAtom);
  if (!atom) {
    return undefined;
  }

  const type = toTrimmedString(atom.type);
  if (!type) {
    return undefined;
  }

  if (type === "nextTurn") {
    return { type: "nextTurn" };
  }

  if (type === "combatRoundEnd") {
    return { type: "combatRoundEnd" };
  }

  if (type === "combatParticipantUpsert") {
    const participantId = toTrimmedString(atom.participantId);
    if (!participantId) {
      return undefined;
    }
    const roleId = toPositiveInteger(atom.roleId);
    const name = toTrimmedString(atom.name);
    const initiative = toFiniteNumber(atom.initiative);
    const values = toCombatValueRecord(atom.values);
    return {
      type: "combatParticipantUpsert",
      participantId,
      ...(typeof roleId === "number" ? { roleId } : {}),
      ...(name ? { name } : {}),
      ...(typeof initiative === "number" ? { initiative } : {}),
      ...(values ? { values } : {}),
    };
  }

  if (type === "combatParticipantRemove") {
    const participantId = toTrimmedString(atom.participantId);
    return participantId
      ? { type: "combatParticipantRemove", participantId }
      : undefined;
  }

  if (type === "combatOrderSet") {
    const participantIds = normalizeParticipantIds(atom.participantIds);
    return participantIds
      ? { type: "combatOrderSet", participantIds }
      : undefined;
  }

  if (type === "combatActiveParticipantSet") {
    const participantId = toTrimmedString(atom.participantId);
    return {
      type: "combatActiveParticipantSet",
      ...(participantId ? { participantId } : {}),
    };
  }

  if (type === "combatColumnUpsert") {
    const key = toTrimmedString(atom.key);
    const label = toTrimmedString(atom.label);
    const source = normalizeCombatColumnSource(atom.source);
    if (!key || !label || !source) {
      return undefined;
    }
    const attrKey = toTrimmedString(atom.attrKey);
    const stateKey = toTrimmedString(atom.stateKey);
    if (source === STATE_EVENT_COMBAT_COLUMN_SOURCE.ROLE_ATTR && !attrKey) {
      return undefined;
    }
    if (source === STATE_EVENT_COMBAT_COLUMN_SOURCE.STATE_KEY && !stateKey) {
      return undefined;
    }
    return {
      type: "combatColumnUpsert",
      key,
      label,
      source,
      ...(source === STATE_EVENT_COMBAT_COLUMN_SOURCE.ROLE_ATTR ? { attrKey } : {}),
      ...(source === STATE_EVENT_COMBAT_COLUMN_SOURCE.STATE_KEY ? { stateKey } : {}),
    };
  }

  if (type === "combatColumnRemove") {
    const key = toTrimmedString(atom.key);
    return key
      ? { type: "combatColumnRemove", key }
      : undefined;
  }

  if (type === "combatMapTokenUpsert") {
    const roleId = toPositiveInteger(atom.roleId);
    const rowIndex = toNonNegativeInteger(atom.rowIndex);
    const colIndex = toNonNegativeInteger(atom.colIndex);
    if (!roleId || typeof rowIndex !== "number" || typeof colIndex !== "number") {
      return undefined;
    }
    return {
      type: "combatMapTokenUpsert",
      roleId,
      rowIndex,
      colIndex,
    };
  }

  if (type === "combatMapTokenRemove") {
    const roleId = toPositiveInteger(atom.roleId);
    return roleId
      ? { type: "combatMapTokenRemove", roleId }
      : undefined;
  }

  const scope = normalizeStateEventScope(atom.scope);
  if (!scope) {
    return undefined;
  }

  if (type === "varOp") {
    const key = toTrimmedString(atom.key);
    const op = toTrimmedString(atom.op);
    const value = toFiniteNumber(atom.value);
    if (!key || (op !== STATE_EVENT_VAR_OP.SET && op !== STATE_EVENT_VAR_OP.ADD && op !== STATE_EVENT_VAR_OP.SUB) || typeof value !== "number") {
      return undefined;
    }
    return {
      type: "varOp",
      scope,
      key,
      op,
      value,
    };
  }

  if (type === "statusApply") {
    const statusId = toTrimmedString(atom.statusId);
    if (!statusId) {
      return undefined;
    }
    const durationTurns = toPositiveInteger(atom.durationTurns);
    return {
      type: "statusApply",
      scope,
      statusId,
      ...(typeof durationTurns === "number" ? { durationTurns } : {}),
    };
  }

  if (type === "statusRemove") {
    const statusName = toTrimmedString(atom.statusName);
    if (!statusName) {
      return undefined;
    }
    return {
      type: "statusRemove",
      scope,
      statusName,
    };
  }

  return undefined;
}

export function normalizeStateEventExtra(rawExtra: unknown): StateEventExtra | undefined {
  const extra = toRecord(rawExtra);
  if (!extra) {
    return undefined;
  }
  const source = normalizeStateEventSource(extra.source);
  if (!source) {
    return undefined;
  }
  const rawEvents = Array.isArray(extra.events) ? extra.events : [];
  const events = rawEvents
    .map(item => normalizeStateEventAtom(item))
    .filter((item): item is StateEventAtom => Boolean(item));
  if (events.length === 0) {
    return undefined;
  }
  return {
    source,
    events,
  };
}

export function getRawStateEventExtra(extra: unknown): ApiStateEventExtra | undefined {
  const record = toRecord(extra);
  const nested = record?.stateEvent;
  return toRecord(nested) ? nested as ApiStateEventExtra : undefined;
}

export function getNormalizedStateEventExtra(extra: unknown): StateEventExtra | undefined {
  return normalizeStateEventExtra(getRawStateEventExtra(extra));
}

export function buildRoomStateEventScope(): RoomStateEventScope {
  return {
    kind: STATE_EVENT_SCOPE_KIND.ROOM,
  };
}

export function buildRoleStateEventScope(roleId: number): RoleStateEventScope {
  return {
    kind: STATE_EVENT_SCOPE_KIND.ROLE,
    roleId,
  };
}

export function buildCommandStateEventExtra(
  commandName: string,
  events: StateEventAtom[],
): StateEventExtra {
  return {
    source: {
      kind: STATE_EVENT_SOURCE_KIND.COMMAND,
      commandName,
      parserVersion: STATE_EVENT_PARSER_VERSION,
    },
    events,
  };
}

export function buildUiStateEventExtra(events: StateEventAtom[]): StateEventExtra {
  return {
    source: {
      kind: STATE_EVENT_SOURCE_KIND.UI,
      parserVersion: STATE_EVENT_PARSER_VERSION,
    },
    events,
  };
}

export function toApiStateEventExtra(extra: StateEventExtra): ApiStateEventExtra {
  return extra as ApiStateEventExtra;
}

export function toApiStateEventSource(source: StateEventSource): ApiStateEventSource {
  return source as ApiStateEventSource;
}

export function toApiStateEventScope(scope: StateEventScope): ApiStateEventScope {
  return scope as ApiStateEventScope;
}

export function toApiMessageExtraWithStateEvent(extra: StateEventExtra): ApiMessageExtra {
  return {
    stateEvent: toApiStateEventExtra(extra),
  };
}

export function formatStateNumericValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatStateKeyLabel(key: string): string {
  const normalized = key.trim();
  if (!normalized) {
    return "变量";
  }
  return /^[\w:-]+$/.test(normalized) ? normalized.toUpperCase() : normalized;
}

export function formatStateScopeLabel(scope: StateEventScope, options?: StateScopeLabelOptions): string {
  if (scope.kind === STATE_EVENT_SCOPE_KIND.ROOM) {
    return options?.roomLabel ?? "房间";
  }
  const mappedRoleName = options?.roleNameById?.[scope.roleId];
  if (typeof mappedRoleName === "string" && mappedRoleName.trim()) {
    return mappedRoleName.trim();
  }
  return options?.fallbackRoleLabel?.(scope.roleId) ?? `角色 #${scope.roleId}`;
}

export function collectStateEventScopeLabels(
  events: StateEventAtom[],
  options?: StateScopeLabelOptions,
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();

  events.forEach((event) => {
    if (event.type === "nextTurn") {
      return;
    }
    if (event.type === "combatParticipantUpsert" && typeof event.roleId === "number") {
      const label = formatStateScopeLabel({ kind: STATE_EVENT_SCOPE_KIND.ROLE, roleId: event.roleId }, options);
      if (seen.has(label)) {
        return;
      }
      seen.add(label);
      labels.push(label);
      return;
    }
    if (!("scope" in event)) {
      return;
    }
    const label = formatStateScopeLabel(event.scope, options);
    if (seen.has(label)) {
      return;
    }
    seen.add(label);
    labels.push(label);
  });

  return labels;
}

export function formatStateEventAtomDetail(atom: StateEventAtom, options?: StateScopeLabelOptions): string {
  if (atom.type === "nextTurn") {
    return "推进到下一回合";
  }

  if (atom.type === "combatRoundEnd") {
    return "结束战斗";
  }

  if (atom.type === "combatParticipantUpsert") {
    const name = atom.name ?? (typeof atom.roleId === "number" ? formatStateScopeLabel({ kind: STATE_EVENT_SCOPE_KIND.ROLE, roleId: atom.roleId }, options) : atom.participantId);
    const parts = [`先攻参与者 ${name}`];
    if (typeof atom.initiative === "number") {
      parts.push(`先攻 ${formatStateNumericValue(atom.initiative)}`);
    }
    if (atom.values && Object.keys(atom.values).length > 0) {
      parts.push(`更新 ${Object.keys(atom.values).join("、")}`);
    }
    return parts.join(" · ");
  }

  if (atom.type === "combatParticipantRemove") {
    return `移除先攻参与者 ${atom.participantId}`;
  }

  if (atom.type === "combatOrderSet") {
    return `设置先攻顺序 ${atom.participantIds.length} 项`;
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
  const scopeLabel = formatStateScopeLabel(atom.scope, options);
  if (atom.type === "varOp") {
    const opLabel = atom.op === STATE_EVENT_VAR_OP.SET
      ? "="
      : atom.op === STATE_EVENT_VAR_OP.ADD
        ? "+"
        : "-";
    return `${scopeLabel} · ${formatStateKeyLabel(atom.key)} ${opLabel} ${formatStateNumericValue(atom.value)}`;
  }
  if (atom.type === "statusApply") {
    const durationLabel = typeof atom.durationTurns === "number" ? ` · ${atom.durationTurns} 回合` : "";
    return `${scopeLabel} · 施加状态 ${atom.statusId}${durationLabel}`;
  }
  return `${scopeLabel} · 移除状态 ${atom.statusName}`;
}

function formatNormalizedStateEventPreviewText(normalized: StateEventExtra | undefined, fallbackContent = ""): string {
  const fallback = toTrimmedString(fallbackContent) || "状态事件";
  if (!normalized) {
    return `[状态] ${fallback}`;
  }
  const combatBatchPrimaryText = buildCombatInitiativeBatchPrimaryText(normalized);
  if (combatBatchPrimaryText) {
    return `[战斗] ${combatBatchPrimaryText}`;
  }
  const [firstEvent] = normalized.events;
  if (!firstEvent) {
    return `[状态] ${fallback}`;
  }
  if (firstEvent.type === "varOp") {
    const opLabel = firstEvent.op === STATE_EVENT_VAR_OP.SET
      ? "="
      : firstEvent.op === STATE_EVENT_VAR_OP.ADD
        ? "+"
        : "-";
    return `[状态] ${formatStateKeyLabel(firstEvent.key)} ${opLabel} ${formatStateNumericValue(firstEvent.value)}`;
  }
  if (firstEvent.type === "nextTurn") {
    return "[状态] 下一回合";
  }
  if (firstEvent.type === "combatRoundEnd") {
    return "[战斗] 结束战斗";
  }
  if (firstEvent.type === "statusApply") {
    return `[状态] 施加 ${firstEvent.statusId}`;
  }
  if (firstEvent.type === "statusRemove") {
    return `[状态] 移除 ${firstEvent.statusName}`;
  }
  if (firstEvent.type === "combatParticipantUpsert") {
    return `[战斗] ${firstEvent.name ?? firstEvent.participantId} 加入先攻`;
  }
  if (firstEvent.type === "combatParticipantRemove") {
    return `[战斗] 移除 ${firstEvent.participantId}`;
  }
  if (firstEvent.type === "combatOrderSet") {
    return `[战斗] 调整先攻顺序`;
  }
  if (firstEvent.type === "combatActiveParticipantSet") {
    return firstEvent.participantId ? `[战斗] 当前行动者 ${firstEvent.participantId}` : "[战斗] 清空当前行动者";
  }
  if (firstEvent.type === "combatColumnUpsert") {
    return `[战斗] 更新列 ${firstEvent.label}`;
  }
  if (firstEvent.type === "combatMapTokenUpsert") {
    return `[战斗] 地图角色 #${firstEvent.roleId} 移动`;
  }
  if (firstEvent.type === "combatMapTokenRemove") {
    return `[战斗] 移除地图角色 #${firstEvent.roleId}`;
  }
  return `[战斗] 移除列 ${firstEvent.key}`;
}

export function formatStateEventPreviewText(extra: unknown, fallbackContent = ""): string {
  return formatNormalizedStateEventPreviewText(getNormalizedStateEventExtra(extra), fallbackContent);
}
