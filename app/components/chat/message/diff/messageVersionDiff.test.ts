import { describe, expect, it } from "vitest";

import {
  buildBaseArchiveMessageIndex,
  buildFullMessageVersionDiffItems,
  getBaseMessageForVersionDiff,
  resolveMessageDiffBaseCommitId,
  VERSION_STATE_MODIFIED,
} from "@/components/chat/message/diff/messageVersionDiff";

import type { ChatMessageResponse } from "../../../../../api";

function messageResponse(message: Partial<ChatMessageResponse["message"]>): ChatMessageResponse {
  return {
    message: {
      messageId: 1,
      syncId: 1,
      roomId: 1,
      userId: 1,
      content: "",
      status: 0,
      messageType: 0,
      position: 1,
      ...message,
    },
  };
}

describe("messageVersionDiff", () => {
  it("消息 diff 基线优先使用克隆来源 commit", () => {
    expect(resolveMessageDiffBaseCommitId({
      parentCommitId: 101,
      repositoryCommitId: 202,
    })).toBe(101);
  });

  it("没有克隆来源时使用空间仓库当前 commit 作为消息 diff 基线", () => {
    expect(resolveMessageDiffBaseCommitId({
      parentCommitId: null,
      repositoryCommitId: 202,
    })).toBe(202);
  });

  it("没有有效 commit 时不加载消息 diff 基线", () => {
    expect(resolveMessageDiffBaseCommitId({
      parentCommitId: 0,
      repositoryCommitId: null,
    })).toBeUndefined();
  });

  it("用归档快照里的 inheritedArchiveMessageId 建立稳定索引", () => {
    const base = messageResponse({
      messageId: 100,
      inheritedArchiveMessageId: 9001,
      content: "归档文本",
    });

    const index = buildBaseArchiveMessageIndex([base]);

    expect(index.get(9001)).toBe(base);
  });

  it("可以为修改态消息找到继承来源并返回 base 消息", () => {
    const base = messageResponse({
      messageId: 100,
      inheritedArchiveMessageId: 9001,
      content: "归档文本",
    });
    const current = messageResponse({
      messageId: 200,
      inheritedArchiveMessageId: 9001,
      versionState: VERSION_STATE_MODIFIED,
      content: "当前文本",
    });

    const result = getBaseMessageForVersionDiff(current, buildBaseArchiveMessageIndex([base]));

    expect(result).toBe(base);
  });

  it("内容没有变化时不展示版本 diff", () => {
    const base = messageResponse({
      messageId: 100,
      inheritedArchiveMessageId: 9001,
      content: "同一文本",
    });
    const current = messageResponse({
      messageId: 200,
      inheritedArchiveMessageId: 9001,
      versionState: VERSION_STATE_MODIFIED,
      content: "同一文本",
    });

    const result = getBaseMessageForVersionDiff(current, buildBaseArchiveMessageIndex([base]));

    expect(result).toBeNull();
  });

  it("非修改态消息不展示版本 diff", () => {
    const base = messageResponse({
      inheritedArchiveMessageId: 9001,
      content: "归档文本",
    });
    const current = messageResponse({
      inheritedArchiveMessageId: 9001,
      versionState: 0,
      content: "当前文本",
    });

    const result = getBaseMessageForVersionDiff(current, buildBaseArchiveMessageIndex([base]));

    expect(result).toBeNull();
  });

  it("全量 diff 将没有继承来源的当前消息标记为新增", () => {
    const current = messageResponse({
      messageId: 200,
      content: "新增文本",
      versionState: 2,
    });

    const items = buildFullMessageVersionDiffItems([current], buildBaseArchiveMessageIndex([]));

    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("added");
    expect(items[0]?.diff.afterSegments).toContainEqual({
      kind: "insert",
      text: "新增文本",
    });
  });

  it("全量 diff 会对继承消息做内容对比，即使当前状态不是修改态", () => {
    const base = messageResponse({
      messageId: 100,
      inheritedArchiveMessageId: 9001,
      content: "归档文本",
    });
    const current = messageResponse({
      messageId: 200,
      inheritedArchiveMessageId: 9001,
      versionState: 0,
      content: "归档文本",
    });

    const items = buildFullMessageVersionDiffItems([current], buildBaseArchiveMessageIndex([base]));

    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("unchanged");
    expect(items[0]?.diff.hasChanges).toBe(false);
  });

  it("全量 diff 将父版本中缺失的消息标记为删除", () => {
    const base = messageResponse({
      messageId: 100,
      inheritedArchiveMessageId: 9001,
      content: "被删除文本",
    });

    const items = buildFullMessageVersionDiffItems([], buildBaseArchiveMessageIndex([base]));

    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("deleted");
    expect(items[0]?.diff.beforeSegments).toContainEqual({
      kind: "delete",
      text: "被删除文本",
    });
  });
});
