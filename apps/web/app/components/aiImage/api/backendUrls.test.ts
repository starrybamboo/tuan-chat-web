import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveBackendAugmentImageUrl, resolveBackendGenerateImageUrl } from "@/components/aiImage/api/backendUrls";

function stubWindowLocation(origin: string) {
  vi.stubGlobal("window", {
    location: {
      href: `${origin}/ai-image`,
      origin,
    },
    isSecureContext: true,
  });
}

describe("backendUrls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("会为线上 API 生成直连后端地址", () => {
    stubWindowLocation("https://test.tuan.chat");

    expect(resolveBackendGenerateImageUrl()).toBe("https://api.tuan.chat/api/novelapi/ai/generate-image");
    expect(resolveBackendAugmentImageUrl()).toBe("https://api.tuan.chat/api/novelapi/ai/augment-image");
  });
});
