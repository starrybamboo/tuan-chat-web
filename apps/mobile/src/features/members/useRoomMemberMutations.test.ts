import { describe, expect, it, vi } from "vitest";

import { addRoomMemberWithSuccessGuard } from "./roomMemberMutation";

describe("addRoomMemberWithSuccessGuard", () => {
  it("成功时透传添加成员请求结果", async () => {
    const addMember1 = vi.fn().mockResolvedValue({ success: true, data: null });
    const result = await addRoomMemberWithSuccessGuard(
      { roomMemberController: { addMember1 } } as any,
      { roomId: 10, userIdList: [20] },
    );

    expect(addMember1).toHaveBeenCalledWith({ roomId: 10, userIdList: [20] });
    expect(result.success).toBe(true);
  });

  it("接口返回失败时抛出可读错误", async () => {
    const addMember1 = vi.fn().mockResolvedValue({ success: false, errMsg: "没有权限" });

    await expect(addRoomMemberWithSuccessGuard(
      { roomMemberController: { addMember1 } } as any,
      { roomId: 10, userIdList: [20] },
    )).rejects.toThrow("没有权限");
  });
});
