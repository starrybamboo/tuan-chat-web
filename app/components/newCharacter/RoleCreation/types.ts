export type CharacterData = {
  // 基础信息
  name: string;
  description: string;
  avatar: string;
  // 规则和能力
  ruleSystem: string;
  act: Record<string, string>;
  basic: Record<string, string>;
  ability: Record<string, string>;
  skill: Record<string, string>;
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
