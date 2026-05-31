import type { StateEventAtom, StateEventExtra } from "@/types/stateEvent";

export const TUANCHAT_ROLE_IDS_VAR = "tuanchat.roleIds";
export const TUANCHAT_COMBAT_ACTIVE_VAR = "tuanchat.combat.active";
export const TUANCHAT_COMBAT_TURN_VAR = "tuanchat.combat.turn";
export const TUANCHAT_MAP_HAS_CONFIG_VAR = "tuanchat.map.hasConfig";
export const TUANCHAT_MAP_FILE_ID_VAR = "tuanchat.map.fileId";
export const TUANCHAT_MAP_IMAGE_URL_VAR = "tuanchat.map.imageUrl";
export const TUANCHAT_MAP_GRID_ROWS_VAR = "tuanchat.map.gridRows";
export const TUANCHAT_MAP_GRID_COLS_VAR = "tuanchat.map.gridCols";
export const TUANCHAT_MAP_GRID_COLOR_VAR = "tuanchat.map.gridColor";
export const TUANCHAT_MAP_TOKEN_ROLE_IDS_VAR = "tuanchat.map.tokenRoleIds";
export const TUANCHAT_ROLE_AVATAR_URL_KEY = "avatarUrl";

function toFiniteNumber(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(numberValue) ? numberValue : null;
}

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

function isGameRelativeResourcePath(value: string): boolean {
  return value === "" || value.startsWith("./game/");
}

function buildResourceSetVarLine(key: string, value: string): string | null {
  const trimmed = value.trim();
  if (!isGameRelativeResourcePath(trimmed)) {
    return null;
  }
  return buildSetVarLine(key, trimmed);
}

export function buildTuanChatRoleVarKey(roleId: number, key: string): string {
  return `tuanchat.role.${roleId}.${key.trim()}`;
}

export function buildTuanChatRoomVarKey(key: string): string {
  return `tuanchat.room.${key.trim()}`;
}

export function buildTuanChatMapTokenVarKey(roleId: number, key: "active" | "rowIndex" | "colIndex"): string {
  return `tuanchat.map.token.${roleId}.${key}`;
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

export function buildTuanChatWebgalInitVarLines(params: {
  roleIds: number[];
  avatarUrlsByRoleId?: Record<number, string | null | undefined>;
}): string[] {
  const roleIds = [...new Set(params.roleIds.filter(roleId => Number.isFinite(roleId) && roleId > 0))]
    .sort((left, right) => left - right);
  const lines = [
    buildSetVarLine(TUANCHAT_ROLE_IDS_VAR, roleIds.join(",")),
    buildSetVarLine(TUANCHAT_COMBAT_ACTIVE_VAR, false),
    buildSetVarLine(TUANCHAT_COMBAT_TURN_VAR, 0),
    buildSetVarLine(TUANCHAT_MAP_HAS_CONFIG_VAR, false),
    buildSetVarLine(TUANCHAT_MAP_TOKEN_ROLE_IDS_VAR, ""),
  ];

  roleIds.forEach((roleId) => {
    const avatarUrl = params.avatarUrlsByRoleId?.[roleId]?.trim();
    if (avatarUrl) {
      lines.push(buildResourceSetVarLine(buildTuanChatRoleVarKey(roleId, TUANCHAT_ROLE_AVATAR_URL_KEY), avatarUrl));
    }
  });

  return lines.filter((line): line is string => Boolean(line));
}

export function applyTuanChatStateEventToMapTokenRoleIds(
  events: StateEventExtra["events"],
  currentRoleIds: Iterable<number> = [],
): number[] {
  const roleIds = new Set([...currentRoleIds].filter(roleId => Number.isFinite(roleId) && roleId > 0));
  events.forEach((event) => {
    if (event.type === "mapConfigClear") {
      roleIds.clear();
      return;
    }
    if (event.type === "mapConfigUpsert" && event.clearTokens) {
      roleIds.clear();
      return;
    }
    if (event.type === "mapTokenRemove") {
      roleIds.delete(event.roleId);
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
  let shouldWriteTokenRoleIds = false;

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
      return;
    }
    if (event.type === "combatRoundEnd") {
      pushLine(lines, buildSetVarLine(TUANCHAT_COMBAT_ACTIVE_VAR, false));
      pushLine(lines, buildSetVarLine(TUANCHAT_COMBAT_TURN_VAR, 0));
      return;
    }
    if (event.type === "nextTurn") {
      pushLine(lines, buildSetVarExpressionLine(TUANCHAT_COMBAT_TURN_VAR, `${TUANCHAT_COMBAT_TURN_VAR} + 1`));
      return;
    }

    if (event.type === "mapConfigUpsert") {
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_HAS_CONFIG_VAR, true));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_FILE_ID_VAR, event.mapFileId));
      const imageUrl = String(event.imageUrl ?? "").trim();
      pushLine(lines, buildResourceSetVarLine(
        TUANCHAT_MAP_IMAGE_URL_VAR,
        isGameRelativeResourcePath(imageUrl) ? imageUrl : "",
      ));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_GRID_ROWS_VAR, event.gridRows));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_GRID_COLS_VAR, event.gridCols));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_GRID_COLOR_VAR, event.gridColor));
      if (event.clearTokens) {
        shouldWriteTokenRoleIds = true;
      }
      return;
    }
    if (event.type === "mapConfigClear") {
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_HAS_CONFIG_VAR, false));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_FILE_ID_VAR, 0));
      pushLine(lines, buildResourceSetVarLine(TUANCHAT_MAP_IMAGE_URL_VAR, ""));
      shouldWriteTokenRoleIds = true;
      return;
    }
    if (event.type === "mapTokenRemove") {
      pushLine(lines, buildSetVarLine(buildTuanChatMapTokenVarKey(event.roleId, "active"), false));
      shouldWriteTokenRoleIds = true;
      return;
    }
    if (event.type === "mapTokenUpsert") {
      pushLine(lines, buildSetVarLine(buildTuanChatMapTokenVarKey(event.roleId, "active"), true));
      pushLine(lines, buildSetVarLine(buildTuanChatMapTokenVarKey(event.roleId, "rowIndex"), event.rowIndex));
      pushLine(lines, buildSetVarLine(buildTuanChatMapTokenVarKey(event.roleId, "colIndex"), event.colIndex));
      shouldWriteTokenRoleIds = true;
    }
  });

  if (shouldWriteTokenRoleIds) {
    pushLine(lines, buildSetVarLine(TUANCHAT_MAP_TOKEN_ROLE_IDS_VAR, mapTokenRoleIds.join(",")));
  }

  return { lines, mapTokenRoleIds };
}
