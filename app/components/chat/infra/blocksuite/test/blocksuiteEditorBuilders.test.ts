import { DocTitleViewExtension } from "@blocksuite/affine/fragments/doc-title/view";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readBlocksuiteCachedDocTitle } from "../editors/extensions/blocksuiteEditorTitle";
import {
  filterBlocksuiteDocTitlePageSpecs,
} from "../editors/extensions/buildBlocksuiteCoreEditorExtensions";
import {
  createBlocksuiteDocMenuGroup,
  handleBlocksuiteDocLinkNavigation,
  parseBlocksuiteRoomIdFromDocKey,
} from "../editors/extensions/buildBlocksuiteLinkedDocExtensions";
import {
  buildBlocksuiteMentionMenuGroup,
  insertBlocksuiteMentionViaInlineEditor,
  isBlocksuiteMentionMenuLocked,
  lockBlocksuiteMentionMenu,
} from "../editors/extensions/buildBlocksuiteMentionExtensions";
import { buildBlocksuiteQuickSearchExtension } from "../editors/extensions/buildBlocksuiteQuickSearchExtension";
import { buildBlocksuiteEmbedExtensions } from "../editors/extensions/embed/buildBlocksuiteEmbedExtensions";
import { EmbedIframeNoCredentiallessViewOverride } from "../editors/extensions/embed/embedIframeNoCredentiallessViewOverride";
import { RoomMapEmbedOptionExtension } from "../editors/extensions/embed/roomMapEmbedOption";
import { listBlocksuiteSpaceMemberIds } from "../services/blocksuiteSpaceMemberService";

vi.mock("../manager/view", () => ({
  getEdgelessSpecs: () => [],
  getPageSpecs: () => [],
}));

vi.mock("../services/blocksuiteSpaceMemberService", () => ({
  listBlocksuiteSpaceMemberIds: vi.fn(),
}));

const mockedListBlocksuiteSpaceMemberIds = vi.mocked(listBlocksuiteSpaceMemberIds);

function createTestContext(overrides: Record<string, unknown> = {}) {
  return {
    store: {},
    storeAny: { id: "current-doc" },
    workspace: {
      getDoc: vi.fn(() => null),
      meta: {},
    },
    docModeProvider: {
      getPrimaryMode: vi.fn(() => "page"),
    },
    spaceId: 12,
    onNavigateToDoc: undefined,
    userService: {
      prefetch: vi.fn(async () => {}),
      getCachedUserInfo: vi.fn((id: string) => ({
        id,
        name: id === "1" ? "Alice" : "Bob",
        avatar: null,
        removed: false,
      })),
    },
    quickSearchService: {
      searchDoc: vi.fn(),
      dispose: vi.fn(),
    },
    disposers: [],
    titleCache: new Map(),
    titleInflight: new Map(),
    roomIdsCache: new Map(),
    roomIdsInflight: new Map(),
    mentionMenuLockUntil: 0,
    mentionCommitDedupUntil: 0,
    debugEnabled: false,
    ...overrides,
  } as any;
}

describe("blocksuiteEditorBuilders", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("core builder 能在 disableDocTitle 时过滤 doc title extension", () => {
    const dummyExtension = { name: "other-extension" };
    const pageSpecs = [DocTitleViewExtension, dummyExtension];

    expect(filterBlocksuiteDocTitlePageSpecs(pageSpecs, true)).toEqual([dummyExtension]);
    expect(filterBlocksuiteDocTitlePageSpecs(pageSpecs, false)).toEqual(pageSpecs);
  });

  it("能读取并缓存稳定标题", async () => {
    const store = {
      getModelsByFlavour: vi.fn(() => [
        {
          props: {
            title: {
              toString: () => "文档标题",
            },
          },
        },
      ]),
    };
    const load = vi.fn();
    const context = createTestContext({
      workspace: {
        getDoc: vi.fn(() => ({
          load,
          getStore: () => store,
        })),
        meta: {
          getDocMeta: vi.fn(() => null),
        },
      },
    });

    const title = await readBlocksuiteCachedDocTitle(context, {
      docId: "room:12:description",
      signal: new AbortController().signal,
    });

    expect(title).toBe("文档标题");
    expect(load).toHaveBeenCalled();
    expect(context.titleCache.get("room:12:description")?.title).toBe("文档标题");
  });

  it("linked-doc builder 的菜单 action 会插入引用节点", () => {
    const insertText = vi.fn();
    const setInlineRange = vi.fn();
    const load = vi.fn();
    const track = vi.fn();
    const workspace = {
      getDoc: vi.fn(() => ({
        load,
        getStore: () => ({ load }),
      })),
      meta: {
        getDocMeta: vi.fn(() => null),
        addDocMeta: vi.fn(),
      },
      slots: {
        docListUpdated: {
          next: vi.fn(),
        },
      },
    };
    const context = createTestContext({
      workspace,
    });

    const group = createBlocksuiteDocMenuGroup({
      context,
      entries: [{ docId: "room:2:description", title: "房间设定" }],
      inlineEditor: {
        getInlineRange: () => ({ index: 3, length: 0 }),
        insertText,
        setInlineRange,
      },
      editorHost: {
        std: {
          workspace,
          getOptional: () => ({
            track,
          }),
        },
      },
    });

    expect(group.name).toBe("Link to Doc");
    const items = group.items as Array<{ action: () => void }>;
    expect(items).toHaveLength(1);

    items[0].action();

    expect(insertText).toHaveBeenCalled();
    expect(setInlineRange).toHaveBeenCalledWith({ index: 4, length: 0 });
    expect(load).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith("LinkedDocCreated", expect.any(Object));
  });

  it("linked-doc 导航优先交给宿主，否则回退到本地切换", () => {
    const onNavigateToDoc = vi.fn();
    const hostResult = handleBlocksuiteDocLinkNavigation({
      docId: "room:9:description",
      editor: {},
      workspace: {
        getDoc: vi.fn(() => null),
      },
      onNavigateToDoc,
      spaceId: 7,
    });

    expect(hostResult).toBe("host");
    expect(onNavigateToDoc).toHaveBeenCalledWith({ spaceId: 7, docId: "room:9:description" });

    const target = { load: vi.fn() };
    const editor = { doc: null as unknown };
    const fallbackResult = handleBlocksuiteDocLinkNavigation({
      docId: "room:3:description",
      editor,
      workspace: {
        getDoc: vi.fn(() => ({
          getStore: () => target,
        })),
      },
    });

    expect(fallbackResult).toBe("local");
    expect(target.load).toHaveBeenCalled();
    expect(editor.doc).toBe(target);
  });

  it("mention 锁是实例级的，不会跨 editor context 串扰", () => {
    vi.useFakeTimers();
    const left = createTestContext();
    const right = createTestContext();

    lockBlocksuiteMentionMenu(left);

    expect(isBlocksuiteMentionMenuLocked(left)).toBe(true);
    expect(isBlocksuiteMentionMenuLocked(right)).toBe(false);
  });

  it("mention builder 能生成成员菜单并插入 mention", async () => {
    mockedListBlocksuiteSpaceMemberIds.mockResolvedValueOnce([1, 2]);
    const abort = vi.fn();
    const insertText = vi.fn();
    const setInlineRange = vi.fn();
    const context = createTestContext();

    const group = await buildBlocksuiteMentionMenuGroup(context, {
      query: "ali",
      abort,
      inlineEditor: {
        getInlineRange: () => ({ index: 4, length: 0 }),
        insertText,
        setInlineRange,
      },
      signal: new AbortController().signal,
    });

    expect(group?.name).toBe("用户");
    const items = (group?.items ?? []) as Array<{ action: () => void }>;
    expect(items).toHaveLength(1);

    items[0]?.action();

    expect(abort).toHaveBeenCalled();
    expect(insertText).toHaveBeenCalledTimes(2);
    expect(setInlineRange).toHaveBeenLastCalledWith({ index: 2, length: 0 });
  });

  it("insertMention helper 会清理触发文本并写入 embed mention", () => {
    const abort = vi.fn();
    const insertText = vi.fn();
    const setInlineRange = vi.fn();

    const inserted = insertBlocksuiteMentionViaInlineEditor({
      inlineEditor: {
        getInlineRange: () => ({ index: 5, length: 0 }),
        insertText,
        setInlineRange,
      },
      query: "ab",
      triggerKey: "@",
      memberId: "42",
      abort,
    });

    expect(inserted).toBe(true);
    expect(abort).toHaveBeenCalled();
    expect(insertText).toHaveBeenCalledTimes(2);
    expect(setInlineRange).toHaveBeenNthCalledWith(1, { index: 2, length: 0 });
    expect(setInlineRange).toHaveBeenNthCalledWith(2, { index: 4, length: 0 });
  });

  it("embed builder 会注入共享扩展和 edgeless header", () => {
    const result = buildBlocksuiteEmbedExtensions();

    expect(result.sharedExtensions).toContain(RoomMapEmbedOptionExtension);
    expect(result.sharedExtensions).toContain(EmbedIframeNoCredentiallessViewOverride);
    expect(result.edgelessExtensions).toHaveLength(1);
  });

  it("quick search builder 会把 picker 结果适配成 extension 返回值", async () => {
    const context = createTestContext();
    const result = buildBlocksuiteQuickSearchExtension(context);
    const extension = result.sharedExtensions?.[0] as {
      setup?: (di: { addImpl: (token: unknown, impl: { openQuickSearch: () => Promise<unknown> }) => void }) => void;
    };
    let service: { openQuickSearch: () => Promise<unknown> } | undefined;

    extension.setup?.({
      addImpl: (_token, impl) => {
        service = impl;
      },
    });

    expect(service).toBeDefined();
    const openQuickSearch = service!.openQuickSearch;

    context.quickSearchService.searchDoc.mockResolvedValueOnce({ docId: "doc-1", isNewDoc: false });
    await expect(openQuickSearch()).resolves.toEqual({ docId: "doc-1" });

    context.quickSearchService.searchDoc.mockResolvedValueOnce({ userInput: "https://example.com" });
    await expect(openQuickSearch()).resolves.toEqual({ externalUrl: "https://example.com" });

    context.quickSearchService.searchDoc.mockResolvedValueOnce(null);
    await expect(openQuickSearch()).resolves.toBeNull();
  });

  it("room description docId 能被正确解析", () => {
    expect(parseBlocksuiteRoomIdFromDocKey("room:8:description")).toBe(8);
    expect(parseBlocksuiteRoomIdFromDocKey("space:8:description")).toBeNull();
  });
});
