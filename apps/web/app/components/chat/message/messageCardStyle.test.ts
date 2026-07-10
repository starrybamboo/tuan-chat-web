import { describe, expect, it } from "vitest";

import {
  CHAT_MESSAGE_BUBBLE_BASE_CLASS,
  getChatMessageHoverToolbarClass,
  getChatMessageMetaRowClass,
} from "./messageCardStyle";

describe("messageCardStyle", () => {
  it("does not reserve toolbar width in the message meta row", () => {
    const className = getChatMessageMetaRowClass();

    expect(className).toContain("max-w-full");
    expect(className).not.toContain("pr-80");
    expect(className).not.toContain("pr-32");
  });

  it("hides the message toolbar on mobile to avoid sticky hover state", () => {
    const className = getChatMessageHoverToolbarClass(true);

    expect(className).toBe("hidden");
    expect(className).not.toContain("group-hover:opacity-100");
  });

  it("still hides the message toolbar until hover on desktop", () => {
    const className = getChatMessageHoverToolbarClass(false);

    expect(className).toContain("opacity-0");
    expect(className).toContain("group-hover:opacity-100");
  });

  it("keeps the responsive chat bubble text sizing used by message height alignment", () => {
    expect(CHAT_MESSAGE_BUBBLE_BASE_CLASS).toContain("text-base");
    expect(CHAT_MESSAGE_BUBBLE_BASE_CLASS).toContain("sm:text-sm");
    expect(CHAT_MESSAGE_BUBBLE_BASE_CLASS).toContain("lg:text-base");
  });
});
