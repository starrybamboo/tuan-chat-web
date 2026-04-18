import { afterEach, describe, expect, it, vi } from "vitest";

const {
  mockHandleBlocksuiteDocLinkNavigation,
  mockCreateBlocksuiteEditorAssemblyContext,
  mockInstallBlocksuiteSlashContextMenu,
} = vi.hoisted(() => ({
  mockHandleBlocksuiteDocLinkNavigation: vi.fn(),
  mockCreateBlocksuiteEditorAssemblyContext: vi.fn(() => ({
    storeAny: { id: "doc:1" },
    workspace: { getDoc: vi.fn(() => null) },
    disposers: [],
  })),
  mockInstallBlocksuiteSlashContextMenu: vi.fn(() => () => {}),
}));

vi.mock("../editors/blocksuiteEditorAssemblyContext", () => ({
  addBlocksuiteEditorDisposer: vi.fn(),
  createBlocksuiteEditorAssemblyContext: mockCreateBlocksuiteEditorAssemblyContext,
  disposeBlocksuiteEditorAssemblyContext: vi.fn(),
}));

vi.mock("../editors/extensions/buildBlocksuiteCoreEditorExtensions", () => ({
  buildBlocksuiteCoreEditorExtensions: vi.fn(() => ({
    pageExtensions: ["core-page"],
    edgelessExtensions: ["core-edgeless"],
    sharedExtensions: ["core-shared"],
    disposers: [],
  })),
}));

vi.mock("../editors/extensions/buildBlocksuiteMentionExtensions", () => ({
  buildBlocksuiteMentionExtensions: vi.fn(() => ({
    sharedExtensions: ["mention-shared"],
    api: {
      getMentionMenuGroups: vi.fn(async () => []),
    },
  })),
}));

vi.mock("../editors/extensions/buildBlocksuiteQuickSearchExtension", () => ({
  buildBlocksuiteQuickSearchExtension: vi.fn(() => ({
    sharedExtensions: ["quick-search"],
  })),
}));

vi.mock("../editors/extensions/embed/buildBlocksuiteEmbedExtensions", () => ({
  buildBlocksuiteEmbedExtensions: vi.fn(() => ({
    sharedExtensions: ["embed-shared"],
    edgelessExtensions: ["embed-edgeless"],
  })),
}));

vi.mock("../editors/extensions/buildBlocksuiteLinkedDocExtensions", () => ({
  buildBlocksuiteLinkedDocExtensions: vi.fn(() => ({
    sharedExtensions: ["linked-doc"],
  })),
  handleBlocksuiteDocLinkNavigation: mockHandleBlocksuiteDocLinkNavigation,
}));

vi.mock("../editors/extensions/types", () => ({
  mergeBlocksuiteExtensionBundles: (...bundles: Array<any>) => ({
    sharedExtensions: bundles.flatMap(bundle => bundle.sharedExtensions ?? []),
    pageExtensions: bundles.flatMap(bundle => bundle.pageExtensions ?? []),
    edgelessExtensions: bundles.flatMap(bundle => bundle.edgelessExtensions ?? []),
    disposers: bundles.flatMap(bundle => bundle.disposers ?? []),
  }),
}));

vi.mock("../editors/blocksuiteSlashContextMenu", () => ({
  installBlocksuiteSlashContextMenu: mockInstallBlocksuiteSlashContextMenu,
}));

vi.mock("../editors/tcAffineEditorContainer", () => ({
  ensureTCAffineEditorContainerDefined: vi.fn(),
  TC_AFFINE_EDITOR_CONTAINER_TAG: "tc-affine-editor-container",
}));

import { createBlocksuiteEditorClient } from "../editors/createBlocksuiteEditor.client";

describe("blocksuiteEditorClient", () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    vi.clearAllMocks();
    if (originalDocument) {
      globalThis.document = originalDocument;
    }
    else {
      delete (globalThis as any).document;
    }
  });

  it("创建 editor 时不会在 render 前访问 std，并把 doc link 回调挂到容器属性上", () => {
    let stdReadCount = 0;
    const editorElement = {
      setAttribute: vi.fn(),
      appendChild: vi.fn(),
      get std() {
        stdReadCount += 1;
        return {
          get: vi.fn(),
        };
      },
    } as any;

    const styleElement = {
      textContent: "",
    } as any;

    globalThis.document = {
      addEventListener: vi.fn(),
      createElement: vi.fn((tag: string) => {
        if (tag === "style") {
          return styleElement;
        }
        return editorElement;
      }),
      removeEventListener: vi.fn(),
    } as any;

    const result = createBlocksuiteEditorClient({
      store: {},
      workspace: { getDoc: vi.fn(() => null) },
      docModeProvider: { getPrimaryMode: vi.fn(() => "page") } as any,
      spaceId: 9,
      onNavigateToDoc: vi.fn(),
    });

    expect(result).toBe(editorElement);
    expect(stdReadCount).toBe(0);
    expect(typeof editorElement.onDocLinkClicked).toBe("function");

    editorElement.onDocLinkClicked({ pageId: "room:9:description" });

    expect(mockHandleBlocksuiteDocLinkNavigation).toHaveBeenCalledWith(expect.objectContaining({
      docId: "room:9:description",
      editor: editorElement,
      spaceId: 9,
    }));
  });
});
