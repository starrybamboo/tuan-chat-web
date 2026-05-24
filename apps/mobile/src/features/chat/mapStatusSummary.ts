import type {
  ActiveStateInstance,
  CombatMapToken,
  CombatStateRuntime,
} from "@tuanchat/domain/state-runtime";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

type RuntimeForMapStatus = Pick<
  CombatStateRuntime,
  "activeStates" | "baseDisplayValues" | "derivedDisplayValues" | "roleVarsByRoleId"
>;

type RoleLike = Pick<UserRole, "roleId" | "roleName">;

type TokenLike = Pick<CombatMapToken, "roleId">;

export type MobileMapStatusRow = {
  activeStateLabels: string[];
  hp: number | null;
  id: string;
  initiative: number | null;
  isPlaced: boolean;
  maxHp: number | null;
  name: string;
  roleId: number | null;
};

export type MobileMapTokenStatus = {
  activeStateLabels: string[];
  hp: number | null;
  initiative: number | null;
  maxHp: number | null;
  text: string;
};

const HP_KEYS = ["hp"];
const MAX_HP_KEYS = ["maxHp", "maxhp", "hpMax", "hpmax"];

function readNumberFromRecord(values: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!values) {
    return null;
  }
  for (const key of keys) {
    const raw = values[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function readRoleRuntimeNumber(runtime: RuntimeForMapStatus, roleId: number, keys: string[]): number | null {
  return (
    readNumberFromRecord(runtime.derivedDisplayValues.rolesByRoleId[roleId], keys)
    ?? readNumberFromRecord(runtime.baseDisplayValues.rolesByRoleId[roleId], keys)
    ?? readNumberFromRecord(runtime.roleVarsByRoleId[roleId], keys)
  );
}

function formatRemainingTurns(remainingTurns: number | undefined): string {
  return typeof remainingTurns === "number" ? ` ${remainingTurns}T` : "";
}

function formatStateLabel(state: ActiveStateInstance): string {
  return `${state.statusName}${formatRemainingTurns(state.remainingTurns)}`;
}

function roleNameFor(roleById: Map<number, RoleLike>, roleId: number): string {
  return roleById.get(roleId)?.roleName?.trim() || `角色 #${roleId}`;
}

function collectRuntimeRoleIds(runtime: RuntimeForMapStatus): Set<number> {
  const roleIds = new Set<number>();
  Object.keys(runtime.roleVarsByRoleId).forEach((value) => {
    const roleId = Number(value);
    if (roleId > 0) {
      roleIds.add(roleId);
    }
  });
  runtime.activeStates.forEach((state) => {
    if (state.scope.kind === "role" && state.scope.roleId > 0) {
      roleIds.add(state.scope.roleId);
    }
  });
  return roleIds;
}

export function formatMobileMapNumericValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function formatMobileMapStatusText(status: Omit<MobileMapTokenStatus, "text">): string {
  const parts: string[] = [];
  if (status.initiative != null) {
    parts.push(`先攻 ${formatMobileMapNumericValue(status.initiative)}`);
  }
  if (status.hp != null) {
    const hpText = status.maxHp != null
      ? `${formatMobileMapNumericValue(status.hp)}/${formatMobileMapNumericValue(status.maxHp)}`
      : formatMobileMapNumericValue(status.hp);
    parts.push(`HP ${hpText}`);
  }
  if (status.activeStateLabels.length > 0) {
    parts.push(status.activeStateLabels.join("、"));
  }
  return parts.join(" · ");
}

export function buildMobileMapStatusRows(params: {
  roomRoles: RoleLike[];
  runtime: RuntimeForMapStatus | null | undefined;
  tokens: TokenLike[];
}): MobileMapStatusRow[] {
  const { roomRoles, runtime, tokens } = params;
  if (!runtime) {
    return [];
  }

  const roleById = new Map(roomRoles.map(role => [role.roleId, role]));
  const placedRoleIds = new Set(tokens.map(token => token.roleId));
  const remainingRoleIds = collectRuntimeRoleIds(runtime);

  const stateOnlyRows = [...remainingRoleIds]
    .sort((left, right) => left - right)
    .map((roleId): MobileMapStatusRow => {
      const activeStateLabels = runtime.activeStates
        .filter(state => state.scope.kind === "role" && state.scope.roleId === roleId)
        .map(formatStateLabel);

      return {
        activeStateLabels,
        hp: readRoleRuntimeNumber(runtime, roleId, HP_KEYS),
        id: `role:${roleId}`,
        initiative: readRoleRuntimeNumber(runtime, roleId, ["initiative"]),
        isPlaced: placedRoleIds.has(roleId),
        maxHp: readRoleRuntimeNumber(runtime, roleId, MAX_HP_KEYS),
        name: roleNameFor(roleById, roleId),
        roleId,
      };
    });

  return stateOnlyRows;
}

export function buildMobileMapTokenStatusByRoleId(rows: MobileMapStatusRow[]): Record<number, MobileMapTokenStatus> {
  return rows.reduce<Record<number, MobileMapTokenStatus>>((acc, row) => {
    if (row.roleId == null) {
      return acc;
    }
    const status = {
      activeStateLabels: row.activeStateLabels,
      hp: row.hp,
      initiative: row.initiative,
      maxHp: row.maxHp,
    };
    const text = formatMobileMapStatusText(status);
    if (!text) {
      return acc;
    }
    acc[row.roleId] = { ...status, text };
    return acc;
  }, {});
}
