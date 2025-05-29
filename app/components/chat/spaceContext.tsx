import { createContext } from "react";

export interface SpaceContextType {
  spaceId?: number; // 当前激活的spaceID
  isSpaceOwner?: boolean;
  setActiveSpaceId: (id: number | null) => void;
  setActiveRoomId: (id: number | null) => void;
}

export const SpaceContext = createContext<SpaceContextType>({
  spaceId: undefined,
  isSpaceOwner: false,
  setActiveSpaceId: () => {},
  setActiveRoomId: () => {},
});
