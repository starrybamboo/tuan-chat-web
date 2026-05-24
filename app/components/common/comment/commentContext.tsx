import { createContext } from "react";
import type { CommentTargetInfo } from "../../../../api/hooks/commentQueryHooks";

export interface CommentTreeOptions {
  childLimit: number;
  maxLevel: number;
}

export interface CommentContextType {
  targetInfo: CommentTargetInfo;
  treeOptions?: CommentTreeOptions;
}

export const CommentContext = createContext<CommentContextType>({
  targetInfo: {
    targetId: -1,
    targetType: "-1",
  },
  treeOptions: undefined,
});
