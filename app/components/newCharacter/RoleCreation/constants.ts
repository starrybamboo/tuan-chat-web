import type { Step } from "./types";

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

export const ST_STEPS: Step[] = [
  { id: 1, title: "基础信息" },
  { id: 2, title: "选择规则" },
  { id: 3, title: "角色表演" },
  { id: 4, title: "ST导入" },
  { id: 5, title: "能力配置" },
  { id: 6, title: "技能设定" },
];
