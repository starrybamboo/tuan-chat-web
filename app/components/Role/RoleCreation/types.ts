export type CharacterData = {
  // 基础信息
  id?: number;
  name: string;
  description: string;
  modelName?: string;
  speakerName?: string;
  voiceUrl?: string;
  avatar?: string;
  avatarId?: number;
  // 规则ID（后端规则主键）
  ruleId: number;
  act: Record<string, string>;
  basic: Record<string, string>;
  ability: Record<string, string>;
  skill: Record<string, string>;
};

export type Step = {
  id: number;
  title: string;
};
