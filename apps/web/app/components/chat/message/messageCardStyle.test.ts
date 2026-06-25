import { describe, expect, it } from "vitest";

import { getChatMessageHoverToolbarClass, getChatMessageMetaRowClass } from "./messageCardStyle";

describe("messageCardStyle", () => {
  it("does not reserve toolbar width in the message meta row", () => {
    const className = getChatMessageMetaRowClass();

    expect(className).toContain("max-w-full");
    expect(className).not.toContain("pr-80");
    expect(className).not.toContain("pr-32");
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
