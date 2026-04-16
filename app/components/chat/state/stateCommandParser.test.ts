import { describe, expect, it } from "vitest";

import { parseSimpleStateCommand } from "@/components/chat/state/stateCommandParser";

describe("stateCommandParser", () => {
  it("允许在没有角色 ID 时解析 .next", () => {
    expect(parseSimpleStateCommand({
      curRoleId: -1,
      inputText: ".next",
      inputTextWithoutMentions: ".next",
      mentionedRoleCount: 0,
    })).toEqual({
      content: ".next",
      stateEvent: {
        source: {
          kind: "command",
          commandName: "next",
          parserVersion: "state-event-v1",
        },
        events: [{
          type: "nextTurn",
        }],
      },
    });
  });

  it("在有角色 ID 时解析 .st 变量增减命令", () => {
    expect(parseSimpleStateCommand({
      curRoleId: 3,
      inputText: ".st hp -2",
      inputTextWithoutMentions: ".st hp -2",
      mentionedRoleCount: 0,
    })).toEqual({
      content: ".st hp -2",
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

  it("在没有角色 ID 时拒绝解析 .st", () => {
    expect(parseSimpleStateCommand({
      curRoleId: 0,
      inputText: ".st hp -2",
      inputTextWithoutMentions: ".st hp -2",
      mentionedRoleCount: 0,
    })).toBeNull();
  });

  it("在带 mention 时拒绝解析 .st", () => {
    expect(parseSimpleStateCommand({
      curRoleId: 3,
      inputText: "@张三 .st hp -2",
      inputTextWithoutMentions: ".st hp -2",
      mentionedRoleCount: 1,
    })).toBeNull();
  });
});
