import "@toeverything/theme/style.css";
import "@toeverything/theme/fonts.css";
import "katex/dist/katex.min.css";

import "../styles/affine-embed-synced-doc-header.css";
import "../styles/frameBase.css";
import "../styles/tcHeader.css";
import { ensureBlocksuiteCoreElementsDefined } from "../spec/coreElements.browser";
import { patchBlocksuiteUiLocale } from "./patchBlocksuiteUiLocale";

/**
 * iframe 内浏览器运行时的最小 bootstrap。
 *
 * 样式通过静态 import 直接进入 route client chunk，
 * 不再像旧方案那样运行时拼接 CSS 文本后再注入。
 */
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
    // HMR / StrictMode 下可能重复 define，同名元素这里直接跳过。
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

  // 运行时只启动一次；失败时清空 promise，允许下一次重新尝试。
  owner[READY_PROMISE_KEY] = ensureBlocksuiteCoreElementsDefined()
    .then(() => {
      patchBlocksuiteUiLocale();
    })
    .catch((error) => {
      delete owner[READY_PROMISE_KEY];
      throw error;
    });

  return owner[READY_PROMISE_KEY] as Promise<void>;
}
