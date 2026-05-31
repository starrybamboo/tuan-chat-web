import { describe, expect, it } from "vitest";

import {
  DEFAULT_CACHED_IMAGE_POINTER_EVENTS,
  resolveCachedImageOriginalFallbackUri,
  resolveCachedImagePointerEvents,
} from "./cachedImageModel";

describe("cached image", () => {
  it("默认不参与触摸命中，让父级 Pressable 接管点击", () => {
    expect(DEFAULT_CACHED_IMAGE_POINTER_EVENTS).toBe("none");
    expect(resolveCachedImagePointerEvents(undefined)).toBe("none");
  });

  it("允许调用方显式覆盖触摸命中策略", () => {
    expect(resolveCachedImagePointerEvents("auto")).toBe("auto");
    expect(resolveCachedImagePointerEvents("box-none")).toBe("box-none");
  });

  it("媒体派生图加载失败时，会回退到 original URL", () => {
    expect(resolveCachedImageOriginalFallbackUri("/media/v1/files/045/45/image/low.webp"))
      .toBe("/media/v1/files/045/45/original");
    expect(resolveCachedImageOriginalFallbackUri("/media/v1/files/045/45/image/medium.webp"))
      .toBe("/media/v1/files/045/45/original");
  });

  it("original 和非媒体 URL 不会继续回退", () => {
    expect(resolveCachedImageOriginalFallbackUri("/media/v1/files/045/45/original")).toBeNull();
    expect(resolveCachedImageOriginalFallbackUri("https://example.com/avatar.png")).toBeNull();
  });
});
