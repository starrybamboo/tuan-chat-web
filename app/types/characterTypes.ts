// types.ts
// 一个角色应该有东西
export type Role = {
  id: number;
  avatar?: string;
  name: string;
  description: string;
  avatarId: number;
  type?: number; // 角色类型,0:角色,1:骰娘
  modelName?: string;
  speakerName?: string;
  voiceUrl?: string;
  extra?: Record<string, string>; // 角色扩展属性
};
