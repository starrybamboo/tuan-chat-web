import type { ExtensionType } from "@blocksuite/store";

import { ImageProxyService } from "@blocksuite/affine-shared/adapters";
import {
  FeatureFlagService,
  LinkPreviewCache,
  LinkPreviewService,
} from "@blocksuite/affine-shared/services";
import { AttachmentStoreExtension } from "@blocksuite/affine/blocks/attachment/store";
import { BookmarkStoreExtension } from "@blocksuite/affine/blocks/bookmark/store";
import { DataViewStoreExtension } from "@blocksuite/affine/blocks/data-view/store";
import { DatabaseStoreExtension } from "@blocksuite/affine/blocks/database/store";
import { EdgelessTextStoreExtension } from "@blocksuite/affine/blocks/edgeless-text/store";
import { EmbedDocStoreExtension } from "@blocksuite/affine/blocks/embed-doc/store";
import { EmbedStoreExtension } from "@blocksuite/affine/blocks/embed/store";
import { FrameStoreExtension } from "@blocksuite/affine/blocks/frame/store";
import { ImageStoreExtension } from "@blocksuite/affine/blocks/image/store";
import { LatexStoreExtension as BlockLatexStoreExtension } from "@blocksuite/affine/blocks/latex/store";
import { ListStoreExtension } from "@blocksuite/affine/blocks/list/store";
import { NoteStoreExtension } from "@blocksuite/affine/blocks/note/store";
import { ParagraphStoreExtension } from "@blocksuite/affine/blocks/paragraph/store";
import { RootStoreExtension } from "@blocksuite/affine/blocks/root/store";
import { SurfaceRefStoreExtension } from "@blocksuite/affine/blocks/surface-ref/store";
import { SurfaceStoreExtension } from "@blocksuite/affine/blocks/surface/store";
import { TableStoreExtension } from "@blocksuite/affine/blocks/table/store";
import { StoreExtensionManager } from "@blocksuite/affine/ext-loader";
import { ConnectorStoreExtension } from "@blocksuite/affine/gfx/connector/store";
import { FootnoteStoreExtension } from "@blocksuite/affine/inlines/footnote/store";
import { LatexStoreExtension as InlineLatexStoreExtension } from "@blocksuite/affine/inlines/latex/store";
import { LinkStoreExtension } from "@blocksuite/affine/inlines/link/store";
import { InlinePresetStoreExtension } from "@blocksuite/affine/inlines/preset/store";
import { ReferenceStoreExtension } from "@blocksuite/affine/inlines/reference/store";

import { RoomMapEmbedIframeConfigExtension } from "./roomMapEmbedConfig";

// 注意：这个文件必须保持「无 DOM 依赖」，不要 import `lit` / `lit-html`。
// React Router dev + Vite 在开发时可能会用 SSR 模式评估模块，
// 任何顶层引入的 DOM 依赖都会导致 `document is not defined`。

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
  // Equation block（slash menu 的 Equation）
  BlockLatexStoreExtension,
  InlinePresetStoreExtension,
  // Inline equation（行内公式）
  InlineLatexStoreExtension,
  ReferenceStoreExtension,
  LinkStoreExtension,
  FootnoteStoreExtension,
  // Edgeless connector tool (arrow/line connector)
  ConnectorStoreExtension,
]);

export const AFFINE_STORE_EXTENSIONS: ExtensionType[] = (storeManager.get("store") as ExtensionType[]).concat([
  FeatureFlagService,

  // Link preview & image proxy (used by bookmark/embed cards)
  LinkPreviewCache,
  LinkPreviewService,
  ImageProxyService,

  // 允许嵌入房间地图 iframe
  RoomMapEmbedIframeConfigExtension,
]);
