import { createRoleAbilityAliasMapSet } from "@/components/common/dicer/roleAbilityAliasMaps";
import UTILS from "@/components/common/dicer/utils/utils";

import type { CharacterData } from "../types";

type CalculatedSection = "ability" | "skill";

export function evaluateCharacterDataExpressions(data: CharacterData): CharacterData {
  UTILS.initAliasMap(createRoleAbilityAliasMapSet());

  const nextData: CharacterData = {
    ...data,
    act: { ...data.act },
    basic: { ...data.basic },
    ability: { ...data.ability },
    skill: { ...data.skill },
  };

  for (const key of Object.keys(nextData.ability)) {
    const rawValue = nextData.ability[key];
    if (Number.isNaN(Number(rawValue)))
      nextData.ability[key] = String(safeCalculateExpression(rawValue, key, "ability", nextData));
  }

  for (const key of Object.keys(nextData.skill)) {
    const rawValue = nextData.skill[key];
    if (Number.isNaN(Number(rawValue)))
      nextData.skill[key] = String(safeCalculateExpression(rawValue, key, "skill", nextData));
  }

  return nextData;
}

function safeCalculateExpression(
  expression: string,
  key: string,
  section: CalculatedSection,
  data: CharacterData,
): number {
  try {
    return UTILS.calculateExpression(expression, data);
  }
  catch (error) {
    // 附带字段上下文，便于定位规则模板里的表达式错误。
    console.error("角色属性表达式计算失败", {
      section,
      key,
      expression,
      ability: data.ability,
      skill: data.skill,
      error,
    });
    throw error;
  }
}
