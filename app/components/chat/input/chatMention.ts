import { SPACE_MEMBER_TYPE } from "@/components/chat/utils/memberPermissions";
import { resolveUserDisplayName } from "@/components/common/userAccess.shared";

import type { SpaceMember, UserRole } from "../../../../api";

/**
 * 编辑器内可插入的 mention 候选项。
 */
export type ChatMentionCandidate = ChatMentionRoleCandidate | ChatMentionMemberCandidate;

/**
 * 角色 mention 候选项。
 */
export type ChatMentionRoleCandidate = {
  kind: "role";
  key: string;
  keywords: string[];
  note?: string;
  role: UserRole;
};

/**
 * 空间成员 mention 候选项。
 */
export type ChatMentionMemberCandidate = {
  kind: "member";
  key: string;
  keywords: string[];
  note?: string;
  member: SpaceMember;
};

/**
 * 输入框解析后的 mention 快照。
 */
export type ChatInputMentionSnapshot = {
  mentionedRoles: UserRole[];
  textWithoutMentions: string;
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

/**
 * 获取 mention 候选项在编辑器和下拉菜单中的展示名。
 */
export function getChatMentionDisplayName(candidate: ChatMentionCandidate) {
  if (candidate.kind === "role") {
    return candidate.role.roleName?.trim() || `角色${candidate.role.roleId}`;
  }
  const userId = candidate.member.userId ?? -1;
  return candidate.member.username?.trim() || (userId > 0 ? `用户${userId}` : "未知用户");
}

/**
 * 将角色列表和空间成员列表整理为统一的 mention 候选项。
 */
export function buildChatMentionCandidates(params: {
  roles: UserRole[];
  spaceMembers: SpaceMember[];
}): ChatMentionCandidate[] {
  const { roles, spaceMembers } = params;
  const memberCandidates: ChatMentionMemberCandidate[] = [];
  const seenMemberUserIds = new Set<number>();

  for (const member of spaceMembers) {
    const userId = member.userId ?? -1;
    if (userId <= 0 || seenMemberUserIds.has(userId)) {
      continue;
    }
    seenMemberUserIds.add(userId);

    const displayName = resolveUserDisplayName(member, `用户${userId}`);
    const memberTypeLabel = typeof member.memberType === "number"
      ? MEMBER_TYPE_LABEL[member.memberType]
      : undefined;
    const note = memberTypeLabel ? `空间成员 · ${memberTypeLabel}` : "空间成员";
    memberCandidates.push({
      kind: "member",
      key: `member:${userId}`,
      keywords: [displayName, note, String(userId)],
      note,
      member,
    });
  }

  const roleCandidates: ChatMentionRoleCandidate[] = roles.map((role) => {
    const roleName = role.roleName?.trim() || `角色${role.roleId}`;
    const mentionNote = role.extra?.mentionNote?.trim();
    return {
      kind: "role",
      key: `role:${role.roleId}`,
      keywords: [roleName, mentionNote ?? "", String(role.roleId)],
      note: mentionNote,
      role,
    };
  });

  return [...roleCandidates, ...memberCandidates];
}

/**
 * 根据输入关键字过滤 mention 候选项。
 */
export function filterChatMentionCandidates(candidates: ChatMentionCandidate[], keyword: string) {
  const normalizedKeyword = normalizeKeyword(keyword);
  if (!normalizedKeyword) {
    return candidates;
  }

  return candidates.filter(candidate =>
    candidate.keywords.some(value => normalizeKeyword(value).includes(normalizedKeyword)),
  );
}

/**
 * 从 contentEditable 编辑器中提取角色 mention，并生成去掉所有 mention 节点后的纯文本。
 */
export function extractChatInputMentionSnapshot(editorDiv: HTMLDivElement | null): ChatInputMentionSnapshot {
  if (!editorDiv) {
    return { mentionedRoles: [], textWithoutMentions: "" };
  }

  const clone = editorDiv.cloneNode(true) as HTMLDivElement;
  const mentionedRoles: UserRole[] = [];
  const mentionSpans = clone.querySelectorAll<HTMLSpanElement>("span[data-role], span[data-member]");

  mentionSpans.forEach((span) => {
    const roleData = span.dataset.role;
    if (roleData) {
      try {
        const role: UserRole = JSON.parse(roleData);
        if (!mentionedRoles.some(item => item.roleId === role.roleId)) {
          mentionedRoles.push(role);
        }
      }
      catch (error) {
        console.error("Failed to parse role data", error);
      }
    }
    span.parentNode?.removeChild(span);
  });

  return {
    mentionedRoles,
    textWithoutMentions: (clone.textContent ?? "").replace(/\u00A0/g, " "),
  };
}
