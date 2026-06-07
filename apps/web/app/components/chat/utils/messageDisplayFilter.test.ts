import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageResponse } from "../../../../api";
import type { MessageDisplayFilterConfig } from "./messageDisplayFilter";

import {
  collectMessageDisplayFilterEntries,
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
    filterStateMessages: false,
    ...overrides,
  };
}

describe("messageDisplayFilter", () => {
  it("仅保留匹配的场外发言和状态消息", () => {
    const messages = [
      createMessage(1, "普通消息"),
      createMessage(2, "(场外对白)"),
      createMessage(3, "状态消息", {
        messageType: MESSAGE_TYPE.STATE_EVENT,
      }),
    ];

    const filtered = filterChatMessagesForDisplay(messages, createFilterConfig({
      action: "keep",
      filterOutOfCharacterSpeech: true,
      filterStateMessages: true,
    }));

    expect(filtered.map(item => item.message.messageId)).toEqual([2, 3]);
  });

  it("剔除匹配的场外发言和状态消息", () => {
    const messages = [
      createMessage(1, "普通消息"),
      createMessage(2, "(旁白：需要隐藏)"),
      createMessage(3, "继续显示"),
      createMessage(4, "状态消息", {
        messageType: MESSAGE_TYPE.STATE_EVENT,
      }),
    ];

    const filtered = filterChatMessagesForDisplay(messages, createFilterConfig({
      action: "remove",
      filterOutOfCharacterSpeech: true,
      filterStateMessages: true,
    }));

    expect(filtered.map(item => item.message.messageId)).toEqual([1, 3]);
  });

  it("筛选后保留原始消息索引，避免显示列表影响场景状态定位", () => {
    const messages = [
      createMessage(1, "普通消息"),
      createMessage(2, "(旁白：需要隐藏)"),
      createMessage(3, "继续显示"),
    ];

    const entries = collectMessageDisplayFilterEntries(messages, createFilterConfig({
      action: "remove",
      filterOutOfCharacterSpeech: true,
    }));

    expect(entries.map(entry => entry.message.message.messageId)).toEqual([1, 3]);
    expect(entries.map(entry => entry.sourceIndex)).toEqual([0, 2]);
  });

  it("支持仅过滤状态消息", () => {
    const messages = [
      createMessage(1, "普通消息"),
      createMessage(2, "状态消息", {
        messageType: MESSAGE_TYPE.STATE_EVENT,
      }),
      createMessage(3, "继续显示"),
    ];

    const filtered = filterChatMessagesForDisplay(messages, createFilterConfig({
      action: "remove",
      filterStateMessages: true,
    }));

    expect(filtered.map(item => item.message.messageId)).toEqual([1, 3]);
  });

  it("无筛选条件时回退完整消息列表", () => {
    const messages = [
      createMessage(1, "one"),
      createMessage(2, "two"),
    ];
    const config = createFilterConfig({
      action: "keep",
    });

    const matcher = createMessageDisplayFilterMatcher(config);
    const filtered = filterChatMessagesForDisplay(messages, config);

    expect(matcher.error).toBeNull();
    expect(matcher.test).toBeNull();
    expect(filtered).toBe(messages);
  });

  it("描述隐藏条件的过滤状态", () => {
    expect(describeMessageDisplayFilterStatus(createFilterConfig({
      action: "remove",
      filterOutOfCharacterSpeech: true,
      filterStateMessages: true,
    }))).toBe("筛选：隐藏场外发言 或 隐藏状态消息");
  });

  it("描述显示条件的过滤状态", () => {
    expect(describeMessageDisplayFilterStatus(createFilterConfig({
      action: "keep",
      filterStateMessages: true,
    }))).toBe("反选：仅显示状态消息");
  });

  it("没有有效条件时回退到筛选中状态", () => {
    expect(describeMessageDisplayFilterStatus(createFilterConfig({}))).toBe("筛选中");
  });

  it("keep 模式下会仅显示匹配的场外发言", () => {
    const messages = [
      createMessage(1, "(keep me)"),
      createMessage(2, "visible dialog"),
    ];
    const config = createFilterConfig({
      action: "keep",
      filterOutOfCharacterSpeech: true,
    });

    const matcher = createMessageDisplayFilterMatcher(config);
    const filtered = filterChatMessagesForDisplay(messages, config);

    expect(matcher.error).toBeNull();
    expect(matcher.test).not.toBeNull();
    expect(filtered.map(item => item.message.messageId)).toEqual([1]);
  });
});
