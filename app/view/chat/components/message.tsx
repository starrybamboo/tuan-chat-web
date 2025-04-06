import type { RoleAvatar, UserRole } from "../../../../api";
// import type { RoleAvatar, UserRole } from "../../../../api";
import { mockRoles as roles } from "@/view/chat/components/role";

export interface Message {
  avatar: RoleAvatar;
  userRole: UserRole;
  messageId: number;
  userId: number;
  roleId: number;
  content: string;
  type: number; // 0: system, 1: user.tsx, 2: group
  createTime: Date;
  updateTime: Date;
}

export const mockMessages: Message[] = [{
  avatar: roles[0].roleAvatars[0],
  userRole: roles[0].userRole,
  messageId: 1,
  content: "团聚共创聊天室demo",
  type: 0,
  createTime: new Date(Date.now() - 40000),
  userId: 0,
  roleId: 0,
  updateTime: new Date(Date.now() - 40000),
}, {
  avatar: roles[1].roleAvatars[0],
  userRole: roles[1].userRole,
  messageId: 2,
  content: "gugugaga\ngugugaga!",
  type: 1,
  createTime: new Date(Date.now() - 40000),
  userId: 0,
  roleId: 0,
  updateTime: new Date(Date.now() - 40000),
}, {
  avatar: roles[2].roleAvatars[0],
  userRole: roles[2].userRole,
  messageId: 3,
  content: "喵喵喵喵喵喵",
  type: 1,
  createTime: new Date(Date.now() - 40000),
  userId: 0,
  roleId: 0,
  updateTime: new Date(Date.now() - 40000),
}];
