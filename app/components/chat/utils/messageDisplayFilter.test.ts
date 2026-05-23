import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "../../../../api";
import type { MessageDisplayFilterConfig } from "./messageDisplayFilter";

import {
  createMessageDisplayFilterMatcher,
  describeMessageDisplayFilterStatus,
  filterChatMessagesForDisplay,
} from "./messageDisplayFilter";

function createMessage(
  messageId: number,
  content: string,
  overrides: Partial<ChatMessageResponse["message"]> = {},
): ChatMessageResponse {
  return {
    message: {
      messageId,
      syncId: messageId,
      roomId: 1,
      userId: 1,
      content,
      status: 0,
      messageType: 1,
      position: messageId,
      ...overrides,
    },
  } as ChatMessageResponse;
}

function createFilterConfig(overrides: Partial<MessageDisplayFilterConfig>): MessageDisplayFilterConfig {
  return {
    action: "remove",
    filterOutOfCharacterSpeech: false,
    regexFlags: "i",
    regexPattern: "",
    ...overrides,
  };
}

describe("messageDisplayFilter", () => {
  it("仅保留正则命中的消息", () => {
    const messages = [
      createMessage(1, "普通消息"),
      createMessage(2, "Alpha secret"),
      createMessage(3, "beta"),
    ];

    const filtered = filterChatMessagesForDisplay(messages, createFilterConfig({
      action: "keep",
      regexPattern: "alpha",
    }));

    expect(filtered.map(item => item.message.messageId)).toEqual([2]);
  });

  it("剔除正则命中的消息", () => {
    const messages = [
      createMessage(1, "普通消息"),
      createMessage(2, "旁白：需要隐藏"),
      createMessage(3, "继续显示"),
    ];

    const filtered = filterChatMessagesForDisplay(messages, createFilterConfig({
      action: "remove",
      regexPattern: "隐藏",
    }));

    expect(filtered.map(item => item.message.messageId)).toEqual([1, 3]);
  });

  it("支持用场外发言规则命中半角与全角括号", () => {
    const messages = [
      createMessage(1, "(hello)"),
      createMessage(2, "（world）"),
      createMessage(3, "普通消息"),
    ];

    const filtered = filterChatMessagesForDisplay(messages, createFilterConfig({
      action: "keep",
      filterOutOfCharacterSpeech: true,
    }));

    expect(filtered.map(item => item.message.messageId)).toEqual([1, 2]);
  });

  it("无效正则且未开启场外发言时回退完整消息列表", () => {
    const messages = [
      createMessage(1, "one"),
      createMessage(2, "two"),
    ];
    const config = createFilterConfig({
      action: "keep",
      regexPattern: "[",
    });

    const matcher = createMessageDisplayFilterMatcher(config);
    const filtered = filterChatMessagesForDisplay(messages, config);

    expect(matcher.error).toBeTruthy();
    expect(matcher.test).toBeNull();
    expect(filtered).toBe(messages);
  });

  it("无效正则但开启场外发言时仍按场外发言规则筛选", () => {
    const messages = [
      createMessage(1, "(keep me)"),
      createMessage(2, "visible dialog"),
    ];
    const config = createFilterConfig({
      action: "keep",
      filterOutOfCharacterSpeech: true,
      regexPattern: "[",
    });

    const matcher = createMessageDisplayFilterMatcher(config);
    const filtered = filterChatMessagesForDisplay(messages, config);

    expect(matcher.error).toBeTruthy();
    expect(matcher.test).not.toBeNull();
    expect(filtered.map(item => item.message.messageId)).toEqual([1]);
  });

  it("描述保留匹配条件的过滤状态", () => {
    expect(describeMessageDisplayFilterStatus(createFilterConfig({
      action: "keep",
      filterOutOfCharacterSpeech: true,
      regexPattern: "alpha",
    }))).toBe("显示匹配：正则「alpha」/i 或 场外发言");
  });

  it("描述隐藏匹配条件的过滤状态", () => {
    expect(describeMessageDisplayFilterStatus(createFilterConfig({
      action: "remove",
      regexFlags: "",
      regexPattern: "旁白",
    }))).toBe("隐藏匹配：正则「旁白」");
  });

  it("没有有效条件时回退到筛选中状态", () => {
    expect(describeMessageDisplayFilterStatus(createFilterConfig({}))).toBe("筛选中");
  });
});
