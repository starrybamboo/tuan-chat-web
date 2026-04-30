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

  it("会为同源 API 生成相对代理地址", () => {
    stubWindowLocation("https://test.tuan.chat");

    expect(resolveBackendGenerateImageUrl()).toBe("/api/novelapi/ai/generate-image");
    expect(resolveBackendAugmentImageUrl()).toBe("/api/novelapi/ai/augment-image");
  });
});
