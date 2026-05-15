export type EditableTextNodeLike = {
  nodeType: number;
  nodeName?: string;
  textContent?: string | null;
  childNodes?: ArrayLike<EditableTextNodeLike>;
  dataset?: Record<string, string | undefined>;
};

type EditableTextElementNodeLike = EditableTextNodeLike & {
  nodeType: 1;
};

type EditableTextTextNodeLike = EditableTextNodeLike & {
  nodeType: 3;
};

type ExtractEditableTextOptions = {
  omitMentions?: boolean;
};

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const BLOCK_TAG_NAMES = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DIV",
  "DL",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TR",
  "UL",
]);

function normalizeEditableText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

function isElementNode(node: EditableTextNodeLike | null | undefined): node is EditableTextElementNodeLike {
  return Boolean(node && node.nodeType === ELEMENT_NODE);
}

function isTextNode(node: EditableTextNodeLike | null | undefined): node is EditableTextTextNodeLike {
  return Boolean(node && node.nodeType === TEXT_NODE);
}

function getNodeName(node: EditableTextNodeLike) {
  return typeof node.nodeName === "string" ? node.nodeName.toUpperCase() : "";
}

function isMentionElement(node: EditableTextNodeLike) {
  return isElementNode(node) && typeof node.dataset?.role === "string";
}

function isBlockElement(node: EditableTextNodeLike) {
  return isElementNode(node) && BLOCK_TAG_NAMES.has(getNodeName(node));
}

function readEditableText(node: EditableTextNodeLike | null | undefined, options: ExtractEditableTextOptions): string {
  if (isTextNode(node)) {
    return node.textContent ?? "";
  }

  if (!isElementNode(node)) {
    return node?.textContent ?? "";
  }

  if (options.omitMentions && isMentionElement(node)) {
    return "";
  }

  if (getNodeName(node) === "BR") {
    return "\n";
  }

  const childNodes = node.childNodes ? Array.from(node.childNodes) : [];
  const childEntries = childNodes
    .map(child => ({ child, text: readEditableText(child, options) }))
    .filter(entry => entry.text.length > 0);

  let result = "";
  childEntries.forEach(({ child, text }, index) => {
    const childIsBlock = isBlockElement(child);
    if (childIsBlock && result && !result.endsWith("\n")) {
      result += "\n";
    }
    result += text;
    if (childIsBlock && index < childEntries.length - 1 && !result.endsWith("\n")) {
      result += "\n";
    }
  });

  return result;
}

export function extractEditablePlainText(
  root: EditableTextNodeLike | null | undefined,
  options: ExtractEditableTextOptions = {},
) {
  if (!root) {
    return "";
  }
  return normalizeEditableText(readEditableText(root, options));
}
