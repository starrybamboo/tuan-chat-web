import type { EdgeOptions, GraphData, NodeOptions } from "@antv/g6";

import type { Branch, BranchMap, Commit, GitEdgeData, GitNodeData } from "./types";

/**
 * 生成随机的十六进制颜色代码
 * @returns 形如 #66ccff 的颜色字符串
 */
function generateRandomColor(): string {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  // 将 RGB 值转换为十六进制，并确保是两位数
  const toHex = (n: number) => n.toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 颜色生成器，循环使用预定义的颜色
 * @returns 颜色字符串
 */
function* colorGenerator() {
  const ColorPalette = ["#66ccff", "#F4664A"];
  let index = 0;
  while (true) {
    yield ColorPalette[index % ColorPalette.length];
    index++;
  }
}

/**
 * @description 将后端返回的 git 数据, 重构为可供 antv/g6 使用的数据格式
 */
function formatter({ branches: _branches, commits }: { branches: Branch[]; commits: Commit[] }): GraphData {
  // 创建并初始化 branch map
  const branches: BranchMap = new Map();
  const colorGen = colorGenerator();
  // 第一遍遍历，收集所有的 branch 信息
  commits.forEach((commit) => {
    const { branch } = commit;
    if (!branches.has(branch)) {
      branches.set(branch, {
        color: colorGen.next().value ?? generateRandomColor(),
      });
    }
  });
  // 构建节点
  const nodes: GitNodeData[] = commits.map((commit) => {
    const branchData = branches.get(commit.branch)!;
    return {
      id: commit.commitId.toString(),
      label: commit.commitId,
      data: {
        message: commit.message,
        depth: commit.depth,
        branch: commit.branch,
        color: branchData.color, // 为节点添加颜色
      },
    };
  });

  // 构建边
  const edges: GitEdgeData[] = commits.map((commit) => {
    if (commit.firstParentId === null && commit.secondParentId === null) {
      return null;
    }

    const newEdges: GitEdgeData[] = [];
    const currentBranchColor = branches.get(commit.branch)!.color;

    // 直接父节点情况
    if (commit.firstParentId !== null) {
      newEdges.push({
        source: commit.firstParentId.toString(),
        target: commit.commitId.toString(),
        data: {
          isMerge: false,
          color: currentBranchColor,
        },
      });
    }

    // merge 父节点情况
    if (commit.secondParentId !== null) {
      let color: string;
      // checkout 的第一个节点,没有直接父节点
      if (commit.firstParentId === null) {
        color = currentBranchColor!;
      }
      else {
        // merge 的节点, 有直接父节点和 merge 父节点
        // 这时候需要取 merge 父节点的颜色
        const secondParentNode = commits.find(c => c.commitId === commit.secondParentId);
        const mergeBranch = branches.get(secondParentNode!.branch);
        color = mergeBranch!.color!;
      }
      newEdges.push({
        source: commit.secondParentId.toString(),
        target: commit.commitId.toString(),
        data: {
          isMerge: true,
          color,
        },
      });
    }

    return newEdges;
  }).flat(2).filter(edge => edge !== null) as GitEdgeData[];

  return { nodes, edges };
}

// 修改 nodeOption，使用传入的颜色
const nodeOption: NodeOptions = {
  type: "git-node",
  style: {
    size: 8,
    label: true,
    stroke: "#fff",
    lineWidth: 1,
    fill: (rawData) => {
      const gitNode = (rawData as unknown) as GitNodeData;
      return gitNode.data.color;
    },
    cursor: "pointer",
    // labelText: (rawData) => {
    //   const gitNode = (rawData as unknown) as GitNodeData;
    //   return gitNode.id;
    // },
  },
};

// 修改 edgeOption，添加颜色属性
const edgeOption: EdgeOptions = {
  type: "cubic-vertical",
  style: {
    lineWidth: 2,
    curveOffset: 0,
    curvePosition: 0.5,
    stroke: (edgeData) => {
      const gitEdge = (edgeData as unknown) as GitEdgeData;
      return gitEdge.data.color;
    }, // 使用边的颜色
  },
};

export {
  edgeOption,
  formatter,
  nodeOption,
};
