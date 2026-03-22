import type { SlashMenuItem } from "@blocksuite/affine/widgets/slash-menu";
import type { ExtensionType } from "@blocksuite/store";

import { EdgelessSelectedRectViewExtension } from "@blocksuite/affine-widget-edgeless-selected-rect/view";
import { EdgelessZoomToolbarViewExtension } from "@blocksuite/affine-widget-edgeless-zoom-toolbar/view";
import { NoteSlicerViewExtension } from "@blocksuite/affine-widget-note-slicer/view";
import { AttachmentViewExtension } from "@blocksuite/affine/blocks/attachment/view";
import { BookmarkViewExtension } from "@blocksuite/affine/blocks/bookmark/view";
import { CodeBlockViewExtension } from "@blocksuite/affine/blocks/code/view";
import { DataViewViewExtension } from "@blocksuite/affine/blocks/data-view/view";
import { DatabaseViewExtension } from "@blocksuite/affine/blocks/database/view";
import { DividerViewExtension } from "@blocksuite/affine/blocks/divider/view";
import { EdgelessTextViewExtension } from "@blocksuite/affine/blocks/edgeless-text/view";
import { EmbedDocViewExtension } from "@blocksuite/affine/blocks/embed-doc/view";
import { EmbedViewExtension } from "@blocksuite/affine/blocks/embed/view";
import { FrameViewExtension } from "@blocksuite/affine/blocks/frame/view";
import { ImageViewExtension } from "@blocksuite/affine/blocks/image/view";
import { LatexViewExtension as BlockLatexViewExtension } from "@blocksuite/affine/blocks/latex/view";
import { ListViewExtension } from "@blocksuite/affine/blocks/list/view";
import { NoteViewExtension } from "@blocksuite/affine/blocks/note/view";
import { ParagraphViewExtension } from "@blocksuite/affine/blocks/paragraph/view";
import { RootViewExtension } from "@blocksuite/affine/blocks/root/view";
import { SurfaceRefViewExtension } from "@blocksuite/affine/blocks/surface-ref/view";
import { SurfaceViewExtension } from "@blocksuite/affine/blocks/surface/view";
import { TableViewExtension } from "@blocksuite/affine/blocks/table/view";
import { ViewExtensionManager, ViewExtensionProvider } from "@blocksuite/affine/ext-loader";
import { FoundationViewExtension } from "@blocksuite/affine/foundation/view";
import { DocTitleViewExtension } from "@blocksuite/affine/fragments/doc-title/view";
import { ConnectorViewExtension } from "@blocksuite/affine/gfx/connector/view";
import { NoteViewExtension as GfxNoteViewExtension } from "@blocksuite/affine/gfx/note/view";
import { PointerViewExtension } from "@blocksuite/affine/gfx/pointer/view";
import { FootnoteViewExtension } from "@blocksuite/affine/inlines/footnote/view";
import { LatexViewExtension as InlineLatexViewExtension } from "@blocksuite/affine/inlines/latex/view";
import { LinkViewExtension } from "@blocksuite/affine/inlines/link/view";
import { MentionViewExtension } from "@blocksuite/affine/inlines/mention/view";
import { InlinePresetViewExtension } from "@blocksuite/affine/inlines/preset/view";
import { ReferenceViewExtension } from "@blocksuite/affine/inlines/reference/view";
import { DragHandleViewExtension } from "@blocksuite/affine/widgets/drag-handle/view";
import { EdgelessAutoConnectViewExtension } from "@blocksuite/affine/widgets/edgeless-auto-connect/view";
import { EdgelessDraggingAreaViewExtension } from "@blocksuite/affine/widgets/edgeless-dragging-area/view";
import { EdgelessToolbarViewExtension } from "@blocksuite/affine/widgets/edgeless-toolbar/view";
import { FrameTitleViewExtension } from "@blocksuite/affine/widgets/frame-title/view";
import { KeyboardToolbarViewExtension } from "@blocksuite/affine/widgets/keyboard-toolbar/view";
import { LinkedDocViewExtension } from "@blocksuite/affine/widgets/linked-doc/view";
import { PageDraggingAreaViewExtension } from "@blocksuite/affine/widgets/page-dragging-area/view";
import { RemoteSelectionViewExtension } from "@blocksuite/affine/widgets/remote-selection/view";
import { ScrollAnchoringViewExtension } from "@blocksuite/affine/widgets/scroll-anchoring/view";
import { AFFINE_SLASH_MENU_WIDGET } from "@blocksuite/affine/widgets/slash-menu";
import { SlashMenuViewExtension } from "@blocksuite/affine/widgets/slash-menu/view";
import { ToolbarViewExtension } from "@blocksuite/affine/widgets/toolbar/view";
import { ViewportOverlayViewExtension } from "@blocksuite/affine/widgets/viewport-overlay/view";

import type { SupportedBlocksuiteFeature } from "./featureSet";

import {
  FILTERED_SURFACE_REF_SLASH_ITEM_NAMES,
  FILTERED_SURFACE_REF_SLASH_ITEM_PREFIXES,
  SUPPORTED_BLOCKSUITE_FEATURES,

} from "./featureSet";

/**
 * 把 featureSet 映射到 page / edgeless 两套 view specs。
 *
 * 这一层决定“哪些 UI 能出现”，例如 slash menu、toolbar、linked-doc、mention。
 * 它与 store.ts 的关系是：同一份 supported subset 同时约束数据层与视图层。
 */
type ViewProviderClass = new (...args: any[]) => ViewExtensionProvider;

const FILTERED_SURFACE_REF_SLASH_ITEM_NAME_SET = new Set<string>(FILTERED_SURFACE_REF_SLASH_ITEM_NAMES);

function shouldHideUnsupportedSlashItem(item: SlashMenuItem): boolean {
  const name = String(item?.name ?? "");
  if (!name)
    return false;

  if (FILTERED_SURFACE_REF_SLASH_ITEM_NAME_SET.has(name))
    return true;

  return FILTERED_SURFACE_REF_SLASH_ITEM_PREFIXES.some(prefix => name.startsWith(prefix));
}

class SupportedSlashMenuFilterViewExtension extends ViewExtensionProvider {
  override name = "tc-blocksuite-supported-slash-menu-filter";

  override effect(): void {
    super.effect();

    if (typeof customElements === "undefined")
      return;

    const slashMenuCtor = customElements.get(AFFINE_SLASH_MENU_WIDGET) as
      | undefined
      | { prototype?: { configItemTransform?: (item: SlashMenuItem) => SlashMenuItem; __tc_supportedSubsetPatched?: boolean } };

    const prototype = slashMenuCtor?.prototype;
    if (!prototype || prototype.__tc_supportedSubsetPatched)
      return;

    const prevTransform = typeof prototype.configItemTransform === "function"
      ? prototype.configItemTransform
      : (item: SlashMenuItem) => item;

    // surface-ref 默认会把 mindmap/group 等入口重新带回 slash menu；
    // 这里做最后一道 UI 过滤，避免暴露未支持能力。
    prototype.configItemTransform = function (item: SlashMenuItem) {
      const transformed = prevTransform.call(this, item);
      if (!shouldHideUnsupportedSlashItem(transformed))
        return transformed;

      return {
        ...transformed,
        when: () => false,
      };
    };
    prototype.__tc_supportedSubsetPatched = true;
  }
}

const VIEW_EXTENSION_PROVIDERS: Partial<Record<SupportedBlocksuiteFeature, ViewProviderClass>> = {
  "foundation": FoundationViewExtension,
  "root": RootViewExtension,
  "note": NoteViewExtension,
  "paragraph": ParagraphViewExtension,
  "list": ListViewExtension,
  "surface": SurfaceViewExtension,
  "edgeless-text": EdgelessTextViewExtension,
  "frame": FrameViewExtension,
  "surface-ref": SurfaceRefViewExtension,
  "table": TableViewExtension,
  "database": DatabaseViewExtension,
  "data-view": DataViewViewExtension,
  "attachment": AttachmentViewExtension,
  "bookmark": BookmarkViewExtension,
  "code": CodeBlockViewExtension,
  "divider": DividerViewExtension,
  "embed": EmbedViewExtension,
  "embed-doc": EmbedDocViewExtension,
  "image": ImageViewExtension,
  "block-latex": BlockLatexViewExtension,
  "inline-preset": InlinePresetViewExtension,
  "inline-latex": InlineLatexViewExtension,
  "reference": ReferenceViewExtension,
  "link": LinkViewExtension,
  "footnote": FootnoteViewExtension,
  "connector": ConnectorViewExtension,
  "pointer": PointerViewExtension,
  "gfx-note": GfxNoteViewExtension,
  "doc-title": DocTitleViewExtension,
  "mention": MentionViewExtension,
  "drag-handle": DragHandleViewExtension,
  "edgeless-auto-connect": EdgelessAutoConnectViewExtension,
  "frame-title": FrameTitleViewExtension,
  "keyboard-toolbar": KeyboardToolbarViewExtension,
  "linked-doc": LinkedDocViewExtension,
  "remote-selection": RemoteSelectionViewExtension,
  "scroll-anchoring": ScrollAnchoringViewExtension,
  "slash-menu": SlashMenuViewExtension,
  "toolbar": ToolbarViewExtension,
  "viewport-overlay": ViewportOverlayViewExtension,
  "edgeless-zoom-toolbar": EdgelessZoomToolbarViewExtension,
  "page-dragging-area": PageDraggingAreaViewExtension,
  "edgeless-selected-rect": EdgelessSelectedRectViewExtension,
  "edgeless-dragging-area": EdgelessDraggingAreaViewExtension,
  "note-slicer": NoteSlicerViewExtension,
  "edgeless-toolbar": EdgelessToolbarViewExtension,
};

function getSupportedViewProviders(): ViewProviderClass[] {
  const providers = SUPPORTED_BLOCKSUITE_FEATURES.flatMap((feature) => {
    const provider = VIEW_EXTENSION_PROVIDERS[feature];
    return provider ? [provider] : [];
  });

  return providers.concat(SupportedSlashMenuFilterViewExtension);
}

export function createBlocksuiteViewManager() {
  return new ViewExtensionManager(getSupportedViewProviders());
}

const blocksuiteViewManager = createBlocksuiteViewManager();

export function getBlocksuiteViewManager() {
  return blocksuiteViewManager;
}

export function getPageSpecs(): ExtensionType[] {
  return blocksuiteViewManager.get("page") as ExtensionType[];
}

export function getEdgelessSpecs(): ExtensionType[] {
  return blocksuiteViewManager.get("edgeless") as ExtensionType[];
}
