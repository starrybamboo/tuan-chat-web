import { createContext } from "react";

import type { CommentTargetInfo } from "../../../../api/hooks/commentQueryHooks";

export type CommentTreeOptions = {
  childLimit: number;
  maxLevel: number;
}

export type CommentContextType = {
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
