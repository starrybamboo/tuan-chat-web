import type { RoleAvatar, UserRole } from "../../../../api";

export interface RoleVO {
  userRole: UserRole;
  roleAvatars: RoleAvatar[];
  currentAvatarIndex: number;
}

export const mockRoles: RoleVO[] = [
  {
    userRole: {
      userId: 0,
      roleId: 0,
      roleName: "系统",
      description: "系统",
      avatarId: 0,
      createTime: (new Date(Date.now() - 40000)).toString(),
      updateTime: (new Date(Date.now() - 40000)).toString(),
    },
    roleAvatars: [
      {
        avatarId: 0,
        avatarUrl: "https://avatars.githubusercontent.com/u/47094597?v=4",
        roleId: 0,
      },
    ],
    currentAvatarIndex: 0,
  },
  {
    userRole: {
      userId: 0,
      roleId: 1,
      roleName: "用户",
      description: "旧都",
      avatarId: 0,
      createTime: (new Date(Date.now() - 40000)).toString(),
      updateTime: (new Date(Date.now() - 40000)).toString(),
    },
    roleAvatars: [
      {
        avatarId: 3,
        avatarUrl: "https://entropy622.github.io/img/avatar_hud9e0e7c4951e871acf83365066e399f1_1041756_300x0_resize_box_3.png",
        roleId: 1,
      },
      {
        avatarId: 4,
        avatarUrl: "https://avatars.githubusercontent.com/u/176760093?v=4",
        roleId: 1,
      },
    ],
    currentAvatarIndex: 0,
  },
  {
    userRole: {
      userId: 0,
      roleId: 2,
      roleName: "兴爷",
      description: "兴爷",
      avatarId: 5,
      createTime: (new Date(Date.now() - 40000)).toString(),
      updateTime: (new Date(Date.now() - 40000)).toString(),
    },
    roleAvatars: [
      {
        avatarId: 6,
        avatarUrl: "https://avatars.githubusercontent.com/u/107794984?v=4",
        roleId: 2,
      },
      {
        avatarId: 7,
        avatarUrl: "https://entropy622.github.io/img/avatar_hud9e0e7c4951e871acf83365066e399f1_1041756_300x0_resize_box_3.png",
        roleId: 2,
      },
    ],
    currentAvatarIndex: 0,
  },
];
