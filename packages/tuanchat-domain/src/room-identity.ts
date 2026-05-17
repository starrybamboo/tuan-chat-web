import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

export type ResolveCurrentRoomRoleIdParams = {
  availableRoleIds?: ReadonlySet<number>;
  canValidateStoredRoleId?: boolean;
  fallbackRoleId: number;
  isSpaceOwner?: boolean;
  isSpectator: boolean;
  storedRoleId?: number | null;
};

export type ResolveSelectableRoomRolesParams = {
  isSpaceOwner?: boolean;
  isSpectator: boolean;
  roomBaseRoles: readonly UserRole[];
  roomNpcRoles?: readonly UserRole[];
  userRoles?: readonly UserRole[];
};

export type ResolveSendIdentityParams = {
  currentAvatarId?: number;
  customRoleName?: string | null;
  inputContent?: string;
  isSpaceOwner?: boolean;
  isSpectator: boolean;
  roleId: number;
};

export type SendIdentity = {
  avatarId: number;
  content: string | undefined;
  customRoleName: string | undefined;
  roleId: number;
};

export function resolveCurrentRoomRoleId({
  storedRoleId,
  fallbackRoleId,
  availableRoleIds,
  canValidateStoredRoleId = true,
  isSpaceOwner,
  isSpectator,
}: ResolveCurrentRoomRoleIdParams): number {
  if (isSpectator) {
    return -1;
  }
  if (storedRoleId == null) {
    return fallbackRoleId;
  }
  if (storedRoleId <= 0 && !isSpaceOwner) {
    return canValidateStoredRoleId ? fallbackRoleId : storedRoleId;
  }
  if (storedRoleId > 0 && canValidateStoredRoleId && availableRoleIds && !availableRoleIds.has(storedRoleId)) {
    return fallbackRoleId;
  }
  return storedRoleId;
}

export function resolveSelectableRoomRoles({
  isSpaceOwner,
  isSpectator,
  roomBaseRoles,
  roomNpcRoles = [],
  userRoles = [],
}: ResolveSelectableRoomRolesParams): UserRole[] {
  if (isSpectator) {
    return [];
  }

  const userRoleIds = new Set(userRoles.map(role => role.roleId).filter((roleId): roleId is number => typeof roleId === "number"));
  const playerRoles = isSpaceOwner
    ? [...roomBaseRoles]
    : roomBaseRoles.filter(role => typeof role.roleId === "number" && userRoleIds.has(role.roleId));

  return isSpaceOwner ? [...playerRoles, ...roomNpcRoles] : playerRoles;
}

export function pickDefaultAvatarId(avatars: ReadonlyArray<{ avatarId?: number; avatarTitle?: { label?: string } }> = []): number {
  const defaultLabelAvatar = avatars.find(avatar => (avatar.avatarTitle?.label ?? "") === "默认");
  return defaultLabelAvatar?.avatarId ?? avatars[0]?.avatarId ?? -1;
}

export function buildOutOfCharacterSpeechContent(content: string): string {
  const trimmed = content.trim();
  return trimmed ? `(${trimmed})` : "";
}

export function resolveSendIdentity({
  currentAvatarId,
  customRoleName,
  inputContent,
  isSpaceOwner,
  isSpectator,
  roleId,
}: ResolveSendIdentityParams): SendIdentity {
  const resolvedRoleId = isSpectator ? -1 : roleId;
  if (resolvedRoleId < 0 && !isSpaceOwner && !isSpectator) {
    throw new Error("旁白仅主持可用，请先选择/拉入你的角色。");
  }

  const content = isSpectator && typeof inputContent === "string"
    ? buildOutOfCharacterSpeechContent(inputContent)
    : inputContent;

  return {
    avatarId: resolvedRoleId > 0 ? currentAvatarId ?? -1 : -1,
    content,
    customRoleName: resolvedRoleId > 0 ? customRoleName?.trim() || undefined : undefined,
    roleId: resolvedRoleId,
  };
}
