export type SupportedHtmlTag = "a" | "img" | "div" | "span";

export type HtmlToken = {
  tag: SupportedHtmlTag;
  snippet: string;
  snippetStart: number;
  trailingWhitespace: string;
  isVoid: boolean;
  attributes: Record<string, string>;
  sanitizedHtml: string | null;
  plainText: string;
};

export type HtmlDebugEntry = {
  ts: number;
  event: string;
  payload?: Record<string, unknown>;
};

type QuillLike = {
  getLine?: (index: number) => [any, number] | undefined;
  getText?: (index: number, length: number) => string;
  getSelection?: (focus?: boolean) => { index: number; length: number } | null | undefined;
  getLeaf?: (index: number) => [any, any] | null | undefined;
  deleteText: (index: number, length: number, source?: "api" | "user" | "silent") => void;
  insertText: (index: number, text: string, source?: "api" | "user" | "silent") => void;
  insertEmbed: (index: number, embed: string, value: any, source?: "api" | "user" | "silent") => void;
  formatText: (index: number, length: number, format: string, value: any, source?: "api" | "user" | "silent") => void;
  setSelection: (index: number, length: number, source?: "api" | "user" | "silent") => void;
  history: { cutoff: () => void };
  clipboard?: { dangerouslyPasteHTML?: (index: number, html: string, source?: "api" | "user" | "silent") => unknown };
};

type HtmlRule = {
  tag: SupportedHtmlTag;
  isVoid: boolean;
  outerPattern: RegExp;
};

const TRAILING_SPACE_PATTERN = /[\u0020\u00A0\u2000-\u200B\u205F\u3000]+$/;

const HTML_RULES: HtmlRule[] = [
  { tag: "a", isVoid: false, outerPattern: /(<a\b[^>]*>[\s\S]*<\/a\s*>)$/i },
  { tag: "img", isVoid: true, outerPattern: /(<img\b[^<>]*?(?:\/>|>))$/i },
  { tag: "div", isVoid: false, outerPattern: /(<div\b[^>]*>[\s\S]*<\/div\s*>)$/i },
  { tag: "span", isVoid: false, outerPattern: /(<span\b[^>]*>[\s\S]*<\/span\s*>)$/i },
];

export const HTML_DEBUG_FLAG = "__QUILL_HTML_DEBUG__";
const HTML_DEBUG_HISTORY_KEY = "__QUILL_HTML_DEBUG_HISTORY__";
const MAX_DEBUG_HISTORY = 50;

const debugListeners = new Set<(entry: HtmlDebugEntry) => void>();

function logHtmlDebug(event: string, payload?: Record<string, unknown>): void {
  const entry: HtmlDebugEntry = { ts: Date.now(), event, payload };

  for (const listener of debugListeners) {
    try {
      listener(entry);
    }
    catch {
      // ignore listener errors
    }
  }

  try {
    if (typeof window === "undefined")
      return;
    if (!(window as any)[HTML_DEBUG_FLAG])
      return;

    const history = Array.isArray((window as any)[HTML_DEBUG_HISTORY_KEY])
      ? (window as any)[HTML_DEBUG_HISTORY_KEY] as HtmlDebugEntry[]
      : [];
    history.push(entry);
    if (history.length > MAX_DEBUG_HISTORY)
      history.splice(0, history.length - MAX_DEBUG_HISTORY);
    (window as any)[HTML_DEBUG_HISTORY_KEY] = history;

    if (typeof console?.warn === "function") {
      const prefix = `[QuillHtml] ${event}`;
      if (payload)
        console.warn(prefix, payload);
      else
        console.warn(prefix);
    }
  }
  catch {
    // ignore debug logging failures
  }
}

export function subscribeHtmlDebug(listener: (entry: HtmlDebugEntry) => void): () => void {
  debugListeners.add(listener);
  return () => {
    debugListeners.delete(listener);
  };
}

export function setHtmlDebugEnabled(enabled: boolean): void {
  if (typeof window === "undefined")
    return;
  try {
    (window as any)[HTML_DEBUG_FLAG] = enabled;
    if (!enabled)
      (window as any)[HTML_DEBUG_HISTORY_KEY] = [];
  }
  catch {
    // ignore debug flag errors
  }
}

export function getHtmlDebugHistory(): HtmlDebugEntry[] {
  if (typeof window === "undefined")
    return [];
  try {
    const history = (window as any)[HTML_DEBUG_HISTORY_KEY];
    return Array.isArray(history) ? [...history] : [];
  }
  catch {
    return [];
  }
}

export function clearHtmlDebugHistory(): void {
  if (typeof window === "undefined")
    return;
  try {
    (window as any)[HTML_DEBUG_HISTORY_KEY] = [];
  }
  catch {
    // ignore
  }
}

type SanitizedSnippet = {
  attributes: Record<string, string>;
  sanitizedHtml: string | null;
  plainText: string;
};

export function detectHtmlTag(quillInstance: QuillLike | null | undefined, range: any): boolean {
  if (!quillInstance || !range || typeof range.index !== "number")
    return false;

  const lineInfo = quillInstance.getLine?.(range.index);
  if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2)
    return false;

  const [line, offset] = lineInfo as [any, number];
  const lineStart = range.index - offset;
  const lineLength = typeof line?.length === "function" ? line.length() : 0;
  const rawLineText = (quillInstance.getText?.(lineStart, Math.max(0, lineLength)) ?? "").replace(/\n$/, "");
  const leftText = rawLineText.slice(0, Math.max(0, offset));

  const token = parseHtmlToken(leftText);
  if (!token) {
    logHtmlDebug("detectHtmlTag:no-match", { leftText });
    return false;
  }

  const startIndex = lineStart + token.snippetStart;
  const deleteLength = token.snippet.length + token.trailingWhitespace.length;
  const fallbackText = token.snippet + token.trailingWhitespace;

  logHtmlDebug("detectHtmlTag:matched", {
    tag: token.tag,
    startIndex,
    deleteLength,
    trailingWhitespace: token.trailingWhitespace,
    snippet: token.snippet,
  });

  try {
    quillInstance.history.cutoff();
    quillInstance.deleteText(startIndex, deleteLength, "user");

    let selectionIndex = startIndex;
    let handled = false;

    if (token.tag === "a") {
      const result = applyAnchorReplacement(quillInstance, startIndex, token);
      if (result != null) {
        selectionIndex = result;
        handled = true;
      }
    }
    else if (token.tag === "img") {
      const result = applyImageReplacement(quillInstance, startIndex, token);
      if (result != null) {
        selectionIndex = result;
        handled = true;
      }
    }
    else {
      const result = applyElementReplacement(quillInstance, startIndex, token);
      if (result != null) {
        selectionIndex = result;
        handled = true;
      }
    }

    if (!handled) {
      logHtmlDebug("detectHtmlTag:unhandled", { tag: token.tag });
      fallbackInsertOriginal(quillInstance, startIndex, fallbackText);
      return false;
    }

    if (token.trailingWhitespace) {
      quillInstance.insertText(selectionIndex, token.trailingWhitespace, "user");
      selectionIndex += token.trailingWhitespace.length;
    }

    quillInstance.setSelection(selectionIndex, 0, "silent");
    quillInstance.history.cutoff();
    logHtmlDebug("detectHtmlTag:success", { tag: token.tag, selectionIndex });
    return true;
  }
  catch (error) {
    logHtmlDebug("detectHtmlTag:error", { error: error instanceof Error ? error.message : String(error) });
    fallbackInsertOriginal(quillInstance, startIndex, fallbackText);
    return false;
  }
}

function parseHtmlToken(leftText: string): HtmlToken | null {
  if (!leftText)
    return null;

  const trailingMatch = leftText.match(TRAILING_SPACE_PATTERN);
  const trailingWhitespace = trailingMatch ? trailingMatch[0] : "";
  const trimmed = trailingWhitespace ? leftText.slice(0, -trailingWhitespace.length) : leftText;

  if (!trimmed)
    return null;

  for (const rule of HTML_RULES) {
    const execResult = rule.outerPattern.exec(trimmed);
    if (!execResult)
      continue;

    const snippet = execResult[1];
    if (!snippet)
      continue;

    const snippetStart = typeof execResult.index === "number"
      ? execResult.index
      : trimmed.length - snippet.length;

    const sanitized = sanitizeSnippet(snippet, rule.tag, rule.isVoid);
    if (!sanitized) {
      logHtmlDebug("parseHtmlToken:sanitize-failed", { tag: rule.tag, snippet });
      continue;
    }

    return {
      tag: rule.tag,
      snippet,
      snippetStart,
      trailingWhitespace,
      isVoid: rule.isVoid,
      ...sanitized,
    };
  }

  return null;
}

function sanitizeSnippet(snippet: string, tag: SupportedHtmlTag, isVoid: boolean): SanitizedSnippet | null {
  if (typeof document === "undefined")
    return legacySanitizeFallback(snippet, tag, isVoid);

  const container = document.createElement("div");
  container.innerHTML = snippet;

  const element = container.firstElementChild as HTMLElement | null;
  if (!element || element.tagName.toLowerCase() !== tag)
    return null;

  const attributes = sanitizeElementAttributes(element, tag);
  if (!attributes)
    return null;

  if (isVoid) {
    return {
      attributes,
      sanitizedHtml: null,
      plainText: "",
    };
  }

  const rawText = element.textContent ?? "";
  element.textContent = rawText;

  return {
    attributes,
    sanitizedHtml: element.outerHTML,
    plainText: rawText,
  };
}

function sanitizeElementAttributes(element: HTMLElement, tag: SupportedHtmlTag): Record<string, string> | null {
  const allowed = new Set(["id", "width", "height", "ref"]);
  if (tag === "a")
    allowed.add("href");
  if (tag === "img")
    allowed.add("src");

  const sanitized: Record<string, string> = {};
  const attrs = Array.from(element.attributes);

  for (const attr of attrs) {
    const name = attr.name.toLowerCase();
    if (name === "style") {
      logHtmlDebug("sanitizeElementAttributes:style-rejected", { tag, snippet: element.outerHTML });
      return null;
    }

    if (!allowed.has(name)) {
      element.removeAttribute(attr.name);
      continue;
    }

    const value = attr.value.trim();
    if (!value) {
      element.removeAttribute(attr.name);
      continue;
    }

    if (tag === "a" && name === "href" && /^javascript:/i.test(value)) {
      logHtmlDebug("sanitizeElementAttributes:href-rejected", { value });
      return null;
    }

    sanitized[name] = value;
    element.setAttribute(attr.name, value);
  }

  if (tag === "a" && !sanitized.href)
    return null;
  if (tag === "img" && !sanitized.src)
    return null;

  return sanitized;
}

function legacySanitizeFallback(snippet: string, tag: SupportedHtmlTag, isVoid: boolean): SanitizedSnippet | null {
  const attrMatch = tag === "img"
    ? /^<img\b([^<>]*?)(?:\/>|>)$/i.exec(snippet)
    : /^<([a-z]+)\b([^>]*)>([\s\S]*?)<\/[a-z]+\s*>$/i.exec(snippet);

  if (!attrMatch)
    return null;

  const attrRaw = isVoid ? (attrMatch[1] ?? "") : (attrMatch[2] ?? "");
  const attributes = sanitizeAttributesFallback(attrRaw, tag);
  if (!attributes)
    return null;

  const plainText = isVoid ? "" : (attrMatch[isVoid ? 0 : 3] ?? "");
  const sanitizedHtml = isVoid ? null : buildFallbackHtml(tag, attributes, plainText);

  return {
    attributes,
    sanitizedHtml,
    plainText,
  };
}

function sanitizeAttributesFallback(raw: string, tag: SupportedHtmlTag): Record<string, string> | null {
  const allowed = new Set(["id", "width", "height", "ref"]);
  if (tag === "a")
    allowed.add("href");
  if (tag === "img")
    allowed.add("src");

  const attrs: Record<string, string> = {};
  const attrRegex = /([a-z_:][\w:.-]*)\s*=\s*"([^"]*)"/gi;
  for (const match of raw.matchAll(attrRegex)) {
    const name = match[1].toLowerCase();
    if (!allowed.has(name))
      continue;

    const value = match[2].trim();
    if (!value)
      continue;
    if (name === "href" && /^javascript:/i.test(value))
      return null;
    attrs[name] = value;
  }

  if (tag === "a" && !attrs.href)
    return null;
  if (tag === "img" && !attrs.src)
    return null;

  return attrs;
}

function buildFallbackHtml(tag: SupportedHtmlTag, attrs: Record<string, string>, innerContent: string): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(attrs)) {
    const safeVal = val.replace(/"/g, "&quot;");
    parts.push(`${key}="${safeVal}"`);
  }
  const openTag = parts.length > 0
    ? `<${tag} ${parts.join(" ")}>`
    : `<${tag}>`;
  const safeInner = innerContent
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `${openTag}${safeInner}</${tag}>`;
}

function applyAnchorReplacement(quillInstance: QuillLike, startIndex: number, token: HtmlToken): number | null {
  const href = token.attributes.href;
  if (!href)
    return null;

  const collapsed = token.plainText.replace(/\s+/g, " ").trim();
  const displayText = collapsed.length > 0 ? collapsed : href;

  quillInstance.insertText(startIndex, displayText, "user");
  quillInstance.formatText(startIndex, displayText.length, "link", href, "user");
  applyAnchorAttributes(quillInstance, startIndex, displayText.length, token.attributes);
  logHtmlDebug("applyAnchorReplacement", { href, displayText });
  return startIndex + displayText.length;
}

function applyImageReplacement(quillInstance: QuillLike, startIndex: number, token: HtmlToken): number | null {
  const src = token.attributes.src;
  if (!src)
    return null;

  quillInstance.insertEmbed(startIndex, "image", src, "user");
  applyImageAttributes(quillInstance, startIndex, token.attributes);
  logHtmlDebug("applyImageReplacement", { src });
  return startIndex + 1;
}

function applyElementReplacement(quillInstance: QuillLike, startIndex: number, token: HtmlToken): number | null {
  if (!token.sanitizedHtml || !quillInstance.clipboard?.dangerouslyPasteHTML)
    return null;

  quillInstance.clipboard.dangerouslyPasteHTML(startIndex, token.sanitizedHtml, "user");
  const afterSel = quillInstance.getSelection?.(true);
  if (afterSel && typeof afterSel.index === "number") {
    logHtmlDebug("applyElementReplacement", { tag: token.tag, selectionIndex: afterSel.index });
    return afterSel.index;
  }

  return startIndex + (token.plainText.length > 0 ? token.plainText.length : 1);
}

function fallbackInsertOriginal(quillInstance: QuillLike, startIndex: number, original: string): void {
  try {
    quillInstance.insertText(startIndex, original, "user");
  }
  catch (error) {
    logHtmlDebug("fallbackInsertOriginal:error", { error: error instanceof Error ? error.message : String(error) });
  }
}

function applyAnchorAttributes(quillInstance: QuillLike, startIndex: number, _length: number, attributes: Record<string, string>): void {
  if (typeof window === "undefined")
    return;
  try {
    const leafTuple = quillInstance.getLeaf?.(startIndex);
    const leaf = Array.isArray(leafTuple) ? leafTuple[0] : null;
    const linkNode = (leaf?.parent?.domNode instanceof HTMLAnchorElement)
      ? leaf.parent.domNode as HTMLAnchorElement
      : (leaf?.domNode?.parentElement instanceof HTMLAnchorElement ? leaf.domNode.parentElement : null);
    if (!linkNode)
      return;
    if (attributes.id)
      linkNode.id = attributes.id;
    if (attributes.ref)
      linkNode.setAttribute("data-ref", attributes.ref);
    if (attributes.width)
      linkNode.setAttribute("data-width", attributes.width);
    if (attributes.height)
      linkNode.setAttribute("data-height", attributes.height);
  }
  catch (error) {
    logHtmlDebug("applyAnchorAttributes:error", { error: error instanceof Error ? error.message : String(error) });
  }
}

function applyImageAttributes(quillInstance: QuillLike, startIndex: number, attributes: Record<string, string>): void {
  if (typeof window === "undefined")
    return;
  try {
    const leafTuple = quillInstance.getLeaf?.(startIndex);
    const leaf = Array.isArray(leafTuple) ? leafTuple[0] : null;
    const imgNode = leaf?.domNode instanceof HTMLImageElement ? leaf.domNode : null;
    if (!imgNode)
      return;
    if (attributes.id)
      imgNode.id = attributes.id;
    if (attributes.ref)
      imgNode.setAttribute("data-ref", attributes.ref);
    if (attributes.width)
      imgNode.setAttribute("width", attributes.width);
    if (attributes.height)
      imgNode.setAttribute("height", attributes.height);
  }
  catch (error) {
    logHtmlDebug("applyImageAttributes:error", { error: error instanceof Error ? error.message : String(error) });
  }
}
