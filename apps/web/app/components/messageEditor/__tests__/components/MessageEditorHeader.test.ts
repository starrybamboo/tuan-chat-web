import { describe, expect, it } from "vitest";

import {
  resolveMessageEditorHeaderState,
  shouldShowMessageEditorFloatingHeader,
} from "../../components/MessageEditorHeader";

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
      statusLabel: "已同步",
      statusPhase: "idle",
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
      statusPhase: "synced",
      title: "兜底标题",
    });
  });

  it("展示本地保存、等待上传、服务器确认和分段耗时", () => {
    const base = { readOnly: false, ready: true, saveState: "dirty" as const };
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { phase: "editing" },
    }, 1400).statusLabel).toBe("编辑中");
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { phase: "localSaving", startedAt: 1000 },
    }, 1400).statusLabel).toBe("正在保存到本地 · 0.4 秒");
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { dueAt: 3000, phase: "localSaved" },
    }, 2400).statusLabel).toBe("已保存到本地 · 0.6 秒后同步");
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { phase: "cloudSaving", startedAt: 1000 },
    }, 3400).statusLabel).toBe("正在等待服务器确认 · 2.4 秒");
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { cloudDurationMs: 800, phase: "localFinalizing", startedAt: 3000 },
    }, 3400).statusLabel).toBe("服务器已确认 · 正在更新本地 · 0.4 秒");
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { cloudDurationMs: 800, localDurationMs: 240, phase: "synced" },
    }, 9999).statusLabel).toBe("已同步 · 本地 0.2 秒 · 云端 0.8 秒");
  });

  it("展示复合编辑、重试、不确定结果和本地待补写状态", () => {
    const base = { readOnly: false, ready: true, saveState: "dirty" as const };
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { backgroundPhase: "cloudSaving", phase: "editing", startedAt: 1000 },
    }, 1500).statusLabel).toBe("编辑中 · 上一版同步中 0.5 秒");
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { dueAt: 4500, phase: "retrying" },
    }, 2000).statusLabel).toBe("云端同步失败 · 3 秒后重试");
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { phase: "reconciling", startedAt: 1000 },
    }, 1500).statusLabel).toBe("正在核对服务器结果 · 0.5 秒");
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { phase: "ambiguous" },
    }).statusLabel).toBe("服务器结果待确认");
    expect(resolveMessageEditorHeaderState({
      ...base,
      roomDocumentSyncProgress: { cloudDurationMs: 620, phase: "syncedLocalPending" },
    }).statusLabel).toBe("已同步 · 本地缓存待补写 · 云端 0.6 秒");
  });

  it("内部解析只读、载入和错误状态文案", () => {
    expect(resolveMessageEditorHeaderState({ readOnly: true, ready: true, saveState: "idle" }).statusLabel).toBe("只读");
    expect(resolveMessageEditorHeaderState({ readOnly: false, ready: false, saveState: "idle" }).statusLabel).toBe("载入中");
    expect(resolveMessageEditorHeaderState({ readOnly: false, ready: true, saveState: "dirty" }).statusLabel).toBe("编辑中");
    expect(resolveMessageEditorHeaderState({ readOnly: false, ready: true, saveState: "saving" }).statusLabel).toBe("保存中");
    expect(resolveMessageEditorHeaderState({ readOnly: false, ready: true, saveState: "error" }).statusLabel).toBe("未保存");
    expect(resolveMessageEditorHeaderState({
      readOnly: false,
      ready: true,
      roomDocumentSyncState: "syncing",
      saveState: "dirty",
    }).statusLabel).toBe("编辑中");
    expect(resolveMessageEditorHeaderState({
      readOnly: false,
      ready: true,
      roomDocumentSyncState: "error",
      saveState: "error",
    }).statusLabel).toBe("已保存到本地 · 云端同步失败");
    expect(resolveMessageEditorHeaderState({
      readOnly: false,
      ready: true,
      roomDocumentSyncState: "ambiguous",
      saveState: "error",
    }).statusLabel).toBe("服务器结果待确认");
  });

  it("仅在标题从视口上方滚出后显示紧凑状态条", () => {
    expect(shouldShowMessageEditorFloatingHeader({
      isIntersecting: true,
      markerTop: 80,
      viewportTop: 0,
    })).toBe(false);
    expect(shouldShowMessageEditorFloatingHeader({
      isIntersecting: false,
      markerTop: 500,
      viewportTop: 0,
    })).toBe(false);
    expect(shouldShowMessageEditorFloatingHeader({
      isIntersecting: false,
      markerTop: -1,
      viewportTop: 0,
    })).toBe(true);
  });
});
