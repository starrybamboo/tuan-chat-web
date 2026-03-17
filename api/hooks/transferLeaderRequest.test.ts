import { describe, expect, it, vi } from "vitest";

import { transferLeaderWithFallbackDeps } from "./transferLeaderRequest";

describe("transferLeaderWithFallbackDeps", () => {
  const requestBody = {
    spaceId: 12,
    newLeaderId: 34,
  };

  it("运行时 client 已包含 transferLeader 时优先走 service 方法", async () => {
    const transferLeader = vi.fn().mockResolvedValue({ success: true });
    const request = vi.fn().mockResolvedValue({ success: true });

    await transferLeaderWithFallbackDeps(requestBody, {
      controller: { transferLeader },
      request: { request },
    });

    expect(transferLeader).toHaveBeenCalledWith(requestBody);
    expect(request).not.toHaveBeenCalled();
  });

  it("运行时 client 缺少 transferLeader 时回退到底层请求", async () => {
    const request = vi.fn().mockResolvedValue({ success: true });

    await transferLeaderWithFallbackDeps(requestBody, {
      controller: {},
      request: { request },
    });

    expect(request).toHaveBeenCalledWith({
      method: "PUT",
      url: "/space/member/leader",
      body: requestBody,
      mediaType: "application/json",
    });
  });
});
