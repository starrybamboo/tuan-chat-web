const POKEMON_TYPE_CHART: Record<string, Record<string, number>> = {
  普通: { 岩石: 0.5, 幽灵: 0, 钢: 0.5 },
  火: { 火: 0.5, 水: 0.5, 草: 2, 冰: 2, 虫: 2, 岩石: 0.5, 龙: 0.5, 钢: 2 },
  水: { 火: 2, 水: 0.5, 草: 0.5, 地面: 2, 岩石: 2, 龙: 0.5 },
  电: { 水: 2, 电: 0.5, 草: 0.5, 地面: 0, 飞行: 2, 龙: 0.5 },
  草: { 火: 0.5, 水: 2, 草: 0.5, 毒: 0.5, 地面: 2, 飞行: 0.5, 虫: 0.5, 岩石: 2, 龙: 0.5, 钢: 0.5 },
  冰: { 火: 0.5, 水: 0.5, 草: 2, 冰: 0.5, 地面: 2, 飞行: 2, 龙: 2, 钢: 0.5 },
  格斗: { 普通: 2, 冰: 2, 毒: 0.5, 飞行: 0.5, 超能力: 0.5, 虫: 0.5, 岩石: 2, 幽灵: 0, 恶: 2, 钢: 2, 妖精: 0.5 },
  毒: { 草: 2, 毒: 0.5, 地面: 0.5, 岩石: 0.5, 幽灵: 0.5, 钢: 0, 妖精: 2 },
  地面: { 火: 2, 电: 2, 草: 0.5, 毒: 2, 飞行: 0, 虫: 0.5, 岩石: 2, 钢: 2 },
  飞行: { 电: 0.5, 草: 2, 格斗: 2, 虫: 2, 岩石: 0.5, 钢: 0.5 },
  超能力: { 格斗: 2, 毒: 2, 超能力: 0.5, 恶: 0, 钢: 0.5 },
  虫: { 火: 0.5, 草: 2, 格斗: 0.5, 毒: 0.5, 飞行: 0.5, 超能力: 2, 幽灵: 0.5, 恶: 2, 钢: 0.5, 妖精: 0.5 },
  岩石: { 火: 2, 冰: 2, 格斗: 0.5, 地面: 0.5, 飞行: 2, 虫: 2, 钢: 0.5 },
  幽灵: { 普通: 0, 超能力: 2, 幽灵: 2, 恶: 0.5 },
  龙: { 龙: 2, 钢: 0.5, 妖精: 0 },
  恶: { 格斗: 0.5, 超能力: 2, 幽灵: 2, 恶: 0.5, 妖精: 0.5 },
  钢: { 火: 0.5, 水: 0.5, 电: 0.5, 冰: 2, 岩石: 2, 钢: 0.5, 妖精: 2 },
  妖精: { 火: 0.5, 格斗: 2, 毒: 0.5, 龙: 2, 恶: 2, 钢: 0.5 },
};

const POKEMON_ATTACK_TYPES = Object.keys(POKEMON_TYPE_CHART);
const POKEMON_STAGE_MIN = -6;
const POKEMON_STAGE_MAX = 6;

function normalizePokemonType(value: string | null | undefined): string | null {
  if (!value)
    return null;
  const raw = value.trim();
  if (!raw)
    return null;
  if (raw === "一般")
    return "普通";
  return raw;
}

export function computePokemonDefensiveMatchups(type1Raw: string | null | undefined, type2Raw: string | null | undefined) {
  const type1 = normalizePokemonType(type1Raw);
  const type2 = normalizePokemonType(type2Raw);
  const groups: Record<"4" | "2" | "0.5" | "0.25" | "0", string[]> = {
    4: [],
    2: [],
    0.5: [],
    0.25: [],
    0: [],
  };

  if (!type1 && !type2) {
    return groups;
  }

  for (const atkType of POKEMON_ATTACK_TYPES) {
    const m1 = type1 ? (POKEMON_TYPE_CHART[atkType]?.[type1] ?? 1) : 1;
    const m2 = type2 ? (POKEMON_TYPE_CHART[atkType]?.[type2] ?? 1) : 1;
    const total = m1 * m2;

    if (total === 4)
      groups["4"].push(atkType);
    else if (total === 2)
      groups["2"].push(atkType);
    else if (total === 0.5)
      groups["0.5"].push(atkType);
    else if (total === 0.25)
      groups["0.25"].push(atkType);
    else if (total === 0)
      groups["0"].push(atkType);
  }

  return groups;
}

function clampPokemonStageModifier(stageModifier: number): number {
  if (!Number.isFinite(stageModifier))
    return 0;
  return Math.min(POKEMON_STAGE_MAX, Math.max(POKEMON_STAGE_MIN, stageModifier));
}

export function applyPokemonStageModifier(baseValue: number, stageModifier: number): number {
  if (!Number.isFinite(baseValue))
    return 0;

  const normalizedStageModifier = clampPokemonStageModifier(stageModifier);

  if (normalizedStageModifier === 0)
    return baseValue;

  if (normalizedStageModifier > 0)
    return baseValue * (2 + normalizedStageModifier) / 2;

  return baseValue * 2 / (2 - normalizedStageModifier);
}

function getPokemonStageFactor(stageModifier: number): number {
  const normalizedStageModifier = clampPokemonStageModifier(stageModifier);

  if (normalizedStageModifier === 0)
    return 1;

  if (normalizedStageModifier > 0)
    return (2 + normalizedStageModifier) / 2;

  return 2 / (2 - normalizedStageModifier);
}

export function formatPokemonBattleNumber(value: number): string {
  if (!Number.isFinite(value))
    return "0";
  if (Number.isInteger(value))
    return String(value);
  return String(Math.round(value * 1000) / 1000);
}

export function formatPokemonModifiedStat(label: string, baseValue: number, stageModifier: number, finalValue: number): string {
  const normalizedStageModifier = clampPokemonStageModifier(stageModifier);
  const finalText = formatPokemonBattleNumber(finalValue);
  if (normalizedStageModifier === 0)
    return `${label}${finalText}`;

  const factor = getPokemonStageFactor(normalizedStageModifier);
  const baseText = formatPokemonBattleNumber(baseValue);
  const factorText = formatPokemonBattleNumber(factor);
  return `${label}${finalText}（${baseText}*${factorText}）`;
}
