import type { MessageDraft } from "@tuanchat/domain/message-draft";

import { describe, expect, it, vi } from "vitest";

import {
  toUserReadMeMessageDraft,
  UserReadMeSaveCoordinator,
} from "../../hooks/useUserReadMeMessageAdapter";

function draft(content: string): MessageDraft {
  return { content, messageType: 1 };
}

describe("UserReadMe messageDraft adapter", () => {
  it("不会把 room message 身份伪造进个人主页草稿", () => {
    const result = toUserReadMeMessageDraft({
      content: "主页内容",
      messageId: 10,
      messageType: 1,
      position: 2,
      roomId: 9,
      status: 0,
      syncId: 20,
      userId: 7,
    });

    expect(result).toMatchObject({ content: "主页内容", messageType: 1 });
    expect(result).not.toHaveProperty("messageId");
    expect(result).not.toHaveProperty("roomId");
    expect(result).not.toHaveProperty("syncId");
  });

  it("整份覆写失败时保留 error，下一次编辑保存最新 Query 草稿", async () => {
    const states: string[] = [];
    const write = vi.fn()
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValueOnce(undefined);
    const coordinator = new UserReadMeSaveCoordinator({
      onState: state => states.push(state),
      scheduler: { clear: () => undefined, schedule: () => 1 },
      write,
    });

    coordinator.edit([draft("first")]);
    await expect(coordinator.flush()).rejects.toThrow("disk full");
    coordinator.edit([draft("latest")]);
    await coordinator.flush();

    expect(write).toHaveBeenNthCalledWith(1, [draft("first")]);
    expect(write).toHaveBeenNthCalledWith(2, [draft("latest")]);
    expect(states).toContain("error");
    expect(states.at(-1)).toBe("saved");
  });

  it("保存期间继续编辑时会在当前请求后覆写最新整份草稿", async () => {
    let resolveFirst!: () => void;
    const firstWrite = new Promise<void>((resolve) => { resolveFirst = resolve; });
    const write = vi.fn()
      .mockReturnValueOnce(firstWrite)
      .mockResolvedValueOnce(undefined);
    const coordinator = new UserReadMeSaveCoordinator({
      onState: () => undefined,
      scheduler: { clear: () => undefined, schedule: () => 1 },
      write,
    });

    coordinator.edit([draft("submitted")]);
    const firstFlush = coordinator.flush();
    coordinator.edit([draft("latest")]);
    resolveFirst();
    await firstFlush;
    await coordinator.flush();

    expect(write).toHaveBeenNthCalledWith(1, [draft("submitted")]);
    expect(write).toHaveBeenNthCalledWith(2, [draft("latest")]);
  });
});
