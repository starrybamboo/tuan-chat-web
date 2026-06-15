import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";

export const ROLE_AVATAR_UNGROUPED_VARIANT_ID = 0;

const DEFAULT_CATEGORY_LABEL = "默认";

export type RoleAvatarVariantGroup = {
  avatars: RoleAvatar[];
  coverAvatar?: RoleAvatar;
  label: string;
  variantId: number;
};

export type RoleAvatarCategoryGroup = {
  avatars: RoleAvatar[];
  category: string;
};

function normalizePositiveInteger(value: unknown): number | null {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return Math.floor(raw);
}

export function getRoleAvatarVariantId(avatar: RoleAvatar | null | undefined): number {
  return normalizePositiveInteger(avatar?.variantGroup?.variantId)
    ?? normalizePositiveInteger(avatar?.variantId)
    ?? ROLE_AVATAR_UNGROUPED_VARIANT_ID;
}

function getRoleAvatarVariantLabel(avatar: RoleAvatar, variantId: number): string {
  if (variantId === ROLE_AVATAR_UNGROUPED_VARIANT_ID) {
    return "未分组";
  }
  return String(avatar.variantGroup?.name ?? "").trim() || `立绘组 ${variantId}`;
}

function compareVariantGroups(left: RoleAvatarVariantGroup, right: RoleAvatarVariantGroup): number {
  if (left.variantId === ROLE_AVATAR_UNGROUPED_VARIANT_ID && right.variantId !== ROLE_AVATAR_UNGROUPED_VARIANT_ID) {
    return 1;
  }
  if (right.variantId === ROLE_AVATAR_UNGROUPED_VARIANT_ID && left.variantId !== ROLE_AVATAR_UNGROUPED_VARIANT_ID) {
    return -1;
  }
  return left.label.localeCompare(right.label, "zh-CN") || left.variantId - right.variantId;
}

export function buildRoleAvatarVariantGroups(avatars: RoleAvatar[]): RoleAvatarVariantGroup[] {
  const groups = new Map<number, RoleAvatarVariantGroup>();

  for (const avatar of avatars) {
    const variantId = getRoleAvatarVariantId(avatar);
    const current = groups.get(variantId);
    if (current) {
      current.avatars.push(avatar);
      if (avatar.avatarId === avatar.variantGroup?.baseAvatarId) {
        current.coverAvatar = avatar;
      }
      continue;
    }

    groups.set(variantId, {
      avatars: [avatar],
      coverAvatar: avatar,
      label: getRoleAvatarVariantLabel(avatar, variantId),
      variantId,
    });
  }

  return Array.from(groups.values()).sort(compareVariantGroups);
}

export function getRoleAvatarVariantFolders(groups: RoleAvatarVariantGroup[]): RoleAvatarVariantGroup[] {
  return groups.filter(group => group.variantId !== ROLE_AVATAR_UNGROUPED_VARIANT_ID);
}

export function resolveActiveRoleAvatarVariantId(params: {
  groups: RoleAvatarVariantGroup[];
  preferredVariantId?: number | null;
  selectedAvatarId?: number | null;
}): number {
  const groupIds = new Set(params.groups.map(group => group.variantId));
  const preferredVariantId = params.preferredVariantId == null
    ? null
    : Math.floor(Number(params.preferredVariantId));

  if (preferredVariantId === ROLE_AVATAR_UNGROUPED_VARIANT_ID) {
    return ROLE_AVATAR_UNGROUPED_VARIANT_ID;
  }
  if (preferredVariantId != null && groupIds.has(preferredVariantId)) {
    return preferredVariantId;
  }

  const selectedAvatarId = normalizePositiveInteger(params.selectedAvatarId);
  if (selectedAvatarId != null) {
    const selectedGroup = params.groups.find(group =>
      group.avatars.some(avatar => normalizePositiveInteger(avatar.avatarId) === selectedAvatarId),
    );
    if (selectedGroup) {
      return selectedGroup.variantId;
    }
  }

  return params.groups[0]?.variantId ?? ROLE_AVATAR_UNGROUPED_VARIANT_ID;
}

function getRoleAvatarCategoryLabel(avatar: RoleAvatar): string {
  return String(avatar.category ?? "").trim() || DEFAULT_CATEGORY_LABEL;
}

export function buildRoleAvatarCategoryGroups(avatars: RoleAvatar[]): RoleAvatarCategoryGroup[] {
  const groups = new Map<string, RoleAvatar[]>();

  for (const avatar of avatars) {
    const category = getRoleAvatarCategoryLabel(avatar);
    const current = groups.get(category);
    if (current) {
      current.push(avatar);
    }
    else {
      groups.set(category, [avatar]);
    }
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => {
      if (left === DEFAULT_CATEGORY_LABEL && right !== DEFAULT_CATEGORY_LABEL) {
        return -1;
      }
      if (right === DEFAULT_CATEGORY_LABEL && left !== DEFAULT_CATEGORY_LABEL) {
        return 1;
      }
      return left.localeCompare(right, "zh-CN");
    })
    .map(([category, avatars]) => ({
      avatars,
      category,
    }));
}
