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
      content: "下一回合",
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

  it("支持带符号数值和属性名连写的 .st 变量增减命令", () => {
    expect(parseSimpleStateCommand({
      curRoleId: 3,
      inputText: ".st hp+6",
      inputTextWithoutMentions: ".st hp+6",
      mentionedRoleCount: 0,
    })).toEqual({
      content: "状态更新：HP +6",
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
          op: "add",
          value: 6,
        }],
      },
    });
  });

  it("支持无空格无符号 .st 直写，避免落回旧骰娘属性设置", () => {
    expect(parseSimpleStateCommand({
      curRoleId: 3,
      inputText: ".st hp10",
      inputTextWithoutMentions: ".st hp10",
      mentionedRoleCount: 0,
    })).toEqual({
      content: "状态更新：HP = 10",
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
          value: 10,
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
