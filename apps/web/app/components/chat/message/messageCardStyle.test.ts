import { describe, expect, it } from "vitest";

import { getChatMessageHoverToolbarClass, getChatMessageMetaRowClass } from "./messageCardStyle";

describe("messageCardStyle", () => {
  it("keeps the full right padding when no side drawer is open", () => {
    expect(getChatMessageMetaRowClass(false)).toContain("sm:pr-80");
  });

  it("uses a tighter right padding when a side drawer is open", () => {
    expect(getChatMessageMetaRowClass(true)).toContain("sm:pr-32");
  });

  it("keeps the message toolbar interactive on mobile without hover", () => {
    const className = getChatMessageHoverToolbarClass(true);

    expect(className).toContain("opacity-100");
    expect(className).toContain("pointer-events-auto");
    expect(className).not.toContain("group-hover:opacity-100");
  });

  it("still hides the message toolbar until hover on desktop", () => {
    const className = getChatMessageHoverToolbarClass(false);

    expect(className).toContain("opacity-0");
    expect(className).toContain("group-hover:opacity-100");
  });
});
