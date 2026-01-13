import type { ExtensionType } from "@blocksuite/store";

import { AttachmentStoreExtension } from "@blocksuite/affine-block-attachment/store";
import { BookmarkStoreExtension } from "@blocksuite/affine-block-bookmark/store";
import { DataViewStoreExtension } from "@blocksuite/affine-block-data-view/store";
import { DatabaseStoreExtension } from "@blocksuite/affine-block-database/store";
import { EdgelessTextStoreExtension } from "@blocksuite/affine-block-edgeless-text/store";
import { EmbedDocStoreExtension } from "@blocksuite/affine-block-embed-doc/store";
import { EmbedStoreExtension } from "@blocksuite/affine-block-embed/store";
import { FrameStoreExtension } from "@blocksuite/affine-block-frame/store";
import { ImageStoreExtension } from "@blocksuite/affine-block-image/store";
import { ListStoreExtension } from "@blocksuite/affine-block-list/store";
import { NoteStoreExtension } from "@blocksuite/affine-block-note/store";
import { ParagraphStoreExtension } from "@blocksuite/affine-block-paragraph/store";
import { RootStoreExtension } from "@blocksuite/affine-block-root/store";
import { SurfaceRefStoreExtension } from "@blocksuite/affine-block-surface-ref/store";
import { SurfaceStoreExtension } from "@blocksuite/affine-block-surface/store";
import { TableStoreExtension } from "@blocksuite/affine-block-table/store";
import { StoreExtensionManager } from "@blocksuite/affine-ext-loader";
import { ConnectorStoreExtension } from "@blocksuite/affine-gfx-connector/store";
import { FootnoteStoreExtension } from "@blocksuite/affine-inline-footnote/store";
import { LatexStoreExtension } from "@blocksuite/affine-inline-latex/store";
import { LinkStoreExtension } from "@blocksuite/affine-inline-link/store";
import { InlinePresetStoreExtension } from "@blocksuite/affine-inline-preset/store";
import { ReferenceStoreExtension } from "@blocksuite/affine-inline-reference/store";
import { ImageProxyService } from "@blocksuite/affine-shared/adapters";
import {
  FeatureFlagService,
  LinkPreviewCache,
  LinkPreviewService,
} from "@blocksuite/affine-shared/services";

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
  InlinePresetStoreExtension,
  LatexStoreExtension,
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
]);
