import { describe, expect, it, vi } from "vitest";

import { createLoginEasterEggAnalyticsReporter } from "./loginEasterEggAnalytics";

describe("createLoginEasterEggAnalyticsReporter", () => {
  it("会在托管登录页上报同源事件", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    const report = createLoginEasterEggAnalyticsReporter({
      fetchFn,
      getLocation: () => ({ hostname: "tuan.chat", protocol: "https:" }),
      isProd: true,
    });

    await expect(report("login_easter_egg_discovered")).resolves.toBe(true);
    expect(fetchFn).toHaveBeenCalledWith("/_analytics/login-easter-egg-discovered", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });
  });

  it("会跳过本地开发环境", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    const report = createLoginEasterEggAnalyticsReporter({
      fetchFn,
      getLocation: () => ({ hostname: "localhost", protocol: "http:" }),
      isProd: false,
    });

    await expect(report("login_page_view")).resolves.toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("会吸收观测请求失败，保持登录流程可用", async () => {
    const report = createLoginEasterEggAnalyticsReporter({
      fetchFn: vi.fn(async () => {
        throw new Error("network unavailable");
      }),
      getLocation: () => ({ hostname: "test.tuan.chat", protocol: "https:" }),
      isProd: true,
    });

    await expect(report("login_page_view")).resolves.toBe(false);
  });

  it("不会把旧版 SPA 的 200 响应误判为事件已写入", async () => {
    const report = createLoginEasterEggAnalyticsReporter({
      fetchFn: vi.fn(async () => new Response("<html />", { status: 200 })),
      getLocation: () => ({ hostname: "tuan.chat", protocol: "https:" }),
      isProd: true,
    });

    await expect(report("login_page_view")).resolves.toBe(false);
  });
});
