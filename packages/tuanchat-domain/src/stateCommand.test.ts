import { describe, expect, it } from "vitest";

import {
  buildEndCombatStateEventExtra,
  buildStartCombatStateEventExtra,
  END_COMBAT_CONTENT,
  NEXT_TURN_CONTENT,
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

  it("解析可静态识别的 .next 与 .st 数值状态命令", () => {
    expect(parseSimpleStateCommand({
      curRoleId: -1,
      inputText: ".next",
      inputTextWithoutMentions: ".next",
      mentionedRoleCount: 0,
    })).toEqual({
      content: NEXT_TURN_CONTENT,
      stateEvent: {
        source: {
          kind: "command",
          commandName: "next",
          parserVersion: "state-event-v1",
        },
        events: [{ type: "nextTurn" }],
      },
    });

    expect(parseSimpleStateCommand({
      curRoleId: 3,
      inputText: ".st hp20",
      inputTextWithoutMentions: ".st hp20",
      mentionedRoleCount: 0,
    })).toEqual({
      content: "状态更新：HP = 20",
      stateEvent: {
        source: {
          kind: "command",
          commandName: "st",
          parserVersion: "state-event-v1",
        },
        events: [{
          type: "varOp",
          scope: {
            kind: "role",
            roleId: 3,
          },
          key: "hp",
          op: "set",
          value: 20,
        }],
      },
    });

    expect(parseSimpleStateCommand({
      curRoleId: 3,
      inputText: ".st hp -2",
      inputTextWithoutMentions: ".st hp -2",
      mentionedRoleCount: 0,
    })).toEqual({
      content: "状态更新：HP -2",
      stateEvent: {
        source: {
          kind: "command",
          commandName: "st",
          parserVersion: "state-event-v1",
        },
        events: [{
          type: "varOp",
          scope: {
            kind: "role",
            roleId: 3,
          },
          key: "hp",
          op: "sub",
          value: 2,
        }],
      },
    });
  });

  it("不会把展示或掷骰表达式类 .st 误识别成状态事件", () => {
    expect(parseSimpleStateCommand({
      curRoleId: 3,
      inputText: ".st show",
      inputTextWithoutMentions: ".st show",
      mentionedRoleCount: 0,
    })).toBeNull();

    expect(parseSimpleStateCommand({
      curRoleId: 3,
      inputText: ".st 手枪 1d4+1d8",
      inputTextWithoutMentions: ".st 手枪 1d4+1d8",
      mentionedRoleCount: 0,
    })).toBeNull();
  });
});
