import { describe, expect, it } from "vitest";

import { resolveRoomMemberState } from "./useRoomMemberState";

describe("resolveRoomMemberState", () => {
  it("在未合并 space 成员信息时，房间成员默认仍可发言", () => {
    const state = resolveRoomMemberState({
      roomId: 2,
      roomMembers: [{ roomId: 2, userId: 1001 }],
      userId: 1001,
      spaceMembers: [],
    });

    expect(state.curMember?.memberType).toBe(2);
    expect(state.isSpectator).toBe(false);
    expect(state.notMember).toBe(false);
  });

  it("主持人即使不在 room_member 中，也不应被判成观战", () => {
    const state = resolveRoomMemberState({
      roomId: 2,
      roomMembers: [{ roomId: 2, userId: 2002 }],
      userId: 1001,
      spaceMembers: [{ spaceId: 9, userId: 1001, memberType: 1 }],
    });

    expect(state.members).toHaveLength(1);
    expect(state.curMember).toMatchObject({
      roomId: 2,
      spaceId: 9,
      userId: 1001,
      memberType: 1,
    });
    expect(state.isSpectator).toBe(false);
    expect(state.notMember).toBe(false);
  });

  it("观战成员不在房间成员列表时，仍保持观战状态", () => {
    const state = resolveRoomMemberState({
      roomId: 2,
      roomMembers: [{ roomId: 2, userId: 2002 }],
      userId: 1001,
      spaceMembers: [{ spaceId: 9, userId: 1001, memberType: 3 }],
    });

    expect(state.curMember).toBeUndefined();
    expect(state.isSpectator).toBe(true);
    expect(state.notMember).toBe(true);
  });
});
