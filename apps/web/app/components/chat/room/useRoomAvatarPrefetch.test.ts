import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  collectRoomAvatarPrefetchAssetUrls,
  collectRoomAvatarPrefetchIds,
  prefetchRoomAvatarBatch,
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
  it("收集消息和角色已携带文件 ID 的头像素材 URL", () => {
    const urls = collectRoomAvatarPrefetchAssetUrls({
      messages: [message(1, 20, 101), message(2, 10, 102)],
      roles: [{ avatarId: 3, avatarFileId: 103 }, { avatarId: 4 }],
    });

    expect(urls).toEqual([
      "https://media.tuan.chat/media/v1/files/101/101/image/low.webp",
      "https://media.tuan.chat/media/v1/files/102/102/image/low.webp",
      "https://media.tuan.chat/media/v1/files/103/103/image/low.webp",
    ]);
  });

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

  it("环境暂时不允许预取时返回未完成状态", async () => {
    await expect(prefetchRoomAvatarBatch({
      avatarIds: [1],
      queryClient: new QueryClient(),
      runtime: { document: { visibilityState: "hidden" } },
    })).resolves.toBe(false);
  });
});
