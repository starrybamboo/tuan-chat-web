import { describe, expect, it } from "vitest";

import { redirectSystemPath } from "../../app/+native-intent";

describe("+native-intent", () => {
  it("会把群聊系统深链重写到聊天 tab 房间参数", () => {
    expect(redirectSystemPath({ initial: false, path: "tuanchat://chat/room/10657" })).toBe("/?roomId=10657");
  });

  it("会把私聊系统深链重写到聊天 tab 参数", () => {
    expect(redirectSystemPath({ initial: false, path: "tuanchat://chat/private/42" })).toBe("/?contactId=42");
  });
});
