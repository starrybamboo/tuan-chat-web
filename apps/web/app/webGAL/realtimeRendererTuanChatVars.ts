import type { StateEventAtom, StateEventExtra } from "@/types/stateEvent";

export const TUANCHAT_ROLE_IDS_VAR = "tuanchat.roleIds";
export const TUANCHAT_COMBAT_ACTIVE_VAR = "tuanchat.combat.active";
export const TUANCHAT_COMBAT_TURN_VAR = "tuanchat.combat.turn";
export const TUANCHAT_MAP_BACKGROUND_VAR = "tuanchat.map.background";
export const TUANCHAT_MAP_CONFIG_ACTIVE_VAR = "tuanchat.map.config.active";
export const TUANCHAT_MAP_GRID_ROWS_VAR = "tuanchat.map.gridRows";
export const TUANCHAT_MAP_GRID_COLS_VAR = "tuanchat.map.gridCols";
export const TUANCHAT_MAP_GRID_COLOR_VAR = "tuanchat.map.gridColor";
export const TUANCHAT_MAP_OVERLAY_ACTIVE_VAR = "tuanchat.map.overlay.active";
export const TUANCHAT_ROLE_AVATAR_URL_KEY = "avatarUrl";

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

function isAllowedResourceUrl(value: string): boolean {
  return value === "" || value.startsWith("./game/");
}

function buildResourceSetVarLine(key: string, value: string): string | null {
  const trimmed = value.trim();
  if (!isAllowedResourceUrl(trimmed)) {
    return null;
  }
  return buildSetVarLine(key, trimmed);
}

function buildBackgroundAssetSetVarLine(key: string, value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return buildSetVarLine(key, "");
  }
  if (!/^[\w.-]+$/.test(trimmed)) {
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

export function buildTuanChatRoleAvatarUrlLine(roleId: number, avatarUrl: string): string | null {
  return buildResourceSetVarLine(buildTuanChatRoleVarKey(roleId, TUANCHAT_ROLE_AVATAR_URL_KEY), avatarUrl);
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
  return buildSetVarLine(TUANCHAT_MAP_OVERLAY_ACTIVE_VAR, active)!;
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
    buildSetVarLine(TUANCHAT_MAP_BACKGROUND_VAR, ""),
    buildTuanChatMapOverlayActiveLine(false),
  ];

  roleIds.forEach((roleId) => {
    const avatarUrl = params.avatarUrlsByRoleId?.[roleId]?.trim();
    if (avatarUrl) {
      lines.push(buildTuanChatRoleAvatarUrlLine(roleId, avatarUrl));
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
      pushLine(lines, buildTuanChatMapOverlayActiveLine(true));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_CONFIG_ACTIVE_VAR, true));
      const mapBackground = String(params.mapBackgroundsByFileId?.[event.mapFileId] ?? "").trim();
      pushLine(lines, buildBackgroundAssetSetVarLine(
        TUANCHAT_MAP_BACKGROUND_VAR,
        mapBackground,
      ));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_GRID_ROWS_VAR, event.gridRows));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_GRID_COLS_VAR, event.gridCols));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_GRID_COLOR_VAR, event.gridColor));
      return;
    }
    if (event.type === "mapConfigClear") {
      pushLine(lines, buildTuanChatMapOverlayActiveLine(true));
      pushLine(lines, buildSetVarLine(TUANCHAT_MAP_CONFIG_ACTIVE_VAR, false));
      pushLine(lines, buildBackgroundAssetSetVarLine(TUANCHAT_MAP_BACKGROUND_VAR, ""));
      return;
    }
    if (event.type === "mapTokenRemove") {
      pushLine(lines, buildTuanChatMapOverlayActiveLine(true));
      pushLine(lines, buildSetVarLine(buildTuanChatMapTokenVarKey(event.roleId, "active"), false));
      return;
    }
    if (event.type === "mapTokenUpsert") {
      const avatarUrl = params.avatarUrlsByRoleId?.[event.roleId]?.trim();
      if (avatarUrl) {
        pushLine(lines, buildTuanChatRoleAvatarUrlLine(event.roleId, avatarUrl));
      }
      pushLine(lines, buildTuanChatMapOverlayActiveLine(true));
      pushLine(lines, buildSetVarLine(buildTuanChatMapTokenVarKey(event.roleId, "active"), true));
      pushLine(lines, buildSetVarLine(buildTuanChatMapTokenVarKey(event.roleId, "rowIndex"), event.rowIndex));
      pushLine(lines, buildSetVarLine(buildTuanChatMapTokenVarKey(event.roleId, "colIndex"), event.colIndex));
    }
  });

  return { lines, mapTokenRoleIds };
}
