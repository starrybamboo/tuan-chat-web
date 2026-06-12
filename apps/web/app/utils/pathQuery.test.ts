import { describe, expect, it } from "vitest";

import { appendPathQuery } from "./pathQuery";

describe("appendPathQuery", () => {
  it("omits question mark for empty query", () => {
    expect(appendPathQuery("/chat/1", "")).toBe("/chat/1");
    expect(appendPathQuery("/chat/1", new URLSearchParams())).toBe("/chat/1");
  });

  it("appends serialized query when query is present", () => {
    const params = new URLSearchParams();
    params.set("leftDrawer", "true");

    expect(appendPathQuery("/chat/1", "tab=material")).toBe("/chat/1?tab=material");
    expect(appendPathQuery("/chat/1", params)).toBe("/chat/1?leftDrawer=true");
  });

  it("preserves hash after query", () => {
    expect(appendPathQuery("/chat/1", "", "#message")).toBe("/chat/1#message");
    expect(appendPathQuery("/chat/1", "tab=material", "#message")).toBe("/chat/1?tab=material#message");
  });
});
