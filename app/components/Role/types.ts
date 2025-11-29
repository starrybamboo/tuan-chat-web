// types.ts
// 一个角色应该有东西
export type Role = {
  // 基础信息
  id: number;
  name: string;
  description: string;
  avatar?: string;
  avatarId: number;
  modelName?: string;
  speakerName?: string;
  voiceUrl?: string;
  extra?: Record<string, string>;
  // 规则ID（后端规则主键）
  ruleId?: number;
  // 角色属性数据
  act?: Record<string, string>;
  basic?: Record<string, string>;
  ability?: Record<string, string>;
  skill?: Record<string, string>;
};
