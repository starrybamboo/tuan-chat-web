import { describe, expect, it, vi } from "vitest";

import {
  collectRoomAvatarPrefetchIds,
  prefetchAvatarImageUrl,
  shouldPrefetchRoomAvatars,
} from "./useRoomAvatarPrefetch";

function message(avatarId?: number | null, position = avatarId ?? 0, avatarFileId?: number | null) {
  return {
    message: {
      messageId: avatarId ?? 0,
      syncId: avatarId ?? 0,
      roomId: 1,
      userId: 1,
      content: "",
      status: 0,
      messageType: 1,
      position,
      avatarId: avatarId ?? undefined,
      avatarFileId: avatarFileId ?? undefined,
    },
  };
}

describe("collectRoomAvatarPrefetchIds", () => {
  it("按全房间消息和角色去重收集正数头像 ID", () => {
    const ids = collectRoomAvatarPrefetchIds({
      messages: [message(1), message(2), message(1), message(0), message(undefined)],
      roles: [{ avatarId: 2 }, { avatarId: 3 }, { avatarId: -1 }],
    });

    expect(ids).toEqual([2, 1, 3]);
  });

  it("按 position 从大到小优先收集消息头像", () => {
    const ids = collectRoomAvatarPrefetchIds({
      messages: [
        message(1, 10),
        message(2, 30),
        message(3, 20),
      ],
    });

    expect(ids).toEqual([2, 3, 1]);
  });

  it("默认收集全量消息头像", () => {
    const messages = Array.from({ length: 60 }, (_, index) => message(index + 1));

    expect(collectRoomAvatarPrefetchIds({ messages })).toHaveLength(60);
  });

  it("遵守预取上限", () => {
    const ids = collectRoomAvatarPrefetchIds({
      messages: [message(1), message(2), message(3)],
      roles: [{ avatarId: 4 }],
      limit: 2,
    });

    expect(ids).toEqual([3, 2]);
  });

  it("消息或角色已携带头像文件 ID 时跳过头像元数据请求", () => {
    const ids = collectRoomAvatarPrefetchIds({
      messages: [message(1, 20, 101), message(2, 10)],
      roles: [{ avatarId: 3, avatarFileId: 103 }, { avatarId: 4 }],
    });

    expect(ids).toEqual([2, 4]);
  });
});

describe("shouldPrefetchRoomAvatars", () => {
  it("页面可见且网络允许时可以预取", () => {
    expect(shouldPrefetchRoomAvatars({
      document: { visibilityState: "visible" },
      navigator: { connection: { effectiveType: "4g" } },
    })).toBe(true);
  });

  it("页面隐藏、节省流量或弱网时跳过预取", () => {
    expect(shouldPrefetchRoomAvatars({ document: { visibilityState: "hidden" } })).toBe(false);
    expect(shouldPrefetchRoomAvatars({ navigator: { connection: { saveData: true } } })).toBe(false);
    expect(shouldPrefetchRoomAvatars({ navigator: { connection: { effectiveType: "2g" } } })).toBe(false);
    expect(shouldPrefetchRoomAvatars({ navigator: { connection: { effectiveType: "slow-2g" } } })).toBe(false);
  });
});

describe("prefetchAvatarImageUrl", () => {
  it("使用 Image 预加载头像 URL，并吞掉加载失败", async () => {
    const requestedUrls: string[] = [];

    class MockImage {
      decoding = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      set src(value: string) {
        this._src = value;
        requestedUrls.push(value);
        queueMicrotask(() => this.onerror?.());
      }

      get src() {
        return this._src;
      }
    }

    await expect(prefetchAvatarImageUrl(" /avatar.webp ", { Image: MockImage as never })).resolves.toBeUndefined();

    expect(requestedUrls).toEqual(["/avatar.webp"]);
  });

  it("没有 Image 构造器时安全跳过", async () => {
    await expect(prefetchAvatarImageUrl("/avatar.webp", { Image: undefined })).resolves.toBeUndefined();
    expect(vi.isMockFunction(globalThis.Image)).toBe(false);
  });
});
