import type { MarkTarget } from "api";
import { createContext } from "react";

export interface CommentTreeOptions {
  childLimit: number;
  maxLevel: number;
}

export interface CommentContextType {
  targetInfo: MarkTarget;
  treeOptions?: CommentTreeOptions;
}

export const CommentContext = createContext<CommentContextType>({
  targetInfo: {
    targetId: -1,
    targetType: "-1",
  },
  treeOptions: undefined,
});
