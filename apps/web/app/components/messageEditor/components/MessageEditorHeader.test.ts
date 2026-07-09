import { describe, expect, it } from "vitest";

import { resolveMessageEditorHeaderState } from "./MessageEditorHeader";

describe("MessageEditorHeader", () => {
  it("优先使用显式标题和封面，并清理文档 ID", () => {
    expect(resolveMessageEditorHeaderState({
      coverUrl: "https://example.com/cover.png",
      docId: "  room-1  ",
      readOnly: false,
      ready: true,
      saveState: "idle",
      tcHeader: {
        fallbackImageUrl: "https://example.com/fallback.png",
        fallbackTitle: "兜底标题",
      },
      title: "  正文标题  ",
    })).toEqual({
      coverUrl: "https://example.com/cover.png",
      docId: "room-1",
      statusLabel: "编辑中",
      title: "正文标题",
    });
  });

  it("在缺少显式信息时使用团剧共创头部兜底", () => {
    expect(resolveMessageEditorHeaderState({
      readOnly: false,
      ready: true,
      saveState: "saved",
      tcHeader: {
        fallbackImageUrl: "https://example.com/fallback.png",
        fallbackTitle: "兜底标题",
      },
    })).toEqual({
      coverUrl: "https://example.com/fallback.png",
      docId: undefined,
      statusLabel: "已保存",
      title: "兜底标题",
    });
  });

  it("内部解析只读、载入和错误状态文案", () => {
    expect(resolveMessageEditorHeaderState({ readOnly: true, ready: true, saveState: "idle" }).statusLabel).toBe("只读");
    expect(resolveMessageEditorHeaderState({ readOnly: false, ready: false, saveState: "idle" }).statusLabel).toBe("载入中");
    expect(resolveMessageEditorHeaderState({ readOnly: false, ready: true, saveState: "saving" }).statusLabel).toBe("保存中");
    expect(resolveMessageEditorHeaderState({ readOnly: false, ready: true, saveState: "error" }).statusLabel).toBe("未保存");
  });
});
