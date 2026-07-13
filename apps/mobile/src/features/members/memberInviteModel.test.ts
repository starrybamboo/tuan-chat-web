import { describe, expect, it } from "vitest";

import { buildMemberInviteCandidates } from "./memberInviteModel";

describe("buildMemberInviteCandidates", () => {
  it("合并空间成员和好友并过滤当前用户", () => {
    const candidates = buildMemberInviteCandidates({
      currentUserId: 1,
      friends: [
        { userId: 2, username: "好友二" },
        { userId: 4, username: "好友四" },
      ],
      query: "",
      roomMemberUserIds: new Set([2]),
      spaceMembers: [
        { userId: 1, username: "自己" },
        { userId: 2, username: "空间二" },
        { userId: 3, username: "空间三" },
      ],
    });

    expect(candidates).toEqual([
      { avatarFileId: undefined, isRoomMember: false, source: "friend", userId: 4, username: "好友四" },
      { avatarFileId: undefined, isRoomMember: false, source: "space", userId: 3, username: "空间三" },
      { avatarFileId: undefined, isRoomMember: true, source: "space", userId: 2, username: "空间二" },
    ]);
  });

  it("按用户名或用户 ID 搜索，并优先复用空间成员资料", () => {
    const candidates = buildMemberInviteCandidates({
      friends: [{ userId: 2, username: "好友资料" }],
      query: "2",
      roomMemberUserIds: new Set(),
      spaceMembers: [{ userId: 2, username: "空间资料", avatarFileId: 20 }],
    });

    expect(candidates).toEqual([
      { avatarFileId: 20, isRoomMember: false, source: "space", userId: 2, username: "空间资料" },
    ]);
  });
});
