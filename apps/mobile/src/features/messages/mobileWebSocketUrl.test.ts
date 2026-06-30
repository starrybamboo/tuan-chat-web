import { afterEach, describe, expect, it, vi } from "vitest";

describe("createMobileWebSocketUrl", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.EXPO_PUBLIC_TUANCHAT_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_TUANCHAT_API_WS_URL;
  });

  it("uses explicit websocket url instead of deriving from api base url", async () => {
    process.env.EXPO_PUBLIC_TUANCHAT_API_WS_URL = "ws://127.0.0.1:8090";
    vi.doMock("../../lib/api", () => ({
      DEFAULT_TUANCHAT_API_BASE_URL: "http://127.0.0.1:8081",
    }));

    const { createMobileWebSocketUrl } = await import("./mobileWebSocketUrl");

    expect(createMobileWebSocketUrl("token value")).toBe("ws://127.0.0.1:8090?token=token%20value");
  });
});
