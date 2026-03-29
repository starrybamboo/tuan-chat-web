import type { MaterialMessageItem } from "../../../../api/models/MaterialMessageItem";
import type { MaterialNode } from "../../../../api/models/MaterialNode";

import { MaterialNode as MaterialNodeModel } from "../../../../api/models/MaterialNode";
import { MessageType } from "../../../../api/wsModels";
import { getNodeLabel, serializeNodePath } from "@/components/material/components/materialPackageTreeUtils";

export type MaterialSidebarVirtualNode = {
  key: string;
  kind: "folder" | "material" | "asset";
  label: string;
  meta?: string;
  path: number[];
  depth: number;
  messageCount: number;
  assetIndex?: number;
  message?: MaterialMessageItem;
  children: MaterialSidebarVirtualNode[];
};

function buildMaterialSidebarKey(spacePackageId: number, path: number[]): string {
  return `material-package:${spacePackageId}:${serializeNodePath(path)}`;
}

function buildMaterialAssetKey(spacePackageId: number, path: number[], assetIndex: number): string {
  return `${buildMaterialSidebarKey(spacePackageId, path)}:asset:${assetIndex}`;
}

function getNestedPayload(message: MaterialMessageItem, key: "imageMessage" | "soundMessage" | "videoMessage" | "fileMessage") {
  const extra = (message.extra ?? {}) as Record<string, any>;
  return extra[key] ?? extra;
}

function getMaterialAssetPresentation(message: MaterialMessageItem, index: number): {
  typeLabel: string;
  title: string;
  meta: string;
} {
  const annotationText = Array.isArray(message.annotations) && message.annotations.length > 0
    ? message.annotations.join(" / ")
    : "无标注";

  if (message.messageType === MessageType.IMG) {
    const image = getNestedPayload(message, "imageMessage");
    return {
      typeLabel: "图片",
      title: image?.fileName?.trim() || `图片素材 ${index + 1}`,
      meta: annotationText,
    };
  }

  if (message.messageType === MessageType.SOUND) {
    const sound = getNestedPayload(message, "soundMessage");
    return {
      typeLabel: "音频",
      title: sound?.fileName?.trim() || `音频素材 ${index + 1}`,
      meta: annotationText,
    };
  }

  if (message.messageType === MessageType.VIDEO) {
    const video = getNestedPayload(message, "videoMessage");
    return {
      typeLabel: "视频",
      title: video?.fileName?.trim() || `视频素材 ${index + 1}`,
      meta: annotationText,
    };
  }

  if (message.messageType === MessageType.FILE) {
    const file = getNestedPayload(message, "fileMessage");
    return {
      typeLabel: "文件",
      title: file?.fileName?.trim() || `文件素材 ${index + 1}`,
      meta: annotationText,
    };
  }

  return {
    typeLabel: "素材",
    title: message.content?.trim() || `素材 ${index + 1}`,
    meta: annotationText,
  };
}

export function buildMaterialSidebarTree(params: {
  spacePackageId: number;
  nodes?: MaterialNode[];
  parentPath?: number[];
  depth?: number;
}): MaterialSidebarVirtualNode[] {
  const {
    spacePackageId,
    nodes,
    parentPath = [],
    depth = 1,
  } = params;

  return (nodes ?? []).map((node, index) => {
    const path = [...parentPath, index];
    let children: MaterialSidebarVirtualNode[] = [];

    if (node.type === MaterialNodeModel.type.FOLDER) {
      children = buildMaterialSidebarTree({
        spacePackageId,
        nodes: node.children,
        parentPath: path,
        depth: depth + 1,
      });
    }
    else {
      children = (node.messages ?? []).map((message, messageIndex) => {
        const presentation = getMaterialAssetPresentation(message, messageIndex);
        return {
          key: buildMaterialAssetKey(spacePackageId, path, messageIndex),
          kind: "asset" as const,
          label: `${presentation.typeLabel} · ${presentation.title}`,
          meta: presentation.meta,
          path,
          depth: depth + 1,
          messageCount: 1,
          assetIndex: messageIndex,
          message,
          children: [],
        };
      });
    }

    return {
      key: buildMaterialSidebarKey(spacePackageId, path),
      kind: node.type === MaterialNodeModel.type.FOLDER ? "folder" : "material",
      label: getNodeLabel(node, node.type === MaterialNodeModel.type.FOLDER ? "未命名文件夹" : "未命名素材"),
      path,
      depth,
      messageCount: node.type === MaterialNodeModel.type.MATERIAL ? (node.messages?.length ?? 0) : 0,
      children,
    };
  });
}

export function collectMaterialExpandableKeys(nodes: MaterialSidebarVirtualNode[]): string[] {
  const result: string[] = [];

  for (const node of nodes) {
    if ((node.kind !== "folder" && node.kind !== "material") || node.children.length === 0) {
      continue;
    }
    result.push(node.key);
    result.push(...collectMaterialExpandableKeys(node.children));
  }

  return result;
}
