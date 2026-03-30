import type { ChatMessageResponse } from "../../../../api";
import { vi } from "vitest";

import { buildCommittedBatchResponses, commitBatchOptimisticMessages } from "./roomMessageBatchCommit";

function createOptimisticMessage(messageId: number, position: number): ChatMessageResponse {
  return {
    message: {
      messageId,
      syncId: messageId,
      roomId: 1,
      userId: 2,
      roleId: 3,
      content: "素材消息",
      status: 0,
      messageType: 2,
      position,
      createTime: "2026-03-30 20:00:00",
      updateTime: "2026-03-30 20:00:00",
    },
  };
}

describe("roomMessageBatchCommit", () => {
  it("在服务端未回传 position 时沿用乐观位置", () => {
    expect(buildCommittedBatchResponses(
      [createOptimisticMessage(-1, 101)],
      [{
        messageId: 11,
        syncId: 201,
        roomId: 1,
        userId: 2,
        roleId: 3,
        content: "素材消息",
        status: 0,
        messageType: 2,
        createTime: "2026-03-30 20:00:01",
        updateTime: "2026-03-30 20:00:01",
      } as ChatMessageResponse["message"]],
    )).toEqual([
      expect.objectContaining({
        message: expect.objectContaining({
          messageId: 11,
          position: 101,
        }),
      }),
    ]);
  });

  it("优先用 replaceMessageById 替换批量乐观消息", async () => {
    const replaceMessageById = vi.fn(async () => {});
    const addOrUpdateMessages = vi.fn(async () => {});

    const optimisticMessages = [
      createOptimisticMessage(-1, 101),
      createOptimisticMessage(-2, 102),
    ];
    const createdMessages = [
      {
        messageId: 11,
        syncId: 201,
        roomId: 1,
        userId: 2,
        roleId: 3,
        content: "素材消息1",
        status: 0,
        messageType: 2,
        createTime: "2026-03-30 20:00:01",
        updateTime: "2026-03-30 20:00:01",
      },
      {
        messageId: 12,
        syncId: 202,
        roomId: 1,
        userId: 2,
        roleId: 3,
        content: "素材消息2",
        status: 0,
        messageType: 2,
        createTime: "2026-03-30 20:00:02",
        updateTime: "2026-03-30 20:00:02",
      },
    ] as ChatMessageResponse["message"][];

    const result = await commitBatchOptimisticMessages({
      optimisticMessages,
      createdMessages,
      replaceMessageById,
      addOrUpdateMessages,
    });

    expect(replaceMessageById).toHaveBeenCalledTimes(2);
    expect(replaceMessageById).toHaveBeenNthCalledWith(1, -1, expect.objectContaining({
      message: expect.objectContaining({ messageId: 11, position: 101 }),
    }));
    expect(replaceMessageById).toHaveBeenNthCalledWith(2, -2, expect.objectContaining({
      message: expect.objectContaining({ messageId: 12, position: 102 }),
    }));
    expect(addOrUpdateMessages).not.toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });
});
