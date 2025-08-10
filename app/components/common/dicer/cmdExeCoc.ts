import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { parseDiceExpression, rollDice } from "@/components/common/dicer/dice";

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
    if (!curAbility?.ability) {
      cpi.sendMsg(prop, `未设置角色能力？`);
      return false;
    }

    let value = curAbility?.ability[name];

    if (value === undefined && attr === undefined) {
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
  ["sanchecck"],
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
      currentSan = curAbility.ability["san值"] || curAbility.ability.san;
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

    // 更新角色卡中的san值
    if (curAbility) {
      const ability = { ...curAbility.ability };
      ability["san值"] = newSan;
      ability.san = newSan;

      await cpi.setRoleAbilityList(mentioned[0].roleId, ability);
    }

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
