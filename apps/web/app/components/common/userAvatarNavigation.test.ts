import { describe, expect, it } from "vitest";

import { buildUserProfileNavigation } from "./userAvatarNavigation";

describe("userAvatarNavigation", () => {
  it("builds a TanStack Router profile navigation descriptor", () => {
    expect(buildUserProfileNavigation(42)).toEqual({
      to: "/profile/$userId",
      params: { userId: "42" },
    });
  });
});
