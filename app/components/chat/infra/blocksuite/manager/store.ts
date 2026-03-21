import type { StoreExtensionProvider } from "@blocksuite/affine/ext-loader";
import type { ExtensionType } from "@blocksuite/store";

import { LinkPreviewCache, LinkPreviewService } from "@blocksuite/affine-shared/services";
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
import { FoundationStoreExtension } from "@blocksuite/affine/foundation/store";
import { ConnectorStoreExtension } from "@blocksuite/affine/gfx/connector/store";
import { FootnoteStoreExtension } from "@blocksuite/affine/inlines/footnote/store";
import { LatexStoreExtension as InlineLatexStoreExtension } from "@blocksuite/affine/inlines/latex/store";
import { LinkStoreExtension } from "@blocksuite/affine/inlines/link/store";
import { InlinePresetStoreExtension } from "@blocksuite/affine/inlines/preset/store";
import { ReferenceStoreExtension } from "@blocksuite/affine/inlines/reference/store";

import type { SupportedBlocksuiteFeature } from "./featureSet";

import { RoomMapEmbedIframeConfigExtension } from "../spec/roomMapEmbedConfig";
import { SUPPORTED_BLOCKSUITE_FEATURES } from "./featureSet";

/**
 * 把 featureSet 映射到 BlockSuite store/schema 侧扩展。
 *
 * 这里决定“数据层认识哪些 block / inline / service”，
 * 因此必须与 view.ts 共享同一份 supported subset。
 */
type StoreProviderClass = new (...args: any[]) => StoreExtensionProvider;

const STORE_EXTENSION_PROVIDERS: Partial<Record<SupportedBlocksuiteFeature, StoreProviderClass>> = {
  "foundation": FoundationStoreExtension,
  "root": RootStoreExtension,
  "note": NoteStoreExtension,
  "paragraph": ParagraphStoreExtension,
  "list": ListStoreExtension,
  "surface": SurfaceStoreExtension,
  "edgeless-text": EdgelessTextStoreExtension,
  "frame": FrameStoreExtension,
  "surface-ref": SurfaceRefStoreExtension,
  "table": TableStoreExtension,
  "database": DatabaseStoreExtension,
  "data-view": DataViewStoreExtension,
  "attachment": AttachmentStoreExtension,
  "bookmark": BookmarkStoreExtension,
  "embed": EmbedStoreExtension,
  "embed-doc": EmbedDocStoreExtension,
  "image": ImageStoreExtension,
  "block-latex": BlockLatexStoreExtension,
  "inline-preset": InlinePresetStoreExtension,
  "inline-latex": InlineLatexStoreExtension,
  "reference": ReferenceStoreExtension,
  "link": LinkStoreExtension,
  "footnote": FootnoteStoreExtension,
  "connector": ConnectorStoreExtension,
};

function getSupportedStoreProviders(): StoreProviderClass[] {
  return SUPPORTED_BLOCKSUITE_FEATURES.flatMap((feature) => {
    const provider = STORE_EXTENSION_PROVIDERS[feature];
    return provider ? [provider] : [];
  });
}

export function createBlocksuiteStoreManager() {
  return new StoreExtensionManager(getSupportedStoreProviders());
}

const blocksuiteStoreManager = createBlocksuiteStoreManager();

export const BLOCKSUITE_STORE_EXTENSIONS: ExtensionType[] = (
  blocksuiteStoreManager.get("store") as ExtensionType[]
).concat([
  // 项目侧额外补上的 store/service 能力，不属于 BlockSuite 内建 featureSet。
  LinkPreviewCache,
  LinkPreviewService,
  RoomMapEmbedIframeConfigExtension,
]);

export function getBlocksuiteStoreExtensions(): ExtensionType[] {
  return BLOCKSUITE_STORE_EXTENSIONS;
}
