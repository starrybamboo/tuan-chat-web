import type { MarkTarget } from "api";
import { createContext } from "react";

export interface CommentContextType {
  targetInfo: MarkTarget;
}

export const CommentContext = createContext<CommentContextType>({
  targetInfo: {
    targetId: -1,
    targetType: "-1",
  },
});
