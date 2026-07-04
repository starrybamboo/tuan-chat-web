import { describe, expect, it } from "vitest";

import { resolveLoginMethod } from "./LoginModal";

describe("resolveLoginMethod", () => {
  it("uses userId login for pure numeric identifiers", () => {
    expect(resolveLoginMethod("10008")).toBe("userId");
    expect(resolveLoginMethod(" 10008 ")).toBe("userId");
  });

  it("uses username login when identifier contains non-numeric characters", () => {
    expect(resolveLoginMethod("t10008")).toBe("username");
    expect(resolveLoginMethod("用户10008")).toBe("username");
  });
});
