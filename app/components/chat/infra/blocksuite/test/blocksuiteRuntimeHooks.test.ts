import { describe, expect, it, vi } from "vitest";

import {
  fitBlocksuiteEdgelessViewport,
  shouldRefocusBlocksuiteEdgelessViewport,
  syncBlocksuiteEditorMode,
} from "../useBlocksuiteEditorModeSync";
import { syncBlocksuiteTcHeaderState } from "../useBlocksuiteTcHeaderSync";
import {
  getBlocksuiteRootClassName,
  getBlocksuiteViewportOverflowClass,
  hasBlocksuiteHeightConstraintClass,
} from "../useBlocksuiteViewportBehavior";

function createEditorHandle(overrides: Record<string, unknown> = {}) {
  return {
    hostContainerRef: { current: null },
    fullscreenRootRef: { current: null },
    editorRef: { current: null },
    storeRef: { current: null },
    runtimeRef: { current: null },
    triggerReload: vi.fn(),
    ...overrides,
  } as any;
}

describe("blocksuiteRuntimeHooks", () => {
  it("mode sync 会切换 editor 模式并同步高度", () => {
    const editor = {
      switchEditor: vi.fn(),
      style: {
        height: "auto",
      },
    };

    const changed = syncBlocksuiteEditorMode({
      editor,
      currentMode: "edgeless",
      shouldFillHeight: true,
    });

    expect(changed).toBe(true);
    expect(editor.switchEditor).toHaveBeenCalledTimes(1);
    expect(editor.switchEditor).toHaveBeenCalledWith("edgeless");
    expect(editor.style.height).toBe("100%");
  });

  it("只在 page -> edgeless 时触发 edgeless 重新聚焦", () => {
    expect(shouldRefocusBlocksuiteEdgelessViewport("page", "edgeless")).toBe(true);
    expect(shouldRefocusBlocksuiteEdgelessViewport("edgeless", "edgeless")).toBe(false);
    expect(shouldRefocusBlocksuiteEdgelessViewport("edgeless", "page")).toBe(false);
  });

  it("edgeless 聚焦 helper 会调用 fitToScreen", () => {
    const fitToScreen = vi.fn();
    const editor = {
      host: {
        view: {
          getBlock: vi.fn(() => ({
            gfx: {
              fitToScreen,
            },
          })),
        },
      },
    };
    const store = {
      root: {
        id: "root-1",
      },
    };

    expect(fitBlocksuiteEdgelessViewport(editor, store)).toBe(true);
    expect(editor.host.view.getBlock).toHaveBeenCalledWith("root-1");
    expect(fitToScreen).toHaveBeenCalledTimes(1);
  });

  it("tcHeader sync 会写 meta 并通知宿主", () => {
    const ensureDocMeta = vi.fn();
    const postToParent = vi.fn();
    const onTcHeaderChange = vi.fn();
    const editorHandle = createEditorHandle({
      runtimeRef: {
        current: {
          ensureDocMeta,
        },
      },
    });

    const synced = syncBlocksuiteTcHeaderState({
      tcHeaderEnabled: true,
      tcHeaderState: {
        docId: "room:1:description",
        header: {
          title: "标题",
          imageUrl: "https://example.com/image.png",
        },
      },
      docId: "room:1:description",
      workspaceId: "space:1",
      editorHandle,
      postToParent,
      onTcHeaderChange,
      tcHeaderEntity: {
        entityType: "room",
        entityId: 1,
      },
      shouldPostToParent: true,
    });

    expect(synced).toBe(true);
    expect(ensureDocMeta).toHaveBeenCalledWith({
      workspaceId: "space:1",
      docId: "room:1:description",
      title: "标题",
    });
    expect(postToParent).toHaveBeenCalledWith(expect.objectContaining({
      type: "tc-header",
      docId: "room:1:description",
    }));
    expect(onTcHeaderChange).toHaveBeenCalledWith(expect.objectContaining({
      docId: "room:1:description",
      entityType: "room",
    }));
  });

  it("tcHeader sync 只在当前文档匹配时生效", () => {
    const ensureDocMeta = vi.fn();
    const postToParent = vi.fn();

    const synced = syncBlocksuiteTcHeaderState({
      tcHeaderEnabled: true,
      tcHeaderState: {
        docId: "room:2:description",
        header: {
          title: "错文档",
          imageUrl: "",
        },
      },
      docId: "room:1:description",
      workspaceId: "space:1",
      editorHandle: createEditorHandle({
        runtimeRef: {
          current: {
            ensureDocMeta,
          },
        },
      }),
      postToParent,
      tcHeaderEntity: null,
      shouldPostToParent: true,
    });

    expect(synced).toBe(false);
    expect(ensureDocMeta).not.toHaveBeenCalled();
    expect(postToParent).not.toHaveBeenCalled();
  });

  it("viewport 规则不再依赖 editor/store 即可判定 overflow 与 root class", () => {
    expect(hasBlocksuiteHeightConstraintClass("w-full h-64 rounded-md")).toBe(true);
    expect(getBlocksuiteViewportOverflowClass({
      currentMode: "page",
      isFull: false,
      isEdgelessFullscreen: false,
      isBrowserFullscreen: false,
      className: "w-full",
    })).toBe("overflow-visible");
    expect(getBlocksuiteViewportOverflowClass({
      currentMode: "page",
      isFull: false,
      isEdgelessFullscreen: false,
      isBrowserFullscreen: true,
      className: "w-full",
    })).toBe("overflow-auto");
    expect(getBlocksuiteRootClassName({
      tcHeaderEnabled: true,
      className: "rounded-md",
      isFull: true,
      isEdgelessFullscreen: false,
      isBrowserFullscreen: false,
    })).toContain("tc-blocksuite-tc-header-enabled");
  });
});
