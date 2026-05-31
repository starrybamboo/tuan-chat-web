import { describe, expect, it } from "vitest";

import { getCombatRoundControlState } from "./combatRoundControls";

describe("combatRoundControls", () => {
  it("未进入战斗时只允许开始战斗", () => {
    expect(getCombatRoundControlState(false)).toEqual({
      canAdvanceTurn: false,
      canEndCombat: false,
      canStartCombat: true,
      primaryAction: "start",
    });
  });

  it("进入战斗后切换为结束战斗并允许下一回合", () => {
    expect(getCombatRoundControlState(true)).toEqual({
      canAdvanceTurn: true,
      canEndCombat: true,
      canStartCombat: false,
      primaryAction: "end",
    });
  });
});
