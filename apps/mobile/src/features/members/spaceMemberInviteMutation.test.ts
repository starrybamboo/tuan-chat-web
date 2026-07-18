import { describe, expect, it, vi } from "vitest";

import { inviteSpaceMember } from "./spaceMemberInviteMutation";

describe("inviteSpaceMember", () => {
  it("观战邀请只新增空间成员", async () => {
    const addMember = vi.fn(async () => ({ success: true }));
    const grantPlayer = vi.fn(async () => ({ success: true }));

    await inviteSpaceMember({ addMember, grantPlayer }, {
      inviteAsPlayer: false,
      spaceId: 12,
      userId: 34,
    });

    expect(addMember).toHaveBeenCalledWith({ spaceId: 12, userIdList: [34] });
    expect(grantPlayer).not.toHaveBeenCalled();
  });

  it("玩家邀请在新增成员成功后授予玩家身份", async () => {
    const addMember = vi.fn(async () => ({ success: true }));
    const grantPlayer = vi.fn(async () => ({ success: true }));

    await inviteSpaceMember({ addMember, grantPlayer }, {
      inviteAsPlayer: true,
      spaceId: 12,
      userId: 34,
    });

    expect(grantPlayer).toHaveBeenCalledWith({ spaceId: 12, uidList: [34] });
  });

  it("新增成员失败时保留后端错误且不继续授予玩家", async () => {
    const addMember = vi.fn(async () => ({ success: false, errMsg: "无权邀请" }));
    const grantPlayer = vi.fn(async () => ({ success: true }));

    await expect(inviteSpaceMember({ addMember, grantPlayer }, {
      inviteAsPlayer: true,
      spaceId: 12,
      userId: 34,
    })).rejects.toThrow("无权邀请");
    expect(grantPlayer).not.toHaveBeenCalled();
  });

  it("授予玩家失败时向界面返回明确错误", async () => {
    const addMember = vi.fn(async () => ({ success: true }));
    const grantPlayer = vi.fn(async () => ({ success: false, errMsg: "玩家席位不可用" }));

    await expect(inviteSpaceMember({ addMember, grantPlayer }, {
      inviteAsPlayer: true,
      spaceId: 12,
      userId: 34,
    })).rejects.toThrow("玩家席位不可用");
  });
});
