import type { StateEventAtom, StateEventExtra } from "@/types/stateEvent";

export const TUANCHAT_ROLE_IDS_VAR = "tuanchat.roleIds";
export const TUANCHAT_COMBAT_ACTIVE_VAR = "tuanchat.combat.active";
export const TUANCHAT_COMBAT_TURN_VAR = "tuanchat.combat.turn";
const TUANCHAT_MAP_COMMAND = "tuanChatMap";

function isSafeVarSegment(value: string): boolean {
  return value.length > 0 && !/[=;\r\n]/.test(value);
}

function formatWebgalValue(value: number | string | boolean): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return JSON.stringify(value);
}

function buildSetVarLine(key: string, value: number | string | boolean): string | null {
  if (!isSafeVarSegment(key)) {
    return null;
  }
  if (typeof value === "string" && /[;\r\n]/.test(value)) {
    return null;
  }
  return `setVar:${key}=${formatWebgalValue(value)};`;
}

export function buildTuanChatRoleVarKey(roleId: number, key: string): string {
  return `tuanchat.role.${roleId}.${key.trim()}`;
}

export function buildTuanChatRoomVarKey(key: string): string {
  return `tuanchat.room.${key.trim()}`;
}

function buildSetVarExpressionLine(key: string, expression: string): string | null {
  if (!isSafeVarSegment(key) || /[;\r\n]/.test(expression)) {
    return null;
  }
  return `setVar:${key}=${expression};`;
}

function buildVarOpExpression(key: string, op: Extract<StateEventAtom, { type: "varOp" }>["op"], value: number): string {
  if (op === "set") {
    return formatWebgalValue(value);
  }
  const absValue = Math.abs(value);
  if (op === "add") {
    return value >= 0 ? `${key} + ${formatWebgalValue(absValue)}` : `${key} - ${formatWebgalValue(absValue)}`;
  }
  return value >= 0 ? `${key} - ${formatWebgalValue(absValue)}` : `${key} + ${formatWebgalValue(absValue)}`;
}

function buildScopeVarKey(atom: Extract<StateEventAtom, { type: "varOp" }>): string | null {
  const key = atom.key.trim();
  if (!isSafeVarSegment(key)) {
    return null;
  }
  return atom.scope.kind === "room"
    ? buildTuanChatRoomVarKey(key)
    : buildTuanChatRoleVarKey(atom.scope.roleId, key);
}

function pushLine(lines: string[], line: string | null): void {
  if (line) {
    lines.push(line);
  }
}

function isMapOverlayTriggerEvent(event: StateEventAtom): boolean {
  return event.type === "mapConfigUpsert"
    || event.type === "mapConfigClear"
    || event.type === "mapTokenUpsert"
    || event.type === "mapTokenRemove";
}

export function hasTuanChatMapOverlayTrigger(events: StateEventExtra["events"] | undefined): boolean {
  return Boolean(events?.some(isMapOverlayTriggerEvent));
}

export function buildTuanChatMapOverlayActiveLine(active: boolean): string {
  return buildTuanChatMapCommandLine(active ? "show" : "hide")!;
}

function isSafeCommandArgValue(value: string): boolean {
  return value.length > 0 && !/[;\r\n]/.test(value) && !/\s-/.test(value);
}

function buildTuanChatMapCommandLine(
  action: "reset" | "show" | "hide" | "config" | "clear" | "token",
  args: Record<string, number | string | boolean | null | undefined> = {},
): string | null {
  const parts = Object.entries(args).flatMap(([key, rawValue]) => {
    if (!isSafeVarSegment(key) || rawValue == null || rawValue === "") {
      return [];
    }
    if (typeof rawValue === "boolean") {
      return rawValue ? [`-${key}`] : [];
    }
    const value = String(rawValue).trim();
    return isSafeCommandArgValue(value) ? [`-${key}=${value}`] : [];
  });
  return `${TUANCHAT_MAP_COMMAND}:${action}${parts.length > 0 ? ` ${parts.join(" ")}` : ""};`;
}

export function buildTuanChatWebgalInitVarLines(params: {
  roleIds: number[];
}): string[] {
  const roleIds = [...new Set(params.roleIds.filter(roleId => Number.isFinite(roleId) && roleId > 0))]
    .sort((left, right) => left - right);
  const lines = [
    buildSetVarLine(TUANCHAT_ROLE_IDS_VAR, roleIds.join(",")),
    buildSetVarLine(TUANCHAT_COMBAT_ACTIVE_VAR, false),
    buildSetVarLine(TUANCHAT_COMBAT_TURN_VAR, 0),
    buildTuanChatMapCommandLine("reset"),
  ];

  return lines.filter((line): line is string => Boolean(line));
}

export function applyTuanChatStateEventToMapTokenRoleIds(
  events: StateEventExtra["events"],
  currentRoleIds: Iterable<number> = [],
): number[] {
  const roleIds = new Set([...currentRoleIds].filter(roleId => Number.isFinite(roleId) && roleId > 0));
  events.forEach((event) => {
    if (event.type === "mapTokenRemove") {
      roleIds.delete(event.roleId);
      return;
    }
    if (event.type === "mapConfigUpsert" && event.clearTokens) {
      roleIds.clear();
      return;
    }
    if (event.type === "mapConfigClear") {
      roleIds.clear();
      return;
    }
    if (event.type === "mapTokenUpsert") {
      roleIds.add(event.roleId);
    }
  });
  return [...roleIds].sort((left, right) => left - right);
}

export function buildTuanChatStateEventVarLines(params: {
  stateEvent: StateEventExtra | undefined;
  mapBackgroundsByFileId?: Record<number, string | null | undefined>;
  avatarUrlsByRoleId?: Record<number, string | null | undefined>;
  mapTokenRoleIds?: Iterable<number>;
}): { lines: string[]; mapTokenRoleIds: number[] } {
  const stateEvent = params.stateEvent;
  const mapTokenRoleIds = stateEvent
    ? applyTuanChatStateEventToMapTokenRoleIds(stateEvent.events, params.mapTokenRoleIds)
    : [...(params.mapTokenRoleIds ?? [])].sort((left, right) => left - right);
  if (!stateEvent) {
    return { lines: [], mapTokenRoleIds };
  }

  const lines: string[] = [];

  stateEvent.events.forEach((event) => {
    if (event.type === "varOp") {
      const key = buildScopeVarKey(event);
      if (!key) {
        return;
      }
      pushLine(lines, buildSetVarExpressionLine(key, buildVarOpExpression(key, event.op, event.value)));
      return;
    }

    if (event.type === "combatRoundStart") {
      pushLine(lines, buildSetVarLine(TUANCHAT_COMBAT_ACTIVE_VAR, true));
      pushLine(lines, buildTuanChatMapOverlayActiveLine(false));
      return;
    }
    if (event.type === "combatRoundEnd") {
      pushLine(lines, buildSetVarLine(TUANCHAT_COMBAT_ACTIVE_VAR, false));
      pushLine(lines, buildSetVarLine(TUANCHAT_COMBAT_TURN_VAR, 0));
      pushLine(lines, buildTuanChatMapOverlayActiveLine(false));
      return;
    }
    if (event.type === "nextTurn") {
      pushLine(lines, buildSetVarExpressionLine(TUANCHAT_COMBAT_TURN_VAR, `${TUANCHAT_COMBAT_TURN_VAR} + 1`));
      return;
    }

    if (event.type === "mapConfigUpsert") {
      const mapBackground = String(params.mapBackgroundsByFileId?.[event.mapFileId] ?? "").trim();
      pushLine(lines, buildTuanChatMapCommandLine("config", {
        background: mapBackground,
        rows: event.gridRows,
        cols: event.gridCols,
        gridColor: event.gridColor,
        clearTokens: event.clearTokens,
      }));
      pushLine(lines, buildTuanChatMapOverlayActiveLine(true));
      return;
    }
    if (event.type === "mapConfigClear") {
      pushLine(lines, buildTuanChatMapCommandLine("clear"));
      pushLine(lines, buildTuanChatMapOverlayActiveLine(true));
      return;
    }
    if (event.type === "mapTokenRemove") {
      pushLine(lines, buildTuanChatMapCommandLine("token", {
        roleId: event.roleId,
        remove: true,
      }));
      pushLine(lines, buildTuanChatMapOverlayActiveLine(true));
      return;
    }
    if (event.type === "mapTokenUpsert") {
      const avatarUrl = params.avatarUrlsByRoleId?.[event.roleId]?.trim();
      pushLine(lines, buildTuanChatMapCommandLine("token", {
        roleId: event.roleId,
        row: event.rowIndex,
        col: event.colIndex,
        avatar: avatarUrl,
      }));
      pushLine(lines, buildTuanChatMapOverlayActiveLine(true));
    }
  });

  return { lines, mapTokenRoleIds };
}
