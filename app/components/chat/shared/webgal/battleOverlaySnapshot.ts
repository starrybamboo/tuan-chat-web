import type { UserRole } from "../../../../../api";
import type { RoomDndMapSnapshot } from "@/components/chat/shared/map/roomDndMapApi";
import type { ActiveStateInstance, CombatStateRuntime } from "@/components/chat/state/stateRuntime";

import { getRoomDndMapImageUrl } from "@/components/chat/shared/map/roomDndMapApi";
import { avatarUrl as buildAvatarUrl, imageLowUrl as buildAvatarThumbUrl } from "@/utils/mediaUrl";

export const TUANCHAT_BATTLE_OVERLAY_MESSAGE_TYPE = "TUANCHAT_BATTLE_OVERLAY_SYNC";
export const TUANCHAT_BATTLE_OVERLAY_SCHEMA_VERSION = 1;

export type BattleOverlayStatusSnapshot = {
  instanceId: string;
  name: string;
  remainingTurns?: number;
};

export type BattleOverlayRoleSnapshot = {
  roleId: number;
  name: string;
  avatarUrl: string;
  hp: number | null;
  maxHp: number | null;
  hpPercent: number | null;
  initiative: number | null;
  statuses: BattleOverlayStatusSnapshot[];
  isCurrentActor: boolean;
};

export type BattleOverlayMapTokenSnapshot = {
  roleId: number;
  rowIndex: number;
  colIndex: number;
  name: string;
  avatarUrl: string;
};

export type BattleOverlayMapSnapshot = {
  imageUrl: string;
  gridRows: number;
  gridCols: number;
  gridColor: string;
  tokens: BattleOverlayMapTokenSnapshot[];
};

export type BattleOverlaySnapshot = {
  schemaVersion: typeof TUANCHAT_BATTLE_OVERLAY_SCHEMA_VERSION;
  visible: boolean;
  roomId: number | null;
  round: number | null;
  currentActorRoleId: number | null;
  currentActorName: string;
  map: BattleOverlayMapSnapshot | null;
  roles: BattleOverlayRoleSnapshot[];
};

export type BattleOverlayMessage = {
  type: typeof TUANCHAT_BATTLE_OVERLAY_MESSAGE_TYPE;
  payload: BattleOverlaySnapshot;
};

type BuildBattleOverlaySnapshotParams = {
  roomId?: number | null;
  map?: RoomDndMapSnapshot | null;
  roles?: UserRole[] | null;
  runtime?: CombatStateRuntime | null;
};

function normalizePositiveNumber(value: unknown): number | null {
  const raw = typeof value === "number" ? value : Number(value);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function readRuntimeNumber(values: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!values) {
    return null;
  }
  for (const key of keys) {
    const raw = values[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
  }
  return null;
}

function buildRoleName(role: UserRole | undefined, roleId: number): string {
  const roleName = role?.roleName?.trim();
  return roleName || `角色 #${roleId}`;
}

function buildRoleAvatarUrl(role: UserRole | undefined): string {
  return buildAvatarThumbUrl(role?.avatarFileId) || buildAvatarUrl(role?.avatarFileId) || "";
}

function clampHpPercent(hp: number | null, maxHp: number | null): number | null {
  if (hp == null || maxHp == null || maxHp <= 0) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
}

function buildStatusSnapshots(states: ActiveStateInstance[]): BattleOverlayStatusSnapshot[] {
  return states.map((state) => ({
    instanceId: state.instanceId,
    name: state.statusName,
    ...(typeof state.remainingTurns === "number" ? { remainingTurns: state.remainingTurns } : {}),
  }));
}

function getRoleSortValue(role: BattleOverlayRoleSnapshot): number {
  if (role.isCurrentActor) {
    return Number.POSITIVE_INFINITY;
  }
  return role.initiative ?? Number.NEGATIVE_INFINITY;
}

function resolveCurrentActorRoleId(runtime: CombatStateRuntime | null | undefined, visibleRoleIds: Set<number>): number | null {
  let bestRoleId: number | null = null;
  let bestInitiative = Number.NEGATIVE_INFINITY;
  for (const [roleIdText, values] of Object.entries(runtime?.derivedDisplayValues.rolesByRoleId ?? {})) {
    const roleId = Number(roleIdText);
    if (!visibleRoleIds.has(roleId)) {
      continue;
    }
    const initiative = readRuntimeNumber(values, ["initiative"]);
    if (initiative != null && initiative > bestInitiative) {
      bestInitiative = initiative;
      bestRoleId = roleId;
    }
  }
  return bestRoleId;
}

export function buildBattleOverlaySnapshot({
  roomId,
  map,
  roles,
  runtime,
}: BuildBattleOverlaySnapshotParams): BattleOverlaySnapshot {
  const roleById = new Map<number, UserRole>();
  (roles ?? []).forEach((role) => {
    const roleId = normalizePositiveNumber(role.roleId);
    if (roleId != null) {
      roleById.set(roleId, role);
    }
  });

  const roleIds = new Set<number>();
  roleById.forEach((_, roleId) => roleIds.add(roleId));
  Object.keys(runtime?.derivedDisplayValues.rolesByRoleId ?? {}).forEach((roleIdText) => {
    const roleId = normalizePositiveNumber(roleIdText);
    if (roleId != null) {
      roleIds.add(roleId);
    }
  });
  runtime?.activeStates.forEach((state) => {
    if (state.scope.kind === "role") {
      roleIds.add(state.scope.roleId);
    }
  });
  const tokenRoleIds = new Set<number>();
  (runtime?.mapTokens ?? map?.tokens ?? []).forEach((token) => {
    roleIds.add(token.roleId);
    tokenRoleIds.add(token.roleId);
  });

  const currentActorRoleId = resolveCurrentActorRoleId(runtime, roleIds);
  const roleSnapshots = [...roleIds]
    .map((roleId): BattleOverlayRoleSnapshot => {
      const role = roleById.get(roleId);
      const baseValues = runtime?.baseDisplayValues.rolesByRoleId[roleId] ?? {};
      const derivedValues = runtime?.derivedDisplayValues.rolesByRoleId[roleId] ?? {};
      const hp = readRuntimeNumber(derivedValues, ["hp"]) ?? readRuntimeNumber(baseValues, ["hp"]);
      const maxHp = readRuntimeNumber(derivedValues, ["maxHp", "maxhp", "hpMax", "hpmax"])
        ?? readRuntimeNumber(baseValues, ["maxHp", "maxhp", "hpMax", "hpmax"]);
      const initiative = readRuntimeNumber(derivedValues, ["initiative"]) ?? readRuntimeNumber(baseValues, ["initiative"]);
      const statuses = buildStatusSnapshots(
        runtime?.activeStates.filter(state => state.scope.kind === "role" && state.scope.roleId === roleId) ?? [],
      );
      return {
        roleId,
        name: buildRoleName(role, roleId),
        avatarUrl: buildRoleAvatarUrl(role),
        hp,
        maxHp,
        hpPercent: clampHpPercent(hp, maxHp),
        initiative,
        statuses,
        isCurrentActor: currentActorRoleId === roleId,
      };
    })
    .filter(role => role.hp != null || role.initiative != null || role.statuses.length > 0 || tokenRoleIds.has(role.roleId))
    .sort((left, right) => getRoleSortValue(right) - getRoleSortValue(left) || left.name.localeCompare(right.name, "zh-CN"));

  const tokens = runtime?.hasMapState
    ? runtime.mapTokens
    : (map?.tokens ?? []);
  const mapSnapshot: BattleOverlayMapSnapshot | null = map || tokens.length > 0
    ? {
        imageUrl: getRoomDndMapImageUrl(map),
        gridRows: map?.gridRows ?? 10,
        gridCols: map?.gridCols ?? 10,
        gridColor: map?.gridColor ?? "#808080",
        tokens: tokens.map((token) => {
          const role = roleById.get(token.roleId);
          return {
            roleId: token.roleId,
            rowIndex: token.rowIndex,
            colIndex: token.colIndex,
            name: buildRoleName(role, token.roleId),
            avatarUrl: buildRoleAvatarUrl(role),
          };
        }),
      }
    : null;

  const round = typeof runtime?.turn === "number" && runtime.turn > 0 ? runtime.turn : null;
  const currentActorName = currentActorRoleId != null
    ? buildRoleName(roleById.get(currentActorRoleId), currentActorRoleId)
    : "";
  const visible = Boolean(
    mapSnapshot?.imageUrl
    || (mapSnapshot?.tokens.length ?? 0) > 0
    || round != null
    || roleSnapshots.some(role => role.hp != null || role.initiative != null || role.statuses.length > 0),
  );

  return {
    schemaVersion: TUANCHAT_BATTLE_OVERLAY_SCHEMA_VERSION,
    visible,
    roomId: normalizePositiveNumber(roomId),
    round,
    currentActorRoleId,
    currentActorName,
    map: mapSnapshot,
    roles: visible ? roleSnapshots : [],
  };
}

export function buildBattleOverlayMessage(snapshot: BattleOverlaySnapshot): BattleOverlayMessage {
  return {
    type: TUANCHAT_BATTLE_OVERLAY_MESSAGE_TYPE,
    payload: snapshot,
  };
}
