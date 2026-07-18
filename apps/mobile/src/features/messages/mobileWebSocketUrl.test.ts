import { afterEach, describe, expect, it, vi } from "vitest";

describe("createMobileWebSocketUrl", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.EXPO_PUBLIC_TUANCHAT_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_TUANCHAT_API_WS_URL;
  });

  it("uses explicit websocket url instead of deriving from api base url", async () => {
    process.env.EXPO_PUBLIC_TUANCHAT_API_WS_URL = "ws://10.0.2.2:8090";
    vi.doMock("../../lib/api", () => ({
      DEFAULT_TUANCHAT_API_BASE_URL: "http://10.0.2.2:8081",
      LOCAL_TUANCHAT_API_BASE_URL: "http://10.0.2.2:8081",
      PRODUCTION_TUANCHAT_API_BASE_URL: "https://api.tuan.chat/api",
    }));

    const { createMobileWebSocketUrl } = await import("./mobileWebSocketUrl");

    expect(createMobileWebSocketUrl("token value")).toBe("ws://10.0.2.2:8090?token=token%20value");
  });

  it("uses local websocket port when api base url is local default", async () => {
    vi.doMock("../../lib/api", () => ({
      DEFAULT_TUANCHAT_API_BASE_URL: "http://10.0.2.2:8081",
      LOCAL_TUANCHAT_API_BASE_URL: "http://10.0.2.2:8081",
      PRODUCTION_TUANCHAT_API_BASE_URL: "https://api.tuan.chat/api",
    }));

    const { createMobileWebSocketUrl } = await import("./mobileWebSocketUrl");

    expect(createMobileWebSocketUrl("token value")).toBe("ws://10.0.2.2:8090?token=token%20value");
  });

  it("uses production websocket url when api base url is production default", async () => {
    vi.doMock("../../lib/api", () => ({
      DEFAULT_TUANCHAT_API_BASE_URL: "https://api.tuan.chat/api",
      LOCAL_TUANCHAT_API_BASE_URL: "http://10.0.2.2:8081",
      PRODUCTION_TUANCHAT_API_BASE_URL: "https://api.tuan.chat/api",
    }));

    const { createMobileWebSocketUrl } = await import("./mobileWebSocketUrl");

    expect(createMobileWebSocketUrl("token value")).toBe("wss://api.tuan.chat/ws?token=token%20value");
  });
});
