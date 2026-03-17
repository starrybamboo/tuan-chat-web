import { describe, expect, it, vi } from "vitest";

import { updateSpaceMemberTypeWithFallbackDeps } from "./updateSpaceMemberTypeRequest";

describe("updateSpaceMemberTypeWithFallback", () => {
  const requestBody = {
    spaceId: 12,
    uidList: [34],
    memberType: 3,
  };

  it("运行时 client 已包含 updateMemberType 时优先走 service 方法", async () => {
    const updateMemberType = vi.fn().mockResolvedValue({ success: true });
    const request = vi.fn().mockResolvedValue({ success: true });

    await updateSpaceMemberTypeWithFallbackDeps(requestBody, {
      controller: { updateMemberType },
      request: { request },
    });

    expect(updateMemberType).toHaveBeenCalledWith(requestBody);
    expect(request).not.toHaveBeenCalled();
  });

  it("运行时 client 缺少 updateMemberType 时回退到底层请求", async () => {
    const request = vi.fn().mockResolvedValue({ success: true });

    await updateSpaceMemberTypeWithFallbackDeps(requestBody, {
      controller: {},
      request: { request },
    });

    expect(request).toHaveBeenCalledWith({
      method: "PUT",
      url: "/space/member/type",
      body: requestBody,
      mediaType: "application/json",
    });
  });
});
