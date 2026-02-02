import type { RuleNameSpace } from "@/components/common/dicer/cmd";

import executorCoc from "@/components/common/dicer/cmdExe/cmdExeCoc";
import executorDnd from "@/components/common/dicer/cmdExe/cmdExeDnd";
import executorFu from "@/components/common/dicer/cmdExe/cmdExeFu";
import UTILS from "@/components/common/dicer/utils/utils";

// 统一维护规则执行器映射，外部统一从此处获取
export const RULES: Map<number, RuleNameSpace> = new Map<number, RuleNameSpace>();
RULES.set(1, executorCoc);
RULES.set(2, executorDnd);
RULES.set(3, executorFu);

// 统一维护别名映射集，供 AliasMap 初始化使用
const ALIAS_MAP_SET: { [key: string]: Map<string, string> } = {
  1: executorCoc.aliasMap,
  2: executorDnd.aliasMap,
  3: executorFu.aliasMap,
};

let initialized = false;

// 在首次使用前初始化一次别名映射；重复调用将被忽略
export function initAliasMapOnce(): void {
  if (initialized)
    return;
  UTILS.initAliasMap(ALIAS_MAP_SET);
  initialized = true;
}

// 可选：动态注册新规则执行器，同时更新别名映射集
export function registerExecutor(ruleId: number, executor: RuleNameSpace): void {
  RULES.set(ruleId, executor);
  ALIAS_MAP_SET[String(ruleId)] = executor.aliasMap;
  // 标记为未初始化，下一次显式调用 initAliasMapOnce 时会重新初始化
  initialized = false;
}
