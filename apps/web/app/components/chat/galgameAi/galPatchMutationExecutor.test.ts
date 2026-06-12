import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { RoomMessageStreamPatchOperation } from "@tuanchat/openapi-client/models/RoomMessageStreamPatchOperation";

import { describe, expect, it, vi } from "vitest";

import type { GalPatchMutationPlan } from "./galPatchMutationAdapter";

import { GAL_PATCH_MUTATION_META, executeGalPatchMutationPlan } from "./galPatchMutationExecutor";

function createMessage(overrides: Partial<Message>): Message {
  return {
    messageId: 1,
    syncId: 1,
    roomId: 10,
    userId: 99,
    roleId: 7,
    content: "内容",
    status: 0,
    messageType: 1,
    position: 1,
    ...overrides,
  };
}

describe("executeGalPatchMutationPlan", () => {
  it("空 plan 不调用 patch 并返回零计数", async () => {
    const patchMessages = vi.fn<(...args: any[]) => any>();

    await expect(executeGalPatchMutationPlan({
      updateMessages: [],
      deleteMessageIds: [],
      insertMessages: [],
    }, {
      patchMessages,
    })).resolves.toEqual({
      inserted: 0,
      updated: 0,
      deleted: 0,
    });
    expect(patchMessages).not.toHaveBeenCalled();
  });

  it("按 update/delete/insert 顺序合并为单次 patch 请求", async () => {
    const order: string[] = [];
    const patchMessages = vi.fn<(...args: any[]) => any>(async (operations: RoomMessageStreamPatchOperation[]) => {
      order.push(operations.map(operation => operation.op).join(","));
      return operations.map((operation, index) => createMessage({
        messageId: 100 + index,
        content: operation.message?.content ?? "新增",
        position: operation.message?.position ?? 1,
        status: operation.op === "delete" ? 1 : 0,
      }));
    });

    const plan: GalPatchMutationPlan = {
      updateMessages: [createMessage({ messageId: 1, content: "改" })],
      deleteMessageIds: [2],
      insertMessages: [{
        roomId: 10,
        roleId: 7,
        content: "补一条",
        messageType: 1,
        position: 2,
        extra: {},
      }],
    };

    await expect(executeGalPatchMutationPlan(plan, {
      patchMessages,
    })).resolves.toEqual({
      inserted: 1,
      updated: 1,
      deleted: 1,
    });
    expect(order).toEqual(["update,delete,insert"]);
    expect(patchMessages).toHaveBeenCalledOnce();
    expect(patchMessages.mock.calls[0]?.[1]).toEqual(GAL_PATCH_MUTATION_META);
  });

  it("patch 失败时传播错误且不报告应用成功", async () => {
    await expect(executeGalPatchMutationPlan({
      updateMessages: [],
      deleteMessageIds: [],
      insertMessages: [{
        roomId: 10,
        roleId: 7,
        content: "A",
        messageType: 1,
        position: 2,
        extra: {},
      }],
    }, {
      patchMessages: vi.fn<(...args: any[]) => any>(async () => {
        throw new Error("patch failed");
      }),
    })).rejects.toThrow("patch failed");
  });

  it("批量变更返回数量不一致时抛错，避免误报应用成功", async () => {
    await expect(executeGalPatchMutationPlan({
      updateMessages: [],
      deleteMessageIds: [],
      insertMessages: [{
        roomId: 10,
        roleId: 7,
        content: "A",
        messageType: 1,
        position: 2,
        extra: {},
      }, {
        roomId: 10,
        roleId: 7,
        content: "B",
        messageType: 1,
        position: 3,
        extra: {},
      }],
    }, {
      patchMessages: vi.fn<(...args: any[]) => any>(async () => [createMessage({ messageId: 1 })]),
    })).rejects.toThrow("批量变更消息数量与 proposal 不一致");
  });

  it("批量更新返回数量不一致时抛错", async () => {
    await expect(executeGalPatchMutationPlan({
      updateMessages: [createMessage({ messageId: 1 })],
      deleteMessageIds: [],
      insertMessages: [],
    }, {
      patchMessages: vi.fn<(...args: any[]) => any>(async () => []),
    })).rejects.toThrow("批量变更消息数量与 proposal 不一致");
  });

  it("批量删除返回数量不一致时抛错", async () => {
    await expect(executeGalPatchMutationPlan({
      updateMessages: [],
      deleteMessageIds: [2],
      insertMessages: [],
    }, {
      patchMessages: vi.fn<(...args: any[]) => any>(async () => []),
    })).rejects.toThrow("批量变更消息数量与 proposal 不一致");
  });

  it("patch 消息时保留演出展示字段", async () => {
    const patchMessages = vi.fn<(...args: any[]) => any>(async (operations: RoomMessageStreamPatchOperation[]) => {
      return operations.map((operation, index) => createMessage({
        messageId: 300 + index,
        content: operation.message?.content ?? "",
        position: operation.message?.position ?? 1,
      }));
    });

    await executeGalPatchMutationPlan({
      updateMessages: [],
      deleteMessageIds: [],
      insertMessages: [{
        roomId: 10,
        roleId: 7,
        avatarId: 8,
        customRoleName: "旁白",
        content: "补一条",
        messageType: 1,
        position: 2,
        annotations: ["fadeIn"],
        extra: { image: { fileId: 12 } } as any,
        webgal: { command: "bg", args: ["park"] },
      }],
    }, {
      patchMessages,
    });

    expect(patchMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        op: "insert",
        message: expect.objectContaining({
          annotations: ["fadeIn"],
          avatarId: 8,
          customRoleName: "旁白",
          extra: { image: { fileId: 12 } },
          roleId: 7,
          webgal: { command: "bg", args: ["park"] },
        }),
      }),
    ], GAL_PATCH_MUTATION_META);
  });

  it("patch 消息时保留回复字段", async () => {
    const patchMessages = vi.fn<(...args: any[]) => any>(async (operations: RoomMessageStreamPatchOperation[]) => {
      return operations.map((operation, index) => createMessage({
        messageId: 200 + index,
        content: operation.message?.content ?? "",
        position: operation.message?.position ?? 1,
      }));
    });

    await executeGalPatchMutationPlan({
      updateMessages: [
        createMessage({
          messageId: 1,
          replyMessageId: 11,
        }),
      ],
      deleteMessageIds: [],
      insertMessages: [{
        roomId: 10,
        replayMessageId: 21,
        roleId: 7,
        content: "补一条",
        messageType: 1,
        position: 2,
        extra: {},
      }],
    }, {
      patchMessages,
    });

    expect(patchMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        op: "update",
        message: expect.objectContaining({
          replayMessageId: 11,
        }),
      }),
      expect.objectContaining({
        op: "insert",
        message: expect.objectContaining({
          replayMessageId: 21,
        }),
      }),
    ], GAL_PATCH_MUTATION_META);
  });
});
