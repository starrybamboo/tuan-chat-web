import type { MaterialMessageItem } from "../../../../api/models/MaterialMessageItem";
import type { MaterialNode } from "../../../../api/models/MaterialNode";
import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";

import { MaterialNode as MaterialNodeModel } from "../../../../api/models/MaterialNode";
import { MessageType } from "../../../../api/wsModels";
import { createEmptyMaterialPackageContent } from "./materialPackageEditorShared";

export type MaterialNodePath = number[];

export type MaterialOverviewItem = {
  key: string;
  path: MaterialNodePath;
  title: string;
  note: string;
  folderTrail: string[];
  assetCount: number;
  assetKinds: string[];
};

export const ROOT_NODE_KEY = "root";

export function cloneMaterialPackageContent(content?: MaterialPackageContent): MaterialPackageContent {
  return JSON.parse(JSON.stringify(content ?? createEmptyMaterialPackageContent())) as MaterialPackageContent;
}

export function ensureMaterialPackageContent(content?: MaterialPackageContent): MaterialPackageContent {
  const next = cloneMaterialPackageContent(content);
  next.version = next.version ?? 1;
  next.root = Array.isArray(next.root) ? next.root : [];
  return next;
}

export function createFolderNode(name = "新建文件夹"): MaterialNode {
  return {
    type: MaterialNodeModel.type.FOLDER,
    name,
    children: [],
  };
}

export function createMaterialNode(name = "新素材单元"): MaterialNode {
  return {
    type: MaterialNodeModel.type.MATERIAL,
    name,
    note: "",
    messages: [],
  };
}

export function serializeNodePath(path: MaterialNodePath): string {
  return path.join(".");
}

export function parseNodePath(pathKey: string): MaterialNodePath {
  if (!pathKey || pathKey === ROOT_NODE_KEY) {
    return [];
  }

  return pathKey
    .split(".")
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && value >= 0);
}

export function getNodeLabel(node: MaterialNode | null | undefined, fallback: string) {
  return node?.name?.trim() || fallback;
}

export function getNodeAtPath(nodes: MaterialNode[] | undefined, path: MaterialNodePath): MaterialNode | null {
  const source = Array.isArray(nodes) ? nodes : [];
  if (path.length === 0) {
    return null;
  }

  let current: MaterialNode | undefined;
  let currentNodes = source;

  for (const index of path) {
    current = currentNodes[index];
    if (!current) {
      return null;
    }
    currentNodes = Array.isArray(current.children) ? current.children : [];
  }

  return current ?? null;
}

function updateNodeListAtPath(
  nodes: MaterialNode[],
  path: MaterialNodePath,
  updater: (node: MaterialNode) => MaterialNode,
): MaterialNode[] {
  const [head, ...rest] = path;
  return nodes.map((node, index) => {
    if (index !== head) {
      return node;
    }

    if (rest.length === 0) {
      return updater(node);
    }

    if (node.type !== MaterialNodeModel.type.FOLDER) {
      return node;
    }

    return {
      ...node,
      children: updateNodeListAtPath([...(node.children ?? [])], rest, updater),
    };
  });
}

export function updateNodeInContent(
  content: MaterialPackageContent,
  path: MaterialNodePath,
  updater: (node: MaterialNode) => MaterialNode,
): MaterialPackageContent {
  const next = ensureMaterialPackageContent(content);
  if (path.length === 0) {
    return next;
  }

  next.root = updateNodeListAtPath([...(next.root ?? [])], path, updater);
  return next;
}

function removeNodeAtPathFromList(nodes: MaterialNode[], path: MaterialNodePath): MaterialNode[] {
  const [head, ...rest] = path;

  if (rest.length === 0) {
    return nodes.filter((_, index) => index !== head);
  }

  return nodes.map((node, index) => {
    if (index !== head || node.type !== MaterialNodeModel.type.FOLDER) {
      return node;
    }

    return {
      ...node,
      children: removeNodeAtPathFromList([...(node.children ?? [])], rest),
    };
  });
}

export function removeNodeFromContent(
  content: MaterialPackageContent,
  path: MaterialNodePath,
): MaterialPackageContent {
  const next = ensureMaterialPackageContent(content);
  if (path.length === 0) {
    return next;
  }

  next.root = removeNodeAtPathFromList([...(next.root ?? [])], path);
  return next;
}

export function appendNodeToContent(
  content: MaterialPackageContent,
  parentPath: MaterialNodePath,
  node: MaterialNode,
): MaterialPackageContent {
  const next = ensureMaterialPackageContent(content);

  if (parentPath.length === 0) {
    next.root = [...(next.root ?? []), node];
    return next;
  }

  return updateNodeInContent(next, parentPath, currentNode => ({
    ...currentNode,
    children: [...(currentNode.children ?? []), node],
  }));
}

export function collectFolderKeys(nodes: MaterialNode[] | undefined, parentPath: MaterialNodePath = []): string[] {
  const result: string[] = [];

  (nodes ?? []).forEach((node, index) => {
    if (node.type !== MaterialNodeModel.type.FOLDER) {
      return;
    }

    const nextPath = [...parentPath, index];
    result.push(serializeNodePath(nextPath));
    result.push(...collectFolderKeys(node.children, nextPath));
  });

  return result;
}

function getMessageKindLabel(message: MaterialMessageItem) {
  switch (message.messageType) {
    case MessageType.IMG:
      return "图片";
    case MessageType.SOUND:
      return "音频";
    case MessageType.VIDEO:
      return "视频";
    case MessageType.FILE:
      return "文件";
    default:
      return "素材";
  }
}

export function getMessageKindLabels(messages: MaterialMessageItem[] | undefined) {
  const uniqueLabels = new Set<string>();
  for (const message of messages ?? []) {
    uniqueLabels.add(getMessageKindLabel(message));
  }
  return [...uniqueLabels];
}

export function collectMaterialOverview(
  nodes: MaterialNode[] | undefined,
  folderTrail: string[] = [],
  parentPath: MaterialNodePath = [],
): MaterialOverviewItem[] {
  const result: MaterialOverviewItem[] = [];

  (nodes ?? []).forEach((node, index) => {
    const nextPath = [...parentPath, index];
    if (node.type === MaterialNodeModel.type.FOLDER) {
      result.push(...collectMaterialOverview(
        node.children,
        [...folderTrail, getNodeLabel(node, "未命名文件夹")],
        nextPath,
      ));
      return;
    }

    if (node.type === MaterialNodeModel.type.MATERIAL) {
      result.push({
        key: serializeNodePath(nextPath),
        path: nextPath,
        title: getNodeLabel(node, "未命名素材"),
        note: node.note?.trim() || "",
        folderTrail,
        assetCount: node.messages?.length ?? 0,
        assetKinds: getMessageKindLabels(node.messages),
      });
    }
  });

  return result;
}

function countNodesByType(nodes: MaterialNode[] | undefined, targetType: MaterialNode.type): number {
  let count = 0;

  for (const node of nodes ?? []) {
    if (node.type === targetType) {
      count += 1;
    }
    if (node.type === MaterialNodeModel.type.FOLDER) {
      count += countNodesByType(node.children, targetType);
    }
  }

  return count;
}

export function countFolderNodes(nodes: MaterialNode[] | undefined) {
  return countNodesByType(nodes, MaterialNodeModel.type.FOLDER);
}

export function countMaterialNodes(nodes: MaterialNode[] | undefined) {
  return countNodesByType(nodes, MaterialNodeModel.type.MATERIAL);
}

export function countMaterialAssets(nodes: MaterialNode[] | undefined): number {
  let count = 0;

  for (const node of nodes ?? []) {
    if (node.type === MaterialNodeModel.type.MATERIAL) {
      count += node.messages?.length ?? 0;
    }
    if (node.type === MaterialNodeModel.type.FOLDER) {
      count += countMaterialAssets(node.children);
    }
  }

  return count;
}
