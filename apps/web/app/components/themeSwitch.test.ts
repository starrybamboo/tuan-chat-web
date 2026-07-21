import { describe, expect, it } from "vitest";

import { getNextTheme } from "./themeSwitch";

describe("getNextTheme", () => {
  it("cycles through light, dark, and system themes", () => {
    expect(getNextTheme("light")).toBe("dark");
    expect(getNextTheme("dark")).toBe("system");
    expect(getNextTheme("system")).toBe("light");
  });
});
