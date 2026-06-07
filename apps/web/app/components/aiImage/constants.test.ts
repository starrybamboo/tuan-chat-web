import { describe, expect, it } from "vitest";

import { DEFAULT_DIRECTOR_TOOL_ID, isDirectorToolDisabled } from "@/components/aiImage/constants";

describe("aiImage constants", () => {
  it("defaults Director Tools to the first enabled tool", () => {
    expect(DEFAULT_DIRECTOR_TOOL_ID).toBe("lineArt");
  });

  it("keeps Remove BG and Emotion disabled while leaving other tools available", () => {
    expect(isDirectorToolDisabled("removeBackground")).toBe(true);
    expect(isDirectorToolDisabled("emotion")).toBe(true);
    expect(isDirectorToolDisabled("lineArt")).toBe(false);
    expect(isDirectorToolDisabled("colorize")).toBe(false);
  });
});
