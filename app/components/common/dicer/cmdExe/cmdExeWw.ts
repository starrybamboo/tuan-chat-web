import { CommandExecutor } from "@/components/common/dicer/cmd";
import UTILS from "@/components/common/dicer/utils/utils";

export type WwCommandOptions = {
  diceCount: number;
  explodeAt: number;
  bonusSuccess: number;
  successAt: number;
  sides: number;
};

export type WwRollResult = {
  rolls: number[]; // 扁平化的所有投掷结果
  rounds: number[][]; // 按轮次分组的投掷结果
  baseSuccesses: number;
  totalSuccesses: number;
  totalRollsCount: number; // 总投掷次数
};

const DEFAULT_DICE_COUNT = 1;
const DEFAULT_EXPLODE_AT = 10;
const DEFAULT_SUCCESS_AT = 8;
const DEFAULT_SIDES = 10;
const MIN_EXPLODE_AT = 2; // 允许更低的加骰线，只要 > 1
const MAX_TOTAL_ROLLS = 1000; // 降低一点防止卡死

/**
 * 解析 .ww 指令参数：
 * .ww X[aY][mZ][kN] [+-bonus]
 * X: 骰子数 (默认1)
 * a: 加骰线 (默认10)
 * m: 面数 (默认10)
 * k: 成功线 (默认8)
 */
export function parseWwCommandArgs(args: string[]): WwCommandOptions {
  // 1. 预处理：合并参数，转小写，特定字符替换
  let normalized = args
    .join("")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replaceAll("＋", "+")
    .replaceAll("－", "-")
    .replaceAll("ａ", "a");

  // 若为空，返回默认
  if (!normalized) {
    return {
      diceCount: DEFAULT_DICE_COUNT,
      explodeAt: DEFAULT_EXPLODE_AT,
      bonusSuccess: 0,
      successAt: DEFAULT_SUCCESS_AT,
      sides: DEFAULT_SIDES,
    };
  }

  // 2. 提取末尾的 bonus (+1, -2 等)
  let bonusSuccess = 0;
  // 匹配末尾的 +数字 或 -数字
  // 注意：如果是类似 3a9+2 这种格式
  const bonusMatch = normalized.match(/([+-]\d+)$/);
  if (bonusMatch) {
    bonusSuccess = Number.parseInt(bonusMatch[1], 10);
    // 移除 bonus 部分，剩下的是 XaYmZkN
    normalized = normalized.slice(0, bonusMatch.index);
  }

  // 3. 解析 X (骰子数)
  // 尝试匹配开头的数字
  let diceCount = DEFAULT_DICE_COUNT;
  const startNumMatch = normalized.match(/^(\d+)/);
  if (startNumMatch) {
    diceCount = Number.parseInt(startNumMatch[1], 10);
    // 移除开头的数字
    normalized = normalized.slice(startNumMatch[0].length);
  }

  // 4. 解析剩余的参数 a, m, k
  let explodeAt = DEFAULT_EXPLODE_AT;
  let sides = DEFAULT_SIDES;
  let successAt = DEFAULT_SUCCESS_AT;

  // 使用正则循环匹配剩余部分
  // 匹配单个字母加数字，例如 a9, m10, k7
  const paramRegex = /([amk])(\d+)/g;
  let match;
  while ((match = paramRegex.exec(normalized)) !== null) {
    const type = match[1];
    const value = Number.parseInt(match[2], 10);

    switch (type) {
      case "a":
        explodeAt = value;
        break;
      case "m":
        sides = value;
        break;
      case "k":
        successAt = value;
        break;
    }
  }

  // 校验
  if (diceCount <= 0) diceCount = 1;
  if (sides < 2) sides = DEFAULT_SIDES;
  
  // 加骰线不能 <= 1，否则会无限加骰
  if (explodeAt <= 1) explodeAt = 2;
  // 加骰线如果 > 面数，则无法加骰，这是允许的，但逻辑上可能用户填错，不过这里只做基本范围限制
  // 如果用户设置 .ww m10a11，那么永远不会加骰

  return {
    diceCount,
    explodeAt,
    bonusSuccess,
    successAt,
    sides,
  };
}

function rollDx(sides: number, rng: () => number): number {
  const raw = rng();
  if (!Number.isFinite(raw)) {
    throw new TypeError("随机数生成异常");
  }
  // [0, 1) -> [0, sides) -> [1, sides]
  return Math.floor(raw * sides) + 1;
}

/**
 * 按 WW 规则掷骰
 */
export function rollWw(
  options: WwCommandOptions,
  rng: () => number = Math.random,
  maxTotalRolls: number = MAX_TOTAL_ROLLS,
): WwRollResult {
  const rounds: number[][] = [];
  const allRolls: number[] = [];
  
  let currentRoundDiceCount = options.diceCount;
  let totalRollsCount = 0;

  // 循环投掷，直到没有骰子需要重投或达到最大限制
  while (currentRoundDiceCount > 0) {
    if (totalRollsCount >= maxTotalRolls) {
      // 达到上限，强制停止
      break;
    }

    const currentRoundRolls: number[] = [];
    let nextRoundDiceCount = 0;

    // 投掷本轮的所有骰子
    for (let i = 0; i < currentRoundDiceCount; i++) {
        if (totalRollsCount >= maxTotalRolls) break;

        const point = rollDx(options.sides, rng);
        totalRollsCount++;
        currentRoundRolls.push(point);
        allRolls.push(point);

        // 检查是否加骰
        if (point >= options.explodeAt) {
            nextRoundDiceCount++;
        }
    }

    rounds.push(currentRoundRolls);
    currentRoundDiceCount = nextRoundDiceCount;
  }

  const baseSuccesses = allRolls.filter(point => point >= options.successAt).length;
  
  return {
    rolls: allRolls,
    rounds,
    baseSuccesses,
    totalSuccesses: Math.max(0, baseSuccesses + options.bonusSuccess),
    totalRollsCount,
  };
}

/**
 * 格式化输出
 * 参考格式：
 * <Sola>掷出了 10a5k7m9=6[10a5k7m9=成功6/22 轮数:4 {2,<8*>,<5>,<9*>,<5>,<7*>,<7*>,<9*>,3,3},{4,<6>,4,<6>,<5>,4,1},{4,<5>,<8*>},{4,2}]=6
 * 简化版适应现有接口：
 * WW检定 10a5k7m9+1=6 [10a5k7m9+1=成功6/22 轮数:4 {详情...}]=6
 */
export function formatWwResultMessage(options: WwCommandOptions, result: WwRollResult, operatorName: string = "当前角色"): string {
  // 构建指令字符串 e.g. 10a5k7m9
  let cmdStr = `${options.diceCount}a${options.explodeAt}k${options.successAt}m${options.sides}`;
  // 只有当参数非默认时才显示简化信息？或者总是全显示。用户示例中是全显示的。
  // 优化：如果 m10 (默认) 可以不显示 m10？用户示例里 m9 显示了。
  // 我们可以完全重构这个字符串的生成逻辑。
  
  // 简单的构建方式
  let simpleCmd = `${options.diceCount}`;
  if (options.explodeAt !== 10) simpleCmd += `a${options.explodeAt}`;
  if (options.successAt !== 8) simpleCmd += `k${options.successAt}`;
  if (options.sides !== 10) simpleCmd += `m${options.sides}`;
  
  // 完整详细串，用于详情中
  const detailCmdStr = `${options.diceCount}a${options.explodeAt}k${options.successAt}m${options.sides}`;

  const bonusText = options.bonusSuccess === 0
    ? ""
    : (options.bonusSuccess > 0 ? `+${options.bonusSuccess}` : `${options.bonusSuccess}`);

  const finalSuccess = result.totalSuccesses;

  // 构建详细的轮次结果字符串
  // 格式：{<10*>,1,2}, {<9*>, <9*>}
  const roundsStr = result.rounds.map((round, index) => {
    const diceStrs = round.map(pt => {
        let str = `${pt}`;
        
        // 判断是否成功 (星号)
        const isSuccess = pt >= options.successAt;
        // 判断是否加骰 (<>)
        const isExplode = pt >= options.explodeAt;
        
        if (isSuccess) {
            str = `${str}*`;
        }
        
        if (isExplode) {
            str = `<${str}>`;
        }
        
        return str;
    }).join(",");
    return `\n第 ${index + 1} 轮: {${diceStrs}}`;
  }).join("");

  // 最终格式拼接
  // 头部信息
  // <角色>掷出了 10a5k7m9=6
  // 详情块
  // [10a5k7m9]=成功6/22 轮数:4
  // 第 1 轮: {...}
  // 第 2 轮: {...}
  
  const header = `<${operatorName}>掷出了 ${simpleCmd}${bonusText}=${finalSuccess}`;
  const detailHeader = `[${detailCmdStr}${bonusText}]=成功${result.totalSuccesses}/${result.totalRollsCount} 轮数:${result.rounds.length}`;
  const detailBlock = `${detailHeader}${roundsStr}`;
  
  return `${header}${detailBlock}\n成功数=${finalSuccess}`;
}

/**
 * 注意：由外部规则执行器（当前为 executorPublic）决定是否挂载。
 */
export const cmdWw = new CommandExecutor(
  "ww",
  [],
  "WW无限规则检定（支持自定义加骰、面数、成功线）",
  [".ww 5", ".ww 5a9", ".ww 5m9k7", ".ww 5+1"],
  ".ww [数量]a[加骰]m[面数]k[成功线] +[附加成功]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const isForceToast = UTILS.doesHaveArg(args, "h");
    try {
      const options = parseWwCommandArgs(args);
      const result = rollWw(options);
      
      const operatorName = mentioned[mentioned.length - 1]?.roleName || "当前角色";
      const message = formatWwResultMessage(options, result, operatorName);

      if (isForceToast) {
        cpi.sendToast(message);
        cpi.replyMessage(`${operatorName}进行了一次暗骰`);
        return true;
      }

      cpi.replyMessage(message);
      return true;
    }
    catch (error) {
      const message = `WW检定错误：${error instanceof Error ? error.message : String(error)}`;
      if (isForceToast) {
        cpi.sendToast(message);
      }
      else {
        cpi.replyMessage(message);
      }
      return false;
    }
  },
);
