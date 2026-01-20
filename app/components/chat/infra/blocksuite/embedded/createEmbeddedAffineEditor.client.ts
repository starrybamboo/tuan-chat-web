// 嵌入式 Blocksuite 编辑器创建与扩展配置。
import type { LinkedMenuGroup } from "@blocksuite/affine-widget-linked-doc";
import type { DocModeProvider } from "@blocksuite/affine/shared/services";

import { EmbedSyncedDocConfigExtension } from "@blocksuite/affine-block-embed-doc";
import { DocTitleViewExtension } from "@blocksuite/affine-fragment-doc-title/view";
import { ImageProxyService } from "@blocksuite/affine-shared/adapters";
import { DocDisplayMetaProvider, LinkPreviewServiceIdentifier } from "@blocksuite/affine-shared/services";
import {
  createLinkedDocMenuGroup,
  LinkedWidgetConfigExtension,
} from "@blocksuite/affine-widget-linked-doc";
import { LinkedDocViewExtension } from "@blocksuite/affine-widget-linked-doc/view";
import { RefNodeSlotsProvider } from "@blocksuite/affine/inlines/reference";
import {
  DocModeProvider as DocModeProviderToken,
  EditorSettingExtension,
  FeatureFlagService,
  ParseDocUrlExtension,
  QuickSearchExtension,
  UserServiceExtension,
} from "@blocksuite/affine/shared/services";
import { getTestViewManager } from "@blocksuite/integration-test/view";
import { ZERO_WIDTH_FOR_EMBED_NODE } from "@blocksuite/std/inline";
import { html } from "lit";

import { tuanchat } from "api/instance";

import { createBlocksuiteQuickSearchService } from "../quickSearchService";
import { createTuanChatUserService } from "../services/tuanChatUserService";
import { mockEditorSetting, mockParseDocUrlService } from "./mockServices";
import { ensureTCAffineEditorContainerDefined, TC_AFFINE_EDITOR_CONTAINER_TAG } from "./tcAffineEditorContainer";

type ElementSnapshot = { attrs: Map<string, string | null>; className: string; styleText: string };

type WorkspaceLike = {
  getDoc: (docId: string) => { getStore: () => unknown; loaded?: boolean; load?: () => void } | null;
  meta?: unknown;
};

const viewManager = getTestViewManager();

let slashMenuSelectionGuardInstalled = false;
let slashMenuSelectionGuardRefCount = 0;
let slashMenuSelectionGuardHandler: ((e: Event) => void) | null = null;
const mentionMenuLockMs = 400;
let mentionMenuLockUntil = 0;
const mentionMenuDebugEnabled = Boolean((import.meta as any)?.env?.DEV);
const mentionCommitDedupMs = 600;
let mentionCommitDedupUntil = 0;

function isMentionCommitDeduped(): boolean {
  return Date.now() < mentionCommitDedupUntil;
}

function lockMentionCommitDedup() {
  mentionCommitDedupUntil = Date.now() + mentionCommitDedupMs;
}

function isMentionMenuLocked() {
  return Date.now() < mentionMenuLockUntil;
}

function lockMentionMenu() {
  mentionMenuLockUntil = Date.now() + mentionMenuLockMs;
}

function forwardMentionMenu(message: string, payload?: Record<string, unknown>) {
  try {
    const fn = (globalThis as any).__tcBlocksuiteDebugLog as undefined | ((entry: any) => void);
    fn?.({ source: "BlocksuiteMentionMenu", message, payload });
  }
  catch {
    // ignore
  }
}

function logMentionMenu(message: string, payload?: Record<string, unknown>) {
  if (!mentionMenuDebugEnabled)
    return;
  if (payload) {
    console.warn("[BlocksuiteMentionMenu]", message, payload);
  }
  else {
    console.warn("[BlocksuiteMentionMenu]", message);
  }
  forwardMentionMenu(message, payload);
}

function normalizeTcHeaderTitle(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getCachedTcHeaderTitle(docId: string): string | null {
  const cached = tcHeaderTitleCache.get(docId);
  if (!cached)
    return null;
  if (Date.now() - cached.at > TC_HEADER_TITLE_TTL_MS) {
    tcHeaderTitleCache.delete(docId);
    return null;
  }
  return cached.title;
}

function cacheTcHeaderTitle(docId: string, title: string) {
  tcHeaderTitleCache.set(docId, { at: Date.now(), title });
}

function syncMetaTitleFromTcHeader(workspace: WorkspaceLike, docId: string, title: string) {
  try {
    const metaAny = (workspace as any)?.meta;
    if (!metaAny)
      return;
    const current = metaAny.getDocMeta?.(docId);
    if (!current) {
      metaAny.addDocMeta?.({ id: docId, title, tags: [], createDate: Date.now() });
      workspace.slots.docListUpdated.next();
      return;
    }
    if (current.title !== title) {
      metaAny.setDocMeta?.(docId, { title });
      workspace.slots.docListUpdated.next();
    }
  }
  catch {
    // ignore
  }
}

function insertLinkedNodeWithTitle(params: { inlineEditor: any; docId: string; title?: string }) {
  const { inlineEditor, docId, title } = params;
  if (!inlineEditor)
    return;
  const inlineRange = inlineEditor.getInlineRange?.();
  if (!inlineRange)
    return;
  const reference: { type: "LinkedPage"; pageId: string; title?: string } = { type: "LinkedPage", pageId: docId };
  if (title)
    reference.title = title;
  inlineEditor.insertText(inlineRange, REFERENCE_NODE, { reference });
  inlineEditor.setInlineRange({
    index: inlineRange.index + 1,
    length: 0,
  });
}

function ensureDocExistsInWorkspace(workspace: WorkspaceLike, docId: string) {
  try {
    const wsAny = workspace as any;
    const doc = wsAny?.getDoc?.(docId) ?? wsAny?.createDoc?.(docId);
    doc?.load?.();
  }
  catch {
    // ignore
  }
}

async function readTcHeaderTitle(params: {
  docId: string;
  signal: AbortSignal;
  workspace: WorkspaceLike;
}): Promise<string> {
  const { docId, signal, workspace } = params;
  if (signal.aborted)
    return "";

  const cached = getCachedTcHeaderTitle(docId);
  if (cached !== null)
    return cached;

  const inflight = tcHeaderTitleInflight.get(docId);
  if (inflight)
    return inflight;

  const task = (async () => {
    if (signal.aborted)
      return "";
    let title = "";
    try {
      const wsAny = workspace as any;
      const doc = wsAny?.getDoc?.(docId) ?? wsAny?.createDoc?.(docId);
      doc?.load?.();
      const store = doc?.getStore?.({ readonly: true }) ?? doc?.getStore?.();
      const header = readBlocksuiteDocHeader(store);
      title = normalizeTcHeaderTitle(header?.title);
    }
    catch {
      // ignore
    }

    cacheTcHeaderTitle(docId, title);
    syncMetaTitleFromTcHeader(workspace, docId, title);
    return title;
  })();

  tcHeaderTitleInflight.set(docId, task);
  try {
    return await task;
  }
  finally {
    tcHeaderTitleInflight.delete(docId);
  }
}

function insertMentionViaInlineEditor(params: {
  inlineEditor: any;
  query: string;
  triggerKey: string;
  memberId: string;
  abort: () => void;
}): boolean {
  const { inlineEditor, query, triggerKey, memberId, abort } = params;

  const current = inlineEditor?.getInlineRange?.();
  if (!current) {
    logMentionMenu("insert: inline range missing", { memberId });
    return false;
  }

  const deleteLen = String(triggerKey).length + String(query ?? "").length;
  const insertIndex = Math.max(0, Number(current.index ?? 0) - deleteLen);

  // Close popover and clear "@query" using the official abort routine first,
  // then insert mention at the computed index to avoid abort wiping inserted text.
  try {
    abort();
  }
  catch {
    // ignore
  }

  try {
    inlineEditor.setInlineRange?.({ index: insertIndex, length: 0 });
    // IMPORTANT:
    // Mention inline spec is an "embed" node. It should be represented by a single
    // ZERO_WIDTH_FOR_EMBED_NODE character with `mention` attributes, otherwise
    // each character may be rendered as a full mention, causing repeated "@xxx".
    inlineEditor.insertText?.({ index: insertIndex, length: 0 }, ZERO_WIDTH_FOR_EMBED_NODE, {
      mention: { member: String(memberId) },
    });
    // Add a trailing space (plain text) to make typing easier.
    inlineEditor.insertText?.({ index: insertIndex + 1, length: 0 }, " ");
    inlineEditor.setInlineRange?.({ index: insertIndex + 2, length: 0 });
    return true;
  }
  catch (err) {
    logMentionMenu("insert: failed", { memberId, err: String(err) });
    return false;
  }
}

function installSlashMenuDoesNotClearSelectionOnClick(): () => void {
  if (typeof document === "undefined")
    return () => {};

  slashMenuSelectionGuardRefCount += 1;

  if (!slashMenuSelectionGuardInstalled) {
    slashMenuSelectionGuardInstalled = true;

    const shouldGuard = (target: EventTarget | null) => {
      if (!(target instanceof Element))
        return false;

      // The slash menu popover is rendered via a web component (`affine-slash-menu`)
      // and also uses `.slash-menu` class in its internal DOM.
      // Preventing default on pointer/mouse down keeps the editor selection,
      // which some command-based items depend on (e.g. Table/Kanban insertion).
      return Boolean(
        target.closest(
          ".slash-menu, affine-slash-menu, inner-slash-menu, affine-slash-menu-widget",
        ),
      );
    };

    const handler = (e: Event) => {
      if (shouldGuard(e.target)) {
        e.preventDefault();
      }
    };

    slashMenuSelectionGuardHandler = handler;

    document.addEventListener("pointerdown", handler, true);
    document.addEventListener("mousedown", handler, true);
    document.addEventListener("touchstart", handler, true);
  }

  return () => {
    if (typeof document === "undefined")
      return;

    slashMenuSelectionGuardRefCount -= 1;
    if (slashMenuSelectionGuardRefCount > 0)
      return;

    slashMenuSelectionGuardRefCount = 0;

    const handler = slashMenuSelectionGuardHandler;
    if (!handler)
      return;

    document.removeEventListener("pointerdown", handler, true);
    document.removeEventListener("mousedown", handler, true);
    document.removeEventListener("touchstart", handler, true);

    slashMenuSelectionGuardHandler = null;
    slashMenuSelectionGuardInstalled = false;
  };
}

function snapshotElementAttributes(el: Element): ElementSnapshot {
  const attrs = new Map<string, string | null>();
  for (const name of el.getAttributeNames()) {
    attrs.set(name, el.getAttribute(name));
  }

  return {
    attrs,
    className: (el as any).className ?? "",
    styleText: (el as HTMLElement).style?.cssText ?? "",
  };
}

function restoreElementAttributes(el: Element, snapshot: ElementSnapshot) {
  // Remove attributes that didn't exist before
  for (const name of el.getAttributeNames()) {
    if (!snapshot.attrs.has(name)) {
      el.removeAttribute(name);
    }
  }

  // Restore original attributes
  for (const [name, value] of snapshot.attrs.entries()) {
    if (value === null) {
      el.removeAttribute(name);
    }
    else {
      el.setAttribute(name, value);
    }
  }

  (el as any).className = snapshot.className;
  if ((el as HTMLElement).style)
    (el as HTMLElement).style.cssText = snapshot.styleText;
}

function installGlobalDomStyleGuard(): () => void {
  if (typeof document === "undefined")
    return () => {};

  const htmlSnapshot = snapshotElementAttributes(document.documentElement);
  const bodySnapshot = snapshotElementAttributes(document.body);

  const injectedHeadNodes: Element[] = [];
  const head = document.head;

  // Snapshot adoptedStyleSheets if the browser supports it.
  const docAny = document as any;
  const adoptedStyleSheetsSnapshot: any[] | null = Array.isArray(docAny?.adoptedStyleSheets)
    ? [...docAny.adoptedStyleSheets]
    : null;

  let headObserver: MutationObserver | null = null;
  try {
    if (head && typeof MutationObserver !== "undefined") {
      headObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (!(node instanceof Element))
              continue;

            const isStyle = node.tagName === "STYLE";
            const isStylesheetLink
              = node.tagName === "LINK"
                && (node.getAttribute("rel") ?? "").toLowerCase() === "stylesheet";

            if (!isStyle && !isStylesheetLink)
              continue;

            // Mark nodes injected while blocksuite editor is alive so we can safely remove them on dispose.
            node.setAttribute("data-tc-blocksuite-injected", "1");
            injectedHeadNodes.push(node);
          }
        }
      });

      headObserver.observe(head, { childList: true, subtree: true });
    }
  }
  catch {
    headObserver = null;
  }

  return () => {
    try {
      try {
        headObserver?.disconnect?.();
      }
      catch {
        // ignore
      }

      // Remove stylesheets injected during editor lifetime.
      for (let i = injectedHeadNodes.length - 1; i >= 0; i -= 1) {
        const node = injectedHeadNodes[i];
        try {
          if (node.isConnected)
            node.remove();
        }
        catch {
          // ignore
        }
      }

      // Restore adoptedStyleSheets.
      if (adoptedStyleSheetsSnapshot) {
        try {
          docAny.adoptedStyleSheets = adoptedStyleSheetsSnapshot;
        }
        catch {
          // ignore
        }
      }

      restoreElementAttributes(document.documentElement, htmlSnapshot);
      restoreElementAttributes(document.body, bodySnapshot);
    }
    catch {
      // ignore
    }
  };
}

export function createEmbeddedAffineEditor(params: {
  store: unknown;
  workspace: WorkspaceLike;
  docModeProvider: DocModeProvider;
  spaceId?: number;
  autofocus?: boolean;
  disableDocTitle?: boolean;
  onNavigateToDoc?: (params: { spaceId: number; docId: string }) => void;
}): HTMLElement {
  const { store, workspace, docModeProvider, autofocus = true, disableDocTitle = false, onNavigateToDoc } = params;

  const disposers: Array<() => void> = [];
  disposers.push(installGlobalDomStyleGuard());
  disposers.push(installSlashMenuDoesNotClearSelectionOnClick());

  // Register custom elements for linked doc, this is crucial for the widget to work
  new LinkedDocViewExtension().effect();

  const storeAny = store as any;

  // Align with starter playground behavior.
  storeAny
    ?.get?.(FeatureFlagService)
    ?.setFlag?.("enable_advanced_block_visibility", true);

  // Disable link preview fetching by default.
  // In some networks, the upstream default endpoint may time out and flood the console.
  // TODO(tuan-chat): add our own backend link-preview endpoint and remove this no-op override.
  const noOpLinkPreviewProvider = {
    endpoint: "",
    setEndpoint: (_endpoint: string) => {
      // noop
    },
    query: async (_url: string, _signal?: AbortSignal) => {
      // Return empty preview data: blocks should gracefully fallback to URL/domain.
      return {};
    },
  };

  // Optional: override link preview endpoint / image proxy endpoint.
  // Default endpoints are hosted by toeverything and may be unreachable in some networks.
  try {
    const linkPreviewEndpoint = (import.meta as any)?.env?.VITE_BLOCKSUITE_LINK_PREVIEW_ENDPOINT as string | undefined;
    if (linkPreviewEndpoint) {
      storeAny?.get?.(LinkPreviewServiceIdentifier)?.setEndpoint?.(linkPreviewEndpoint);
    }
  }
  catch {
    // ignore
  }

  try {
    const imageProxyEndpoint = (import.meta as any)?.env?.VITE_BLOCKSUITE_IMAGE_PROXY_ENDPOINT as string | undefined;
    if (imageProxyEndpoint) {
      storeAny?.get?.(ImageProxyService)?.setImageProxyURL?.(imageProxyEndpoint);
    }
  }
  catch {
    // ignore
  }

  ensureTCAffineEditorContainerDefined();
  const editor = document.createElement(
    TC_AFFINE_EDITOR_CONTAINER_TAG,
  ) as unknown as HTMLElement;

  // Used to scope any injected CSS to this editor only.
  editor.setAttribute("data-tc-blocksuite-root", "");

  (editor as any).__tc_dispose = () => {
    // LIFO: revert global side effects after blocksuite teardown.
    for (let i = disposers.length - 1; i >= 0; i -= 1) {
      try {
        disposers[i]?.();
      }
      catch {
        // ignore
      }
    }
  };

  (editor as any).autofocus = autofocus;
  (editor as any).disableDocTitle = disableDocTitle;
  (editor as any).doc = storeAny;

  const userService = createTuanChatUserService();

  const getDocMenus = async (
    query: string,
    abort: () => void,
    editorHost: any,
    inlineEditor: any,
    signal: AbortSignal,
  ): Promise<LinkedMenuGroup[]> => {
    if (signal.aborted)
      return [];
    if (isMentionMenuLocked())
      return [];

    let mentionActionLocked = false;
    logMentionMenu("getDocMenus", { query, locked: isMentionMenuLocked() });

    // 1. Custom linked-doc menu (tc_header only)
    const metaAny = (workspace as any)?.meta ?? (editorHost as any)?.store?.workspace?.meta;
    const docMetas = Array.isArray(metaAny?.docMetas) ? metaAny.docMetas : [];
    const currentDocId = (editorHost as any)?.store?.id ?? (storeAny as any)?.id;
    const docIds = docMetas.map((m: any) => m?.id).filter((id: string) => id && id !== currentDocId);

    const queryText = String(query ?? "");
    const filterQuery = queryText.trim();
    const wsForTitle = ((editorHost as any)?.std?.workspace ?? workspace) as WorkspaceLike;
    const docEntries = await Promise.all(docIds.map(async (docId: string) => ({
      docId,
      title: await readTcHeaderTitle({ docId, signal, workspace: wsForTitle }),
    })));

    let filteredEntries = docEntries.filter(({ title }) => {
      if (!filterQuery)
        return true;
      if (!title)
        return false;
      return isFuzzyMatch(title, filterQuery);
    });

    const removedDocIds: string[] = [];
    if (params.spaceId && params.spaceId > 0 && filteredEntries.length > 0) {
      const hasRoomDoc = filteredEntries.some(item => parseRoomIdFromDocKey(item.docId) !== null);
      if (hasRoomDoc) {
        const roomIds = await getRoomIdsForSpace(params.spaceId, signal);
        if (roomIds && !signal.aborted) {
          filteredEntries = filteredEntries.filter((item) => {
            const roomId = parseRoomIdFromDocKey(item.docId);
            if (roomId === null)
              return true;
            if (roomIds.has(roomId))
              return true;
            removedDocIds.push(item.docId);
            return false;
          });
        }
      }
    }

    if (removedDocIds.length > 0) {
      try {
        if (metaAny?.removeDocMeta) {
          for (const docId of removedDocIds) {
            metaAny.removeDocMeta(docId);
          }
        }
      }
      catch {
        // ignore
      }
    }

    const MAX_DOCS = 6;
    const docItems = filteredEntries.map(({ docId, title }) => {
      const mode = docModeProvider?.getPrimaryMode?.(docId);
      return {
        key: docId,
        name: title,
        icon: mode === "edgeless" ? LinkedEdgelessIcon : LinkedDocIcon,
        action: () => {
          abort();
          const safeTitle = typeof title === "string" ? title : "";
          const wsForInsert = ((editorHost as any)?.std?.workspace ?? workspace) as WorkspaceLike;
          ensureDocExistsInWorkspace(wsForInsert, docId);
          syncMetaTitleFromTcHeader(wsForInsert, docId, safeTitle);
          insertLinkedNodeWithTitle({
            inlineEditor,
            docId,
            title: safeTitle,
          });
          editorHost?.std
            ?.getOptional?.(TelemetryProvider)
            ?.track?.("LinkedDocCreated", {
              control: "linked doc",
              module: "inline @",
              type: "doc",
              other: "existing doc",
            });
        },
      };
    });

    const docGroup = {
      ...docGroupRaw,
      items: (docGroupRaw.items ?? []).map((item: any) => {
        const orig = item?.action;
        return {
          ...item,
          action: () => {
            if (isMentionCommitDeduped()) {
              logMentionMenu("doc action deduped", { key: item?.key, name: item?.name });
              return;
            }
            lockMentionCommitDedup();
            return orig?.();
          },
        };
      }),
    };

    const result: LinkedMenuGroup[] = [];

    // 2. Members menu (triggered by '@' or search)
    let memberGroup: LinkedMenuGroup | null = null;
    if (params.spaceId && params.spaceId > 0) {
      try {
        const resp = await tuanchat.spaceMemberController.getMemberList(params.spaceId);
        const members = (resp.data ?? []).filter(m => m.userId != null);

        const q = query.toLowerCase();
        const filtered = members.filter((m) => {
          const id = String(m.userId);
          // Best effort: cast to any to check for extra fields if backend sends them
          // otherwise fallback to ID.
          const anyM = m as any;
          const name = anyM.displayName || anyM.username || anyM.nickname || id;
          return name.toLowerCase().includes(q) || id.includes(q);
        });

        logMentionMenu("menu request", {
          query,
          locked: isMentionMenuLocked(),
          memberCount: filtered.length,
        });

        if (filtered.length > 0) {
          memberGroup = {
            name: "Members",
            items: filtered.slice(0, 20).map((m) => {
              const id = String(m.userId);
              const anyM = m as any;
              const name = anyM.displayName || anyM.username || anyM.nickname || id;

              return {
                key: `member:${id}`,
                name,
                icon: (m as any).avatar
                  ? html`<img src="${(m as any).avatar}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" />`
                  : html`<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:#eee;border-radius:50%;font-size:12px;">@</div>`,
                action: () => {
                  if (mentionActionLocked || isMentionMenuLocked())
                    return;
                  if (isMentionCommitDeduped()) {
                    logMentionMenu("mention action deduped", { memberId: id, name });
                    return;
                  }
                  lockMentionCommitDedup();

                  logMentionMenu("action picked", { memberId: id, name });

                  const inserted = insertMentionViaInlineEditor({
                    inlineEditor,
                    query,
                    triggerKey: "@",
                    abort,
                    memberId: id,
                  });
                  if (inserted) {
                    mentionActionLocked = true;
                    lockMentionMenu();
                    logMentionMenu("action applied", { memberId: id, name, inserted });
                  }
                  else {
                    logMentionMenu("action blocked", { memberId: id, name, inserted });
                  }
                },
              };
            }),
          };
        }
      }
      catch {
        // ignore network errors
      }
    }
    if (memberGroup)
      result.push(memberGroup);
    if (docGroup.items.length > 0)
      result.push(docGroup);

    return result;
  };

  const quickSearchOverlay = createBlocksuiteQuickSearchService({
    meta: ((workspace as any)?.meta ?? (storeAny as any)?.doc?.workspace?.meta) as any,
  });

  const defaultExtensions = [
    EditorSettingExtension({
      setting$: mockEditorSetting(),
    }),
    ParseDocUrlExtension(mockParseDocUrlService((storeAny as any).doc?.workspace ?? (workspace as any))),
    {
      setup: (di: any) => {
        di.override(DocModeProviderToken, docModeProvider);
        di.override(LinkPreviewServiceIdentifier, noOpLinkPreviewProvider);
      },
    },
    UserServiceExtension(userService),
    QuickSearchExtension({
      openQuickSearch: async () => {
        const picked = await quickSearchOverlay.searchDoc({ action: "insert" });
        if (!picked)
          return null;
        if ("docId" in picked) {
          return { docId: picked.docId };
        }
        return { externalUrl: picked.userInput };
      },
    }),

    // Official Linked Doc widget: use `[` or `[[` to trigger.
    // NOTE: linked-doc widget uses the first triggerKey as the primary key.
    // If primary key isn't '@' and `convertTriggerKey` is false, typing '@' won't open the popover.
    // Align with upstream default: '@' (primary) + '[[/【【' (secondary, auto-convert).
    LinkedWidgetConfigExtension({
      triggerKeys: ["@", "[[", "【【"],
      convertTriggerKey: true,
      getMenus: getDocMenus as any,
    }),
  ];

  // Base on upstream default specs, then add official embed synced-doc support
  const edgelessHeaderExt = EmbedSyncedDocConfigExtension({
    edgelessHeader: ({ model, std }: any) => {
      try {
        const pageId = model.props.pageId;
        const params = model.props.params as any;
        const titleSig = std.get(DocDisplayMetaProvider).title(pageId, { params, referenced: true });

        const onOpen = (e: Event) => {
          e.stopPropagation();
          const provider: any = std.getOptional(RefNodeSlotsProvider as any);
          provider?.docLinkClicked?.next?.({ pageId, host: (std as any).host });
        };
        const onCopy = async (e: Event) => {
          e.stopPropagation();
          try {
            const text = pageId ?? "";
            await (navigator?.clipboard?.writeText?.(String(text)) ?? Promise.resolve());
          }
          catch {}
        };
        const onFold = (e: Event) => {
          e.stopPropagation();
          try {
            // Official logic: toggle by setting preFoldHeight and xywh height
            // headerHeight matches AFFiNE's edgeless header height (48px)
            const headerHeight = 48;
            model.store?.captureSync?.();

            const bound = model.elementBound ?? { x: 0, y: 0, w: 0, h: 0 };
            const { x, y, w, h } = bound as { x: number; y: number; w: number; h: number };
            const scale = model.props?.scale ?? 1;

            if (model.isFolded) {
              const prev = model.props?.preFoldHeight$?.peek?.() ?? model.props?.preFoldHeight ?? 1;
              if (model.props?.xywh$) {
                model.props.xywh$.value = `[${x},${y},${w},${prev}]`;
              }
              else {
                model.xywh = `[${x},${y},${w},${prev}]`;
              }
              if (model.props?.preFoldHeight$) {
                model.props.preFoldHeight$.value = 0;
              }
              else {
                model.props.preFoldHeight = 0;
              }
            }
            else {
              if (model.props?.preFoldHeight$) {
                model.props.preFoldHeight$.value = h;
              }
              else {
                model.props.preFoldHeight = h;
              }
              const newH = headerHeight * scale;
              if (model.props?.xywh$) {
                model.props.xywh$.value = `[${x},${y},${w},${newH}]`;
              }
              else {
                model.xywh = `[${x},${y},${w},${newH}]`;
              }
            }
          }
          catch (err) {
            console.error("Failed to toggle fold state:", err);
          }
        };

        return html`
          <div class="affine-embed-synced-doc-header">
            <button
              data-icon-variant="plain"
              data-icon-size="24"
              data-testid="edgeless-embed-synced-doc-fold-button"
              data-folded="${model.isFolded}"
              @click=${onFold}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none"><path fill="currentColor" d="M13.15 15.132a.757.757 0 0 1-1.3 0L8.602 9.605c-.29-.491.072-1.105.65-1.105h6.497c.577 0 .938.614.65 1.105z"></path></svg>
            </button>

            <span class="affine-embed-synced-doc-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none"><path fill="currentColor" d="M3 2.75A1.75 1.75 0 0 1 4.75 1h6.5A1.75 1.75 0 0 1 13 2.75v10.5A1.75 1.75 0 0 1 11.25 15h-6.5A1.75 1.75 0 0 1 3 13.25zM4.75 2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25z"></path></svg>
            </span>
            <div class="affine-embed-synced-doc-title" data-testid="edgeless-embed-synced-doc-title" data-collapsed="${model.isFolded}">${titleSig}</div>

            <div style="margin-left:auto; display:flex; align-items:center; gap:6px;">
              <button data-size="custom" data-variant="plain" @click=${onOpen}>
                <span>Open</span>
              </button>
              <button data-icon-variant="plain" data-icon-size="24" data-testid="edgeless-embed-synced-doc-info-button" @click=${(e: Event) => e.stopPropagation()}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25M13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-1 2.75a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75" clip-rule="evenodd"></path></svg>
              </button>
              <button data-icon-variant="plain" data-icon-size="24" data-testid="edgeless-embed-synced-doc-copy-link-button" @click=${onCopy}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M18.428 5.572a2.806 2.806 0 0 0-3.967 0l-.978.977a.75.75 0 0 1-1.06-1.06l.977-.978a4.305 4.305 0 1 1 6.089 6.089l-3.556 3.556a4.306 4.306 0 0 1-6.089 0 .75.75 0 0 1 1.061-1.061 2.805 2.805 0 0 0 3.968 0l3.555-3.556a2.806 2.806 0 0 0 0-3.967m-5.333 5.333a2.805 2.805 0 0 0-3.968 0l-3.555 3.556a2.806 2.806 0 0 0 3.967 3.967l.98-.979a.75.75 0 0 1 1.06 1.06l-.979.98A4.305 4.305 0 1 1 4.511 13.4l3.556-3.556a4.306 4.306 0 0 1 6.089 0 .75.75 0 0 1-1.061 1.061" clip-rule="evenodd"></path></svg>
              </button>
            </div>
          </div>
        `;
      }
      catch (e) {
        console.error(e);
        return html``;
      }
    },
  });

  const pageSpecsBase = viewManager.get("page");
  const normalizeExtHint = (v: unknown) => String(v ?? "").trim().toLowerCase();
  const isDocTitleExtension = (ext: any) => {
    if (!ext)
      return false;

    // Prefer identity checks when possible.
    if (ext === DocTitleViewExtension || ext?.constructor === DocTitleViewExtension)
      return true;

    // Some builds may duplicate module instances (e.g. workspace + iframe bundles),
    // so fall back to semantic matching by name/id.
    const name = normalizeExtHint(ext?.name ?? (typeof ext === "function" ? ext.name : ""));
    const id = normalizeExtHint(ext?.id ?? ext?.key ?? ext?.type ?? ext?.displayName);

    if (name === "affine-doc-title-fragment" || id === "affine-doc-title-fragment")
      return true;

    // Final heuristic: match "doc"+"title" but avoid over-broad matches.
    return (name.includes("doc") && name.includes("title")) || (id.includes("doc") && id.includes("title"));
  };
  const pageSpecs = disableDocTitle
    ? pageSpecsBase.filter(ext => !isDocTitleExtension(ext))
    : pageSpecsBase;

  (editor as any).pageSpecs = [
    ...pageSpecs,
    ...defaultExtensions,
  ];
  (editor as any).edgelessSpecs = [
    ...viewManager.get("edgeless"),
    edgelessHeaderExt,
    ...defaultExtensions,
  ];

  try {
    const std = (editor as any).std;
    const refProvider = std?.get?.(RefNodeSlotsProvider);
    refProvider?.docLinkClicked?.subscribe?.(({ pageId: docId }: { pageId: string }) => {
      if (typeof onNavigateToDoc === "function" && params.spaceId && params.spaceId > 0) {
        onNavigateToDoc({ spaceId: params.spaceId, docId });
        return;
      }

      // Fallback: keep previous behavior if no router is wired.
      const target = workspace.getDoc(docId)?.getStore();
      if (!target)
        return;
      (target as any).load?.();
      (editor as any).doc = target;
    });
  }
  catch {
    // best-effort; doc link jumping is not required in embedded usage
  }

  // Inject custom styles to fix layout issues (e.g. Tailwind reset making SVGs block)
  const style = document.createElement("style");
  style.textContent = `
    [data-tc-blocksuite-root] .affine-reference svg {
      display: inline-block;
      vertical-align: sub;
    }
    [data-tc-blocksuite-root] .affine-reference {
      display: inline-flex;
      align-items: center;
      line-height: 24px;
      margin: 0 2px;
    }
  `;
  editor.appendChild(style);

  return editor;
}
