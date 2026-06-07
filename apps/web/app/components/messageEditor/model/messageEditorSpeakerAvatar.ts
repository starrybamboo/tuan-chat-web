import type { RoleAvatar } from "../../../../api";

import {
  normalizeMessageEditorSpeakerSearchQuery,
  resolveMessageEditorAvatarTitleLabel,
  scoreMessageEditorSpeakerSearchCandidate,
} from "./messageEditorSpeaker";

export type MessageEditorSpeakerAvatarMenuClearItem = {
  avatarTitle: "无";
  category: "操作";
  kind: "clear";
  roleId: number;
  selected: boolean;
};

export type MessageEditorSpeakerAvatarMenuAvatarItem = {
  avatarId: number;
  avatarTitle: string;
  category: string;
  kind: "avatar";
  roleId: number;
  selected: boolean;
};

export type MessageEditorSpeakerAvatarMenuItem = MessageEditorSpeakerAvatarMenuClearItem | MessageEditorSpeakerAvatarMenuAvatarItem;

const MESSAGE_EDITOR_SPEAKER_AVATAR_DEFAULT_CATEGORY = "默认";
const MESSAGE_EDITOR_SPEAKER_AVATAR_CLEAR_CATEGORY = "操作";

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isDefaultAvatarTitle(value: string): boolean {
  return value === MESSAGE_EDITOR_SPEAKER_AVATAR_DEFAULT_CATEGORY;
}

function compareMessageEditorSpeakerAvatarCategories(left: string, right: string): number {
  if (left === MESSAGE_EDITOR_SPEAKER_AVATAR_DEFAULT_CATEGORY && right !== MESSAGE_EDITOR_SPEAKER_AVATAR_DEFAULT_CATEGORY) {
    return -1;
  }
  if (right === MESSAGE_EDITOR_SPEAKER_AVATAR_DEFAULT_CATEGORY && left !== MESSAGE_EDITOR_SPEAKER_AVATAR_DEFAULT_CATEGORY) {
    return 1;
  }
  return left.localeCompare(right, "zh-CN");
}

/**
 * 生成用于取消 speaker 头像/角色的二阶段候选。
 */
export function buildMessageEditorSpeakerAvatarClearMenuItems(params: {
  roleId?: number;
  selected: boolean;
}): MessageEditorSpeakerAvatarMenuItem[] {
  return [{
    avatarTitle: "无",
    category: MESSAGE_EDITOR_SPEAKER_AVATAR_CLEAR_CATEGORY,
    kind: "clear",
    roleId: params.roleId ?? 0,
    selected: params.selected,
  }];
}

/**
 * 生成文档编辑器里 speaker 的头像候选菜单项。
 */
export function buildMessageEditorSpeakerAvatarMenuItems(params: {
  avatars: RoleAvatar[];
  query: string;
  roleId: number;
  selectedAvatarId?: number | null;
}): MessageEditorSpeakerAvatarMenuItem[] {
  const normalizedQuery = normalizeMessageEditorSpeakerSearchQuery(params.query);
  const entries: Array<MessageEditorSpeakerAvatarMenuAvatarItem & {
    isDefault: boolean;
    score: number;
    sourceIndex: number;
  }> = [];

  params.avatars.forEach((avatar, sourceIndex) => {
    const avatarId = isPositiveFiniteNumber(avatar.avatarId) ? avatar.avatarId : null;
    if (!avatarId) {
      return;
    }

    const avatarTitle = resolveMessageEditorAvatarTitleLabel(avatar.avatarTitle) || `头像 #${avatarId}`;
    const category = String(avatar.category ?? "").trim() || MESSAGE_EDITOR_SPEAKER_AVATAR_DEFAULT_CATEGORY;
    const score = normalizedQuery
      ? scoreMessageEditorSpeakerSearchCandidate({
          description: category,
          roleName: avatarTitle,
        }, params.query)
      : 1;
    if (normalizedQuery && score <= 0) {
      return;
    }

    entries.push({
      avatarId,
      avatarTitle,
      category,
      kind: "avatar",
      roleId: params.roleId,
      score,
      selected: avatarId === params.selectedAvatarId,
      isDefault: isDefaultAvatarTitle(avatarTitle),
      sourceIndex,
    });
  });

  entries.sort((left, right) => {
    if (normalizedQuery) {
      return right.score - left.score
        || Number(right.isDefault) - Number(left.isDefault)
        || compareMessageEditorSpeakerAvatarCategories(left.category, right.category)
        || left.sourceIndex - right.sourceIndex
        || left.avatarId - right.avatarId;
    }

    return Number(right.isDefault) - Number(left.isDefault)
      || compareMessageEditorSpeakerAvatarCategories(left.category, right.category)
      || left.sourceIndex - right.sourceIndex
      || left.avatarId - right.avatarId;
  });

  return [...entries.map<MessageEditorSpeakerAvatarMenuItem>(item => ({
    avatarId: item.avatarId,
    avatarTitle: item.avatarTitle,
    category: item.category,
    kind: "avatar",
    roleId: item.roleId,
    selected: item.selected,
  })), ...buildMessageEditorSpeakerAvatarClearMenuItems({
    roleId: params.roleId,
    selected: params.selectedAvatarId == null,
  })];
}
