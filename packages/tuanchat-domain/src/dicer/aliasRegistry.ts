import type { RuleNameSpace } from "./cmd";

import executorCoc from "./cmdExe/cmdExeCoc";
import executorDnd from "./cmdExe/cmdExeDnd";
import executorFu from "./cmdExe/cmdExeFu";
import UTILS from "./utils/utils";

export const RULES: Map<number, RuleNameSpace> = new Map<number, RuleNameSpace>();
RULES.set(1, executorCoc);
RULES.set(2, executorDnd);
RULES.set(3, executorFu);
RULES.set(7, executorDnd);

const ALIAS_MAP_SET: { [key: string]: Map<string, string> } = {
  1: executorCoc.aliasMap,
  2: executorDnd.aliasMap,
  3: executorFu.aliasMap,
  7: executorDnd.aliasMap,
};

let initialized = false;

export function initAliasMapOnce(): void {
  if (initialized) {
    return;
  }
  UTILS.initAliasMap(ALIAS_MAP_SET);
  initialized = true;
}
