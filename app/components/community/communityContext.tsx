import { createContext } from "react";

export interface CommunityContextType {
  communityId?: number; // 当前激活的communityID
}

export const CommunityContext = createContext<CommunityContextType>({
  communityId: undefined,
});
