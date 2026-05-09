import type { SpaceMember, UserRole } from "api";

import { SPACE_MEMBER_TYPE } from "@/components/chat/utils/memberPermissions";
import { resolveUserDisplayName } from "@/components/common/userAccess.shared";

/**
 * BlockNote 编辑器内可选择的 mention 候选项。
 */
export type BlocksuiteMentionCandidate = {
  key: string;
  kind: "role" | "member";
  label: string;
  insertText: string;
  group: "角色" | "空间成员";
  badge: "角色" | "成员";
  subtext?: string;
  keywords: string[];
};

const MEMBER_TYPE_LABEL: Record<number, string> = {
  [SPACE_MEMBER_TYPE.LEADER]: "主持",
  [SPACE_MEMBER_TYPE.PLAYER]: "玩家",
  [SPACE_MEMBER_TYPE.OBSERVER]: "观战",
  [SPACE_MEMBER_TYPE.BOT]: "骰娘",
  [SPACE_MEMBER_TYPE.ASSISTANT_LEADER]: "副主持",
};

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function buildRoleMentionCandidate(role: UserRole): BlocksuiteMentionCandidate {
  const roleName = role.roleName?.trim() || `角色${role.roleId}`;
  const mentionNote = role.extra?.mentionNote?.trim();
  const roleTypeLabel = role.type === 1 ? "骰娘" : role.type === 2 ? "NPC" : "角色";

  return {
    key: `role:${role.roleId}`,
    kind: "role",
    label: roleName,
    insertText: roleName,
    group: "角色",
    badge: "角色",
    subtext: mentionNote || `${roleTypeLabel} #${role.roleId}`,
    keywords: [roleName, mentionNote ?? "", roleTypeLabel, String(role.roleId)],
  };
}

function buildMemberMentionCandidate(member: SpaceMember): BlocksuiteMentionCandidate | null {
  const userId = member.userId ?? -1;
  if (userId <= 0) {
    return null;
  }

  const displayName = resolveUserDisplayName(member, `用户${userId}`);
  const memberTypeLabel = typeof member.memberType === "number"
    ? MEMBER_TYPE_LABEL[member.memberType]
    : undefined;

  return {
    key: `member:${userId}`,
    kind: "member",
    label: displayName,
    insertText: displayName,
    group: "空间成员",
    badge: "成员",
    subtext: memberTypeLabel ? `空间成员 · ${memberTypeLabel}` : `空间成员 #${userId}`,
    keywords: [displayName, memberTypeLabel ?? "", "空间成员", String(userId)],
  };
}

/**
 * 将空间角色与空间成员整理为统一的编辑器 mention 候选项。
 */
export function buildBlocksuiteMentionCandidates(params: {
  roles: UserRole[];
  spaceMembers: SpaceMember[];
}): BlocksuiteMentionCandidate[] {
  const { roles, spaceMembers } = params;
  const candidates: BlocksuiteMentionCandidate[] = [];
  const seenRoleIds = new Set<number>();
  const seenMemberUserIds = new Set<number>();

  for (const role of roles) {
    if (!Number.isFinite(role.roleId) || seenRoleIds.has(role.roleId)) {
      continue;
    }
    seenRoleIds.add(role.roleId);
    candidates.push(buildRoleMentionCandidate(role));
  }

  for (const member of spaceMembers) {
    const userId = member.userId ?? -1;
    if (userId <= 0 || seenMemberUserIds.has(userId)) {
      continue;
    }
    seenMemberUserIds.add(userId);

    const candidate = buildMemberMentionCandidate(member);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

/**
 * 根据输入关键字过滤 mention 候选项。
 */
export function filterBlocksuiteMentionCandidates(
  candidates: BlocksuiteMentionCandidate[],
  keyword: string,
) {
  const normalizedKeyword = normalizeKeyword(keyword);
  if (!normalizedKeyword) {
    return candidates;
  }

  return candidates.filter(candidate =>
    candidate.keywords.some(value => normalizeKeyword(value).includes(normalizedKeyword)),
  );
}
