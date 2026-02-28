import { CommandExecutor } from "@/components/common/dicer/cmd";
import UTILS from "@/components/common/dicer/utils/utils";

export type WwCommandOptions = {
  diceCount: number;
  explodeAt: number;
  bonusSuccess: number;
};

export type WwRollResult = {
  rolls: number[];
  baseSuccesses: number;
  totalSuccesses: number;
};

const DEFAULT_DICE_COUNT = 1;
const DEFAULT_EXPLODE_AT = 10;
const MIN_EXPLODE_AT = 5;
const MAX_EXPLODE_AT = 10;
const MAX_TOTAL_ROLLS = 5000;

/**
 * 解析 .ww 指令参数：
 * .ww [骰子个数]a[加骰参数] +[附加成功数]
 */
export function parseWwCommandArgs(args: string[]): WwCommandOptions {
  const normalized = args
    .join("")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replaceAll("＋", "+")
    .replaceAll("－", "-")
    .replaceAll("ａ", "a");

  if (!normalized) {
    return {
      diceCount: DEFAULT_DICE_COUNT,
      explodeAt: DEFAULT_EXPLODE_AT,
      bonusSuccess: 0,
    };
  }

  let mainPart = normalized;
  let bonusSuccess = 0;

  const bonusMatch = normalized.match(/([+-]\d+)$/);
  if (bonusMatch) {
    bonusSuccess = Number.parseInt(bonusMatch[1], 10);
    mainPart = normalized.slice(0, bonusMatch.index);
  }

  let diceCount = DEFAULT_DICE_COUNT;
  let explodeAt = DEFAULT_EXPLODE_AT;

  if (mainPart.length > 0) {
    if (mainPart.includes("a")) {
      const segments = mainPart.split("a");
      if (segments.length !== 2) {
        throw new Error("参数格式错误：只允许一个 a 分隔符");
      }

      const [diceCountPart, explodeAtPart] = segments;

      if (diceCountPart.length > 0) {
        if (!/^\d+$/.test(diceCountPart)) {
          throw new Error("骰子个数必须为正整数");
        }
        diceCount = Number.parseInt(diceCountPart, 10);
      }

      if (explodeAtPart.length > 0) {
        if (!/^\d+$/.test(explodeAtPart)) {
          throw new Error("加骰参数必须为整数");
        }
        explodeAt = Number.parseInt(explodeAtPart, 10);
      }
    }
    else {
      if (!/^\d+$/.test(mainPart)) {
        throw new Error("参数格式错误：应为 [骰子个数]a[加骰参数] +[附加成功数]");
      }
      diceCount = Number.parseInt(mainPart, 10);
    }
  }

  if (!Number.isInteger(diceCount) || diceCount <= 0) {
    throw new Error("骰子个数必须为正整数");
  }
  if (!Number.isInteger(explodeAt) || explodeAt < MIN_EXPLODE_AT || explodeAt > MAX_EXPLODE_AT) {
    throw new Error(`加骰参数必须在 ${MIN_EXPLODE_AT}-${MAX_EXPLODE_AT} 之间`);
  }

  return {
    diceCount,
    explodeAt,
    bonusSuccess,
  };
}

function rollD10(rng: () => number): number {
  const raw = rng();
  if (!Number.isFinite(raw)) {
    throw new TypeError("随机数生成异常");
  }
  const normalized = Math.min(Math.max(raw, 0), 0.9999999999999999);
  return Math.floor(normalized * 10) + 1;
}

/**
 * 按 WW 规则掷骰：
 * - 固定 D10
 * - 点数 >= explodeAt 时额外加骰一次（可连锁）
 * - 成功阈值固定为 >=8
 */
export function rollWw(
  options: WwCommandOptions,
  rng: () => number = Math.random,
  maxTotalRolls: number = MAX_TOTAL_ROLLS,
): WwRollResult {
  const rolls: number[] = [];
  let pendingRolls = options.diceCount;

  while (pendingRolls > 0) {
    if (rolls.length >= maxTotalRolls) {
      throw new Error(`加骰次数过多，请降低骰子个数或提高加骰参数（上限 ${maxTotalRolls}）`);
    }

    const point = rollD10(rng);
    rolls.push(point);
    pendingRolls -= 1;

    if (point >= options.explodeAt) {
      pendingRolls += 1;
    }
  }

  const baseSuccesses = rolls.filter(point => point >= 8).length;
  return {
    rolls,
    baseSuccesses,
    totalSuccesses: baseSuccesses + options.bonusSuccess,
  };
}

export function formatWwResultMessage(options: WwCommandOptions, result: WwRollResult): string {
  const bonusText = options.bonusSuccess === 0
    ? ""
    : (options.bonusSuccess > 0 ? `+${options.bonusSuccess}` : `${options.bonusSuccess}`);

  const lines = [
    `WW检定：${options.diceCount}a${options.explodeAt}${bonusText}`,
    `骰面结果：[${result.rolls.join(", ")}]`,
    `基础成功数（>=8）：${result.baseSuccesses}`,
  ];

  if (options.bonusSuccess !== 0) {
    lines.push(`附加成功数：${bonusText}`);
  }

  lines.push(`最终成功数：${result.totalSuccesses}`);
  return lines.join("\n");
}

/**
 * 注意：由外部规则执行器（当前为 executorPublic）决定是否挂载。
 */
export const cmdWw = new CommandExecutor(
  "ww",
  [],
  "WW加骰检定（固定D10，成功阈值>=8）",
  [".ww", ".ww 5a9", ".ww a8+2", ".ww 3+1"],
  ".ww [骰子个数]a[加骰参数] +[附加成功数]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const isForceToast = UTILS.doesHaveArg(args, "h");
    try {
      const options = parseWwCommandArgs(args);
      const result = rollWw(options);
      const message = formatWwResultMessage(options, result);

      if (isForceToast) {
        cpi.sendToast(message);
        const operatorName = mentioned[mentioned.length - 1]?.roleName || "当前角色";
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
