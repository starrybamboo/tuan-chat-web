import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { parseDiceExpression, rollDice } from "@/components/common/dicer/dice";
import UNTIL from "@/components/common/dicer/utils";

// 属性名中英文对照表
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
};

const ruleCoc = new RuleNameSpace(
  0,
  "coc7",
  ["coc", "coc7th"],
  "COC7版规则的指令集",
);

export default ruleCoc;

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

    if ((value === undefined || Number.isNaN(value)) && attr === undefined && attr === undefined) {
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
ruleCoc.addCmd(cmdRc);

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
ruleCoc.addCmd(cmdSc);

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
ruleCoc.addCmd(cmdTi);

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
ruleCoc.addCmd(cmdLi);
