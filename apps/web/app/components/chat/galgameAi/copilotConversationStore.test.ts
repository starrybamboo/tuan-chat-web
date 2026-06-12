import { describe, expect, it } from "vitest";

import type { GalPatchProposal } from "./authoringTypes";

import {
  MAX_ROOM_COPILOT_MESSAGES,
  MemoryRoomCopilotConversationStore,
  normalizePersistedRoomCopilotMessage,
  toPersistedRoomCopilotMessages,
} from "./copilotConversationStore";

describe("copilotConversationStore", () => {
  it("持久化聊天历史时只保存 proposalId 引用并忽略进度态字段", () => {
    const proposal = { proposalId: "proposal-1" } as GalPatchProposal;

    expect(toPersistedRoomCopilotMessages([
      {
        id: "assistant:intro",
        role: "assistant",
        content: "intro",
        status: "success",
      },
      {
        id: "user:1",
        role: "user",
        content: "把最后一句改克制",
        contextRefs: [
          {
            kind: "message",
            sourceRoomId: "10",
            messageIds: ["100"],
            label: "修改范围",
            mode: "target",
            source: "drag",
            persistence: "turn",
          },
        ],
      },
      {
        id: "assistant:1",
        role: "assistant",
        content: "已生成草稿",
        status: "success",
        progressMessage: "正在生成",
        proposal,
      },
    ])).toEqual([
      {
        id: "user:1",
        role: "user",
        content: "把最后一句改克制",
        proposalId: null,
        contextRefs: [
          {
            kind: "message",
            sourceRoomId: "10",
            messageIds: ["100"],
            label: "修改范围",
            mode: "target",
            source: "drag",
            persistence: "turn",
          },
        ],
      },
      {
        id: "assistant:1",
        role: "assistant",
        content: "已生成草稿",
        status: "success",
        proposalId: "proposal-1",
      },
    ]);
  });

  it("恢复 pending assistant 消息时标记为中断错误", () => {
    expect(normalizePersistedRoomCopilotMessage({
      id: "assistant:1",
      role: "assistant",
      content: "正在生成",
      status: "pending",
    })).toEqual({
      id: "assistant:1",
      role: "assistant",
      content: "正在生成",
      status: "error",
      error: "上次生成被中断，已经停止在这里。",
    });
  });

  it("按房间保存并限制历史长度", async () => {
    const store = new MemoryRoomCopilotConversationStore();
    const messages = Array.from({ length: MAX_ROOM_COPILOT_MESSAGES + 2 }, (_, index) => ({
      id: `user:${index}`,
      role: "user" as const,
      content: `第 ${index} 轮`,
    }));

    await store.save("room-1", messages);
    await store.save("room-2", [
      {
        id: "user:room-2",
        role: "user",
        content: "另一个房间",
      },
    ]);

    const roomOneMessages = await store.get("room-1");
    expect(roomOneMessages).toHaveLength(MAX_ROOM_COPILOT_MESSAGES);
    expect(roomOneMessages[0]?.id).toBe("user:2");
    await expect(store.get("room-2")).resolves.toEqual([
      {
        id: "user:room-2",
        role: "user",
        content: "另一个房间",
        proposalId: null,
      },
    ]);
  });

  it("单独持久化当前 Copilot 上下文 chips", async () => {
    const store = new MemoryRoomCopilotConversationStore();
    await store.save("room-1", [
      {
        id: "user:1",
        role: "user",
        content: "参考雨夜",
      },
    ]);
    await store.saveContextRefs("room-1", [
      {
        kind: "room",
        roomId: "11",
        label: "雨夜前奏",
        source: "drag",
        persistence: "persistent",
      },
    ]);

    await expect(store.get("room-1")).resolves.toHaveLength(1);
    await expect(store.getContextRefs("room-1")).resolves.toEqual([
      {
        kind: "room",
        roomId: "11",
        label: "雨夜前奏",
        source: "drag",
        persistence: "persistent",
      },
    ]);
  });
});
