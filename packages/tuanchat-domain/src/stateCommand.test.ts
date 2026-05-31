import { describe, expect, it } from "vitest";

import {
  buildEndCombatStateEventExtra,
  buildStartCombatStateEventExtra,
  END_COMBAT_CONTENT,
  parseSimpleStateCommand,
  START_COMBAT_CONTENT,
} from "./stateCommand";

describe("stateCommand", () => {
  it("构建开始与结束战斗状态事件", () => {
    expect(buildStartCombatStateEventExtra()).toEqual({
      source: {
        kind: "ui",
        parserVersion: "state-event-v1",
      },
      events: [{ type: "combatRoundStart" }],
    });
    expect(buildEndCombatStateEventExtra()).toEqual({
      source: {
        kind: "ui",
        parserVersion: "state-event-v1",
      },
      events: [{ type: "combatRoundEnd" }],
    });
  });

  it("解析显式战斗轮命令", () => {
    expect(parseSimpleStateCommand({
      curRoleId: -1,
      inputText: ".combat start",
      inputTextWithoutMentions: ".combat start",
      mentionedRoleCount: 0,
    })).toEqual({
      content: START_COMBAT_CONTENT,
      stateEvent: buildStartCombatStateEventExtra(),
    });

    expect(parseSimpleStateCommand({
      curRoleId: -1,
      inputText: ".combat end",
      inputTextWithoutMentions: ".combat end",
      mentionedRoleCount: 0,
    })).toEqual({
      content: END_COMBAT_CONTENT,
      stateEvent: buildEndCombatStateEventExtra(),
    });
  });
});
