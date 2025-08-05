import type { ExecutorProp } from "@/components/common/dicer/cmdPre";
import type { CPI } from "@/components/common/dicer/cmdType";

import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";

import type { UserRole } from "../../../../api";

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
  [""],
  "rc [奖励/惩罚骰]? [技能名] [技能值]?",
  (args: string[], operator: UserRole, _ats: UserRole[], cpi: CPI, prop: ExecutorProp): boolean => {
    const curAbility = cpi.getRoleAbilityList(operator.roleId);
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
      cpi.sendMsg(prop, `未设置角色能力`);
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
