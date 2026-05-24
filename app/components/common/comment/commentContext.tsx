import type { CommentTargetInfo } from "../../../../api/hooks/commentQueryHooks";
import { createContext } from "react";

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
