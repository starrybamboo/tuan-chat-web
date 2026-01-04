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
import { InlinePresetStoreExtension } from "@blocksuite/affine-inline-preset/store";
import { InlinePresetViewExtension } from "@blocksuite/affine-inline-preset/view";

const storeManager = new StoreExtensionManager([
  RootStoreExtension,
  NoteStoreExtension,
  ParagraphStoreExtension,
  SurfaceStoreExtension,
  InlinePresetStoreExtension,
]);

const viewManager = new ViewExtensionManager([
  RootViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  SurfaceViewExtension,
  InlinePresetViewExtension,
]);

export const AFFINE_STORE_EXTENSIONS: ExtensionType[] = storeManager.get("store") as ExtensionType[];
export const AFFINE_PAGE_STD_EXTENSIONS: ExtensionType[] = viewManager.get("page") as ExtensionType[];
export const AFFINE_EDGELESS_STD_EXTENSIONS: ExtensionType[] = viewManager.get("edgeless") as ExtensionType[];
