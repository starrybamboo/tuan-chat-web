import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { Message } from "../../../../api";

import { canCurrentUserViewHiddenDiceReply, canCurrentUserViewMessage, filterVisibleChatMessages, isHiddenDiceMessage } from "./hiddenDiceVisibility";

function createMessage(partial?: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 1,
    userId: 1001,
    roleId: 2001,
    content: "D100=42/80 成功",
    status: 0,
    messageType: MESSAGE_TYPE.DICE,
    position: 1,
    extra: {
      diceResult: {
        result: "D100=42/80 成功",
        hidden: true,
      },
    },
    ...partial,
  };
}

describe("hiddenDiceVisibility", () => {
  it("识别带 hidden 标记的暗骰消息", () => {
    expect(isHiddenDiceMessage(createMessage())).toBe(true);
    expect(isHiddenDiceMessage(createMessage({
      extra: { diceResult: { result: "公开骰", hidden: false } },
    }))).toBe(false);
  });

  it("diceTurn 暗骰只隐藏回复内容，不隐藏整条指令消息", () => {
    const turnMessage = createMessage({
      content: ".r 1d20",
      extra: {
        diceResult: { result: "D20=19", hidden: true },
        diceTurn: {
          command: ".r 1d20",
          replies: [{ content: "D20=19", hidden: true }],
        },
      } as any,
    });

    expect(isHiddenDiceMessage(turnMessage)).toBe(false);
    expect(canCurrentUserViewMessage(turnMessage, {
      currentUserId: 2002,
      memberType: 2,
    })).toBe(true);
    expect(canCurrentUserViewHiddenDiceReply(turnMessage, {
      currentUserId: 2002,
      memberType: 2,
    })).toBe(false);
    expect(canCurrentUserViewHiddenDiceReply(turnMessage, {
      currentUserId: 1001,
      memberType: 2,
    })).toBe(true);
  });

  it("允许发起人查看自己的暗骰消息", () => {
    expect(canCurrentUserViewMessage(createMessage(), {
      currentUserId: 1001,
      memberType: 2,
    })).toBe(true);
  });

  it("允许 KP 查看他人的暗骰消息", () => {
    expect(canCurrentUserViewMessage(createMessage(), {
      currentUserId: 2002,
      memberType: 1,
    })).toBe(true);
  });

  it("拦截普通成员查看他人的暗骰消息", () => {
    expect(canCurrentUserViewMessage(createMessage(), {
      currentUserId: 2002,
      memberType: 2,
    })).toBe(false);
  });

  it("过滤消息列表时仅移除无权查看的暗骰", () => {
    const publicDice = createMessage({
      messageId: 2,
      extra: { diceResult: { result: "公开骰", hidden: false } },
    });
    const visible = filterVisibleChatMessages([
      { message: createMessage() },
      { message: publicDice },
    ] as any, {
      currentUserId: 2002,
      memberType: 2,
    });

    expect(visible).toHaveLength(1);
    expect(visible[0]?.message.messageId).toBe(2);
  });
});
