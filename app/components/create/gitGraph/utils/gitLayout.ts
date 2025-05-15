import type { GraphData } from "@antv/g6";

import { BaseLayout, ExtensionCategory, register } from "@antv/g6";

import type { BranchMap, GitNodeData } from "./types";

const GitLayoutId = "git-graph-layout";
class GitLayout extends BaseLayout {
  id = GitLayoutId;
  async execute(model: GraphData): Promise<GraphData> {
    const xOffsetBasis = 20; // 每个 branch 之间的 x 轴间隔
    const yOffsetbasis = 20; // 每个 branch 之间的 y 轴间隔
    const yOffset = 40; // 每个 node 之间的 y 轴间隔
    const branches: BranchMap = new Map();
    const nodes = (model.nodes || []) as GitNodeData[];

    const newNodes: GitNodeData[] = nodes.map((node) => {
      const { depth, branch } = node.data;
      if (!branches.has(branch)) {
        branches.set(branch, {
          xOffset: branches.size * xOffsetBasis,
          yOffset: branches.size * yOffsetbasis,
        });
      }
      const branchData = branches.get(branch)!;
      return {
        ...node,
        style: {
          x: branchData.xOffset,
          y: depth * yOffset + branchData.yOffset!,
        },
        data: {
          ...node.data,
        },
      };
    });
    return {
      nodes: newNodes,
    };
  }
}

register(ExtensionCategory.LAYOUT, GitLayoutId, GitLayout);

export default GitLayout;
