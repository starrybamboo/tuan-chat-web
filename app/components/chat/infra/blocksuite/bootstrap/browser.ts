import "@toeverything/theme/style.css";
import "@toeverything/theme/fonts.css";
import "katex/dist/katex.min.css";

import "../styles/affine-embed-synced-doc-header.css";
import "../styles/tcHeader.css";
import { ensureBlocksuiteCoreElementsDefined } from "../spec/coreElements.browser";

const CUSTOM_ELEMENTS_PATCHED_KEY = "__TC_BLOCKSUITE_CUSTOM_ELEMENTS_PATCHED__";
const READY_PROMISE_KEY = "__TC_BLOCKSUITE_BROWSER_RUNTIME_READY__";

type RuntimeOwner = Record<string, Promise<void> | boolean | undefined>;

function patchCustomElementsDefine() {
  if (typeof window === "undefined" || !window.customElements)
    return;

  const owner = window as unknown as RuntimeOwner;
  if (owner[CUSTOM_ELEMENTS_PATCHED_KEY]) {
    return;
  }

  const originalDefine = window.customElements.define;
  window.customElements.define = function (name, constructor, options) {
    if (window.customElements.get(name)) {
      return;
    }
    originalDefine.call(this, name, constructor, options);
  };

  owner[CUSTOM_ELEMENTS_PATCHED_KEY] = true;
}

export async function ensureBlocksuiteBrowserRuntime(): Promise<void> {
  if (typeof window === "undefined")
    return;

  patchCustomElementsDefine();

  const owner = window as unknown as RuntimeOwner;
  if (owner[READY_PROMISE_KEY]) {
    return owner[READY_PROMISE_KEY] as Promise<void>;
  }

  owner[READY_PROMISE_KEY] = ensureBlocksuiteCoreElementsDefined().catch((error) => {
    delete owner[READY_PROMISE_KEY];
    throw error;
  });

  return owner[READY_PROMISE_KEY] as Promise<void>;
}
