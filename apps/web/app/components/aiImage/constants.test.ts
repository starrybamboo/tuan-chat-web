import { describe, expect, it } from "vitest";

import { DEFAULT_DIRECTOR_TOOL_ID, DEFAULT_PRO_IMAGE_SETTINGS, DIRECTOR_TOOL_OPTIONS } from "@/components/aiImage/constants";

describe("aiImage constants", () => {
  it("defaults Director Tools to the first enabled tool", () => {
    expect(DEFAULT_DIRECTOR_TOOL_ID).toBe("lineArt");
  });

  it("exposes only supported Director tools", () => {
    expect(DIRECTOR_TOOL_OPTIONS.map(tool => tool.id)).toEqual(["lineArt", "sketch", "colorize", "declutter"]);
  });

  it("matches NovelAI V4.5 quality defaults", () => {
    expect(DEFAULT_PRO_IMAGE_SETTINGS.qualityToggle).toBe(true);
    expect(DEFAULT_PRO_IMAGE_SETTINGS.cfgDelay).toBe(false);
    expect(DEFAULT_PRO_IMAGE_SETTINGS.dynamicThresholding).toBe(false);
  });
});
