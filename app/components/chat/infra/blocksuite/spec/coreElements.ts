import { AttachmentViewExtension } from "@blocksuite/affine-block-attachment/view";
import { BookmarkViewExtension } from "@blocksuite/affine-block-bookmark/view";
import { EmbedViewExtension } from "@blocksuite/affine-block-embed/view";
import { effects as blockRootEffects } from "@blocksuite/affine-block-root/effects";
import { effects as captionEffects } from "@blocksuite/affine-components/caption";
import { effects as colorPickerEffects } from "@blocksuite/affine-components/color-picker";
import { effects as contextMenuEffects } from "@blocksuite/affine-components/context-menu";
import { effects as datePickerEffects } from "@blocksuite/affine-components/date-picker";
import { effects as dropIndicatorEffects } from "@blocksuite/affine-components/drop-indicator";
import { effects as embedCardModalEffects } from "@blocksuite/affine-components/embed-card-modal";
import { effects as highlightDropdownMenuEffects } from "@blocksuite/affine-components/highlight-dropdown-menu";
import { IconButton } from "@blocksuite/affine-components/icon-button";
import { effects as linkPreviewEffects } from "@blocksuite/affine-components/link-preview";
import { effects as linkedDocTitleEffects } from "@blocksuite/affine-components/linked-doc-title";
import { effects as portalEffects } from "@blocksuite/affine-components/portal";
import { effects as toggleButtonEffects } from "@blocksuite/affine-components/toggle-button";
import { effects as toolbarEffects } from "@blocksuite/affine-components/toolbar";
import { effects as viewDropdownMenuEffects } from "@blocksuite/affine-components/view-dropdown-menu";
import { effects as richTextEffects } from "@blocksuite/affine-rich-text/effects";
import * as attachmentBlocks from "@blocksuite/affine/blocks/attachment";
import * as bookmarkBlocks from "@blocksuite/affine/blocks/bookmark";
import * as dataViewBlocks from "@blocksuite/affine/blocks/data-view";
import * as databaseBlocks from "@blocksuite/affine/blocks/database";
import * as embedBlocks from "@blocksuite/affine/blocks/embed";
// Ensure AFFiNE block modules are loaded so their schemas/specs (e.g. database/table/kanban) are registered.
// Playground imports these explicitly; without them, slash menu may miss Table/Kanban and views won't work.
import * as noteBlocks from "@blocksuite/affine/blocks/note";
import * as tableBlocks from "@blocksuite/affine/blocks/table";
import { effects as dataViewEffects } from "@blocksuite/data-view/effects";
import { effects as integrationTestEffects } from "@blocksuite/integration-test/effects";
import { effects as stdEffects } from "@blocksuite/std/effects";

// Prevent bundlers from tree-shaking these imports in production.
void noteBlocks;
void tableBlocks;
void databaseBlocks;
void dataViewBlocks;
void attachmentBlocks;
void bookmarkBlocks;
void embedBlocks;

function defineOnce(tagName: string, ctor: any) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ctor as any);
  }
}

function runEffectsIfMissing(probeTagName: string, run: () => void) {
  // React 18 StrictMode（dev）会重复执行 effect；Vite HMR 也可能导致模块重新执行。
  // 这些第三方 effects() 内部直接 customElements.define，重复会抛 NotSupportedError。
  if (customElements.get(probeTagName)) {
    return;
  }
  run();
}

const EFFECTS_ONCE_KEY = "__TC_BLOCKSUITE_EFFECTS_DONE__";

export function ensureBlocksuiteCoreElementsDefined() {
  if (typeof window === "undefined")
    return;
  if (!globalThis.customElements)
    return;

  const g = globalThis as unknown as Record<string, unknown>;
  if (g[EFFECTS_ONCE_KEY]) {
    return;
  }
  g[EFFECTS_ONCE_KEY] = true;

  // Starter playground uses integration-test to register `affine-editor-container` and friends.
  // Keep it aligned so business-embedded editors can reuse the same assembly.
  runEffectsIfMissing("affine-editor-container", integrationTestEffects);

  // 对齐官方 playground：通过 effects() 一次性注册 blocksuite 运行时依赖的 custom elements。
  // 注意：effects() 内部会直接 customElements.define，重复调用会抛异常，因此必须全局仅执行一次。
  runEffectsIfMissing("editor-host", stdEffects);
  runEffectsIfMissing("rich-text", richTextEffects);

  // AFFiNE 在 page/edgeless 下会用到的通用 components（menu/modal/toolbar/portal 等）。
  // 这些 effects 在我们宿主环境里不会自动执行，必须手动注册。
  runEffectsIfMissing("affine-page-root", blockRootEffects);
  runEffectsIfMissing("block-caption-editor", captionEffects);
  runEffectsIfMissing("edgeless-color-picker", colorPickerEffects);
  runEffectsIfMissing("affine-menu", contextMenuEffects);
  runEffectsIfMissing("date-picker", datePickerEffects);
  runEffectsIfMissing("affine-drop-indicator", dropIndicatorEffects);
  runEffectsIfMissing("embed-card-create-modal", embedCardModalEffects);
  runEffectsIfMissing("affine-highlight-dropdown-menu", highlightDropdownMenuEffects);
  runEffectsIfMissing("affine-link-preview", linkPreviewEffects);
  runEffectsIfMissing("affine-linked-doc-title", linkedDocTitleEffects);
  runEffectsIfMissing("blocksuite-portal", portalEffects);
  runEffectsIfMissing("blocksuite-toggle-button", toggleButtonEffects);
  runEffectsIfMissing("editor-toolbar", toolbarEffects);
  runEffectsIfMissing("affine-view-dropdown-menu", viewDropdownMenuEffects);

  // Database/Kanban/DataView 相关的自定义元素（官方 package 内提供 effects()）。
  runEffectsIfMissing("affine-data-view-renderer", dataViewEffects);

  // Attachment / Bookmark / Embed（GitHub 等 embed 卡片）
  runEffectsIfMissing("affine-attachment", () => new AttachmentViewExtension().effect());
  runEffectsIfMissing("affine-bookmark", () => new BookmarkViewExtension().effect());
  runEffectsIfMissing("affine-embed-github-block", () => new EmbedViewExtension().effect());

  // affine-components/icon-button 没有提供 effects()，这里手动 define。
  defineOnce("icon-button", IconButton);
}
