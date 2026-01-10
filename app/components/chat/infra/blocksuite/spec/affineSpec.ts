import type { ExtensionType } from "@blocksuite/store";

import { AttachmentStoreExtension } from "@blocksuite/affine-block-attachment/store";
import { AttachmentViewExtension } from "@blocksuite/affine-block-attachment/view";
import { BookmarkStoreExtension } from "@blocksuite/affine-block-bookmark/store";
import { BookmarkViewExtension } from "@blocksuite/affine-block-bookmark/view";
import { DataViewStoreExtension } from "@blocksuite/affine-block-data-view/store";
import { DataViewViewExtension } from "@blocksuite/affine-block-data-view/view";
import { DatabaseStoreExtension } from "@blocksuite/affine-block-database/store";
import { DatabaseViewExtension } from "@blocksuite/affine-block-database/view";
import { EdgelessTextStoreExtension } from "@blocksuite/affine-block-edgeless-text/store";
import { EdgelessTextViewExtension } from "@blocksuite/affine-block-edgeless-text/view";
import {
  EmbedSyncedDocConfigExtension,
  EmbedSyncedDocViewExtensions,
} from "@blocksuite/affine-block-embed-doc";
import { EmbedDocStoreExtension } from "@blocksuite/affine-block-embed-doc/store";
import { EmbedStoreExtension } from "@blocksuite/affine-block-embed/store";
import { EmbedViewExtension } from "@blocksuite/affine-block-embed/view";
import { FrameStoreExtension } from "@blocksuite/affine-block-frame/store";
import { FrameViewExtension } from "@blocksuite/affine-block-frame/view";
import { ImageStoreExtension } from "@blocksuite/affine-block-image/store";
import { ImageViewExtension } from "@blocksuite/affine-block-image/view";
import { ListStoreExtension } from "@blocksuite/affine-block-list/store";
import { ListViewExtension } from "@blocksuite/affine-block-list/view";
import { NoteStoreExtension } from "@blocksuite/affine-block-note/store";
import { NoteViewExtension } from "@blocksuite/affine-block-note/view";
import { ParagraphStoreExtension } from "@blocksuite/affine-block-paragraph/store";
import { ParagraphViewExtension } from "@blocksuite/affine-block-paragraph/view";
import { RootStoreExtension } from "@blocksuite/affine-block-root/store";
import { RootViewExtension } from "@blocksuite/affine-block-root/view";
import { SurfaceRefStoreExtension } from "@blocksuite/affine-block-surface-ref/store";
import { SurfaceRefViewExtension } from "@blocksuite/affine-block-surface-ref/view";
import { SurfaceStoreExtension } from "@blocksuite/affine-block-surface/store";
import { SurfaceViewExtension } from "@blocksuite/affine-block-surface/view";
import { TableStoreExtension } from "@blocksuite/affine-block-table/store";
import { TableViewExtension } from "@blocksuite/affine-block-table/view";
import { StoreExtensionManager, ViewExtensionManager } from "@blocksuite/affine-ext-loader";
import { DocTitleViewExtension } from "@blocksuite/affine-fragment-doc-title/view";
import { ConnectorStoreExtension } from "@blocksuite/affine-gfx-connector/store";
import { ConnectorViewExtension } from "@blocksuite/affine-gfx-connector/view";
import { FootnoteStoreExtension } from "@blocksuite/affine-inline-footnote/store";
import { FootnoteViewExtension } from "@blocksuite/affine-inline-footnote/view";
import { LatexStoreExtension } from "@blocksuite/affine-inline-latex/store";
import { LatexViewExtension } from "@blocksuite/affine-inline-latex/view";
import { LinkStoreExtension } from "@blocksuite/affine-inline-link/store";
import { LinkViewExtension } from "@blocksuite/affine-inline-link/view";
import { MentionViewExtension } from "@blocksuite/affine-inline-mention/view";
import { InlinePresetStoreExtension } from "@blocksuite/affine-inline-preset/store";
import { InlinePresetViewExtension } from "@blocksuite/affine-inline-preset/view";
import { RefNodeSlotsProvider } from "@blocksuite/affine-inline-reference";
import { ReferenceStoreExtension } from "@blocksuite/affine-inline-reference/store";
import { ReferenceViewExtension } from "@blocksuite/affine-inline-reference/view";
import { ImageProxyService } from "@blocksuite/affine-shared/adapters";
import {
  CitationService,
  CommunityCanvasTextFonts,
  DocDisplayMetaProvider,
  DocModeService,
  EditPropsStore,
  EmbedOptionService,
  FeatureFlagService,
  FontConfigExtension,
  FontLoaderService,
  LinkPreviewCache,
  LinkPreviewService,
  NotificationExtension,
  PageViewportServiceExtension,
  ThemeService,
  ToolbarRegistryExtension,
} from "@blocksuite/affine-shared/services";
import { EdgelessToolbarViewExtension } from "@blocksuite/affine-widget-edgeless-toolbar/view";
import { EdgelessZoomToolbarViewExtension } from "@blocksuite/affine-widget-edgeless-zoom-toolbar/view";
import { LinkedDocViewExtension } from "@blocksuite/affine-widget-linked-doc/view";
import { SlashMenuViewExtension } from "@blocksuite/affine-widget-slash-menu/view";
import { ToolbarViewExtension } from "@blocksuite/affine-widget-toolbar/view";
import { ViewportOverlayViewExtension } from "@blocksuite/affine-widget-viewport-overlay/view";
import { ToolController } from "@blocksuite/std/gfx";
import { html } from "lit";

// 说明：之前我们只注册了少量 block/inline 的 view extensions。
// 这会缺失 AFFiNE 的关键 widgets/fragments（例如 DocTitle/SlashMenu/Toolbar），导致：
// - “没有标题”（DocTitle fragment 未注册）
// - “输入 / 没有 command panel”（SlashMenu widget 未注册）
// - “无法切换 edgeless”（Toolbar/edgeless widgets 未注册）
// 这里补齐必要的 widget/fragment，但仍保持“可控的最小集合”。

const storeManager = new StoreExtensionManager([
  RootStoreExtension,
  NoteStoreExtension,
  ParagraphStoreExtension,
  // `affine:list`（bulleted/numbered list）
  ListStoreExtension,
  SurfaceStoreExtension,
  // `affine:edgeless-text`（edgeless 画布上的文本）
  EdgelessTextStoreExtension,
  // `affine:frame`（edgeless 的 Frame）
  FrameStoreExtension,
  // `affine:surface-ref`（edgeless 的 Surface Reference）
  SurfaceRefStoreExtension,
  // `affine:table`（slash menu 的 Table）
  TableStoreExtension,
  // `affine:database`/`affine:data-view`（slash menu 的 Database/Kanban 等）
  DatabaseStoreExtension,
  DataViewStoreExtension,
  // Attachment / Bookmark / Embed（含 GitHub embed）
  AttachmentStoreExtension,
  BookmarkStoreExtension,
  EmbedStoreExtension,
  EmbedDocStoreExtension,
  // Image block（clipboard/snapshot 会用到 affine:image）
  ImageStoreExtension,
  InlinePresetStoreExtension,
  LatexStoreExtension,
  ReferenceStoreExtension,
  LinkStoreExtension,
  FootnoteStoreExtension,
  // Edgeless connector tool (arrow/line connector)
  ConnectorStoreExtension,
]);

const viewManager = new ViewExtensionManager([
  // Block
  RootViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  ListViewExtension,
  SurfaceViewExtension,
  EdgelessTextViewExtension,
  FrameViewExtension,
  SurfaceRefViewExtension,
  TableViewExtension,
  DatabaseViewExtension,
  DataViewViewExtension,
  AttachmentViewExtension,
  BookmarkViewExtension,
  EmbedViewExtension,
  ImageViewExtension,

  // Inline
  InlinePresetViewExtension,
  LatexViewExtension,
  ReferenceViewExtension,
  LinkViewExtension,
  FootnoteViewExtension,
  MentionViewExtension,

  // Widget/Fragment（提供标题、/ 菜单、工具栏、edgeless 切换等）
  ToolbarViewExtension,
  EdgelessToolbarViewExtension,
  EdgelessZoomToolbarViewExtension,
  SlashMenuViewExtension,
  LinkedDocViewExtension,
  ViewportOverlayViewExtension,
  DocTitleViewExtension,

  // Edgeless connector tool (arrow/line connector)
  ConnectorViewExtension,
]);

export const AFFINE_STORE_EXTENSIONS: ExtensionType[] = (storeManager.get("store") as ExtensionType[]).concat([
  FeatureFlagService,

  // Link preview & image proxy (used by bookmark/embed cards)
  LinkPreviewCache,
  LinkPreviewService,
  ImageProxyService,
]);
export const AFFINE_PAGE_STD_EXTENSIONS: ExtensionType[] = (viewManager.get("page") as ExtensionType[]).concat([
  DocModeService,
  CitationService,
  EmbedOptionService,
  NotificationExtension({
    toast: () => {},
    confirm: async () => false,
    prompt: async () => null,
    notify: () => {},
  }),
  PageViewportServiceExtension,
  ThemeService,
  ToolbarRegistryExtension,
  ToolController,
  EditPropsStore,
  FontLoaderService,
  FontConfigExtension(CommunityCanvasTextFonts),
  // 注册 synced-doc 视图扩展（页面模式）
  ...EmbedSyncedDocViewExtensions,
]);
export const AFFINE_EDGELESS_STD_EXTENSIONS: ExtensionType[] = (viewManager.get("edgeless") as ExtensionType[]).concat([
  DocModeService,
  CitationService,
  EmbedOptionService,
  NotificationExtension({
    toast: () => {},
    confirm: async () => false,
    prompt: async () => null,
    notify: () => {},
  }),
  PageViewportServiceExtension,
  ThemeService,
  ToolbarRegistryExtension,
  ToolController,
  EditPropsStore,
  FontLoaderService,
  FontConfigExtension(CommunityCanvasTextFonts),
  // 注册 synced-doc 视图扩展（白板模式）
  ...EmbedSyncedDocViewExtensions,
  // 官方 edgeless 头部（折叠/标题/打开/复制链接等），通过 Config 扩展注入
  EmbedSyncedDocConfigExtension({
    edgelessHeader: ({ model, std }) => {
      try {
        const pageId = model.props.pageId;
        const params = model.props.params as unknown as { [key: string]: unknown } | undefined;
        const titleSig = std.get(DocDisplayMetaProvider).title(pageId, { params, referenced: true });

        const onOpen = (e: Event) => {
          e.stopPropagation();
          const provider = std.getOptional(RefNodeSlotsProvider) as any;
          provider?.docLinkClicked?.next?.({ pageId, host: (std as any).host });
        };
        const onCopy = async (e: Event) => {
          e.stopPropagation();
          try {
            const text = pageId ?? "";
            await (navigator?.clipboard?.writeText?.(String(text)) ?? Promise.resolve());
          }
          catch {
            // no-op
          }
        };
        const onFold = (e: Event) => {
          e.stopPropagation();
          try {
            // Official logic: use preFoldHeight + xywh to fold/unfold
            const headerHeight = 48;
            (model.store as any)?.captureSync?.();

            const bound = (model as any).elementBound ?? { x: 0, y: 0, w: 0, h: 0 };
            const { x, y, w, h } = bound as { x: number; y: number; w: number; h: number };
            const scale = (model.props as any)?.scale ?? 1;

            if (model.isFolded) {
              const prev = (model.props as any)?.preFoldHeight$?.peek?.() ?? (model.props as any)?.preFoldHeight ?? 1;
              if ((model.props as any)?.xywh$) {
                (model.props as any).xywh$.value = `[${x},${y},${w},${prev}]`;
              }
              else {
                (model as any).xywh = `[${x},${y},${w},${prev}]`;
              }
              if ((model.props as any)?.preFoldHeight$) {
                (model.props as any).preFoldHeight$.value = 0;
              }
              else {
                (model.props as any).preFoldHeight = 0;
              }
            }
            else {
              if ((model.props as any)?.preFoldHeight$) {
                (model.props as any).preFoldHeight$.value = h;
              }
              else {
                (model.props as any).preFoldHeight = h;
              }
              const newH = headerHeight * scale;
              if ((model.props as any)?.xywh$) {
                (model.props as any).xywh$.value = `[${x},${y},${w},${newH}]`;
              }
              else {
                (model as any).xywh = `[${x},${y},${w},${newH}]`;
              }
            }
          }
          catch (err) {
            console.error("Failed to toggle fold state:", err);
          }
        };

        return html`
          <div class="affine-embed-synced-doc-edgeless-header" style="display:flex;align-items:center;gap:8px;">
            <button data-icon-variant="plain" data-icon-size="24" data-testid="edgeless-embed-synced-doc-fold-button" data-folded="${model.isFolded}" style="width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;" @click=${onFold}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none"><path fill="currentColor" d="M13.15 15.132a.757.757 0 0 1-1.3 0L8.602 9.605c-.29-.491.072-1.105.65-1.105h6.497c.577 0 .938.614.65 1.105z"></path></svg>
            </button>
            <div data-collapsed="${model.isFolded}" data-testid="edgeless-embed-synced-doc-title" style="display:flex;align-items:center;gap:6px;min-width:0;">
              <span style="display:inline-flex;width:16px;height:16px;"></span>
              <span style="font-weight:600;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">${titleSig}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-left:auto;">
              <button data-size="custom" data-variant="plain" style="display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 6px;" @click=${onOpen}>
                <span>Open</span>
              </button>
              <button data-icon-variant="plain" data-icon-size="24" data-testid="edgeless-embed-synced-doc-info-button" style="width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;" @click=${(e: Event) => e.stopPropagation()}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25M13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-1 2.75a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75" clip-rule="evenodd"></path></svg>
              </button>
              <button data-icon-variant="plain" data-icon-size="24" data-testid="edgeless-embed-synced-doc-copy-link-button" style="width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;" @click=${onCopy}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M18.428 5.572a2.806 2.806 0 0 0-3.967 0l-.978.977a.75.75 0 0 1-1.06-1.06l.977-.978a4.305 4.305 0 1 1 6.089 6.089l-3.556 3.556a4.306 4.306 0 0 1-6.089 0 .75.75 0 0 1 1.061-1.061 2.805 2.805 0 0 0 3.968 0l3.555-3.556a2.806 2.806 0 0 0 0-3.967m-5.333 5.333a2.805 2.805 0 0 0-3.968 0l-3.555 3.556a2.806 2.806 0 0 0 3.967 3.967l.98-.979a.75.75 0 0 1 1.06 1.06l-.979.98A4.305 4.305 0 1 1 4.511 13.4l3.556-3.556a4.306 4.306 0 0 1 6.089 0 .75.75 0 0 1-1.061 1.061" clip-rule="evenodd"></path></svg>
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
  }),
]);
