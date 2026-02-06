// IMPORTANT:
// React Router dev (and some Vite flows) may evaluate route modules in a Node/SSR context.
// Many BlockSuite/AFFiNE packages touch DOM globals (e.g. `document`) during module evaluation.
// Therefore, this file must NOT have any static imports from `@blocksuite/*`.
// We only dynamically import them inside `ensureBlocksuiteCoreElementsDefined()` after confirming
// we are running in a browser.

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

export async function ensureBlocksuiteCoreElementsDefined(): Promise<void> {
  if (typeof window === "undefined")
    return;
  if (!globalThis.customElements)
    return;

  const g = globalThis as unknown as Record<string, unknown>;
  if (g[EFFECTS_ONCE_KEY]) {
    return;
  }
  g[EFFECTS_ONCE_KEY] = true;

  // Define our customized mention element early so upstream effects won't register the default one.
  // (customElements.define is globally patched in app/root.tsx to ignore duplicate defines.)
  try {
    const mod = await import("./tcMentionElement.client");
    mod.ensureTCAffineMentionDefined();
  }
  catch {
    // ignore
  }

  const [
    attachmentViewMod,
    bookmarkViewMod,
    embedViewMod,
    blockRootEffectsMod,
    captionEffectsMod,
    colorPickerEffectsMod,
    contextMenuEffectsMod,
    datePickerEffectsMod,
    dropIndicatorEffectsMod,
    embedCardModalEffectsMod,
    highlightDropdownMenuEffectsMod,
    iconButtonMod,
    linkPreviewEffectsMod,
    linkedDocTitleEffectsMod,
    portalEffectsMod,
    toggleButtonEffectsMod,
    toolbarEffectsMod,
    viewDropdownMenuEffectsMod,
    richTextEffectsMod,
    dataViewEffectsMod,
    integrationTestEffectsMod,
    stdEffectsMod,
    noteBlocksMod,
    tableBlocksMod,
    databaseBlocksMod,
    dataViewBlocksMod,
    attachmentBlocksMod,
    bookmarkBlocksMod,
    embedBlocksMod,
  ] = await Promise.all([
    import("@blocksuite/affine/blocks/attachment/view"),
    import("@blocksuite/affine/blocks/bookmark/view"),
    import("@blocksuite/affine/blocks/embed/view"),
    import("@blocksuite/affine-block-root/effects"),
    import("@blocksuite/affine-components/caption"),
    import("@blocksuite/affine-components/color-picker"),
    import("@blocksuite/affine-components/context-menu"),
    import("@blocksuite/affine-components/date-picker"),
    import("@blocksuite/affine-components/drop-indicator"),
    import("@blocksuite/affine-components/embed-card-modal"),
    import("@blocksuite/affine-components/highlight-dropdown-menu"),
    import("@blocksuite/affine-components/icon-button"),
    import("@blocksuite/affine-components/link-preview"),
    import("@blocksuite/affine-components/linked-doc-title"),
    import("@blocksuite/affine-components/portal"),
    import("@blocksuite/affine-components/toggle-button"),
    import("@blocksuite/affine-components/toolbar"),
    import("@blocksuite/affine-components/view-dropdown-menu"),
    import("@blocksuite/affine/rich-text/effects"),
    import("@blocksuite/affine/data-view/effects"),
    import("@blocksuite/integration-test/effects"),
    import("@blocksuite/std/effects"),
    // Ensure AFFiNE block modules are loaded so their schemas/specs are registered.
    import("@blocksuite/affine/blocks/note"),
    import("@blocksuite/affine/blocks/table"),
    import("@blocksuite/affine/blocks/database"),
    import("@blocksuite/affine/blocks/data-view"),
    import("@blocksuite/affine/blocks/attachment"),
    import("@blocksuite/affine/blocks/bookmark"),
    import("@blocksuite/affine/blocks/embed"),
  ]);

  // Prevent bundlers from tree-shaking these imports in production.
  void noteBlocksMod;
  void tableBlocksMod;
  void databaseBlocksMod;
  void dataViewBlocksMod;
  void attachmentBlocksMod;
  void bookmarkBlocksMod;
  void embedBlocksMod;

  const AttachmentViewExtension = (attachmentViewMod as any).AttachmentViewExtension as any;
  const BookmarkViewExtension = (bookmarkViewMod as any).BookmarkViewExtension as any;
  const EmbedViewExtension = (embedViewMod as any).EmbedViewExtension as any;

  const blockRootEffects = (blockRootEffectsMod as any).effects as (() => void);
  const captionEffects = (captionEffectsMod as any).effects as (() => void);
  const colorPickerEffects = (colorPickerEffectsMod as any).effects as (() => void);
  const contextMenuEffects = (contextMenuEffectsMod as any).effects as (() => void);
  const datePickerEffects = (datePickerEffectsMod as any).effects as (() => void);
  const dropIndicatorEffects = (dropIndicatorEffectsMod as any).effects as (() => void);
  const embedCardModalEffects = (embedCardModalEffectsMod as any).effects as (() => void);
  const highlightDropdownMenuEffects = (highlightDropdownMenuEffectsMod as any).effects as (() => void);
  const IconButton = (iconButtonMod as any).IconButton as any;
  const linkPreviewEffects = (linkPreviewEffectsMod as any).effects as (() => void);
  const linkedDocTitleEffects = (linkedDocTitleEffectsMod as any).effects as (() => void);
  const portalEffects = (portalEffectsMod as any).effects as (() => void);
  const toggleButtonEffects = (toggleButtonEffectsMod as any).effects as (() => void);
  const toolbarEffects = (toolbarEffectsMod as any).effects as (() => void);
  const viewDropdownMenuEffects = (viewDropdownMenuEffectsMod as any).effects as (() => void);
  const richTextEffects = (richTextEffectsMod as any).effects as (() => void);
  const dataViewEffects = (dataViewEffectsMod as any).effects as (() => void);
  const integrationTestEffects = (integrationTestEffectsMod as any).effects as (() => void);
  const stdEffects = (stdEffectsMod as any).effects as (() => void);

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
