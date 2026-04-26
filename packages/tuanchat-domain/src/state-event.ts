import type { MessageExtra as ApiMessageExtra } from "@tuanchat/openapi-client/models/MessageExtra";
import type { StateEventExtra as ApiStateEventExtra } from "@tuanchat/openapi-client/models/StateEventExtra";
import type { StateEventScope as ApiStateEventScope } from "@tuanchat/openapi-client/models/StateEventScope";
import type { StateEventSource as ApiStateEventSource } from "@tuanchat/openapi-client/models/StateEventSource";

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

export type StateEventSourceKind = typeof STATE_EVENT_SOURCE_KIND[keyof typeof STATE_EVENT_SOURCE_KIND];
export type StateEventScopeKind = typeof STATE_EVENT_SCOPE_KIND[keyof typeof STATE_EVENT_SCOPE_KIND];
export type StateEventVarOpKind = typeof STATE_EVENT_VAR_OP[keyof typeof STATE_EVENT_VAR_OP];
export type StateEventStackMode = typeof STATE_EVENT_STACK_MODE[keyof typeof STATE_EVENT_STACK_MODE];
export type StateStatusModifierOp = typeof STATE_EVENT_STATUS_MODIFIER_OP[keyof typeof STATE_EVENT_STATUS_MODIFIER_OP];

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

export type StateEventAtom
  = | StateEventVarOp
    | StateEventStatusApply
    | StateEventStatusRemove
    | StateEventNextTurn;

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
  if (firstEvent.type === "statusApply") {
    return `[状态] 施加 ${firstEvent.statusId}`;
  }
  return `[状态] 移除 ${firstEvent.statusName}`;
}

export function formatStateEventPreviewText(extra: unknown, fallbackContent = ""): string {
  return formatNormalizedStateEventPreviewText(getNormalizedStateEventExtra(extra), fallbackContent);
}
