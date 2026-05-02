import UTILS from "@/components/common/dicer/utils/utils";

import type { CharacterData } from "../types";

export function evaluateCharacterDataExpressions(data: CharacterData): CharacterData {
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
  section: "ability" | "skill",
  data: CharacterData,
): number {
  try {
    return UTILS.calculateExpression(expression, data);
  }
  catch (error) {
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
