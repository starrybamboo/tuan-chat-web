import type { RuleSystem, Step } from "./types";

export const RULE_SYSTEMS: RuleSystem[] = [
  { id: "dnd5e", name: "D&D 5E", description: "龙与地下城第五版" },
  { id: "coc7e", name: "CoC 7E", description: "克苏鲁的呼唤第七版" },
  { id: "pathfinder", name: "Pathfinder", description: "探索者规则" },
  { id: "custom", name: "自定义", description: "自定义规则系统" },
];

export const SAMPLE_ATTRIBUTES = {
  dnd5e: {
    basic: { 力量: "10", 敏捷: "10", 体质: "10", 智力: "10", 感知: "10", 魅力: "10" },
    ability: { 生命值: "8", 护甲等级: "10", 先攻: "0", 速度: "30" },
    skill: { 运动: "0", 欺骗: "0", 历史: "0", 洞察: "0", 调查: "0", 医药: "0" },
    act: { 外貌: "外貌", 年龄: "年龄", 性别: "性别", 特质: "特质", 携带物品: "携带物品", 背景故事: "背景故事的描述" },
  },
  coc7e: {
    basic: { 力量: "50", 体质: "50", 体型: "50", 敏捷: "50", 外貌: "50", 智力: "50", 意志: "50", 教育: "50" },
    ability: { 生命值: "10", 魔法值: "10", 理智值: "50", 幸运: "50" },
    skill: { 会计: "5", 人类学: "1", 估价: "5", 考古学: "1", 魅惑: "15", 攀爬: "20" },
    act: { 外貌: "外貌", 年龄: "年龄", 性别: "性别", 特质: "特质", 携带物品: "携带物品", 背景故事: "背景故事的描述" },
  },
};

// 自主创建步骤
export const STEPS: Step[] = [
  { id: 1, title: "基础信息" },
  { id: 2, title: "选择规则" },
  { id: 3, title: "角色表演" },
  { id: 4, title: "能力配置" },
  { id: 5, title: "技能设定" },
];

// AI创建步骤
export const AI_STEPS: Step[] = [
  { id: 1, title: "基础信息" },
  { id: 2, title: "选择规则" },
  { id: 3, title: "AI生成" },
  { id: 4, title: "角色表演" },
  { id: 5, title: "能力配置" },
  { id: 6, title: "技能设定" },
];
