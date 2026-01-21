import type { BlockModel, Text } from "@blocksuite/store";

import { BlockComponent, EditorHost } from "@blocksuite/std";
import { InlineEditor, VElement, VLine, VText } from "@blocksuite/std/inline";
import { html } from "lit";
import { state } from "lit/decorators.js";
import { ref } from "lit/directives/ref.js";

function defineOnce(tagName: string, ctor: CustomElementConstructor) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ctor);
  }
}

export type TcRootModel = BlockModel<Record<string, never>>;
export type TcParagraphModel = BlockModel<{ text: Text }>;

class TcRootBlock extends BlockComponent<TcRootModel> {
  override renderBlock() {
    return html`<div class="min-h-full w-full">${this.renderChildren(this.model)}</div>`;
  }
}

class TcParagraphBlock extends BlockComponent<TcParagraphModel> {
  @state()
  accessor _mounted = false;

  private _inlineEditor: InlineEditor | null = null;

  private _mount = (el: HTMLElement | null) => {
    if (!el)
      return;
    if (this._mounted)
      return;

    const modelAny = this.model as unknown as { text?: Text };
    const text = modelAny.text;
    if (!text)
      return;

    this._inlineEditor = new InlineEditor(text.yText);
    this._inlineEditor.mount(el, el, this.store.readonly);
    this._mounted = true;
  };

  override disconnectedCallback() {
    super.disconnectedCallback();
    try {
      this._inlineEditor?.unmount();
    }
    catch {
      // ignore
    }
    this._inlineEditor = null;
    this._mounted = false;
  }

  override renderBlock() {
    return html`
      <div class="px-3 py-2">
        <div
          class="min-h-6 outline-none"
          ${ref((el) => {
            this._mount(el as HTMLElement | null);
          })}
        ></div>
      </div>
    `;
  }
}

export function ensureTcBlockElementsDefined() {
  if (typeof window === "undefined")
    return;
  if (!globalThis.customElements)
    return;

  // Editor host
  defineOnce("editor-host", EditorHost);

  // InlineEditor rendering primitives (lit renders <v-line>/<v-element>/<v-text>)
  defineOnce("v-text", VText);
  defineOnce("v-line", VLine);
  defineOnce("v-element", VElement);

  // Our blocks
  defineOnce("tc-root-block", TcRootBlock);
  defineOnce("tc-paragraph-block", TcParagraphBlock);
}
