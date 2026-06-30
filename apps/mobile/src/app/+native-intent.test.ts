import { describe, expect, it } from "vitest";

import { redirectSystemPath } from "./+native-intent";

describe("+native-intent", () => {
  it("会把群聊系统深链重写到移动端可处理的房间落地页", () => {
    expect(redirectSystemPath({ initial: false, path: "tuanchat://chat/room/10657" })).toBe("/chat/room/10657");
  });

  it("会把私聊系统深链重写到聊天 tab 参数", () => {
    expect(redirectSystemPath({ initial: false, path: "tuanchat://chat/private/42" })).toBe("/?contactId=42");
  });
});
