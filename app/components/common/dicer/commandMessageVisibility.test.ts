import { describe, expect, it } from "vitest";

import { resolveCommandMessageVisibility } from "./commandMessageVisibility";

describe("commandMessageVisibility", () => {
  it("暗骰回复存在时原始指令消息仍保持公开", () => {
    expect(resolveCommandMessageVisibility(["kp_and_sender"])).toBe("public");
  });

  it("混合公开与暗骰回复时原始指令消息仍保持公开", () => {
    expect(resolveCommandMessageVisibility(["public", "kp_and_sender"])).toBe("public");
  });
});
