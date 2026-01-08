type ElementSnapshot = {
  attrs: Map<string, string | null>;
  className: string;
  styleText: string;
};

type CssRuleMutationState = {
  insertedRuleTextsBySheet: WeakMap<CSSStyleSheet, string[]>;
  replacedSheetsSnapshotBySheet: WeakMap<CSSStyleSheet, string[] | null>;
  touchedSheets: Set<CSSStyleSheet>;
  restorePatches: (() => void) | null;
};

type GlobalIsolationState = {
  refCount: number;
  disposeInternal: (() => void) | null;
};

function installDocumentAdoptedStyleSheetsRedirect(params: {
  shadowRoot: ShadowRoot;
  documentAdoptedSnapshot: any[] | null;
}): () => void {
  const { shadowRoot, documentAdoptedSnapshot } = params;

  const docAny = document as any;
  const shadowAny = shadowRoot as any;
  if (!Array.isArray(docAny?.adoptedStyleSheets) || !Array.isArray(shadowAny?.adoptedStyleSheets))
    return () => {};

  const proto = Document.prototype as any;
  const desc = Object.getOwnPropertyDescriptor(proto, "adoptedStyleSheets");
  const originalGet = desc?.get;
  const originalSet = desc?.set;

  // Snapshot current shadowRoot sheets so we can restore on dispose.
  const shadowSnapshot: any[] = [...shadowAny.adoptedStyleSheets];
  let redirectedSheets: any[] | null = null;

  if (!desc || typeof originalGet !== "function" || typeof originalSet !== "function")
    return () => {};

  try {
    Object.defineProperty(proto, "adoptedStyleSheets", {
      configurable: true,
      enumerable: desc.enumerable ?? true,
      get() {
        // If we redirected at least once, return the redirected view so code doing
        // set->get roundtrip keeps working during isolation.
        if (redirectedSheets)
          return redirectedSheets;
        return originalGet.call(this);
      },
      set(value: any[]) {
        try {
          if (this === document) {
            redirectedSheets = Array.isArray(value) ? value : [];
            shadowAny.adoptedStyleSheets = redirectedSheets;
            // Do NOT touch document's adoptedStyleSheets.
            return;
          }
        }
        catch {
          // ignore
        }

        // Fallback to original behavior for other documents.
        return originalSet.call(this, value);
      },
    });
  }
  catch {
    return () => {};
  }

  return () => {
    try {
      // Restore original descriptor
      Object.defineProperty(proto, "adoptedStyleSheets", desc);
    }
    catch {
      // ignore
    }

    // Restore shadowRoot sheets to pre-isolation snapshot
    try {
      shadowAny.adoptedStyleSheets = shadowSnapshot;
    }
    catch {
      // ignore
    }

    // Restore document sheets if we had a snapshot
    if (documentAdoptedSnapshot) {
      try {
        docAny.adoptedStyleSheets = documentAdoptedSnapshot;
      }
      catch {
        // ignore
      }
    }
  };
}

function normalizeCssRuleText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function snapshotCssRules(sheet: CSSStyleSheet, maxRules: number): string[] | null {
  try {
    const rules = sheet.cssRules;
    if (rules.length > maxRules)
      return null;

    const out: string[] = [];
    for (const rule of Array.from(rules)) {
      out.push(rule.cssText);
    }
    return out;
  }
  catch {
    // Cross-origin / inaccessible stylesheet
    return null;
  }
}

function clearAndRestoreCssRules(
  sheet: CSSStyleSheet,
  rules: string[],
  originalInsertRule: (rule: string, index?: number) => number,
) {
  // Best-effort: delete everything then reinsert.
  try {
    const current = sheet.cssRules;
    for (let i = current.length - 1; i >= 0; i -= 1) {
      try {
        sheet.deleteRule(i);
      }
      catch {
        // ignore
      }
    }
  }
  catch {
    return;
  }

  for (const ruleText of rules) {
    try {
      originalInsertRule.call(sheet, ruleText, sheet.cssRules.length);
    }
    catch {
      // ignore
    }
  }
}

function installCssStyleSheetMutationHooks(state: CssRuleMutationState): () => void {
  if (typeof CSSStyleSheet === "undefined")
    return () => {};

  const proto = CSSStyleSheet.prototype as any;

  const originalInsertRule: ((rule: string, index?: number) => number) | undefined = proto.insertRule;
  const originalDeleteRule: ((index: number) => void) | undefined = proto.deleteRule;
  const originalReplaceSync: ((text: string) => void) | undefined = proto.replaceSync;
  const originalReplace: ((text: string) => Promise<CSSStyleSheet>) | undefined = proto.replace;
  const originalAddRule: ((selector?: string, style?: string, index?: number) => number) | undefined = proto.addRule;
  const originalRemoveRule: ((index?: number) => void) | undefined = proto.removeRule;

  const MAX_RESTORE_RULES = 2000;

  function rememberInserted(sheet: CSSStyleSheet, ruleText: string) {
    let arr = state.insertedRuleTextsBySheet.get(sheet);
    if (!arr) {
      arr = [];
      state.insertedRuleTextsBySheet.set(sheet, arr);
    }
    arr.push(ruleText);
    state.touchedSheets.add(sheet);
  }

  function rememberReplaceSnapshotIfNeeded(sheet: CSSStyleSheet) {
    if (state.replacedSheetsSnapshotBySheet.has(sheet))
      return;

    const snapshot = snapshotCssRules(sheet, MAX_RESTORE_RULES);
    state.replacedSheetsSnapshotBySheet.set(sheet, snapshot);
    state.touchedSheets.add(sheet);
  }

  if (originalInsertRule) {
    proto.insertRule = function (this: CSSStyleSheet, rule: string, index?: number) {
      rememberInserted(this, rule);
      return originalInsertRule.call(this, rule, index);
    };
  }

  if (originalAddRule) {
    proto.addRule = function (this: CSSStyleSheet, selector?: string, style?: string, index?: number) {
      // addRule is non-standard but still exists in some browsers.
      if (typeof selector === "string") {
        const ruleText = `${selector}{${style ?? ""}}`;
        rememberInserted(this, ruleText);
      }
      return originalAddRule.call(this, selector, style, index);
    };
  }

  if (originalReplaceSync) {
    proto.replaceSync = function (this: CSSStyleSheet, text: string) {
      rememberReplaceSnapshotIfNeeded(this);
      return originalReplaceSync.call(this, text);
    };
  }

  if (originalReplace) {
    proto.replace = function (this: CSSStyleSheet, text: string) {
      rememberReplaceSnapshotIfNeeded(this);
      return originalReplace.call(this, text);
    };
  }

  if (originalDeleteRule) {
    proto.deleteRule = function (this: CSSStyleSheet, index: number) {
      // We don't try to restore deletions (rare); focus on removing injected rules.
      state.touchedSheets.add(this);
      return originalDeleteRule.call(this, index);
    };
  }

  if (originalRemoveRule) {
    proto.removeRule = function (this: CSSStyleSheet, index?: number) {
      state.touchedSheets.add(this);
      return originalRemoveRule.call(this, index);
    };
  }

  return () => {
    try {
      if (originalInsertRule)
        proto.insertRule = originalInsertRule;
      if (originalDeleteRule)
        proto.deleteRule = originalDeleteRule;
      if (originalReplaceSync)
        proto.replaceSync = originalReplaceSync;
      if (originalReplace)
        proto.replace = originalReplace;
      if (originalAddRule)
        proto.addRule = originalAddRule;
      if (originalRemoveRule)
        proto.removeRule = originalRemoveRule;
    }
    catch {
      // ignore
    }
  };
}

function snapshotElementAttributes(el: Element): ElementSnapshot {
  const attrs = new Map<string, string | null>();
  for (const name of el.getAttributeNames()) {
    attrs.set(name, el.getAttribute(name));
  }

  return {
    attrs,
    className: (el as any).className ?? "",
    styleText: (el as HTMLElement).style?.cssText ?? "",
  };
}

function restoreElementAttributes(el: Element, snapshot: ElementSnapshot) {
  for (const name of el.getAttributeNames()) {
    if (!snapshot.attrs.has(name)) {
      el.removeAttribute(name);
    }
  }

  for (const [name, value] of snapshot.attrs.entries()) {
    if (value === null) {
      el.removeAttribute(name);
    }
    else {
      el.setAttribute(name, value);
    }
  }

  (el as any).className = snapshot.className;
  if ((el as HTMLElement).style)
    (el as HTMLElement).style.cssText = snapshot.styleText;
}

/**
 * Captures global style side-effects (head style/link + adoptedStyleSheets + html/body attrs)
 * so blocksuite usage won't leak styles into other routes.
 *
 * Important: call this BEFORE dynamically importing any blocksuite modules.
 */
export function startBlocksuiteStyleIsolation(options?: { shadowRoot?: ShadowRoot | null }): () => void {
  if (typeof document === "undefined")
    return () => {};

  const winAny = window as any;
  const globalKey = "__tc_blocksuiteStyleIsolationState";
  const existing: GlobalIsolationState | undefined = winAny[globalKey];
  if (existing?.disposeInternal) {
    existing.refCount += 1;
    return () => {
      existing.refCount -= 1;
      if (existing.refCount <= 0) {
        try {
          existing.disposeInternal?.();
        }
        finally {
          existing.disposeInternal = null;
          winAny[globalKey] = undefined;
        }
      }
    };
  }

  const htmlSnapshot = snapshotElementAttributes(document.documentElement);
  const bodySnapshot = snapshotElementAttributes(document.body);

  const shadowRoot = options?.shadowRoot ?? null;
  let shadowStyleHost: HTMLElement | null = null;
  if (shadowRoot) {
    try {
      const existingHost = shadowRoot.querySelector<HTMLElement>("[data-tc-blocksuite-style-host]");
      if (existingHost) {
        shadowStyleHost = existingHost;
      }
      else {
        shadowStyleHost = document.createElement("div");
        shadowStyleHost.setAttribute("data-tc-blocksuite-style-host", "1");
        // Avoid affecting layout.
        shadowStyleHost.style.display = "none";
        shadowRoot.appendChild(shadowStyleHost);
      }
    }
    catch {
      shadowStyleHost = null;
    }
  }

  const injectedStyleElements: Element[] = [];
  const head = document.head;

  const styleTextSnapshot = new Map<HTMLStyleElement, string>();
  if (head) {
    for (const styleEl of Array.from(head.querySelectorAll("style"))) {
      styleTextSnapshot.set(styleEl, styleEl.textContent ?? "");
    }
  }

  const docAny = document as any;
  const adoptedStyleSheetsSnapshot: any[] | null = Array.isArray(docAny?.adoptedStyleSheets)
    ? [...docAny.adoptedStyleSheets]
    : null;

  let observer: MutationObserver | null = null;
  try {
    if (head && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          // Track added stylesheet nodes
          for (const node of m.addedNodes) {
            if (!(node instanceof Element))
              continue;

            const isStyle = node.tagName === "STYLE";
            const isStylesheetLink = node.tagName === "LINK"
              && (node.getAttribute("rel") ?? "").toLowerCase() === "stylesheet";

            if (!isStyle && !isStylesheetLink)
              continue;

            node.setAttribute("data-tc-blocksuite-injected", "1");

            // If a ShadowRoot is provided, immediately move the stylesheet into it.
            if (shadowStyleHost) {
              try {
                shadowStyleHost.appendChild(node);
              }
              catch {
                // ignore
              }
            }

            injectedStyleElements.push(node);
          }

          // Track modifications to existing <style> contents
          if (m.type === "characterData") {
            const target = m.target;
            const styleEl = (target as any)?.parentElement instanceof HTMLStyleElement
              ? (target as any).parentElement as HTMLStyleElement
              : null;

            if (styleEl && !styleTextSnapshot.has(styleEl)) {
              styleTextSnapshot.set(styleEl, styleEl.textContent ?? "");
            }
          }
        }
      });

      observer.observe(head, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }
  catch {
    observer = null;
  }

  const cssMutationState: CssRuleMutationState = {
    insertedRuleTextsBySheet: new WeakMap(),
    replacedSheetsSnapshotBySheet: new WeakMap(),
    touchedSheets: new Set(),
    restorePatches: null,
  };

  const restoreCssHooks = installCssStyleSheetMutationHooks(cssMutationState);
  let restoreAdoptedRedirect: (() => void) | null = null;
  if (shadowRoot) {
    restoreAdoptedRedirect = installDocumentAdoptedStyleSheetsRedirect({
      shadowRoot,
      documentAdoptedSnapshot: adoptedStyleSheetsSnapshot,
    });
  }

  const disposeInternal = () => {
    try {
      // Restore CSSStyleSheet prototype patches first.
      try {
        restoreCssHooks?.();
      }
      catch {
        // ignore
      }

      try {
        restoreAdoptedRedirect?.();
      }
      catch {
        // ignore
      }

      // Undo rule-level injections (best-effort)
      for (const sheet of cssMutationState.touchedSheets) {
        const replacedSnapshot = cssMutationState.replacedSheetsSnapshotBySheet.get(sheet);
        if (replacedSnapshot) {
          // Full restore for sheets that were replaced.
          const proto: any = CSSStyleSheet.prototype;
          const originalInsertRule = proto.insertRule;
          if (typeof originalInsertRule === "function") {
            clearAndRestoreCssRules(sheet, replacedSnapshot, originalInsertRule);
          }
          continue;
        }

        const inserted = cssMutationState.insertedRuleTextsBySheet.get(sheet);
        if (!inserted || inserted.length === 0)
          continue;

        const insertedNormalized = new Set(inserted.map(normalizeCssRuleText));
        try {
          const rules = sheet.cssRules;
          for (let i = rules.length - 1; i >= 0; i -= 1) {
            const cssText = rules[i]?.cssText ?? "";
            if (insertedNormalized.has(normalizeCssRuleText(cssText))) {
              try {
                sheet.deleteRule(i);
              }
              catch {
                // ignore
              }
            }
          }
        }
        catch {
          // ignore
        }
      }
    }
    catch {
      // ignore
    }

    try {
      try {
        observer?.disconnect?.();
      }
      catch {
        // ignore
      }

      // Remove injected nodes (reverse order)
      for (let i = injectedStyleElements.length - 1; i >= 0; i -= 1) {
        const el = injectedStyleElements[i];
        try {
          if (el.isConnected)
            el.remove();
        }
        catch {
          // ignore
        }
      }

      // Restore modified <style> nodes
      for (const [styleEl, text] of styleTextSnapshot.entries()) {
        try {
          if (styleEl.isConnected)
            styleEl.textContent = text;
        }
        catch {
          // ignore
        }
      }

      // Restore adoptedStyleSheets
      if (adoptedStyleSheetsSnapshot) {
        try {
          docAny.adoptedStyleSheets = adoptedStyleSheetsSnapshot;
        }
        catch {
          // ignore
        }
      }

      restoreElementAttributes(document.documentElement, htmlSnapshot);
      restoreElementAttributes(document.body, bodySnapshot);
    }
    catch {
      // ignore
    }
  };

  const globalState: GlobalIsolationState = {
    refCount: 1,
    disposeInternal,
  };
  winAny[globalKey] = globalState;

  return () => {
    globalState.refCount -= 1;
    if (globalState.refCount <= 0) {
      try {
        disposeInternal();
      }
      finally {
        globalState.disposeInternal = null;
        winAny[globalKey] = undefined;
      }
    }
  };
}
