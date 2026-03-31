import type { PokemonSkill } from "@/components/common/dicer/cmdExe/pokemonSkills.d";

// 宝可梦战斗指令文件（cmdExePokemon.ts）
import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import POKEMON_SKILLS from "@/components/common/dicer/cmdExe/pokemonSkills.json";
import UNTIL from "@/components/common/dicer/utils/utils";

const SKILLS: PokemonSkill[] = POKEMON_SKILLS as PokemonSkill[];

// 宝可梦TRPG属性名映射表
const POKEMON_ABILITY_MAP: { [key: string]: string } = {
  agi: "敏捷",
  minjie: "敏捷",
  敏: "敏捷",
  速度: "敏捷",

  生命值: "hp",
  生命: "hp",
  血量: "hp",
  体力: "hp",

};

// 初始化宝可梦TRPG规则命名空间
const executorPokemon = new RuleNameSpace(
  7, // 规则ID（确保与其他规则不冲突）
  "宝可梦trpg",
  ["poke", "pmtrpg"],
  "宝可梦TRPG规则的指令集",
);

export default executorPokemon;

// 实现“ri指令”：显示角色敏捷数值
const cmdRi = new CommandExecutor(
  "ri",
  [],
  "显示指定角色的速度数值",
  [".ri", ".ri @队友"],
  "ri [@角色]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    // 1. 确定目标角色（优先@提及的角色，无则取操作者）
    const targetRole = mentioned.length > 0 ? mentioned[0] : mentioned[mentioned.length - 1];
    if (!targetRole || !targetRole.roleId) {
      cpi.sendToast("错误：未找到目标角色，请@指定角色或确保当前用户已创建角色");
      return false;
    }

    // 2. 获取目标角色的属性列表
    const curAbility = cpi.getRoleAbilityList(targetRole.roleId);
    if (!curAbility?.ability && !curAbility?.basic && !curAbility?.skill) {
      cpi.sendToast(`错误：${targetRole.roleName}的角色属性未设置`);
      return false;
    }

    // 3. 获取速度属性值
    const targetAbilityKey = "速度";
    const speedValueStr = UNTIL.getRoleAbilityValue(curAbility, targetAbilityKey);
    if (!speedValueStr || Number.isNaN(Number(speedValueStr))) {
      cpi.sendToast(`错误：${targetRole.roleName}未设置“速度”属性`);
      return false;
    }
    const speedValue = Number(speedValueStr);
    const speedStage = Number(UNTIL.getRoleAbilityValue(curAbility, "速度修正") || 0);
    const finalSpeed = applyBattleStageModifier(speedValue, speedStage);
    const speedDisplay = formatModifiedStat("速度", speedValue, speedStage, finalSpeed);

    // 4. 计算1d20+速度/10（速度/10向下取整）
    const diceResult = Math.floor(Math.random() * 20) + 1; // 1d20随机数（1-20）
    const speedRollBonus = Math.floor(finalSpeed / 10); // 速度/10取整
    const total = diceResult + speedRollBonus;

    // 5. 构建结果消息
    const result = `${targetRole.roleName}的先攻掷骰：\n`
      + `1d20 = ${diceResult}，${speedDisplay}/${10} = ${speedRollBonus}\n`
      + `先攻：${diceResult} + ${speedRollBonus} = ${total}`;

    cpi.replyMessage(result);
    return true;
  },
);

executorPokemon.addCmd(cmdRi);

const cmdEva = new CommandExecutor(
  "eva",
  [],
  "宝可梦闪避判定",
  [".eva 电击", ".eva 电击 @对手"],
  "eva [技能名] [@对象]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const skillToken = args[0]?.trim();
    if (!skillToken) {
      cpi.sendToast("格式错误！正确格式：.eva [技能名] [@对象]（可选）");
      return false;
    }

    const evadeRole = mentioned[mentioned.length - 1];
    if (!evadeRole || !evadeRole.roleId) {
      cpi.sendToast("错误：未找到闪避角色，请确保当前用户已创建角色");
      return false;
    }

    const targetRole = mentioned
      .slice(0, -1)
      .find(role => role?.roleId && role.roleId !== evadeRole.roleId);

    const skill = getSkillByName(skillToken);
    if (!skill) {
      cpi.sendToast(`未找到技能“${skillToken}”`);
      return false;
    }

    const evadeAbility = cpi.getRoleAbilityList(evadeRole.roleId);
    if (!evadeAbility?.ability && !evadeAbility?.basic && !evadeAbility?.skill) {
      cpi.sendToast(`错误：${evadeRole.roleName}的角色属性未设置`);
      return false;
    }

    const speedBase = Number(UNTIL.getRoleAbilityValue(evadeAbility, "速度") || 0);
    if (!Number.isFinite(speedBase)) {
      cpi.sendToast(`错误：${evadeRole.roleName}未设置“速度”属性`);
      return false;
    }
    const speedStage = Number(UNTIL.getRoleAbilityValue(evadeAbility, "速度修正") || 0);
    const finalSpeed = applyBattleStageModifier(speedBase, speedStage);
    const speedFinalText = formatBattleNumber(finalSpeed);
    const speedBaseText = formatBattleNumber(speedBase);
    const speedFactorText = formatBattleNumber(getBattleStageFactor(speedStage));
    const speedExprText = Number.isFinite(speedStage) && speedStage !== 0
      ? `${speedFinalText}(${speedBaseText}×${speedFactorText})`
      : speedFinalText;

    const evadeModifierRaw = Number(UNTIL.getRoleAbilityValue(evadeAbility, "闪避修正") || 0);
    const evadeModifier = Number.isFinite(evadeModifierRaw) ? evadeModifierRaw : 0;

    let accuracyModifier = 0;
    if (targetRole?.roleId) {
      const targetAbility = cpi.getRoleAbilityList(targetRole.roleId);
      if (targetAbility?.ability || targetAbility?.basic || targetAbility?.skill) {
        const accuracyModifierRaw = Number(UNTIL.getRoleAbilityValue(targetAbility, "命中修正") || 0);
        accuracyModifier = Number.isFinite(accuracyModifierRaw) ? accuracyModifierRaw : 0;
      }
    }

    const baseEvadeDiceSides = Math.floor(10 + finalSpeed / 10);
    const evadeDiceSides = Math.max(
      1,
      Math.floor(baseEvadeDiceSides + evadeModifier * 5 - accuracyModifier * 5),
    );
    const finalRoll = Math.floor(Math.random() * evadeDiceSides) + 1;
    const accuracyThreshold = Number(skill.accuracy || 0) / 10;
    const isEvaded = finalRoll >= accuracyThreshold;

    const actionPointKeys = ["行动点", "行动值", "AP", "ap"];
    const actionPointKey = actionPointKeys.find(key => UNTIL.getRoleAbilityValue(evadeAbility, key) != null) ?? "行动点";
    const currentActionPointRaw = Number(UNTIL.getRoleAbilityValue(evadeAbility, actionPointKey));
    const currentActionPoint = Number.isFinite(currentActionPointRaw) ? currentActionPointRaw : 0;
    const newActionPoint = Math.max(0, currentActionPoint - 1);
    UNTIL.setRoleAbilityValue(evadeAbility, actionPointKey, String(newActionPoint), "ability", "auto");
    cpi.setRoleAbilityList(evadeRole.roleId, evadeAbility);

    const accuracyModifierText = String(accuracyModifier);
    const evadeModifierText = String(evadeModifier);
    const targetNameText = targetRole?.roleName ? `（对象：${targetRole.roleName}）` : "";

    cpi.replyMessage(
      `${evadeRole.roleName}尝试闪避${skill.name}${targetNameText}：\n`
      + `rd(10+速度${speedExprText}/10+闪避修正${evadeModifierText}×5-命中修正${accuracyModifierText}×5) = rd${evadeDiceSides}= ${finalRoll}\n`
      + `对比命中阈值：${formatBattleNumber(skill.accuracy)} / 10 = ${formatBattleNumber(accuracyThreshold)}\n`
      + `判定结果：${finalRoll} ${isEvaded ? ">=" : "<"} ${formatBattleNumber(accuracyThreshold)}，${isEvaded ? "闪避成功" : "闪避失败"}\n`
      + `${evadeRole.roleName}行动点：${currentActionPoint} - 1 = ${newActionPoint}`,
    );
    return true;
  },
);

executorPokemon.addCmd(cmdEva);

const cmdattack = new CommandExecutor(
  "atk",
  [],
  "宝可梦使用技能攻击目标",
  [".atk 电击 @对手", ".atk 火焰拳 @目标 2", ".atk 连环巴掌*4 @目标"],
  "atk [技能名][*段数]? @目标宝可梦 [额外倍率]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    // 解析参数：技能名 + 目标角色（支持多个目标）
    const skillToken = args[0]; // 技能名（如"电击"或"连环巴掌*4"）
    const extraMultiplierInput = args[1]; // 额外倍率（可选，默认1）
    const attackerRole = mentioned[mentioned.length - 1]; // 攻击者（沿用现有逻辑）
    const targetRoles = mentioned
      .slice(0, -1)
      .filter(role => role?.roleId && role.roleId !== attackerRole?.roleId);

    const extraMultiplier = extraMultiplierInput ? Number(extraMultiplierInput) : 1;

    // 校验参数
    if (!skillToken || !attackerRole || targetRoles.length === 0) {
      cpi.sendToast("格式错误！正确格式：.atk [技能名][*段数] @目标宝可梦（可多个） [额外倍率]（可选）");
      return false;
    }

    const parsedToken = parseAttackSkillToken(skillToken);
    if (parsedToken.error || !parsedToken.skillName) {
      cpi.sendToast(parsedToken.error || "技能名格式错误，例如：.atk 连环巴掌*4 @目标");
      return false;
    }

    const skillName = parsedToken.skillName;
    const forcedHitCount = parsedToken.forcedHitCount;

    if (!Number.isFinite(extraMultiplier) || extraMultiplier <= 0) {
      cpi.sendToast("额外倍率必须是大于0的数字，例如：.atk 火焰拳 @目标 2");
      return false;
    }

    // 从技能库中查询技能（支持模糊匹配，如"电击"匹配"thunder_shock"）
    const skill = getSkillByName(skillName); // 自定义匹配函数
    if (!skill) {
      cpi.sendToast(`未找到技能“${skillName}”`);
      return false;
    }

    const multiHitConfig = resolveMultiHitConfig(skill);
    if (forcedHitCount != null) {
      if (!multiHitConfig) {
        cpi.sendToast(`技能“${skill.name}”不是多段技能，不能使用*段数`);
        return false;
      }
      if (forcedHitCount < multiHitConfig.minHits || forcedHitCount > multiHitConfig.maxHits) {
        cpi.sendToast(`技能“${skill.name}”的段数范围是${multiHitConfig.minHits}~${multiHitConfig.maxHits}`);
        return false;
      }
    }

    // 执行战斗逻辑（支持多目标）
    await executeBattle(attackerRole, targetRoles, skill, extraMultiplier, cpi, forcedHitCount);
    return true;
  },
);

executorPokemon.addCmd(cmdattack);

async function executeBattle(
  attacker: UserRole,
  defenders: UserRole[],
  skill: PokemonSkill,
  extraMultiplier: number,
  cpi: CPI,
  forcedHitCount?: number,
) {
  // 1. 获取攻击方属性（攻击/特攻/属性）
  const attackerAbility = cpi.getRoleAbilityList(attacker.roleId);

  // 攻击者属性
  const attackerAtkBase = Number(UNTIL.getRoleAbilityValue(attackerAbility, "攻击") || 0);
  const attackerSpAtkBase = Number(UNTIL.getRoleAbilityValue(attackerAbility, "特攻") || 0);
  const attackerAtkStage = Number(UNTIL.getRoleAbilityValue(attackerAbility, "攻击修正") || 0);
  const attackerSpAtkStage = Number(UNTIL.getRoleAbilityValue(attackerAbility, "特攻修正") || 0);
  const attackerAtk = applyBattleStageModifier(attackerAtkBase, attackerAtkStage);
  const attackerSpAtk = applyBattleStageModifier(attackerSpAtkBase, attackerSpAtkStage);
  const attackerType1 = UNTIL.getRoleAbilityValue(attackerAbility, "属性1") || "";
  const attackerType2 = UNTIL.getRoleAbilityValue(attackerAbility, "属性2") || "";

  // 3. 伤害计算（变化技能无伤害）
  if (skill.category === "status") {
    const actionPointKeys = ["行动点", "行动值", "AP", "ap"];
    const actionPointKey = actionPointKeys.find(key => UNTIL.getRoleAbilityValue(attackerAbility, key) != null) ?? "行动点";
    const currentActionPointRaw = Number(UNTIL.getRoleAbilityValue(attackerAbility, actionPointKey));
    const currentActionPoint = Number.isFinite(currentActionPointRaw) ? currentActionPointRaw : 0;
    const actionPointCost = Math.max(0, Number(skill.actionPointCost || 0));
    const newActionPoint = Math.max(0, currentActionPoint - actionPointCost);
    UNTIL.setRoleAbilityValue(attackerAbility, actionPointKey, String(newActionPoint), "ability", "auto");
    cpi.setRoleAbilityList(attacker.roleId, attackerAbility);
    const actionPointLine = `${attacker.roleName}行动点：${currentActionPoint} - ${actionPointCost} = ${newActionPoint}`;

    cpi.replyMessage(`${attacker.roleName}使用了${skill.name}！\n${skill.effect}\n${actionPointLine}`);
    return;
  }

  // 3.1 基础值：根据技能分类选择攻击/特攻和防御/特防
  const attackValue = skill.category === "physical" ? attackerAtk : attackerSpAtk;
  const multiHitConfig = resolveMultiHitConfig(skill);
  const hitCount = resolveHitCount(multiHitConfig, forcedHitCount);
  const effectivePower = skill.power * hitCount;
  const powerText = hitCount > 1 ? `${effectivePower}(${skill.power}×${hitCount})` : String(skill.power);
  const hitCountText = hitCount > 1
    ? `命中段数：${hitCount}段${forcedHitCount != null ? "（指定）" : "（等概率随机）"}`
    : "";

  // 3.2 本系修正（攻击方属性与技能属性一致则×1.5）
  const isSameType = [attackerType1, attackerType2].includes(skill.type);
  const sameTypeBonus = isSameType ? 1.5 : 1;

  const battleBlocks: string[] = [];

  for (const defender of defenders) {
    const defenderAbility = cpi.getRoleAbilityList(defender.roleId);

    // 防守者属性
    const defenderDefBase = Number(UNTIL.getRoleAbilityValue(defenderAbility, "防御") || 0);
    const defenderSpDefBase = Number(UNTIL.getRoleAbilityValue(defenderAbility, "特防") || 0);
    const defenderDefStage = Number(UNTIL.getRoleAbilityValue(defenderAbility, "防御修正") || 0);
    const defenderSpDefStage = Number(UNTIL.getRoleAbilityValue(defenderAbility, "特防修正") || 0);
    const defenderDef = applyBattleStageModifier(defenderDefBase, defenderDefStage);
    const defenderSpDef = applyBattleStageModifier(defenderSpDefBase, defenderSpDefStage);
    const defenderType1 = UNTIL.getRoleAbilityValue(defenderAbility, "属性1") || "";
    const defenderType2 = UNTIL.getRoleAbilityValue(defenderAbility, "属性2") || "";

    const defenseValueRaw = skill.category === "physical" ? defenderDef : defenderSpDef;
    const defenseValue = Math.max(1, defenseValueRaw);
    const attackLabel = skill.category === "physical" ? "攻击" : "特攻";
    const defenseLabel = skill.category === "physical" ? "防御" : "特防";

    const attackDisplay = skill.category === "physical"
      ? formatModifiedStat(attackLabel, attackerAtkBase, attackerAtkStage, attackValue)
      : formatModifiedStat(attackLabel, attackerSpAtkBase, attackerSpAtkStage, attackValue);
    const defenseDisplay = skill.category === "physical"
      ? formatModifiedStat(defenseLabel, defenderDefBase, defenderDefStage, defenseValue)
      : formatModifiedStat(defenseLabel, defenderSpDefBase, defenderSpDefStage, defenseValue);

    // 3.3 属性克制修正（从克制表中查询）
    const defenderTypes = [defenderType1, defenderType2].filter(Boolean); // 过滤空字符串
    const typeEffectiveness = getTypeEffectiveness(skill.type, defenderTypes);

    // 3.5 最终伤害计算（向下取整，至少1点伤害）
    const baseDamage = (attackValue * effectivePower) / defenseValue;
    const finalDamage = Math.max(1, Math.floor(
      baseDamage * sameTypeBonus * typeEffectiveness * extraMultiplier,
    ));

    // 4. 更新防守方生命值
    const defenderHp = Number(UNTIL.getRoleAbilityValue(defenderAbility, "hp") || 0);
    const newHp = Math.max(0, defenderHp - finalDamage);
    UNTIL.setRoleAbilityValue(defenderAbility, "hp", newHp.toString(), "ability", "ability");
    cpi.setRoleAbilityList(defender.roleId, defenderAbility);

    const blockLines: string[] = [
      `${attacker.roleName}对${defender.roleName}使用了${skill.name}！`,
      "伤害计算：",
      `(${attackDisplay} × 威力${powerText}) ÷ ${defenseDisplay} × 本系修正${sameTypeBonus} × 属性克制${typeEffectiveness} × 额外倍率${extraMultiplier}`,
      `造成${finalDamage}点伤害！`,
      `${defender.roleName}剩余生命值：${defenderHp} → ${newHp}`,
    ];

    if (hitCountText) {
      blockLines.splice(1, 0, hitCountText);
    }

    // 5. 投掷特殊效果触发（仅当effectRate > 0）
    const effectRate = Number(skill.effectRate || 0);
    if (effectRate > 0) {
      const roll = Math.floor(Math.random() * 100) + 1;
      const triggered = roll <= effectRate;
      blockLines.push(
        `特殊效果判定：d100=${roll}（触发率${effectRate}%）${triggered ? "，触发！" : "，未触发"}`,
      );
      if (triggered && skill.effect) {
        blockLines.push(`特殊效果：${skill.effect}`);
      }
    }

    battleBlocks.push(blockLines.join("\n"));
  }

  // 6. 在特殊效果判定后再结算行动点
  const actionPointKeys = ["行动点", "行动值", "AP", "ap"];
  const actionPointKey = actionPointKeys.find(key => UNTIL.getRoleAbilityValue(attackerAbility, key) != null) ?? "行动点";
  const currentActionPointRaw = Number(UNTIL.getRoleAbilityValue(attackerAbility, actionPointKey));
  const currentActionPoint = Number.isFinite(currentActionPointRaw) ? currentActionPointRaw : 0;
  const actionPointCost = Math.max(0, Number(skill.actionPointCost || 0));
  const newActionPoint = Math.max(0, currentActionPoint - actionPointCost);
  UNTIL.setRoleAbilityValue(attackerAbility, actionPointKey, String(newActionPoint), "ability", "auto");
  cpi.setRoleAbilityList(attacker.roleId, attackerAbility);
  const actionPointLine = `${attacker.roleName}行动点：${currentActionPoint} - ${actionPointCost} = ${newActionPoint}`;

  cpi.replyMessage(`${battleBlocks.join("\n\n")}\n${actionPointLine}`);
}

function getSkillByName(skillName: string): PokemonSkill | undefined {
  const lowerSkillName = skillName.toLowerCase();
  // 遍历已断言类型的数组（SKILLS 或 POKEMON_SKILLS）
  return SKILLS.find(skill =>
    skill.name.toLowerCase().includes(lowerSkillName),
  );
}

type AttackSkillTokenParseResult = {
  skillName: string;
  forcedHitCount?: number;
  error?: string;
};

type MultiHitConfig = {
  minHits: number;
  maxHits: number;
  weights?: number[];
};

function parseAttackSkillToken(skillToken: string): AttackSkillTokenParseResult {
  const token = skillToken.trim();
  if (!token)
    return { skillName: "", error: "技能名不能为空" };

  const starIndex = token.lastIndexOf("*");
  if (starIndex <= 0)
    return { skillName: token };
  if (starIndex === token.length - 1)
    return { skillName: "", error: "*后必须填写段数，例如：连环巴掌*4" };

  const skillName = token.slice(0, starIndex).trim();
  const hitCountText = token.slice(starIndex + 1).trim();
  if (!skillName)
    return { skillName: "", error: "技能名不能为空" };
  if (!/^\d+$/.test(hitCountText))
    return { skillName: "", error: "段数必须是正整数，例如：连环巴掌*4" };

  const forcedHitCount = Number.parseInt(hitCountText, 10);
  if (!Number.isFinite(forcedHitCount) || forcedHitCount <= 0)
    return { skillName: "", error: "段数必须大于0" };

  return { skillName, forcedHitCount };
}

function resolveMultiHitConfig(skill: PokemonSkill): MultiHitConfig | undefined {
  const customConfig = skill.multiHit;
  if (customConfig && Number.isFinite(customConfig.minHits) && Number.isFinite(customConfig.maxHits)) {
    const minHits = Math.floor(customConfig.minHits);
    const maxHits = Math.floor(customConfig.maxHits);
    if (minHits >= 1 && maxHits >= minHits) {
      return {
        minHits,
        maxHits,
        weights: customConfig.weights,
      };
    }
  }

  if (skill.effect.includes("连续攻击2～5次")) {
    return {
      minHits: 2,
      maxHits: 5,
    };
  }

  return undefined;
}

function resolveHitCount(config: MultiHitConfig | undefined, forcedHitCount?: number): number {
  if (!config)
    return 1;
  if (forcedHitCount != null)
    return forcedHitCount;

  const span = config.maxHits - config.minHits + 1;
  if (span <= 1)
    return config.minHits;

  const weights = config.weights;
  if (weights && weights.length === span && weights.every(weight => Number.isFinite(weight) && weight > 0)) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    for (let index = 0; index < weights.length; index += 1) {
      random -= weights[index];
      if (random <= 0)
        return config.minHits + index;
    }
  }

  return config.minHits + Math.floor(Math.random() * span);
}

// 属性修正公式：
// 修正 > 0: 属性 * (2 + 修正) / 2
// 修正 < 0: 属性 * 2 / (2 - 修正)
const BATTLE_STAGE_MIN = -6;
const BATTLE_STAGE_MAX = 6;

function clampBattleStageModifier(stageModifier: number): number {
  if (!Number.isFinite(stageModifier))
    return 0;
  return Math.min(BATTLE_STAGE_MAX, Math.max(BATTLE_STAGE_MIN, stageModifier));
}

function applyBattleStageModifier(baseValue: number, stageModifier: number): number {
  if (!Number.isFinite(baseValue))
    return 0;

  const normalizedStageModifier = clampBattleStageModifier(stageModifier);

  if (normalizedStageModifier === 0)
    return baseValue;

  if (normalizedStageModifier > 0)
    return baseValue * (2 + normalizedStageModifier) / 2;

  return baseValue * 2 / (2 - normalizedStageModifier);
}

function getBattleStageFactor(stageModifier: number): number {
  const normalizedStageModifier = clampBattleStageModifier(stageModifier);

  if (normalizedStageModifier === 0)
    return 1;

  if (normalizedStageModifier > 0)
    return (2 + normalizedStageModifier) / 2;

  return 2 / (2 - normalizedStageModifier);
}

function formatBattleNumber(value: number): string {
  if (!Number.isFinite(value))
    return "0";
  if (Number.isInteger(value))
    return String(value);
  return String(Math.round(value * 1000) / 1000);
}

function formatModifiedStat(label: string, baseValue: number, stageModifier: number, finalValue: number): string {
  const normalizedStageModifier = clampBattleStageModifier(stageModifier);
  const finalText = formatBattleNumber(finalValue);
  if (normalizedStageModifier === 0)
    return `${label}${finalText}`;

  const factor = getBattleStageFactor(normalizedStageModifier);
  const baseText = formatBattleNumber(baseValue);
  const factorText = formatBattleNumber(factor);
  return `${label}${finalText}（${baseText}×${factorText}）`;
}

// 1. 定义属性克制表的类型（包含索引签名）
type TypeChart = {
  [attackType: string]: { // 允许任意字符串作为攻击属性的键
    [defenseType: string]: number; // 允许任意字符串作为防御属性的键
  };
};

// 2. 用定义的类型约束 TYPE_CHART，并保留具体属性（移除 as const，改用类型注解）
const TYPE_CHART: TypeChart = {
  普通: { 岩石: 0.5, 幽灵: 0, 钢: 0.5 },
  火: { 火: 0.5, 水: 0.5, 草: 2, 冰: 2, 虫: 2, 岩石: 0.5, 龙: 0.5, 钢: 2 },
  水: { 火: 2, 水: 0.5, 草: 0.5, 地面: 2, 岩石: 2, 龙: 0.5 },
  电: { 水: 2, 电: 0.5, 草: 0.5, 地面: 0, 飞行: 2, 龙: 0.5 },
  草: { 火: 0.5, 水: 2, 草: 0.5, 毒: 0.5, 地面: 2, 飞行: 0.5, 虫: 0.5, 岩石: 2, 龙: 0.5, 钢: 0.5 },
  冰: { 火: 0.5, 水: 0.5, 草: 2, 冰: 0.5, 地面: 2, 飞行: 2, 龙: 2, 钢: 0.5 },
  格斗: { 一般: 2, 冰: 2, 毒: 0.5, 飞行: 0.5, 超能力: 0.5, 虫: 0.5, 岩石: 2, 幽灵: 0, 恶: 2, 钢: 2, 妖精: 0.5 },
  毒: { 草: 2, 毒: 0.5, 地面: 0.5, 岩石: 0.5, 幽灵: 0.5, 钢: 0, 妖精: 2 },
  地面: { 火: 2, 电: 2, 草: 0.5, 毒: 2, 飞行: 0, 虫: 0.5, 岩石: 2, 钢: 2 },
  飞行: { 电: 0.5, 草: 2, 格斗: 2, 虫: 2, 岩石: 0.5, 钢: 0.5 },
  超能力: { 格斗: 2, 毒: 2, 超能力: 0.5, 恶: 0, 钢: 0.5 },
  虫: { 火: 0.5, 草: 2, 格斗: 0.5, 毒: 0.5, 飞行: 0.5, 超能力: 2, 幽灵: 0.5, 恶: 2, 钢: 0.5, 妖精: 0.5 },
  岩石: { 火: 2, 冰: 2, 格斗: 0.5, 地面: 0.5, 飞行: 2, 虫: 2, 钢: 0.5 },
  幽灵: { 一般: 0, 超能力: 2, 幽灵: 2, 恶: 0.5 },
  龙: { 龙: 2, 钢: 0.5, 妖精: 0 },
  恶: { 格斗: 0.5, 超能力: 2, 幽灵: 2, 恶: 0.5, 妖精: 0.5 },
  钢: { 火: 0.5, 水: 0.5, 电: 0.5, 冰: 2, 岩石: 2, 钢: 0.5, 妖精: 2 },
  妖精: { 火: 0.5, 格斗: 2, 毒: 0.5, 龙: 2, 恶: 2, 钢: 0.5 },
};

// 修正函数定义：接收攻击属性 + 防御属性数组（支持1-2个属性）
function getTypeEffectiveness(attackType: string, defTypes: string[]): number {
  const attackRelations = TYPE_CHART[attackType] ?? {};
  // 遍历所有防御属性，计算总倍率（倍率相乘）
  return defTypes.reduce((total, defType) => {
    return total * (attackRelations[defType] ?? 1);
  }, 1);
}

