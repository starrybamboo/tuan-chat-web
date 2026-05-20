import { describe, expect, it } from "vitest";

import {
  DEFAULT_CACHED_IMAGE_POINTER_EVENTS,
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
});
