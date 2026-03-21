import type { SpaceMember } from "../../../../api";
import { createContext } from "react";

export interface SpaceContextType {
  /** 当前激活的空间ID */
  spaceId?: number;

  /** 当前空间的规则ID */
  ruleId?: number;

  /** 标识当前用户是否拥有主持权限（主持人 / 副主持人） */
  isSpaceOwner?: boolean;

  /** 当前用户在空间内的成员类型 */
  memberType?: number;

  /** 是否可以调整其他成员权限 */
  canManageMemberPermissions?: boolean;

  /**
   * 设置激活空间ID的回调函数
   */
  setActiveSpaceId: (id: number | null) => void;

  /**
   * 群角色
   */
  spaceMembers: SpaceMember[];

  /**
   * 设置激活房间ID的回调函数
   */
  setActiveRoomId: (id: number | null) => void;

  /**
   * 开启左侧侧边栏的回调函数
   */
  toggleLeftDrawer: () => void;
}

export const SpaceContext = createContext<SpaceContextType>({
  spaceId: undefined,
  isSpaceOwner: false,
  memberType: undefined,
  canManageMemberPermissions: false,
  setActiveSpaceId: () => {},
  setActiveRoomId: () => {},
  ruleId: undefined,
  toggleLeftDrawer: () => {},
  spaceMembers: [],
});
