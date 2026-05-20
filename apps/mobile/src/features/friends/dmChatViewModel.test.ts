import { describe, expect, it } from "vitest";

import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import {
  getVisibleDirectMessageTimeline,
  selectDirectMessagePage,
} from "./dmChatViewModel";

function createMessage(overrides: Partial<MessageDirectResponse>): MessageDirectResponse {
  return {
    content: "hello",
    createTime: "2025-09-15T21:56:00.000Z",
    messageId: 1,
    messageType: 1,
    receiverId: 7,
    senderId: 42,
    status: 0,
    syncId: 1,
    userId: 7,
    ...overrides,
  };
}

describe("dmChatViewModel", () => {
  it("按展示时间线排序，而不是让 syncId 把旧消息排到列表底部", () => {
    const timeline = getVisibleDirectMessageTimeline([
      createMessage({ content: "sep-15", createTime: "2025-09-15T21:56:00.000Z", messageId: 1, syncId: 1 }),
      createMessage({ content: "oct-29", createTime: "2025-10-29T19:54:00.000Z", messageId: 2, syncId: 2 }),
      createMessage({ content: "sep-23-late-sync", createTime: "2025-09-23T12:47:00.000Z", messageId: 3, syncId: 99 }),
    ]);

    expect(timeline.map(message => message.content)).toEqual([
      "sep-15",
      "sep-23-late-sync",
      "oct-29",
    ]);
  });

  it("分页取时间线最后一页，让最新消息成为底部消息", () => {
    const timeline = getVisibleDirectMessageTimeline([
      createMessage({ content: "old", createTime: "2025-09-15T21:56:00.000Z", messageId: 1, syncId: 1 }),
      createMessage({ content: "middle", createTime: "2025-09-23T12:47:00.000Z", messageId: 2, syncId: 99 }),
      createMessage({ content: "latest", createTime: "2025-10-29T19:54:00.000Z", messageId: 3, syncId: 2 }),
    ]);

    expect(selectDirectMessagePage(timeline, 2).map(message => message.content)).toEqual([
      "middle",
      "latest",
    ]);
  });

  it("展示时间线会忽略已读线消息", () => {
    const timeline = getVisibleDirectMessageTimeline([
      createMessage({ content: "message", messageId: 1, messageType: 1 }),
      createMessage({ content: "read-line", messageId: -42, messageType: 10000 }),
    ]);

    expect(timeline.map(message => message.content)).toEqual(["message"]);
  });
});
