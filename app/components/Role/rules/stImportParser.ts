export type StAbilityDraft = {
  abilityId?: number;
  act: Record<string, string>;
  basic: Record<string, string>;
  ability: Record<string, string>;
  skill: Record<string, string>;
};

export type StTemplateKeySets = {
  basic: Set<string>;
  ability: Set<string>;
  skill: Set<string>;
};

export type ApplyStCommandToDraftParams = {
  cmd: string;
  draft: StAbilityDraft;
  templateKeys: StTemplateKeySets;
};

export type ApplyStCommandToDraftResult = {
  draft: StAbilityDraft;
  abilityToUpdate: Map<string, string>;
  abilityFieldsToDelete: Set<string>;
};

export const ST_ABILITY_MAP: Record<string, string> = {
  str: "力量",
  dex: "敏捷",
  pow: "意志",
  con: "体质",
  app: "外貌",
  edu: "教育",
  siz: "体型",
  int: "智力",
  san: "sanֵ",
  san值: "sanֵ",
  luck: "幸运",
  mp: "魔法",
  魔法值上限: "mpm",
  体力: "hp",
  体力值: "hp",
  生命值: "hp",
  最大生命值: "hpm",
  理智值上限: "sanm",
  理智上限: "sanm",
  cm: "克苏鲁神话",
  克苏鲁: "克苏鲁神话",
  计算机: "计算机使用",
  电脑: "计算机使用",
  灵感: "智力",
  理智: "sanֵ",
  理智值: "sanֵ",
  运气: "幸运",
  信用: "信用评级",
  信誉: "信用评级",
  驾驶: "汽车驾驶",
  汽车: "汽车驾驶",
  图书馆: "图书馆使用",
  开锁: "锁匠",
  撬锁: "锁匠",
  领航: "导航",
  重型操作: "操作重型机械",
  重型机械: "操作重型机械",
  重型: "操作重型机械",
  侦察: "侦查",
};

const ST_ABILITY_FALLBACK_KEYS = new Set([
  "hp",
  "mp",
  "san",
  "sanֵ",
  "hpm",
  "mpm",
  "sanm",
  "db",
  "护甲",
]);

type StFieldType = "basic" | "ability" | "skill";

function cloneDraft(draft: StAbilityDraft): StAbilityDraft {
  return {
    abilityId: draft.abilityId,
    act: { ...(draft.act ?? {}) },
    basic: { ...(draft.basic ?? {}) },
    ability: { ...(draft.ability ?? {}) },
    skill: { ...(draft.skill ?? {}) },
  };
}

function resolveFieldForKey(
  draft: StAbilityDraft,
  key: string,
  templateKeys: StTemplateKeySets,
): StFieldType {
  // 优先沿用当前数据所在分组，避免已有字段漂移
  if (key in draft.basic)
    return "basic";
  if (key in draft.ability)
    return "ability";
  if (key in draft.skill)
    return "skill";

  // 若当前分组没有该键，按规则模板归类
  if (templateKeys.basic.has(key))
    return "basic";
  if (templateKeys.ability.has(key))
    return "ability";
  if (templateKeys.skill.has(key))
    return "skill";

  // 模板未覆盖时，能力兜底键留在 ability，其余进入 skill
  if (ST_ABILITY_FALLBACK_KEYS.has(key.toLowerCase()) || ST_ABILITY_FALLBACK_KEYS.has(key))
    return "ability";
  return "skill";
}

function getFieldValue(draft: StAbilityDraft, field: StFieldType, key: string): string {
  if (field === "basic")
    return draft.basic[key] ?? "0";
  if (field === "ability")
    return draft.ability[key] ?? "0";
  return draft.skill[key] ?? "0";
}

function setFieldValue(draft: StAbilityDraft, field: StFieldType, key: string, value: string): void {
  if (field === "basic") {
    draft.basic[key] = value;
    return;
  }
  if (field === "ability") {
    draft.ability[key] = value;
    return;
  }
  draft.skill[key] = value;
}

function normalizeMisplacedAbilityFields(draft: StAbilityDraft, templateKeys: StTemplateKeySets): Set<string> {
  const toDelete = new Set<string>();

  // 已有污染数据自愈：能力区里落到了“基础/技能模板键”的字段，迁回对应分组
  for (const [key, value] of Object.entries(draft.ability)) {
    if (!templateKeys.ability.has(key) && templateKeys.basic.has(key)) {
      draft.basic[key] = draft.basic[key] ?? value;
      delete draft.ability[key];
      toDelete.add(key);
    }
    else if (!templateKeys.ability.has(key) && templateKeys.skill.has(key)) {
      draft.skill[key] = draft.skill[key] ?? value;
      delete draft.ability[key];
      toDelete.add(key);
    }
  }
  return toDelete;
}

export function applyStCommandToDraft(
  params: ApplyStCommandToDraftParams,
): ApplyStCommandToDraftResult {
  const { cmd, templateKeys } = params;
  const draft = cloneDraft(params.draft);
  if (!cmd.startsWith(".st") && !cmd.startsWith("。st")) {
    throw new Error("指令必须以 .st 开头");
  }

  const normalizedCmd = cmd.slice(3).trim();
  const args = normalizedCmd.split(/\s+/).filter(arg => arg !== "");
  const input = args.join("");
  const abilityFieldsToDelete = normalizeMisplacedAbilityFields(draft, templateKeys);

  // 支持 .st 力量70 / .st 力量+10 / .st 敏捷-5 这三种写法
  const matches = input.matchAll(/([^\d+-]+)([+-]?)(\d+)/g);
  const abilityToUpdate = new Map<string, string>();
  let matchCount = 0;
  for (const match of matches) {
    matchCount += 1;
    const rawKey = match[1].trim();
    const operator = match[2];
    const value = Number.parseInt(match[3], 10);

    const normalizedKey = rawKey.toLowerCase();
    const key = ST_ABILITY_MAP[normalizedKey] || rawKey;
    const targetField = resolveFieldForKey(draft, key, templateKeys);
    const currentValue = Number.parseInt(getFieldValue(draft, targetField, key), 10);

    let newValue: number;
    if (operator === "+") {
      newValue = currentValue + value;
    }
    else if (operator === "-") {
      newValue = currentValue - value;
    }
    else {
      newValue = value;
    }

    setFieldValue(draft, targetField, key, String(newValue));
    if (targetField !== "ability" && key in draft.ability && !templateKeys.ability.has(key)) {
      abilityFieldsToDelete.add(key);
    }
    abilityToUpdate.set(key, String(newValue));
  }

  if (matchCount === 0) {
    throw new Error("未解析到属性，请检查格式（例：.st 力量80 敏捷+10）");
  }

  return {
    draft,
    abilityToUpdate,
    abilityFieldsToDelete,
  };
}
