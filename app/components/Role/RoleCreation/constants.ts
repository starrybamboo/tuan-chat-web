import type { Step } from "./types";

// 统一的创建步骤
export const UNIFIED_STEPS: Step[] = [
  { id: 1, title: "基础信息" },
  { id: 2, title: "选择规则" },
  { id: 3, title: "角色表演" },
  { id: 4, title: "能力配置" },
  { id: 5, title: "技能设定" },
];

// 保留旧的步骤定义以兼容（可选，后续可移除）
export const STEPS: Step[] = UNIFIED_STEPS;
export const AI_STEPS: Step[] = UNIFIED_STEPS;
export const ST_STEPS: Step[] = UNIFIED_STEPS;
