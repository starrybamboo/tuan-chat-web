import { describe, expect, it } from "vitest";

import { getChatMessageMetaRowClass } from "./messageCardStyle";

describe("messageCardStyle", () => {
  it("keeps the full right padding when no side drawer is open", () => {
    expect(getChatMessageMetaRowClass(false)).toContain("sm:pr-80");
  });

  it("uses a tighter right padding when a side drawer is open", () => {
    expect(getChatMessageMetaRowClass(true)).toContain("sm:pr-32");
  });
});
