import { createContext } from "react";

export interface SpaceContextType {
  spaceId?: number; // 当前激活的spaceID
  isSpaceOwner?: boolean;
}

export const SpaceContext = createContext<SpaceContextType>({
  spaceId: undefined,
  isSpaceOwner: false,
});
