/**
 * 浏览器存储工具 - 管理角色与规则的映射关系
 * 存储每个角色上次选中的规则ID
 */

const STORAGE_KEY = "role_rule_mapping";

type RoleRuleMapping = {
  [roleId: number]: number; // roleId -> ruleId
};

/**
 * 获取角色对应的规则ID
 */
export function getRoleRule(roleId: number): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored)
      return null;

    const mapping: RoleRuleMapping = JSON.parse(stored);
    return mapping[roleId] ?? null;
  }
  catch (error) {
    console.error("获取角色规则映射失败:", error);
    return null;
  }
}

/**
 * 保存角色对应的规则ID
 */
export function setRoleRule(roleId: number, ruleId: number): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const mapping: RoleRuleMapping = stored ? JSON.parse(stored) : {};

    mapping[roleId] = ruleId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  }
  catch (error) {
    console.error("保存角色规则映射失败:", error);
  }
}
