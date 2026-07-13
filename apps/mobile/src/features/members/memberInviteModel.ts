import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";
import type { SpaceMember } from "@tuanchat/openapi-client/models/SpaceMember";

export type MemberInviteCandidate = {
  avatarFileId?: number;
  isRoomMember: boolean;
  source: "friend" | "space";
  userId: number;
  username: string;
};

type BuildMemberInviteCandidatesOptions = {
  currentUserId?: number | null;
  friends: readonly FriendResponse[];
  query: string;
  roomMemberUserIds: ReadonlySet<number>;
  spaceMembers: readonly SpaceMember[];
};

function normalizeCandidate(
  member: Pick<FriendResponse, "avatarFileId" | "userId" | "username">,
  source: MemberInviteCandidate["source"],
  roomMemberUserIds: ReadonlySet<number>,
): MemberInviteCandidate | null {
  if (typeof member.userId !== "number" || member.userId <= 0) {
    return null;
  }
  return {
    avatarFileId: member.avatarFileId,
    isRoomMember: roomMemberUserIds.has(member.userId),
    source,
    userId: member.userId,
    username: member.username?.trim() || `用户 #${member.userId}`,
  };
}

export function buildMemberInviteCandidates(options: BuildMemberInviteCandidatesOptions) {
  const candidatesByUserId = new Map<number, MemberInviteCandidate>();
  for (const member of options.spaceMembers) {
    const candidate = normalizeCandidate(member, "space", options.roomMemberUserIds);
    if (candidate && candidate.userId !== options.currentUserId) {
      candidatesByUserId.set(candidate.userId, candidate);
    }
  }
  for (const friend of options.friends) {
    const candidate = normalizeCandidate(friend, "friend", options.roomMemberUserIds);
    if (candidate && candidate.userId !== options.currentUserId && !candidatesByUserId.has(candidate.userId)) {
      candidatesByUserId.set(candidate.userId, candidate);
    }
  }

  const query = options.query.trim().toLocaleLowerCase("zh-CN");
  return [...candidatesByUserId.values()]
    .filter(candidate => !query
      || candidate.username.toLocaleLowerCase("zh-CN").includes(query)
      || String(candidate.userId).includes(query))
    .sort((left, right) => {
      if (left.isRoomMember !== right.isRoomMember) {
        return left.isRoomMember ? 1 : -1;
      }
      return left.username.localeCompare(right.username, "zh-CN") || left.userId - right.userId;
    });
}
