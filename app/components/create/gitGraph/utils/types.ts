import type { BaseNodeStyleProps, EdgeData, NodeData } from "@antv/g6";

type Commit = {
  commitId: string;
  message: string;
  firstParentId: string | null;
  secondParentId: string | null;
  depth: number;
  branch: string;
};

type Branch = {
  name: string;
  headCommitId: number;
};

type BranchMap = Map<string, {
  color?: string;
  xOffset?: number;
  yOffset?: number;
}>;

type GitNodeData = {
  data: {
    depth: number;
    message: string;
    branch: string;
    color?: string;
  };
} & NodeData;

type GitEdgeData = {
  data: {
    isMerge: boolean;
    color?: string;
  };
} & EdgeData;

type GitNodeStyleProps = {
  subtitle?: string;
} & BaseNodeStyleProps;

export type { Branch, BranchMap, Commit, GitEdgeData, GitNodeData, GitNodeStyleProps };
