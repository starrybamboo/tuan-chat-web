import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { parseDiceExpression, rollDice } from "@/components/common/dicer/dice";
import UNTIL from "@/components/common/dicer/utils";

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
  hp: "体力",
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

const executorCoc = new RuleNameSpace(
  0,
  "coc7",
  ["coc", "coc7th"],
  "COC7版规则的指令集",
);

export default executorCoc;

const cmdRc = new CommandExecutor(
  "rc",
  ["ra"],
  "进行技能检定",
  [".rc 侦查 50", ".rc 侦查 +10", ".rc p 手枪", ".rc 力量"],
  "rc [奖励/惩罚骰]? [技能名] [技能值]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    // 所有参数转为小写
    args = args.map(arg => arg.toLowerCase());
    const isForceToasted = UNTIL.doesHaveArg(args, "h");
    // 解析参数
    // 1. 以正负号开头的数字
    const signedNumbers = args.filter(str => /^[+-]\d+(?:\.\d+)?$/.test(str));

    // 2. 无符号数字
    const unsignedNumbers = args.filter(str => /^\d+(?:\.\d+)?$/.test(str));

    // 3. 数字（可无）跟字母b或p
    const numWithBp = args.filter(str => /^\d*[bp]$/.test(str));

    // 4. 其他
    const names = args.filter(str =>
      !/^[+-]\d+(?:\.\d+)?$/.test(str)
      && !/^\d+(?:\.\d+)?$/.test(str)
      && !/^\d*[bp]$/.test(str),
    );
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
      cpi.sendMsg(prop, `未设置角色能力？`);
      return false;
    }

    let value = Number.parseInt(UNTIL.getRoleAbilityValue(curAbility, name) || "");

    if ((value === undefined || Number.isNaN(value)) && attr === undefined) {
      cpi.sendMsg(prop, `错误：未找到技能或属性`);
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
    let result: string = buildCheckResult(name, roll[0], value);
    if (bp > 0) {
      result += ` 奖励骰 [${roll.slice(1).join(",")}]`;
    }
    if (bp < 0) {
      result += ` 惩罚骰 [${roll.slice(1).join(",")}]`;
    }
    if (isForceToasted) {
      cpi.sendToast(result);
      cpi.sendMsg(prop, `${mentioned[mentioned.length - 1].roleName}进行了一次暗骰`);
      return true;
    }
    cpi.sendMsg(prop, result);
    return true;
  },
);
executorCoc.addCmd(cmdRc);

const cmdEn = new CommandExecutor(
  "en",
  [],
  "进行成长检定",
  [".en 教育"],
  "",
  async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    // 所有参数转为小写
    args = args.map(arg => arg.toLowerCase());
    const _isForceToasted = UNTIL.doesHaveArg(args, "h");
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
      cpi.sendMsg(prop, `未设置角色能力？`);
      return false;
    }

    let value = Number.parseInt(UNTIL.getRoleAbilityValue(curAbility, name) || "");

    if ((value === undefined || Number.isNaN(value)) && attr === undefined) {
      cpi.sendMsg(prop, `错误：未找到技能或属性`);
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
      UNTIL.setRoleAbilityValue(curAbility, name, String(value + improveAmount), "skill");
      cpi.setRoleAbilityList(mentioned[0].roleId, curAbility);
      result += `\n${name}成长：${value} -> ${value + improveAmount}`;
    }
    cpi.sendMsg(prop, result);
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
  async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
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
        cpi.sendMsg(prop, `未设置角色能力`);
        return false;
      }
      currentSan = Number.parseInt(curAbility.ability["san值"]) || Number.parseInt(curAbility.ability.san);
      if (currentSan === undefined) {
        cpi.sendMsg(prop, `未找到角色的san值`);
        return false;
      }
    }

    // 解析损失表达式
    const [successLossStr, failureLossStr] = lossExpr.split("/");
    if (!successLossStr || !failureLossStr) {
      cpi.sendMsg(prop, `损失表达式格式错误，应为[成功损失]/[失败损失]`);
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
      result = "大失败";
    }
    // 普通成功
    else if (roll <= currentSan) {
      actualLoss = successLoss.result.value;
      result = "成功";
    }
    // 普通失败
    else {
      actualLoss = failureLoss.result.value;
      result = "失败";
    }

    // 计算新san值
    let newSan = currentSan - actualLoss;
    if (newSan <= 0) {
      newSan = 0;
    }

    if (!curAbility.ability) {
      cpi.sendMsg(prop, `未设置角色san值`);
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
    }
    else if (actualLoss >= 5) {
      res += `\n注意：单次失去理智值达到5点，请进行智力检定，若检定成功角色将陷入疯狂。疯狂后请使用\`.ti\`或\`.li\`指令抽取临时症状或总结症状。`;
    }
    cpi.sendMsg(prop, res);
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
  async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
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
    cpi.sendMsg(prop, `疯狂发作-即时症状：\n${res.name}\n持续时间：${timeOfDuration}轮\n${res.desc}`);
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
  async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
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
    cpi.sendMsg(prop, `疯狂发作-总结症状：\n${res.name}\n已略过时间：${timeOfDuration}小时\n${res.desc}`);
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
  async (args: string[], mentioned: UserRole[], cpi: CPI, _prop: ExecutorProp): Promise<boolean> => {
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
      const key = ABILITY_MAP[normalizedKey] || rawKey;

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
    cpi.sendMsg(_prop, `属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${updateDetails}`);
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

function buildCheckResult(attr: string, roll: number, value: number): string {
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
    result = "普通成功";
  }

  return `${attr}检定：D100=${roll}/${value} ${result}`;
}

function buildEnCheckResult(attr: string, roll: number, value: number): { result: string; doNeedImprove: boolean } {
  if (roll > 95 || roll > value) {
    return { result: `${attr}教育检定：D100=${roll}/${value}，检定成功`, doNeedImprove: true };
  }
  return { result: `${attr}教育检定：D100=${roll}/${value}，检定失败`, doNeedImprove: false };
}
