import type { MaterialNode } from "@tuanchat/openapi-client/models/MaterialNode";

import { getNodeLabel, serializeNodePath } from "@/components/material/components/materialPackageTreeUtils";
import { MaterialNode as MaterialNodeModel } from "@tuanchat/openapi-client/models/MaterialNode";

export type MaterialSidebarVirtualNode = {
  key: string;
  kind: "folder" | "material";
  label: string;
  meta?: string;
  path: number[];
  depth: number;
  messageCount: number;
  children: MaterialSidebarVirtualNode[];
};

function buildMaterialSidebarKey(spacePackageId: number, path: number[]): string {
  return `material-package:${spacePackageId}:${serializeNodePath(path)}`;
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
    const children = node.type === MaterialNodeModel.type.FOLDER
      ? buildMaterialSidebarTree({
          spacePackageId,
          nodes: node.children,
          parentPath: path,
          depth: depth + 1,
        })
      : [];

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
    if (node.kind !== "folder" || node.children.length === 0) {
      continue;
    }
    result.push(node.key);
    result.push(...collectMaterialExpandableKeys(node.children));
  }

  return result;
}
