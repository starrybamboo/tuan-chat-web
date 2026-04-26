import type { DocMode } from "@blocksuite/affine/model";
import type { BlockModel, ExtensionType, Store } from "@blocksuite/affine/store";
import type { PropertyValues } from "lit";
import type { Subscription } from "rxjs";

import { SignalWatcher, WithDisposable } from "@blocksuite/affine/global/lit";
import { RefNodeSlotsProvider } from "@blocksuite/affine/inlines/reference";
import { ThemeProvider } from "@blocksuite/affine/shared/services";
import { BlockStdScope, ShadowlessElement } from "@blocksuite/affine/std";
import { computed, signal } from "@preact/signals-core";
import { css, html } from "lit";
import { property } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { when } from "lit/directives/when.js";

export const TC_AFFINE_EDITOR_CONTAINER_TAG = "tc-affine-editor-container";

/**
 * 真正把 BlockStdScope 渲染到 DOM 的 Web Component 容器。
 *
 * Forked from `@blocksuite/integration-test`'s TestAffineEditorContainer.
 *
 * Why: the integration-test container always inserts `<doc-title>` in page mode.
 * For TuanChat, page title UI is handled by `tcHeader`, so doc-title should be optional.
 */
class TCAffineEditorContainer extends SignalWatcher(
  WithDisposable(ShadowlessElement),
) {
  static override styles = css`
    .affine-page-viewport {
      position: relative;
      display: flex;
      flex-direction: column;
      overflow-x: auto;
      overflow-y: auto;
      container-name: viewport;
      container-type: inline-size;
      font-family: var(--affine-font-family);
    }
    .affine-page-viewport * {
      box-sizing: border-box;
    }

    @media print {
      .affine-page-viewport {
        height: auto;
      }
    }

    .playground-page-editor-container {
      flex-grow: 1;
      font-family: var(--affine-font-family);
      display: block;
      min-height: 100%;
    }

    .playground-page-editor-container * {
      box-sizing: border-box;
    }

    .playground-page-editor-container .affine-page-root-block-container {
      padding-bottom: var(--tc-blocksuite-page-bottom-spacer, var(--affine-editor-bottom-padding, 32px)) !important;
    }

    @media print {
      .playground-page-editor-container {
        height: auto;
      }
    }

    .edgeless-editor-container {
      font-family: var(--affine-font-family);
      background: var(--affine-background-primary-color);
      display: block;
      height: 100%;
      position: relative;
      overflow: clip;
    }

    .edgeless-editor-container * {
      box-sizing: border-box;
    }

    @media print {
      .edgeless-editor-container {
        height: auto;
      }
    }

    .affine-edgeless-viewport {
      display: block;
      height: 100%;
      position: relative;
      overflow: clip;
      container-name: viewport;
      container-type: inline-size;
    }
  `;

  private readonly _doc = signal<Store>();
  private readonly _edgelessSpecs = signal<ExtensionType[]>([]);
  private readonly _mode = signal<DocMode>("page");
  private readonly _pageSpecs = signal<ExtensionType[]>([]);

  private readonly _specs = computed(() =>
    this._mode.value === "page" ? this._pageSpecs.value : this._edgelessSpecs.value,
  );

  private _docLinkSubscription: Subscription | null = null;
  private _docLinkSubscriptionStd: BlockStdScope | null = null;

  private readonly _std = computed(() => {
    // std 是 BlockSuite 的“渲染宿主”，负责把 store + specs 变成真正的 editor-host。
    return new BlockStdScope({
      store: this.doc,
      extensions: this._specs.value,
    });
  });

  private readonly _editorTemplate = computed(() => {
    return this._std.value.render();
  });

  get doc() {
    return this._doc.value as Store;
  }

  set doc(doc: Store) {
    this._doc.value = doc;
  }

  set edgelessSpecs(specs: ExtensionType[]) {
    this._edgelessSpecs.value = specs;
  }

  get edgelessSpecs() {
    return this._edgelessSpecs.value;
  }

  get host() {
    try {
      return this.std.host;
    }
    catch {
      return null;
    }
  }

  get mode() {
    return this._mode.value;
  }

  set mode(mode: DocMode) {
    this._mode.value = mode;
  }

  set pageSpecs(specs: ExtensionType[]) {
    this._pageSpecs.value = specs;
  }

  get pageSpecs() {
    return this._pageSpecs.value;
  }

  get rootModel() {
    return this.doc.root as BlockModel | null;
  }

  get std() {
    return this._std.value;
  }

  override connectedCallback() {
    super.connectedCallback();
    this._disposables.add(this.doc.slots.rootAdded.subscribe(() => this.requestUpdate()));
  }

  override disconnectedCallback() {
    this._teardownDocLinkSubscription();
    super.disconnectedCallback();
  }

  override firstUpdated() {
    this._bindDocLinkSubscription();

    if (this.mode === "page") {
      setTimeout(() => {
        if (this.autofocus && this.mode === "page") {
          const richText = this.querySelector("rich-text") as any;
          richText?.inlineEditor?.focusEnd?.();
        }
      });
    }
  }

  override updated(_changedProperties: PropertyValues) {
    this._bindDocLinkSubscription();
  }

  override render() {
    const mode = this._mode.value;
    const themeService = this.std.get(ThemeProvider);
    const appTheme = themeService.app$.value;
    const edgelessTheme = themeService.edgeless$.value;
    const rootModel = this.rootModel;

    const showDocTitle = mode === "page" && !this.disableDocTitle;

    if (!rootModel) {
      // 文档骨架尚未 ready 时，先渲染空 viewport，避免访问 null root.id。
      return html`
        <div
          data-theme=${mode === "page" ? appTheme : edgelessTheme}
          class=${mode === "page" ? "affine-page-viewport" : "affine-edgeless-viewport"}
        >
          <div
            class=${mode === "page" ? "page-editor playground-page-editor-container" : "edgeless-editor-container"}
          ></div>
        </div>
      `;
    }

    return html`${keyed(
      rootModel.id + mode,
      html`
        <div
          data-theme=${mode === "page" ? appTheme : edgelessTheme}
          class=${mode === "page" ? "affine-page-viewport" : "affine-edgeless-viewport"}
        >
          ${when(showDocTitle, () => html` <doc-title .doc=${this.doc}></doc-title> `)}
          <div
            class=${mode === "page" ? "page-editor playground-page-editor-container" : "edgeless-editor-container"}
          >
            ${this._editorTemplate.value}
          </div>
        </div>
      `,
    )}`;
  }

  switchEditor(mode: DocMode) {
    this._mode.value = mode;
  }

  private _bindDocLinkSubscription() {
    const std = this.std;
    if (this._docLinkSubscriptionStd === std && this._docLinkSubscription) {
      return;
    }

    this._teardownDocLinkSubscription();
    this._docLinkSubscriptionStd = std;

    try {
      const provider: any = std.getOptional(RefNodeSlotsProvider as any);
      this._docLinkSubscription = provider?.docLinkClicked?.subscribe?.((event: { pageId: string; host?: unknown }) => {
        this.onDocLinkClicked?.(event);
      }) ?? null;
    }
    catch {
      this._docLinkSubscription = null;
    }
  }

  private _teardownDocLinkSubscription() {
    this._docLinkSubscription?.unsubscribe();
    this._docLinkSubscription = null;
    this._docLinkSubscriptionStd = null;
  }

  @property({ attribute: false })
  override accessor autofocus = false;

  @property({ attribute: false })
  accessor disableDocTitle = false;

  @property({ attribute: false })
  accessor onDocLinkClicked: ((event: { pageId: string; host?: unknown }) => void) | null = null;
}

export function ensureTCAffineEditorContainerDefined() {
  if (typeof window === "undefined")
    return;
  if (!globalThis.customElements)
    return;

  if (!customElements.get(TC_AFFINE_EDITOR_CONTAINER_TAG)) {
    customElements.define(TC_AFFINE_EDITOR_CONTAINER_TAG, TCAffineEditorContainer as any);
  }
}
