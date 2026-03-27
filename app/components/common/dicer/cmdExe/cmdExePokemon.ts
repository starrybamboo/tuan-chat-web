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

    // 4. 计算1d20+速度/10（速度/10向下取整）
    const diceResult = Math.floor(Math.random() * 20) + 1; // 1d20随机数（1-20）
    const speedModifier = Math.floor(speedValue / 10); // 速度/10取整
    const total = diceResult + speedModifier;

    // 5. 构建结果消息
    const result = `${targetRole.roleName}的先攻掷骰：\n`
      + `1d20 = ${diceResult}，速度/${10} = ${speedModifier}\n`
      + `先攻：${diceResult} + ${speedModifier} = ${total}`;

    cpi.replyMessage(result);
    return true;
  },
);

executorPokemon.addCmd(cmdRi);

const cmdattack = new CommandExecutor(
  "atk",
  [],
  "宝可梦使用技能攻击目标",
  [".atk 电击 @对手", ".atk 撞击 @野生皮卡丘"],
  "atk [技能名] @目标宝可梦",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    // 解析参数：技能名 + 目标角色
    const skillName = args[0]; // 技能名（如"电击"）
    const targetRole = mentioned[0]; // 目标宝可梦（@提及的角色）
    const attackerRole = mentioned[mentioned.length - 1]; // 攻击者（指令发起者）

    // 校验参数
    if (!skillName || !targetRole) {
      cpi.sendToast("格式错误！正确格式：.battle [技能名] @目标宝可梦");
      return false;
    }

    // 从技能库中查询技能（支持模糊匹配，如"电击"匹配"thunder_shock"）
    const skill = getSkillByName(skillName); // 自定义匹配函数
    if (!skill) {
      cpi.sendToast(`未找到技能“${skillName}”`);
      return false;
    }

    // 执行战斗逻辑（见下方步骤）
    await executeBattle(attackerRole, targetRole, skill, cpi);
    return true;
  },
);

executorPokemon.addCmd(cmdattack);

async function executeBattle(
  attacker: UserRole,
  defender: UserRole,
  skill: PokemonSkill,
  cpi: CPI,
) {
  // 1. 获取双方属性（攻击方：攻击/特攻/属性；防守方：防御/特防/属性）
  const attackerAbility = cpi.getRoleAbilityList(attacker.roleId);
  const defenderAbility = cpi.getRoleAbilityList(defender.roleId);

  // 攻击者属性
  const attackerAtk = Number(UNTIL.getRoleAbilityValue(attackerAbility, "攻击") || 0);
  const attackerSpAtk = Number(UNTIL.getRoleAbilityValue(attackerAbility, "特攻") || 0);
  const attackerType1 = UNTIL.getRoleAbilityValue(attackerAbility, "属性1") || "";
  const attackerType2 = UNTIL.getRoleAbilityValue(attackerAbility, "属性2") || "";

  // 防守者属性
  const defenderDef = Number(UNTIL.getRoleAbilityValue(defenderAbility, "防御") || 0);
  const defenderSpDef = Number(UNTIL.getRoleAbilityValue(defenderAbility, "特防") || 0);
  const defenderType1 = UNTIL.getRoleAbilityValue(defenderAbility, "属性1") || "";
  const defenderType2 = UNTIL.getRoleAbilityValue(defenderAbility, "属性2") || "";

  // 3. 伤害计算（变化技能无伤害）
  if (skill.category === "status") {
    cpi.replyMessage(`${attacker.roleName}使用了${skill.name}！${skill.effect}`);
    return;
  }

  // 3.1 基础值：根据技能分类选择攻击/特攻和防御/特防
  const attackValue = skill.category === "physical" ? attackerAtk : attackerSpAtk;
  const defenseValue = skill.category === "physical" ? defenderDef : defenderSpDef;

  // 3.2 本系修正（攻击方属性与技能属性一致则×1.5）
  const isSameType = [attackerType1, attackerType2].includes(skill.type);
  const sameTypeBonus = isSameType ? 1.5 : 1;

  // 3.3 属性克制修正（从克制表中查询）
  const defenderTypes = [defenderType1, defenderType2].filter(Boolean); // 过滤空字符串
  const typeEffectiveness = getTypeEffectiveness(skill.type, defenderTypes);

  // 3.5 最终伤害计算（向下取整，至少1点伤害）
  const baseDamage = (attackValue * skill.power) / defenseValue / 10;
  const finalDamage = Math.max(1, Math.floor(
    baseDamage * sameTypeBonus * typeEffectiveness,
  ));

  // 4. 更新防守方生命值
  const defenderHp = Number(UNTIL.getRoleAbilityValue(defenderAbility, "hp") || 0);
  const newHp = Math.max(0, defenderHp - finalDamage);
  const tempHp = UNTIL.getRoleAbilityValue(defenderAbility, "hp");
  UNTIL.setRoleAbilityValue(defenderAbility, "hp", newHp.toString(), "ability", "ability");
  cpi.setRoleAbilityList(defender.roleId, defenderAbility);
  cpi.replyMessage(`攻击方roleid：${attacker.roleId},防守方roleid：${defender.roleId}`);

  // 5. 输出战斗结果
  cpi.replyMessage(`${attacker.roleName}对${defender.roleName}使用了${skill.name}！\n`
  + `伤害计算：\n`
  + `(攻击${attackValue} × 威力${skill.power}) ÷ 防御${defenseValue} `
  + `× 本系修正${sameTypeBonus} × 属性克制${typeEffectiveness} \n`
  + `造成${finalDamage}点伤害！\n`
  + `${defender.roleName}剩余生命值：${tempHp} → ${newHp}`);
}

function getSkillByName(skillName: string): PokemonSkill | undefined {
  const lowerSkillName = skillName.toLowerCase();
  // 遍历已断言类型的数组（SKILLS 或 POKEMON_SKILLS）
  return SKILLS.find(skill =>
    skill.name.toLowerCase().includes(lowerSkillName),
  );
}

// 1. 定义属性克制表的类型（包含索引签名）
type TypeChart = {
  [attackType: string]: { // 允许任意字符串作为攻击属性的键
    [defenseType: string]: number; // 允许任意字符串作为防御属性的键
  };
};

// 2. 用定义的类型约束 TYPE_CHART，并保留具体属性（移除 as const，改用类型注解）
const TYPE_CHART: TypeChart = {
  电: { 水: 2, 飞行: 2, 电: 0.5, 地面: 0 },
  水: { 火: 2, 地面: 2, 水: 0.5, 草: 0.5 },
  普通: { 岩石: 0.5, 幽灵: 0 },
  火: { 草: 2, 冰: 2, 火: 0.5, 水: 0.5 },
  // 补充更多属性...
};

// 修正函数定义：接收攻击属性 + 防御属性数组（支持1-2个属性）
function getTypeEffectiveness(attackType: string, defTypes: string[]): number {
  const attackRelations = TYPE_CHART[attackType] ?? {};
  // 遍历所有防御属性，计算总倍率（倍率相乘）
  return defTypes.reduce((total, defType) => {
    return total * (attackRelations[defType] ?? 1);
  }, 1);
}

const cmdSt = new CommandExecutor(
  "st",
  [],
  "属性设置",
  [".st 力量70", ".st show 敏捷", ".st 力量+10", ".st 敏捷-5"],
  ".st [属性名][属性值] / .st show [属性名]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const role = mentioned[0];
    const input = args.join("");
    // 修改对象存储变化详情：{ 属性名: { 原值, 操作符, 变化值, 新值 } }
    const abilityChanges: {
      [key: string]: { old: number; op: string; val: number; new: number };
    } = {};
    // 使用正则匹配所有属性+数值的组合
    const matches = input.matchAll(/([^\d+-]+)([+-]?)(\d+)/g);
    const curAbility = cpi.getRoleAbilityList(role.roleId);
    if (!curAbility) {
      cpi.sendToast("非法操作，当前角色不存在于提及列表中。");
      return false;
    }

    if (args[0]?.toLowerCase() === "show") {
      if (!("ability" in curAbility || "basic" in curAbility || "skill" in curAbility)) {
        cpi.sendToast("当前角色没有属性信息，请先设置属性。");
        return false;
      }

      // TODO: 展示全部属性的功能
      const showProps = args.slice(1).filter(arg => arg.trim() !== "");
      if (showProps.length === 0) {
        cpi.sendToast("请指定要展示的属性");
        return false;
      }

      const result: string[] = [];
      for (const prop of showProps) {
        const normalizedKey = prop.toLowerCase();
        const key = POKEMON_ABILITY_MAP[normalizedKey] || prop;
        const value = UNTIL.getRoleAbilityValue(curAbility, key) ?? 0; // 修改这里，添加默认值0

        result.push(`${key}: ${value}`);
      }

      cpi.sendToast(`${role?.roleName || "当前角色"}的属性展示：\n${result.join("\n")}`);
      return true;
    }

    // st 实现
    for (const match of matches) {
      const rawKey = match[1].trim();
      const operator = match[2];
      const value = Number.parseInt(match[3], 10);

      // 统一转换为小写进行比较
      const normalizedKey = rawKey.toLowerCase();
      const key = POKEMON_ABILITY_MAP[normalizedKey] || rawKey;

      const currentValue = Number.parseInt(UNTIL.getRoleAbilityValue(curAbility, key) ?? "0"); // 原有值（默认0）
      let newValue: number;

      if (operator === "+") {
        newValue = currentValue + value; // 增量：原有值+新值
      }
      else if (operator === "-") {
        newValue = currentValue - value; // 减量：原有值-新值
      }
      else {
        newValue = value; // 无运算符：直接赋值
      }

      // 存储变化详情
      abilityChanges[key] = {
        old: currentValue,
        op: operator || "=", // 直接赋值时显示"="
        val: value,
        new: newValue,
      };

      // 更新属性
      UNTIL.setRoleAbilityValue(curAbility, key, newValue.toString(), "skill", "auto");
    }
    // 生成包含变化过程的提示信息
    const changeEntries = Object.entries(abilityChanges)
      .map(([key, { old, op, val, new: newValue }]) => {
        if (op !== "=") {
          return `${key}: ${old}${op}${val}->${newValue}`; // 拼接格式："力量: 70+10=80" 或 "敏捷: 50-5=45" 或 "智力: =90"
        }
        else {
          return `${key}: ${old}->${newValue}`;
        }
      });
    // 拼接成带花括号和换行的格式
    const updateDetails = `{\n${changeEntries.join("\n")}\n}`;

    cpi.setRoleAbilityList(role.roleId, curAbility);
    cpi.replyMessage(`属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${updateDetails}`);
    // cpi.sendToast( `属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${updateDetails}`);
    return true;
  },
);
executorPokemon.addCmd(cmdSt);
