import type { ExtensionType } from "@blocksuite/store";

import { NoteStoreExtension } from "@blocksuite/affine-block-note/store";
import { NoteViewExtension } from "@blocksuite/affine-block-note/view";
import { ParagraphStoreExtension } from "@blocksuite/affine-block-paragraph/store";
import { ParagraphViewExtension } from "@blocksuite/affine-block-paragraph/view";
import { RootStoreExtension } from "@blocksuite/affine-block-root/store";
import { RootViewExtension } from "@blocksuite/affine-block-root/view";
import { SurfaceStoreExtension } from "@blocksuite/affine-block-surface/store";
import { SurfaceViewExtension } from "@blocksuite/affine-block-surface/view";
import { StoreExtensionManager, ViewExtensionManager } from "@blocksuite/affine-ext-loader";
import { DocTitleViewExtension } from "@blocksuite/affine-fragment-doc-title/view";
import { FootnoteStoreExtension } from "@blocksuite/affine-inline-footnote/store";
import { FootnoteViewExtension } from "@blocksuite/affine-inline-footnote/view";
import { LatexStoreExtension } from "@blocksuite/affine-inline-latex/store";
import { LatexViewExtension } from "@blocksuite/affine-inline-latex/view";
import { LinkStoreExtension } from "@blocksuite/affine-inline-link/store";
import { LinkViewExtension } from "@blocksuite/affine-inline-link/view";
import { MentionViewExtension } from "@blocksuite/affine-inline-mention/view";
import { InlinePresetStoreExtension } from "@blocksuite/affine-inline-preset/store";
import { InlinePresetViewExtension } from "@blocksuite/affine-inline-preset/view";
import { ReferenceStoreExtension } from "@blocksuite/affine-inline-reference/store";
import { ReferenceViewExtension } from "@blocksuite/affine-inline-reference/view";
import {
  CommunityCanvasTextFonts,
  DocModeService,
  EditPropsStore,
  FeatureFlagService,
  FontConfigExtension,
  FontLoaderService,
  PageViewportServiceExtension,
  ThemeService,
  ToolbarRegistryExtension,
} from "@blocksuite/affine-shared/services";
import { EdgelessToolbarViewExtension } from "@blocksuite/affine-widget-edgeless-toolbar/view";
import { EdgelessZoomToolbarViewExtension } from "@blocksuite/affine-widget-edgeless-zoom-toolbar/view";
import { SlashMenuViewExtension } from "@blocksuite/affine-widget-slash-menu/view";
import { ToolbarViewExtension } from "@blocksuite/affine-widget-toolbar/view";
import { ViewportOverlayViewExtension } from "@blocksuite/affine-widget-viewport-overlay/view";
import { ToolController } from "@blocksuite/std/gfx";

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
  SurfaceStoreExtension,
  InlinePresetStoreExtension,
  LatexStoreExtension,
  ReferenceStoreExtension,
  LinkStoreExtension,
  FootnoteStoreExtension,
]);

const viewManager = new ViewExtensionManager([
  // Block
  RootViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  SurfaceViewExtension,

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
  ViewportOverlayViewExtension,
  DocTitleViewExtension,
]);

export const AFFINE_STORE_EXTENSIONS: ExtensionType[] = (storeManager.get("store") as ExtensionType[]).concat([
  FeatureFlagService,
]);
export const AFFINE_PAGE_STD_EXTENSIONS: ExtensionType[] = (viewManager.get("page") as ExtensionType[]).concat([
  DocModeService,
  PageViewportServiceExtension,
  ThemeService,
  ToolbarRegistryExtension,
  ToolController,
  EditPropsStore,
  FontLoaderService,
  FontConfigExtension(CommunityCanvasTextFonts),
]);
export const AFFINE_EDGELESS_STD_EXTENSIONS: ExtensionType[] = (viewManager.get("edgeless") as ExtensionType[]).concat([
  DocModeService,
  PageViewportServiceExtension,
  ThemeService,
  ToolbarRegistryExtension,
  ToolController,
  EditPropsStore,
  FontLoaderService,
  FontConfigExtension(CommunityCanvasTextFonts),
]);
