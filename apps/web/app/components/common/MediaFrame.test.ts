import { describe, expect, it } from "vitest";

import { mediaAspectClassName } from "./MediaFrame";

describe("mediaAspectClassName", () => {
  it("将业务媒体比例收敛为固定语义档位", () => {
    expect(mediaAspectClassName("square")).toBe("aspect-square");
    expect(mediaAspectClassName("portrait")).toBe("aspect-3/4");
    expect(mediaAspectClassName("landscape")).toBe("aspect-4/3");
    expect(mediaAspectClassName("video")).toBe("aspect-video");
    expect(mediaAspectClassName("auto")).toBe("");
  });
});
