import { EditorHost } from "@blocksuite/std";
import { VElement, VLine, VText } from "@blocksuite/std/inline";

function defineOnce(tagName: string, ctor: CustomElementConstructor) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ctor);
  }
}

export function ensureBlocksuiteCoreElementsDefined() {
  if (typeof window === "undefined")
    return;
  if (!globalThis.customElements)
    return;

  // BlockSuite host element
  defineOnce("editor-host", EditorHost);

  // InlineEditor primitives (lit renders <v-line>/<v-element>/<v-text>)
  defineOnce("v-text", VText);
  defineOnce("v-line", VLine);
  defineOnce("v-element", VElement);
}
