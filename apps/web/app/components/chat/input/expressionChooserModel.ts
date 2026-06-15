import type { RoleAvatar } from "../../../../api";

export const EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID = 0;
const DEFAULT_CATEGORY_LABEL = "默认";

export type ExpressionChooserAvatarVariantGroup = {
  variantId: number;
  label: string;
  avatars: RoleAvatar[];
  coverAvatar?: RoleAvatar;
};

export type ExpressionChooserAvatarCategoryGroup = {
  category: string;
  avatars: RoleAvatar[];
};

function normalizePositiveInteger(value: unknown): number | null {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return Math.floor(raw);
}

export function getExpressionChooserAvatarVariantId(avatar: RoleAvatar | null | undefined): number {
  return normalizePositiveInteger(avatar?.variantGroup?.variantId)
    ?? normalizePositiveInteger(avatar?.variantId)
    ?? EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID;
}

function getAvatarVariantLabel(avatar: RoleAvatar, variantId: number): string {
  if (variantId === EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID) {
    return "未分组";
  }
  return String(avatar.variantGroup?.name ?? "").trim() || `立绘组 ${variantId}`;
}

function compareVariantGroups(
  left: ExpressionChooserAvatarVariantGroup,
  right: ExpressionChooserAvatarVariantGroup,
): number {
  if (left.variantId === EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID && right.variantId !== EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID) {
    return 1;
  }
  if (right.variantId === EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID && left.variantId !== EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID) {
    return -1;
  }
  return left.label.localeCompare(right.label, "zh-CN") || left.variantId - right.variantId;
}

export function buildExpressionChooserAvatarVariantGroups(
  avatars: RoleAvatar[],
): ExpressionChooserAvatarVariantGroup[] {
  const groups = new Map<number, ExpressionChooserAvatarVariantGroup>();

  for (const avatar of avatars) {
    const variantId = getExpressionChooserAvatarVariantId(avatar);
    const current = groups.get(variantId);
    if (current) {
      current.avatars.push(avatar);
      if (avatar.avatarId === avatar.variantGroup?.baseAvatarId) {
        current.coverAvatar = avatar;
      }
      continue;
    }

    groups.set(variantId, {
      variantId,
      label: getAvatarVariantLabel(avatar, variantId),
      avatars: [avatar],
      coverAvatar: avatar,
    });
  }

  return Array.from(groups.values()).sort(compareVariantGroups);
}

export function getExpressionChooserAvatarVariantFolders(
  groups: ExpressionChooserAvatarVariantGroup[],
): ExpressionChooserAvatarVariantGroup[] {
  return groups.filter(group => group.variantId !== EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID);
}

export function resolveExpressionChooserActiveVariantId(params: {
  groups: ExpressionChooserAvatarVariantGroup[];
  preferredVariantId?: number | null;
  selectedAvatarId?: number | null;
}): number {
  const groupIds = new Set(params.groups.map(group => group.variantId));
  const preferredVariantId = params.preferredVariantId == null
    ? null
    : Math.floor(Number(params.preferredVariantId));
  if (preferredVariantId === EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID) {
    return EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID;
  }
  if (preferredVariantId != null && groupIds.has(preferredVariantId)) {
    return preferredVariantId;
  }

  const selectedAvatarId = normalizePositiveInteger(params.selectedAvatarId);
  if (selectedAvatarId != null) {
    const selectedGroup = params.groups.find(group => (
      group.avatars.some(avatar => normalizePositiveInteger(avatar.avatarId) === selectedAvatarId)
    ));
    if (selectedGroup) {
      return selectedGroup.variantId;
    }
  }

  return params.groups[0]?.variantId ?? EXPRESSION_CHOOSER_UNGROUPED_VARIANT_ID;
}

function getAvatarCategoryLabel(avatar: RoleAvatar): string {
  return String(avatar.category ?? "").trim() || DEFAULT_CATEGORY_LABEL;
}

export function buildExpressionChooserAvatarCategoryGroups(
  avatars: RoleAvatar[],
): ExpressionChooserAvatarCategoryGroup[] {
  const groups = new Map<string, RoleAvatar[]>();

  for (const avatar of avatars) {
    const category = getAvatarCategoryLabel(avatar);
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
    .map(([category, categoryAvatars]) => ({
      category,
      avatars: categoryAvatars,
    }));
}
