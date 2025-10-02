import type { LikeRecordRequest } from "api";
import { createContext } from "react";

export interface CommentContextType {
  targetInfo: LikeRecordRequest;
}

export const CommentContext = createContext<CommentContextType>({
  targetInfo: {
    targetId: -1,
    targetType: "-1",
  },
});
