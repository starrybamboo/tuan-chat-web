import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { parseDiceExpression, rollDice } from "@/components/common/dicer/dice";
import UTILS from "@/components/common/dicer/utils/utils";

// 属性名中英文对照表
// noinspection NonAsciiCharacters
const ABILITY_MAP: { [key: string]: string } = {
  str: "力量",
  dex: "敏捷",
  pow: "意志",
  con: "体质",
  app: "外貌",
  edu: "教育",
  siz: "体型",
  int: "智力",
  san: "san值",
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
  理智: "san值",
  理智值: "san值",
  运气: "幸运",
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

// 因变量映射表
// noinspection NonAsciiCharacters
const DEPENDENT_VALUE_MAP: { [key: string]: (ability: RoleAbility) => { type: string; value: string | number } } = {
  hpm: (ability: RoleAbility) => ({ type: "number", value: Number(UTILS.calculateExpression("(体型+体质)/10", ability)) }),
  mpm: (ability: RoleAbility) => ({ type: "number", value: Number(UTILS.calculateExpression("(意志)/10", ability)) }),
  sanm: (ability: RoleAbility) => ({ type: "number", value: Number(UTILS.calculateExpression("99-克苏鲁神话", ability)) }),
  db: (ability: RoleAbility) => ({ type: "dice", value: (
    () => {
      const ref = UTILS.calculateExpression("敏捷+力量", ability);
      if (ref < 65) {
        return "-2";
      }
      else if (ref < 85) {
        return "-1";
      }
      else if (ref < 125) {
        return "0";
      }
      else if (ref < 165) {
        return "1d4";
      }
      else if (ref < 205) {
        return "1d6";
      }
      else {
        const diceCount = Math.floor((ref - 205) / 80) + 2;
        return `${diceCount}d6`;
      }
    }
  )() }),
};

const executorCoc = new RuleNameSpace(
  0,
  "coc7",
  ["coc", "coc7th"],
  "COC7版规则的指令集",
  new Map<string, string>(Object.entries(ABILITY_MAP)),
  new Map<string, (ability: RoleAbility) => { type: string; value: string | number }>(Object.entries(DEPENDENT_VALUE_MAP)),
);

export default executorCoc;

const cmdRc = new CommandExecutor(
  "rc",
  ["ra"],
  "进行技能检定",
  [".rc 侦查 50", ".rc 侦查 +10", ".rc p 手枪", ".rc 力量", ".rc 敏捷-10"],
  "rc [奖励/惩罚骰]? [技能名] [技能值]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    // 所有参数转为小写
    args = args.map(arg => arg.toLowerCase());
    const isForceToasted = UTILS.doesHaveArg(args, "h");

    // 解析参数
    const signedNumbers: string[] = [];
    const unsignedNumbers: string[] = [];
    const numWithBp: string[] = [];
    const names: string[] = [];

    for (const arg of args) {
      // 先匹配“技能名+带符号数值”（如“力量+20”）
      const nameBonusMatch = arg.match(/^([a-z\u4E00-\u9FA5]+)([+-]\d+)$/i);
      if (nameBonusMatch) {
        names.push(nameBonusMatch[1]); // 提取技能名
        signedNumbers.push(nameBonusMatch[2]); // 提取带符号数值
      }
      else if (/^[+-]\d+(?:\.\d+)?$/.test(arg)) {
        signedNumbers.push(arg);
      }
      else if (/^\d+(?:\.\d+)?$/.test(arg)) {
        unsignedNumbers.push(arg);
      }
      else if (/^\d*[bp]$/.test(arg)) {
        numWithBp.push(arg);
      }
      else {
        names.push(arg);
      }
    }

    const [attr] = unsignedNumbers;
    const [bonus] = signedNumbers;
    // 计算加权总和
    const bp: number = numWithBp.reduce((sum, item) => {
      // 正则匹配：提取数字部分（可含正负号）和末尾的b/p
      const match = item.match(/^([+-]?\d*)([bp])$/);
      if (!match) {
        return 0;
      }

      const [, numStr, letter] = match;
      // 数字部分为空时，默认n=1；否则转换为整数（支持正负）
      const n = numStr === "" ? 1 : Number.parseInt(numStr, 10);
      // 确定权重
      const weight = letter === "b" ? 1 : -1;

      return sum + n * weight;
    }, 0);
    let [name] = names;
    // 补丁：添加对于英文简写属性不可读的临时解决方案
    // TODO 后续添加更健壮的属性解析方案
    if (!name) {
      throw new Error("错误：缺少技能名称");
    }
    if (ABILITY_MAP[name.toLowerCase()]) {
      name = ABILITY_MAP[name.toLowerCase()];
    }
    if (!curAbility?.ability && !curAbility?.skill && !curAbility?.basic && unsignedNumbers.length === 0) {
      cpi.replyMessage(`未设置角色能力？`);
      return false;
    }

    let value = Number.parseInt(UTILS.getRoleAbilityValue(curAbility, name) || "");

    if ((value === undefined || Number.isNaN(value)) && attr === undefined && !bonus) {
      cpi.replyMessage("错误：未找到技能或属性且未指定技能值");
      return false;
    }

    if (attr !== undefined) {
      value = Number.parseInt(attr);
    }

    if (bonus !== undefined) {
      value += Number.parseInt(bonus);
    }

    if (value < 0) {
      value = 0;
    }

    const roll: number[] = rollDiceWithBP(bp);
    let result: string = buildCheckResult(name, roll[0], value, cpi);
    if (bp > 0) {
      result += ` 奖励骰 [${roll.slice(1).join(",")}]`;
    }
    if (bp < 0) {
      result += ` 惩罚骰 [${roll.slice(1).join(",")}]`;
    }
    if (isForceToasted) {
      cpi.sendToast(result);
      cpi.replyMessage(`${mentioned[mentioned.length - 1].roleName}进行了一次暗骰`);
      return true;
    }
    cpi.replyMessage(result);
    return true;
  },
);
executorCoc.addCmd(cmdRc);

const cmdRcb = new CommandExecutor(
  "rcb",
  [],
  "进行带奖励骰的技能检定",
  [".rcb 侦查", ".rcb 力量+10", ".rcb 力量90 2", ".rcb 手枪 3"],
  "rcb [技能名/技能值] [奖励骰数量]?", // 调整格式说明
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    args = args.map(arg => arg.toLowerCase());
    const isForceToasted = UTILS.doesHaveArg(args, "h");

    const signedNumbers: string[] = [];
    const names: string[] = [];
    let bonusCount: number = 1;
    let manualSkillValue: number | null = null; // 手动指定的技能值

    // 标记是否已找到技能名
    let hasSkillName = false;

    for (const arg of args) {
      // 匹配“技能名+修正值”（如“力量+10”）
      const nameBonusMatch = arg.match(/^([a-z\u4E00-\u9FA5]+)([+-]\d+)$/i);
      if (nameBonusMatch) {
        names.push(nameBonusMatch[1]);
        signedNumbers.push(nameBonusMatch[2]);
        hasSkillName = true;
      }
      // 匹配“技能名+纯数值”（如“力量90”）
      else if (/^[a-z\u4E00-\u9FA5]+\d+$/i.test(arg)) {
        const nameValueMatch = arg.match(/^([a-z\u4E00-\u9FA5]+)(\d+)$/i);
        if (nameValueMatch) {
          names.push(nameValueMatch[1]);
          manualSkillValue = Number.parseInt(nameValueMatch[2]);
          hasSkillName = true;
        }
      }
      // 匹配纯数值（优先作为手动技能值，若已找到技能名则作为奖励骰数量）
      else if (/^\d+$/.test(arg)) {
        if (!hasSkillName) {
          manualSkillValue = Number.parseInt(arg);
        }
        else {
          bonusCount = Math.max(1, Number(arg));
        }
      }
      // 纯技能名
      else if (!hasSkillName) {
        names.push(arg);
        hasSkillName = true;
      }
    }

    let [name] = names;
    if (!name && manualSkillValue === null) {
      cpi.replyMessage("错误：缺少技能名称或手动技能值");
      return false;
    }
    // 处理属性简写映射（如ABILITY_MAP定义了“str”→“力量”）
    if (name && ABILITY_MAP[name.toLowerCase()]) {
      name = ABILITY_MAP[name.toLowerCase()];
    }

    // 从角色数据中获取技能基础值
    const baseSkillValue = name ? (UTILS.getRoleAbilityValue(curAbility, name) || "") : "";
    let skillValue: number;

    // 情况1：有技能名 → 优先用角色数据中的技能值
    if (name) {
      if (baseSkillValue) {
        skillValue = Number.parseInt(baseSkillValue);
        // 若有手动指定的技能值，覆盖基础值
        if (manualSkillValue !== null) {
          skillValue = manualSkillValue;
        }
      }
      else if (manualSkillValue !== null) {
        skillValue = manualSkillValue;
      }
      else {
        cpi.replyMessage("错误：未找到技能或属性且未指定技能值");
        return false;
      }
    }
    // 情况2：无技能名 → 必须有手动指定的技能值
    else {
      if (manualSkillValue === null) {
        cpi.replyMessage("错误：缺少技能名称且未指定技能值");
        return false;
      }
      skillValue = manualSkillValue;
      name = "手动指定"; // 用于结果提示
    }

    // 应用修正值
    const [bonus] = signedNumbers;
    if (bonus) {
      skillValue += Number.parseInt(bonus);
    }
    skillValue = Math.max(0, skillValue);

    // 奖励骰逻辑
    const bp = bonusCount;
    const roll: number[] = rollDiceWithBP(bp);
    let result: string = buildCheckResult(name, roll[0], skillValue, cpi);
    result += ` 奖励骰 [${roll.slice(1).join(",")}]`;

    if (isForceToasted) {
      cpi.sendToast(result);
      cpi.replyMessage(`${mentioned[mentioned.length - 1].roleName}进行了一次带奖励骰的暗骰`);
      return true;
    }
    cpi.replyMessage(result);
    return true;
  },
);
executorCoc.addCmd(cmdRcb);

const cmdRcp = new CommandExecutor(
  "rcp",
  [],
  "进行带惩罚骰的技能检定",
  [".rcp 侦查", ".rcp 力量-10", ".rcp 90 2", ".rcp 手枪 3"],
  "rcp [技能名/技能值] [惩罚骰数量]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    args = args.map(arg => arg.toLowerCase());
    const isForceToasted = UTILS.doesHaveArg(args, "h");

    const signedNumbers: string[] = [];
    const names: string[] = [];
    let penaltyCount: number = 1;
    let manualSkillValue: number | null = null;

    let hasSkillName = false;

    for (const arg of args) {
      const nameBonusMatch = arg.match(/^([a-z\u4E00-\u9FA5]+)([+-]\d+)$/i);
      if (nameBonusMatch) {
        names.push(nameBonusMatch[1]);
        signedNumbers.push(nameBonusMatch[2]);
        hasSkillName = true;
      }
      else if (/^[a-z\u4E00-\u9FA5]+\d+$/i.test(arg)) {
        const nameValueMatch = arg.match(/^([a-z\u4E00-\u9FA5]+)(\d+)$/i);
        if (nameValueMatch) {
          names.push(nameValueMatch[1]);
          manualSkillValue = Number.parseInt(nameValueMatch[2]);
          hasSkillName = true;
        }
      }
      else if (/^\d+$/.test(arg)) {
        if (!hasSkillName) {
          manualSkillValue = Number.parseInt(arg);
        }
        else {
          penaltyCount = Math.max(1, Number(arg));
        }
      }
      else if (!hasSkillName) {
        names.push(arg);
        hasSkillName = true;
      }
    }

    let [name] = names;
    if (!name && manualSkillValue === null) {
      cpi.replyMessage("错误：缺少技能名称或手动技能值");
      return false;
    }
    if (name && ABILITY_MAP[name.toLowerCase()]) {
      name = ABILITY_MAP[name.toLowerCase()];
    }

    const baseSkillValue = name ? (UTILS.getRoleAbilityValue(curAbility, name) || "") : "";
    let skillValue: number;

    if (name) {
      if (baseSkillValue) {
        skillValue = Number.parseInt(baseSkillValue);
        if (manualSkillValue !== null) {
          skillValue = manualSkillValue;
        }
      }
      else if (manualSkillValue !== null) {
        skillValue = manualSkillValue;
      }
      else {
        cpi.replyMessage("错误：未找到技能或属性且未指定技能值");
        return false;
      }
    }
    else {
      if (manualSkillValue === null) {
        cpi.replyMessage("错误：缺少技能名称且未指定技能值");
        return false;
      }
      skillValue = manualSkillValue;
      name = "手动指定";
    }

    const [bonus] = signedNumbers;
    if (bonus) {
      skillValue += Number.parseInt(bonus);
    }
    skillValue = Math.max(0, skillValue);

    const bp = -penaltyCount;
    const roll: number[] = rollDiceWithBP(bp);
    let result: string = buildCheckResult(name, roll[0], skillValue, cpi);
    result += ` 惩罚骰 [${roll.slice(1).join(",")}]`;

    if (isForceToasted) {
      cpi.sendToast(result);
      cpi.replyMessage(`${mentioned[mentioned.length - 1].roleName}进行了一次带惩罚骰的暗骰`);
      return true;
    }
    cpi.replyMessage(result);
    return true;
  },
);
executorCoc.addCmd(cmdRcp);

const cmdRh = new CommandExecutor(
  "rh",
  ["暗骰"], // 别名
  "进行基础暗骰（结果仅自己可见）",
  [".rh", ".rh 20", ".rh 3d6"], // 示例：默认D100 / D20 / 3个D6
  "rh [骰子格式]?", // 格式：可选，默认D100，支持“数字”（Dn）或“ndm”（n个m面骰）
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    // 解析骰子格式（默认D100）
    let diceCount = 1; // 骰子数量
    let diceSides = 100; // 骰子面数

    if (args.length > 0) {
      const diceArg = args[0].toLowerCase();
      // 匹配“ndm”格式（如3d6）
      const ndmMatch = diceArg.match(/^(\d+)d(\d+)$/);
      if (ndmMatch) {
        diceCount = Math.max(1, Number(ndmMatch[1])); // 至少1个骰子
        diceSides = Math.max(2, Number(ndmMatch[2])); // 至少2面
      }
      // 匹配纯数字（视为Dn，如20 → D20）
      else if (/^\d+$/.test(diceArg)) {
        diceSides = Math.max(2, Number(diceArg));
      }
      else {
        cpi.replyMessage("错误：骰子格式无效，支持 .rh（默认D100）、.rh 20（D20）、.rh 3d6（3个6面骰）");
        return false;
      }
    }

    // 掷骰子
    const rolls: number[] = [];
    for (let i = 0; i < diceCount; i++) {
      rolls.push(Math.floor(Math.random() * diceSides) + 1);
    }

    // 计算总和（多骰时显示）
    const total = rolls.reduce((sum, val) => sum + val, 0);

    // 构建结果（仅自己可见）
    let result = `暗骰结果：`;
    if (diceCount === 1) {
      result += `D${diceSides}=${rolls[0]}`;
    }
    else {
      result += `${diceCount}D${diceSides}=${rolls.join("+")}=${total}`;
    }

    // 发送暗骰结果（仅发起者可见）
    cpi.sendToast(result); // 假设sendToast是私聊/提示框发送
    cpi.replyMessage(`${mentioned[0].roleName}进行了一次暗骰`); // 公开频道提示
    return true;
  },
);
executorCoc.addCmd(cmdRh);

const cmdRch = new CommandExecutor(
  "rch",
  ["暗骰检定"],
  "进行技能/属性暗骰检定（无奖惩骰，结果仅自己可见）",
  [".rch 侦查", ".rch 力量+10", ".rch 90", ".rch 力量 90"],
  "rch [技能名] [技能值]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    args = args.map(arg => arg.toLowerCase());

    const signedNumbers: string[] = [];
    const names: string[] = [];
    let manualSkillValue: number | null = null;
    let hasSkillName = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // 匹配“技能名+修正值”（如“力量-10”“侦查+5”）
      const nameBonusMatch = arg.match(/^([a-z\u4E00-\u9FA5]+)([+-]\d+)$/i);
      if (nameBonusMatch) {
        names.push(nameBonusMatch[1]);
        signedNumbers.push(nameBonusMatch[2]);
        hasSkillName = true;
      }
      // 匹配“技能名+数值”（如“侦查50”“力量70”）
      else if (/^[a-z\u4E00-\u9FA5]+\d+$/i.test(arg)) {
        const nameValueMatch = arg.match(/^([a-z\u4E00-\u9FA5]+)(\d+)$/i);
        if (nameValueMatch) {
          names.push(nameValueMatch[1]);
          manualSkillValue = Number.parseInt(nameValueMatch[2]);
          hasSkillName = true;
        }
      }
      // 匹配纯数值（作为手动技能值，如“90”）
      else if (/^\d+$/.test(arg)) {
        if (!hasSkillName) {
          manualSkillValue = Number.parseInt(arg);
        }
        else {
          // 若已找到技能名，后续的纯数值作为手动指定的技能值
          manualSkillValue = Number.parseInt(arg);
        }
      }
      // 纯技能名（如“力量”“侦查”）
      else if (!hasSkillName) {
        names.push(arg);
        hasSkillName = true;
      }
    }

    let [name] = names;
    if (!name && manualSkillValue === null) {
      cpi.replyMessage("错误：缺少技能名称或手动技能值");
      return false;
    }
    if (name && ABILITY_MAP[name.toLowerCase()]) {
      name = ABILITY_MAP[name.toLowerCase()];
    }

    const baseSkillValue = name ? (UTILS.getRoleAbilityValue(curAbility, name) || "") : "";
    let skillValue: number;

    if (name) {
      if (baseSkillValue) {
        skillValue = Number.parseInt(baseSkillValue);
        if (manualSkillValue !== null) {
          skillValue = manualSkillValue;
        }
      }
      else if (manualSkillValue !== null) {
        skillValue = manualSkillValue;
      }
      else {
        cpi.replyMessage("错误：未找到技能或属性且未指定技能值");
        return false;
      }
    }
    else {
      if (manualSkillValue === null) {
        cpi.replyMessage("错误：缺少技能名称且未指定技能值");
        return false;
      }
      skillValue = manualSkillValue;
      name = "手动指定";
    }

    const [bonus] = signedNumbers;
    if (bonus) {
      skillValue += Number.parseInt(bonus);
    }
    skillValue = Math.max(0, skillValue);

    const rollResult = Math.floor(Math.random() * 100) + 1;

    const result = buildCheckResult(name, rollResult, skillValue, cpi);

    cpi.sendToast(`暗骰检定结果：${result}`);
    cpi.replyMessage(`${mentioned[0].roleName}进行了一次暗骰检定`);
    return true;
  },
);
executorCoc.addCmd(cmdRch);

const cmdEn = new CommandExecutor(
  "en",
  [],
  "进行成长检定",
  [".en 教育"],
  "",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    // 所有参数转为小写
    args = args.map(arg => arg.toLowerCase());
    const _isForceToasted = UTILS.doesHaveArg(args, "h");
    // 解析参数
    // 1. 以正负号开头的数字
    const signedNumbers = args.filter(str => /^[+-]\d+(?:\.\d+)?$/.test(str));

    // 2. 无符号数字
    const unsignedNumbers = args.filter(str => /^\d+(?:\.\d+)?$/.test(str));

    // 3. 其他
    const names = args.filter(str =>
      !/^[+-]\d+(?:\.\d+)?$/.test(str)
      && !/^\d+(?:\.\d+)?$/.test(str)
      && !/^\d*[bp]$/.test(str),
    );
    const [attr] = unsignedNumbers;
    const [bonus] = signedNumbers;
    let [name] = names;
    // 补丁：添加对于英文简写属性不可读的临时解决方案
    // TODO 后续添加更健壮的属性解析方案
    if (!name) {
      throw new Error("错误：缺少技能名称");
    }
    if (ABILITY_MAP[name.toLowerCase()]) {
      name = ABILITY_MAP[name.toLowerCase()];
    }
    if (!curAbility?.ability && !curAbility?.skill && !curAbility?.basic && unsignedNumbers.length === 0) {
      cpi.replyMessage(`未设置角色能力？`);
      return false;
    }

    let value = Number.parseInt(UTILS.getRoleAbilityValue(curAbility, name) || "");

    if ((value === undefined || Number.isNaN(value)) && attr === undefined) {
      cpi.replyMessage(`错误：未找到技能或属性`);
      return false;
    }

    if (attr !== undefined) {
      value = Number.parseInt(attr);
    }

    if (bonus !== undefined) {
      value += Number.parseInt(bonus);
    }

    if (value < 0) {
      value = 0;
    }

    // 掷d100检定
    const checkValue = Math.floor(Math.random() * 100) + 1;
    let { result, doNeedImprove } = buildEnCheckResult(name, checkValue, value);
    let improveAmount = 0;
    if (doNeedImprove) {
      improveAmount = Math.floor(Math.random() * 10) + 1;
      UTILS.setRoleAbilityValue(curAbility, name, String(value + improveAmount), "skill");
      cpi.setRoleAbilityList(mentioned[0].roleId, curAbility);
      result += `\n${name}成长：${value} -> ${value + improveAmount}`;
    }
    cpi.replyMessage(result);
    return true;
  },
);
executorCoc.addCmd(cmdEn);

const cmdSc = new CommandExecutor(
  "sc",
  [],
  "进行理智检定",
  [".sc 1/1d6 : 成功扣1，失败扣1d6"],
  ".sc [成功扣除]/[失败扣除]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    // 解析参数
    const [lossExpr, currentSanArg] = args;

    // 获取当前san值，优先使用参数，其次从角色卡获取
    let currentSan: number;
    if (currentSanArg) {
      currentSan = Number.parseInt(currentSanArg);
      if (Number.isNaN(currentSan)) {
        throw new TypeError("无效的当前san值");
      }
    }
    else {
      if (!curAbility?.ability) {
        cpi.replyMessage(`未设置角色能力`);
        return false;
      }
      currentSan = Number.parseInt(curAbility.ability["san值"]) || Number.parseInt(curAbility.ability.san);
      if (currentSan === undefined) {
        cpi.replyMessage(`未找到角色的san值`);
        return false;
      }
    }

    // 解析损失表达式
    const [successLossStr, failureLossStr] = lossExpr.split("/");
    if (!successLossStr || !failureLossStr) {
      cpi.replyMessage(`损失表达式格式错误，应为[成功损失]/[失败损失]`);
      return false;
    }

    // 解析成功和失败的损失值
    const successLoss = parseDiceExpression(successLossStr);
    const failureLoss = parseDiceExpression(failureLossStr);

    // 进行理智检定
    const roll = rollDice(100);
    let result: string;
    let actualLoss: number;

    // 大成功判定
    if (roll <= 5) {
      actualLoss = successLoss.possibleRange.min; // 大成功时失去最小san值
      result = "大成功";
    }
    // 大失败判定
    else if (roll >= 96) {
      actualLoss = failureLoss.possibleRange.max; // 大失败时失去最大san值
      cpi.setCopywritingKey("理智检定_大失败");
      result = "大失败";
    }
    // 普通成功
    else if (roll <= currentSan) {
      actualLoss = successLoss.result.value;
      cpi.setCopywritingKey("理智检定_成功");
      result = "成功";
    }
    // 普通失败
    else {
      actualLoss = failureLoss.result.value;
      cpi.setCopywritingKey("理智检定_失败");
      result = "失败";
    }

    // 计算新san值
    let newSan = currentSan - actualLoss;
    if (newSan <= 0) {
      newSan = 0;
    }

    if (!curAbility.ability) {
      cpi.replyMessage(`未设置角色san值`);
      return false;
    }
    // 更新角色卡中的san值
    curAbility.ability["san值"] = String(newSan);
    curAbility.ability.san = String(newSan);

    await cpi.setRoleAbilityList(mentioned[0].roleId, curAbility);

    // 构建返回信息
    let res: string = `理智检定：D100=${roll}/${currentSan} ${result}\n`
      + `损失san值：${actualLoss}\n`
      + `当前san值：${newSan}`;
    if (newSan === 0) {
      res += `\n注意：角色理智值归零，陷入永久性疯狂。`;
      cpi.setCopywritingKey("陷入疯狂_永久性疯狂");
    }
    else if (actualLoss >= 5) {
      res += `\n注意：单次失去理智值达到5点，请进行智力检定，若检定成功角色将陷入疯狂。疯狂后请使用\`.ti\`或\`.li\`指令抽取临时症状或总结症状。`;
      cpi.setCopywritingKey("陷入疯狂_临时性疯狂");
    }
    cpi.replyMessage(res);
    return true;
  },
);
executorCoc.addCmd(cmdSc);

const cmdTi = new CommandExecutor(
  "ti",
  [],
  "抽取临时症状",
  [".ti"],
  "",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const boutsOfMadnessForRealTimeList = [
      {
        name: "失忆",
        desc: "调查员对自己上一次抵达安全的场所后发生的事一无所知。在其看来上一刻他还在吃着早餐，而下一刻就已经身处怪物面前。",
      },
      { name: "假性残疾", desc: "调查员陷入因心理作用引起的失明、耳聋或肢体失能中。" },
      { name: "暴力倾向", desc: "调查员沉浸于狂怒，开始对四周的一切施加失控的暴力与破坏行为，无论敌友。" },
      {
        name: "偏执妄想",
        desc: "调查员陷入严重的偏执妄想之中。所有人都正在与他为敌！没人值得信任！他正在被窥视着，有人背叛了他，他所看见的皆是虚伪的幻象。",
      },
      {
        name: "人际依赖",
        desc: "浏览调查员􀀀景故事的“重要之人”条目。调查员会将当前场景中的另一人误当做他的重要之人。调查员将依照他与重要之人之间关系的性质行事。",
      },
      { name: "昏厥", desc: "调查员会立即昏倒" },
      {
        name: "惊慌逃窜",
        desc: "调查员会无法自制地用一切可能的方法远远逃开，即使这意味着他需要开走唯一的一辆车并抛下其他所有人。",
      },
      { name: "歇斯底里", desc: "调查员情不自禁地开始狂笑、哭泣、尖叫，等等。" },
      {
        name: "恐惧症",
        desc: "调查员患上一项新的恐惧症。掷1D100并查阅表9：范例恐惧症，或由守秘人选择一项。即使引发这些恐惧症的源头并不在身边，调查员仍会在疯狂发作期间想象那些东西正在那里。",
      },
      {
        name: "躁狂症",
        desc: "调查员患上一项新的躁狂症。掷1D100 并查阅表10：范例躁狂症，或由守秘人选择一项。调查员会在疯狂发作期间中沉浸在他新的躁狂症中。",
      },
    ];
    const res = boutsOfMadnessForRealTimeList[rollDice(boutsOfMadnessForRealTimeList.length) - 1];
    const timeOfDuration = rollDice(10);
    cpi.replyMessage(`疯狂发作-即时症状：\n${res.name}\n持续时间：${timeOfDuration}轮\n${res.desc}`);
    return true;
  },
);
executorCoc.addCmd(cmdTi);

const cmdLi = new CommandExecutor(
  "li",
  [],
  "抽取总结症状",
  [".li"],
  "",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const boutsOfMadnessForSummaryList = [
      { name: "失忆", desc: "调查员恢复神志时身处陌生地点，连自己是谁都不记得。记忆会随时间流逝逐渐恢复。" },
      {
        name: "被劫",
        desc: "调查员恢复神志时，财物已遭人打劫，但没有受到人身伤害。如果其携带着宝贵之物（参考调查员背景故事），进行一次幸运检定决定它是否被盗。其他所有值钱的物品都会自动丢失。",
      },
      {
        name: "遍体鳞伤",
        desc: "调查员恢复神志时，遍体鳞伤，浑身淤青。生命值降低至疯狂前的一半，但这不会造成重伤。调查员的财物没有被劫走。这些伤害如何造成由守秘人决定。",
      },
      {
        name: "暴力",
        desc: "调查员的情绪在暴力和破坏的冲动中爆发。调查员恢复神志时可能记得自己做过的事，也可能不记得。调查员对谁、对什么东西施以暴力，是杀死还是仅仅造成伤害，这些都由守秘人决定。",
      },
      {
        name: "思想与信念",
        desc: "浏览调查员背景故事的“思想与信念”条目。调查员选择其中一项，将它以极端、疯魔、形之于色的方式展现出来。例如，信仰宗教的人后来可能在地铁上大声宣讲福音。",
      },
      {
        name: "重要之人",
        desc: "浏览调查员背景故事的“重要之人”条目，及其重要的原因。在略过的时间中，调查员会尽一切努力接近重要之人，并以某种行动展现他们之间的关系。",
      },
      { name: "被收容", desc: "调查员恢复神志时身处精神病房或者警局拘留室当中。调查员会逐渐回想起他们身处此地的原因。" },
      {
        name: "惊慌逃窜",
        desc: "调查员恢复神志时已经身处很远的地方，可能在荒野中迷失了方向，或是正坐在火车或长途巴士上。",
      },
      {
        name: "恐惧症",
        desc: "调查员患上一项新的恐惧症。掷1D100并查阅表9：范例恐惧症，或由守秘人选择一项。即使引发这些恐惧症的源头并不在身边，调查员仍会在疯狂发作期间想象那些东西正在那里。",
      },
      {
        name: "躁狂症",
        desc: "调查员患上一项新的躁狂症。掷1D100 并查阅表10：范例躁狂症，或由守秘人选择一项。调查员会在疯狂发作期间中沉浸在他新的躁狂症中。",
      },
    ];
    const res = boutsOfMadnessForSummaryList[rollDice(boutsOfMadnessForSummaryList.length) - 1];
    const timeOfDuration = rollDice(10);
    cpi.replyMessage(`疯狂发作-总结症状：\n${res.name}\n已略过时间：${timeOfDuration}小时\n${res.desc}`);
    return true;
  },
);
executorCoc.addCmd(cmdLi);

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
        const key = ABILITY_MAP[normalizedKey] || prop;
        const value = UTILS.getRoleAbilityValue(curAbility, key) ?? 0; // 修改这里，添加默认值0

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
      const key = ABILITY_MAP[normalizedKey] || rawKey;

      const currentValue = Number.parseInt(UTILS.getRoleAbilityValue(curAbility, key) ?? "0"); // 原有值（默认0）
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
      UTILS.setRoleAbilityValue(curAbility, key, newValue.toString(), "skill", "auto");
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
executorCoc.addCmd(cmdSt);

/**
 * 带奖励骰和惩罚骰的检定掷骰
 * @param bp 奖励骰数，负数表示惩罚骰数
 * @returns 骰子结果数组 [最终结果, 奖励/惩罚骰1, 奖励/惩罚骰2,...]
 */
function rollDiceWithBP(bp: number = 0): number[] {
  let bonus: boolean = false;
  const result: number[] = Array.from({ length: bp + 2 });
  if (bp > 0) {
    bonus = true;
  }
  bp = Math.abs(bp);
  let tens = Math.floor(Math.random() * 10);
  const ones = Math.floor(Math.random() * 10);
  result[1] = tens;
  for (let i = 1; i <= bp; i++) {
    const roll = Math.floor(Math.random() * 10);
    if ((connect2D10(tens, ones) > connect2D10(roll, ones)) === bonus) {
      tens = roll;
    }
    result[i + 1] = roll;
  }
  result[0] = connect2D10(tens, ones);
  return result;
}

/**
 * 将d100的个位数和十位数连接起来，其中‘00’会被替换为‘100’
 */
function connect2D10(tens: number, ones: number) {
  let result = tens * 10 + ones;
  if (result === 0) {
    result = 100;
  }
  return result;
}

function buildCheckResult(attr: string, roll: number, value: number, cpi?: CPI): string {
  let result = "";
  const fifth = Math.floor(value / 5);
  const half = Math.floor(value / 2);

  if (roll <= 5) {
    result = "大成功";
  }
  else if (roll >= 96) {
    result = "大失败";
  }
  else if (roll > value) {
    result = "失败";
  }
  else if (roll <= fifth) {
    result = "极难成功";
  }
  else if (roll <= half) {
    result = "困难成功";
  }
  else {
    result = "成功";
  }

  // 调用 CPI 设置文案键
  if (cpi) {
    cpi.setCopywritingKey(result);
  }

  return `${attr}检定：D100=${roll}/${value} ${result}`;
}

function buildEnCheckResult(attr: string, roll: number, value: number): { result: string; doNeedImprove: boolean } {
  if (roll > 95 || roll > value) {
    return { result: `${attr}教育检定：D100=${roll}/${value}，检定成功`, doNeedImprove: true };
  }
  return { result: `${attr}教育检定：D100=${roll}/${value}，检定失败`, doNeedImprove: false };
}
