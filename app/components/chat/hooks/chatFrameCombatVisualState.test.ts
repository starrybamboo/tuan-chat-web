import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse, Message } from "../../../../api";

import { deriveCombatVisualActiveAtMessageIndex, getCombatVisualSignal } from "./chatFrameCombatVisualState";

function createMessage(messageId: number, overrides?: Partial<Message>): ChatMessageResponse {
  return {
    message: {
      messageId,
      syncId: messageId,
      roomId: 1,
      userId: 2,
      roleId: 3,
      avatarId: 4,
      content: `消息 ${messageId}`,
      status: 0,
      messageType: MESSAGE_TYPE.TEXT,
      position: messageId,
      createTime: "2026-05-23 10:00:00",
      updateTime: "2026-05-23 10:00:00",
      extra: {},
      ...overrides,
    },
  } as ChatMessageResponse;
}

describe("chatFrameCombatVisualState", () => {
  it("读到全员先攻命令请求后进入战斗视觉态", () => {
    const messages = [
      createMessage(1),
      createMessage(2, {
        content: ".ri",
        messageType: MESSAGE_TYPE.COMMAND_REQUEST,
        extra: {
          commandRequest: {
            command: ".ri",
            allowAll: true,
          },
        },
      }),
    ];

    expect(deriveCombatVisualActiveAtMessageIndex(messages, 0)).toBe(false);
    expect(deriveCombatVisualActiveAtMessageIndex(messages, 1)).toBe(true);
  });

  it("按战斗开始和结束状态事件切换视觉态", () => {
    const messages = [
      createMessage(1, {
        messageType: MESSAGE_TYPE.STATE_EVENT,
        extra: {
          stateEvent: {
            source: {
              kind: "command",
              commandName: "combat",
              parserVersion: "test",
            },
            events: [{ type: "combatRoundStart" }],
          },
        },
      }),
      createMessage(2),
      createMessage(3, {
        messageType: MESSAGE_TYPE.STATE_EVENT,
        extra: {
          stateEvent: {
            source: {
              kind: "command",
              commandName: "combat",
              parserVersion: "test",
            },
            events: [{ type: "combatRoundEnd" }],
          },
        },
      }),
    ];

    expect(deriveCombatVisualActiveAtMessageIndex(messages, 0)).toBe(true);
    expect(deriveCombatVisualActiveAtMessageIndex(messages, 1)).toBe(true);
    expect(deriveCombatVisualActiveAtMessageIndex(messages, 2)).toBe(false);
  });

  it("全员先攻聚合状态消息会切入战斗视觉态", () => {
    const messages = [
      createMessage(1),
      createMessage(2, {
        messageType: MESSAGE_TYPE.STATE_EVENT,
        content: "战斗开始：全员先攻",
        extra: {
          stateEvent: {
            source: {
              kind: "ui",
              parserVersion: "state-event-v1",
            },
            events: [
              {
                type: "combatParticipantUpsert",
                participantId: "role:1",
                roleId: 1,
                name: "艾拉",
                initiative: 16,
              },
              {
                type: "combatOrderSet",
                participantIds: ["role:1"],
              },
            ],
          },
        },
      }),
    ];

    expect(getCombatVisualSignal(messages[1]!.message)).toBe("start");
    expect(deriveCombatVisualActiveAtMessageIndex(messages, 0)).toBe(false);
    expect(deriveCombatVisualActiveAtMessageIndex(messages, 1)).toBe(true);
  });

  it("忽略已删除消息中的战斗信号", () => {
    const message = createMessage(1, {
      content: ".ri",
      status: 1,
      messageType: MESSAGE_TYPE.COMMAND_REQUEST,
      extra: {
        commandRequest: {
          command: ".ri",
          allowAll: true,
        },
      },
    });

    expect(getCombatVisualSignal(message.message)).toBeNull();
    expect(deriveCombatVisualActiveAtMessageIndex([message], 0)).toBe(false);
  });

  it("兼容文本形式的战斗开始和战斗结束提示", () => {
    const messages = [
      createMessage(1, { content: "进入战斗轮" }),
      createMessage(2, { content: "普通消息" }),
      createMessage(3, { content: "战斗结束" }),
    ];

    expect(getCombatVisualSignal(messages[0]!.message)).toBe("start");
    expect(getCombatVisualSignal(messages[2]!.message)).toBe("end");
    expect(deriveCombatVisualActiveAtMessageIndex(messages, 1)).toBe(true);
    expect(deriveCombatVisualActiveAtMessageIndex(messages, 2)).toBe(false);
  });
});
