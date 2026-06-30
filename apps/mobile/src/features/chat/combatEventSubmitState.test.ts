import { describe, expect, it } from "vitest";

import { canSubmitCombatEvent } from "./combatEventSubmitState";

describe("combatEventSubmitState", () => {
  it("没有任何发送中状态时允许提交战斗事件", () => {
    expect(canSubmitCombatEvent({
      combatEventInFlight: false,
      messageSendInFlight: false,
    })).toBe(true);
  });

  it("战斗事件或普通消息发送中时禁止重复提交战斗事件", () => {
    expect(canSubmitCombatEvent({
      combatEventInFlight: true,
      messageSendInFlight: false,
    })).toBe(false);
    expect(canSubmitCombatEvent({
      combatEventInFlight: false,
      messageSendInFlight: true,
    })).toBe(false);
    expect(canSubmitCombatEvent({
      combatEventInFlight: true,
      messageSendInFlight: true,
    })).toBe(false);
  });
});
