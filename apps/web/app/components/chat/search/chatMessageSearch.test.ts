import { describe, expect, it } from "vitest";

import type { ChatMessageResponse } from "api";

import { searchChatMessages, splitChatMessageHighlight } from "./chatMessageSearch";

function createMessage({
  messageId,
  content,
  roleId = 1,
  userId = 10,
  createTime,
  customRoleName,
}: {
  messageId: number;
  content: string;
  roleId?: number;
  userId?: number;
  createTime: string;
  customRoleName?: string;
}): ChatMessageResponse {
  return {
    message: {
      messageId,
      syncId: messageId,
      roomId: 100,
      userId,
      roleId,
      content,
      customRoleName,
      status: 0,
      messageType: 1,
      position: 0,
      createTime,
    },
  };
}

describe("searchChatMessages", () => {
  const messages = [
    createMessage({ messageId: 1, content: "进入旧图书馆", createTime: "2026-07-12T10:00:00" }),
    createMessage({ messageId: 2, content: "发现一封信", roleId: 2, userId: 20, createTime: "2026-07-12T11:00:00" }),
  ];

  it("搜索正文时忽略大小写并默认让最新消息在前", () => {
    const results = searchChatMessages([
      ...messages,
      createMessage({ messageId: 3, content: "LIBRARY key", createTime: "2026-07-12T12:00:00" }),
    ], "library");

    expect(results.map(item => item.message.messageId)).toEqual([3]);
  });

  it("支持按角色名和用户名搜索并切换时间顺序", () => {
    const index = {
      roleNamesById: new Map([[1, "守密人"], [2, "调查员"]]),
      userNamesById: new Map([[10, "降星驰"], [20, "测试玩家"]]),
    };

    expect(searchChatMessages(messages, "调查员", index).map(item => item.message.messageId)).toEqual([2]);
    expect(searchChatMessages(messages, "星驰", index, "oldest").map(item => item.message.messageId)).toEqual([1]);
  });
});

describe("splitChatMessageHighlight", () => {
  it("正则特殊字符也能作为普通关键词高亮", () => {
    expect(splitChatMessageHighlight("检定结果 [成功]", "[成功]")).toEqual([
      { text: "检定结果 ", matched: false },
      { text: "[成功]", matched: true },
    ]);
  });
});
