import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

export type MobileRoomRoleSelectionSnapshot = {
  avatarFileId?: number;
  avatarId?: number;
  customRoleName?: string;
  roleId?: number;
};

export type ResolvedMobileRoomRoleSelection = {
  avatarFileId?: number;
  avatarId?: number;
  customRoleName?: string;
  roleId?: number;
};

type ResolveMobileRoomRoleSelectionParams = {
  canSelectNarrator: boolean;
  canValidateRoleId: boolean;
  fallbackRoleId?: number;
  isSpectator: boolean;
  roles: readonly Pick<UserRole, "avatarFileId" | "avatarId" | "roleId">[];
  snapshot: MobileRoomRoleSelectionSnapshot | null | undefined;
};

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeOptionalPositiveId(value: unknown): number | undefined {
  return isPositiveId(value) ? value : undefined;
}

function normalizeCustomRoleName(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isStoredNarratorRoleId(roleId: unknown): boolean {
  return typeof roleId === "number" && Number.isFinite(roleId) && roleId < 0;
}

export function normalizeMobileRoomRoleSelectionSnapshot(
  snapshot: MobileRoomRoleSelectionSnapshot,
): MobileRoomRoleSelectionSnapshot {
  return {
    avatarFileId: normalizeOptionalPositiveId(snapshot.avatarFileId),
    avatarId: normalizeOptionalPositiveId(snapshot.avatarId),
    customRoleName: normalizeCustomRoleName(snapshot.customRoleName),
    roleId: typeof snapshot.roleId === "number" && Number.isFinite(snapshot.roleId)
      ? snapshot.roleId
      : undefined,
  };
}

export function resolveMobileRoomRoleSelection({
  canSelectNarrator,
  canValidateRoleId,
  fallbackRoleId,
  isSpectator,
  roles,
  snapshot,
}: ResolveMobileRoomRoleSelectionParams): ResolvedMobileRoomRoleSelection | null {
  if (!snapshot || isSpectator) {
    return null;
  }

  const normalizedSnapshot = normalizeMobileRoomRoleSelectionSnapshot(snapshot);
  const storedRoleId = normalizedSnapshot.roleId;
  if (isStoredNarratorRoleId(storedRoleId)) {
    return canSelectNarrator
      ? {
          customRoleName: normalizedSnapshot.customRoleName,
          roleId: undefined,
        }
      : {
          roleId: fallbackRoleId,
        };
  }

  if (!isPositiveId(storedRoleId)) {
    return fallbackRoleId ? { roleId: fallbackRoleId } : { roleId: undefined };
  }

  const role = roles.find(item => item.roleId === storedRoleId);
  if (canValidateRoleId && !role) {
    return fallbackRoleId ? { roleId: fallbackRoleId } : { roleId: undefined };
  }

  return {
    avatarFileId: normalizedSnapshot.avatarFileId ?? role?.avatarFileId,
    avatarId: normalizedSnapshot.avatarId ?? role?.avatarId,
    customRoleName: normalizedSnapshot.customRoleName,
    roleId: storedRoleId,
  };
}
