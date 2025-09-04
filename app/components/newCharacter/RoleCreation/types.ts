export type CharacterData = {
  // 基础信息
  name: string;
  description: string;
  avatar: string;
  // 规则和能力
  ruleSystem: string;
  act: Record<string, number | string>;
  basic: Record<string, number>;
  ability: Record<string, number>;
  skill: Record<string, number>;
};

export type RuleSystem = {
  id: string;
  name: string;
  description: string;
};

export type Step = {
  id: number;
  title: string;
};
