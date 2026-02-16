import type { SpaceUserDocResponse } from "../../../../../api/models/SpaceUserDocResponse";

export const UNTAGGED_KEY = "__untagged__";

export type FolderNode = {
  key: string;
  tagPath: string;
  label: string;
  depth: number;
  docs: SpaceUserDocResponse[];
  children: FolderNode[];
};

type FolderNodeDraft = {
  key: string;
  tagPath: string;
  label: string;
  depth: number;
  docs: SpaceUserDocResponse[];
  childrenKeys: string[];
  childKeySet: Set<string>;
};

function normalizeTag(tag: string | null | undefined): string {
  return (tag ?? "").trim();
}

function splitTagPath(tag: string): string[] {
  return tag
    .split("/")
    .map(part => part.trim())
    .filter(Boolean);
}

export function normalizeTagPath(tag: string | null | undefined): string {
  return splitTagPath(normalizeTag(tag)).join("/");
}

function sortByLabelZh<T extends { label: string }>(a: T, b: T): number {
  return a.label.localeCompare(b.label, "zh-CN");
}

export function buildFolderNodes(docs: SpaceUserDocResponse[], localTagPaths: string[] = []): FolderNode[] {
  const nodeMap = new Map<string, FolderNodeDraft>();

  const ensureNode = (params: {
    key: string;
    tagPath: string;
    label: string;
    depth: number;
  }): FolderNodeDraft => {
    const existing = nodeMap.get(params.key);
    if (existing)
      return existing;
    const created: FolderNodeDraft = {
      key: params.key,
      tagPath: params.tagPath,
      label: params.label,
      depth: params.depth,
      docs: [],
      childrenKeys: [],
      childKeySet: new Set<string>(),
    };
    nodeMap.set(params.key, created);
    return created;
  };

  ensureNode({
    key: UNTAGGED_KEY,
    tagPath: "",
    label: "未分类",
    depth: 0,
  });

  const ensurePathNodes = (tagPath: string): string | null => {
    const normalizedPath = normalizeTagPath(tagPath);
    if (!normalizedPath)
      return null;

    const pathParts = splitTagPath(normalizedPath);
    let parentKey: string | null = null;
    for (let i = 0; i < pathParts.length; i += 1) {
      const path = pathParts.slice(0, i + 1).join("/");
      const node = ensureNode({
        key: path,
        tagPath: path,
        label: pathParts[i],
        depth: i,
      });
      if (parentKey) {
        const parent = nodeMap.get(parentKey);
        if (parent && !parent.childKeySet.has(node.key)) {
          parent.childKeySet.add(node.key);
          parent.childrenKeys.push(node.key);
        }
      }
      parentKey = node.key;
    }
    return parentKey;
  };

  for (const doc of docs) {
    const normalizedTag = normalizeTagPath(doc?.tag ?? "");
    if (!normalizedTag) {
      nodeMap.get(UNTAGGED_KEY)?.docs.push(doc);
      continue;
    }

    // 使用 tag 的 "/" 作为前端虚拟文件夹层级分隔符。
    const parentKey = ensurePathNodes(normalizedTag);
    if (parentKey)
      nodeMap.get(parentKey)?.docs.push(doc);
  }

  for (const tagPath of localTagPaths) {
    ensurePathNodes(tagPath);
  }

  const materialize = (key: string): FolderNode => {
    const node = nodeMap.get(key);
    if (!node) {
      return {
        key,
        tagPath: key === UNTAGGED_KEY ? "" : key,
        label: key === UNTAGGED_KEY ? "未分类" : key,
        depth: 0,
        docs: [],
        children: [],
      };
    }
    const children = node.childrenKeys
      .map(childKey => materialize(childKey))
      .sort(sortByLabelZh);
    return {
      key: node.key,
      tagPath: node.tagPath,
      label: node.label,
      depth: node.depth,
      docs: node.docs,
      children,
    };
  };

  const roots = [...nodeMap.values()]
    .filter(node => node.key !== UNTAGGED_KEY && node.depth === 0)
    .sort(sortByLabelZh)
    .map(node => materialize(node.key));

  const untaggedNode = nodeMap.get(UNTAGGED_KEY);
  if (untaggedNode && untaggedNode.docs.length > 0)
    roots.unshift(materialize(UNTAGGED_KEY));

  return roots;
}
