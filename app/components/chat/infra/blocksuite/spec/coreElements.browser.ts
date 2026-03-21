import { AttachmentViewExtension } from "@blocksuite/affine/blocks/attachment/view";
import "@blocksuite/affine/blocks/attachment";
import "@blocksuite/affine/blocks/bookmark";
import { BookmarkViewExtension } from "@blocksuite/affine/blocks/bookmark/view";
import "@blocksuite/affine/blocks/data-view";
import "@blocksuite/affine/blocks/database";
import { EmbedViewExtension } from "@blocksuite/affine/blocks/embed/view";
import "@blocksuite/affine/blocks/embed";
import "@blocksuite/affine/blocks/note";
import "@blocksuite/affine/blocks/table";
import { effects as dataViewEffects } from "@blocksuite/affine/data-view/effects";
import { effects as richTextEffects } from "@blocksuite/affine/rich-text/effects";
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
import { effects as integrationTestEffects } from "@blocksuite/integration-test/effects";
import { effects as stdEffects } from "@blocksuite/std/effects";
import { ensureTCAffineMentionDefined } from "./tcMentionElement.client";

function defineOnce(tagName: string, ctor: CustomElementConstructor) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ctor);
  }
}

function runEffectsIfMissing(probeTagName: string, run: () => void) {
  if (customElements.get(probeTagName)) {
    return;
  }
  run();
}

const EFFECTS_ONCE_KEY = "__TC_BLOCKSUITE_BROWSER_EFFECTS_DONE__";

export async function ensureBlocksuiteCoreElementsDefined(): Promise<void> {
  if (typeof window === "undefined")
    return;
  if (!globalThis.customElements)
    return;

  const g = globalThis as Record<string, unknown>;
  if (g[EFFECTS_ONCE_KEY]) {
    return;
  }

  g[EFFECTS_ONCE_KEY] = true;

  ensureTCAffineMentionDefined();

  runEffectsIfMissing("affine-editor-container", integrationTestEffects);
  runEffectsIfMissing("editor-host", stdEffects);
  runEffectsIfMissing("rich-text", richTextEffects);
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
  runEffectsIfMissing("affine-data-view-renderer", dataViewEffects);
  runEffectsIfMissing("affine-attachment", () => new AttachmentViewExtension().effect());
  runEffectsIfMissing("affine-bookmark", () => new BookmarkViewExtension().effect());
  runEffectsIfMissing("affine-embed-github-block", () => new EmbedViewExtension().effect());

  defineOnce("icon-button", IconButton as unknown as CustomElementConstructor);
}
