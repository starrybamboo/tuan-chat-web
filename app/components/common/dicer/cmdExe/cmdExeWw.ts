import { CommandExecutor } from "@/components/common/dicer/cmd";
import { roll } from "@/components/common/dicer/dice";
import UTILS from "@/components/common/dicer/utils/utils";

export type WwCommandOptions = {
  diceCount: number;
  explodeAt: number;
  bonusSuccess: number;
  successAt: number;
  sides: number;
  exprStr?: string; // 记录原始骰子表达式（如果有）
};
// ... (WwRollResult and constants remain same)
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
 * .ww [Expression][aY][mZ][kN] [+-bonus]
 * .ww 力量+近战a8
 */
export function parseWwCommandArgs(args: string[], getValue?: (key: string) => number): WwCommandOptions {
  // 1. 预处理
  let normalized = args
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
      successAt: DEFAULT_SUCCESS_AT,
      sides: DEFAULT_SIDES,
    };
  }

  // 2. 提取末尾的 bonus (+1, -2 等)
  // 如果末尾有 +N 或 -N，且前面是 a/m/k 参数结束，或者纯数字结束(这种可能有歧义，暂且当做bonus)
  // 为了支持 "力量+近战"，加号可能是表达式的一部分。
  // 策略：先尝试匹配 a/m/k 参数，将字符串分为 [Expression][Params][Bonus]
  // 但 Params 和 Bonus 可能混杂，标准格式通常是 Params 在 Bonus 前面，或者 Bonus 在最后。
  // 现有的逻辑是优先匹配末尾的 (+/-)\d+ 作为 Bonus。
  // 对于 "力量+近战"，如果不带参数，比如 "力量+近战"，末尾的 "+近战" 不会被当作 bonus (因为近战不是数字)。
  // 如果是 "力量+1"，末尾 "+1" 会被当做 bonus。这可能违背直觉（用户可能想投 力量+1 个骰子）。
  // 修正逻辑：只有当 +N 后没有其他内容（已经是末尾），且移除它后剩余部分看起来是完整的表达式或参数时才算 Bonus。
  // 或者，明确一下，只有在 a/m/k 参数之后的 +/-N 才算 Bonus？或者纯数字模式下的 +/-N？
  // 按照惯例 ww 5+1 意味着 5个骰子，1个自动成功。
  // ww 力量+1 应该意味着 (力量)个骰子，1个自动成功？ 还是 (力量+1)个骰子？
  // 根据 WOD 规则，通常属性+技能是骰池。所以 "力量+近战" 是骰池。
  // 如果要表示自动成功，通常写在最后。
  // 我们保留原逻辑：末尾的 [+-]数字 视为自动成功。
  // 如果用户想表达骰池+1，应该写 "力量+1d0" ??? 不，这样太麻烦。
  // 让我们假设：如果能解析出 a/m/k 参数，那么参数后的 +/- 是 bonus。
  // 如果没有 a/m/k 参数，只有 +/- 数字，这确实有歧义。
  // 鉴于旧逻辑 supported .ww 5+1 -> 5 dice, 1 bonus.
  // 我们保持这个行为。如果用户想投 (力量+1) 个骰，可能需要写 .ww (力量+1)。
  
  let bonusSuccess = 0;
  const bonusMatch = normalized.match(/([+-]\d+)$/);
  if (bonusMatch) {
    // 只有当这个 +N 不是表达式的一部分时才提取。
    // 简单的启发式：如果前面也是运算符（比如 ++1），那肯定不对。
    // 但这里 normalized 已经去掉了空格。
    // 让我们先提取，剩下的部分交给 dice parser。
    bonusSuccess = Number.parseInt(bonusMatch[1], 10);
    normalized = normalized.slice(0, bonusMatch.index);
  }

  // 3. 解析参数 a, m, k
  let explodeAt = DEFAULT_EXPLODE_AT;
  let sides = DEFAULT_SIDES;
  let successAt = DEFAULT_SUCCESS_AT;

  // 从后往前找参数 a/m/k
  // 我们需要把字符串切分成 [Expression] [Params]
  // Params 是由 aN, mN, kN 组成的后缀。
  // 我们可以用正则找结尾的这些模式。
  
  // 循环匹配结尾的 aN, mN, kN
  // 例如 "3a10m8" -> match m8, strip -> "3a10" -> match a10, strip -> "3"
  while (true) {
    // 匹配结尾的 a\d+ 或 m\d+ 或 k\d+
    const paramsMatch = normalized.match(/([amk])(\d+)$/);
    if (!paramsMatch) break;
    
    const type = paramsMatch[1];
    const value = Number.parseInt(paramsMatch[2], 10);
    
    if (type === "a") explodeAt = value;
    else if (type === "m") sides = value;
    else if (type === "k") successAt = value;
    
    // 移除已解析的后缀
    normalized = normalized.slice(0, paramsMatch.index);
  }

  // 4. 解析剩余部分为骰子个数 (X)
  // 此时 normalized 剩下的就是 X，可能是 "5" 也可能是 "力量+近战"
  let diceCount = DEFAULT_DICE_COUNT;
  let exprStr = "";

  if (normalized.length > 0) {
    // 尝试解析表达式
    // 如果是纯数字
    if (/^\d+$/.test(normalized)) {
        diceCount = Number.parseInt(normalized, 10);
        exprStr = normalized;
    } else {
        // 是表达式，需要 getValue
        if (getValue) {
            // 使用 dice 模块的 roll 函数或者简单的 eval (不安全)
            // 这里我们用 dice 模块的 roll ? 但 dice.roll 是掷骰子。
            // 我们只需要计算 "力量+近战" 的值。
            // 简单的替换 + eval (注意安全性，仅允许数字、运算符、属性名)
            // 先将所有非运算符非数字的内容视为属性名进行替换
            exprStr = normalized;
            
            // 替换属性名为数值
            // 匹配中文、英文变量名
            const resolvedExpr = normalized.replace(/([\u4e00-\u9fa5a-zA-Z_]+)/g, (match) => {
                const val = getValue(match);
                return String(val);
            });
            
            try {
                // 使用 Function 构造函数进行简单计算 (相对安全，因为只包含数字和运算符)
                // 但要防范恶意代码。上面正则只允许了特定的字符？
                // normalized 这里可能包含 ( ) . 等。
                // 暂时只支持 + - * / ( )
                // 简单的 sanitize
                if (/^[\d+\-*/().\s]+$/.test(resolvedExpr)) {
                    // eslint-disable-next-line no-new-func
                    diceCount = new Function(`return ${resolvedExpr}`)();
                    diceCount = Math.floor(diceCount); // 取整
                } else {
                    // 解析失败或含有非法字符，默认 1
                    // console.warn("Illegal definition in expression", resolvedExpr);
                    diceCount = 1; 
                }
            } catch (e) {
                diceCount = 1;
            }
        } else {
             // 没有 getValue 不支持表达式
             // 尝试提取开头的数字
            const startNumMatch = normalized.match(/^(\d+)/);
            if (startNumMatch) {
                diceCount = Number.parseInt(startNumMatch[1], 10);
                exprStr = startNumMatch[1];
            }
        }
    }
  }

  // 校验范围
  if (diceCount <= 0) diceCount = 1;
  if (sides < 2) sides = DEFAULT_SIDES;
  if (explodeAt <= 1) explodeAt = 2; // 避免死循环

  return {
    diceCount,
    explodeAt,
    bonusSuccess,
    successAt,
    sides,
    exprStr: exprStr || String(diceCount),
  };
}

function rollDx(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollWw(options: WwCommandOptions): WwRollResult {
  const {
    diceCount,
    explodeAt,
    bonusSuccess,
    successAt,
    sides,
  } = options;

  let currentPool = diceCount;
  let totalRollsCount = 0;
  
  const allRolls: number[] = [];
  const rounds: number[][] = [];
  
  let loopCount = 0;
  
  // 每一轮投掷
  while (currentPool > 0 && totalRollsCount < MAX_TOTAL_ROLLS) {
    loopCount++;
    if(loopCount > 100) break; // 防止死循环

    const roundRolls: number[] = [];
    let nextPool = 0;

    for (let i = 0; i < currentPool; i++) {
        if (totalRollsCount >= MAX_TOTAL_ROLLS) break;
        
        const val = rollDx(sides);
        totalRollsCount++;
        roundRolls.push(val);
        allRolls.push(val);

        if (val >= explodeAt) {
            nextPool++;
        }
    }
    
    rounds.push(roundRolls);
    currentPool = nextPool;
  }

  // 统计成功
  let baseSuccesses = 0;
  for (const r of allRolls) {
      if (r >= successAt) baseSuccesses++;
  }
  
  const totalSuccesses = baseSuccesses + bonusSuccess;

  return {
      rolls: allRolls,
      rounds,
      baseSuccesses,
      totalSuccesses,
      totalRollsCount
  };
}

/**
 * 格式化输出
 */
export function formatWwResultMessage(options: WwCommandOptions, result: WwRollResult, operatorName: string = "当前角色"): string {
  // 构建详细指令串
  const paramsStr = `${options.diceCount !== options.diceCount /* dummy check */ ? "" : ""}` 
      + (options.explodeAt !== 10 ? `a${options.explodeAt}` : "")
      + (options.successAt !== 8 ? `k${options.successAt}` : "")
      + (options.sides !== 10 ? `m${options.sides}` : "");
  
  // 简略显示：如果是表达式计算出来的，显示 "力量+近战(5)"
  let simpleCmd = `${options.diceCount}`;
  if (options.exprStr && options.exprStr !== String(options.diceCount)) {
      simpleCmd = `${options.exprStr}=${options.diceCount}`;
  }
  
  // 参数显示
  if (paramsStr) simpleCmd += paramsStr;

  const bonusText = options.bonusSuccess === 0
    ? ""
    : (options.bonusSuccess > 0 ? `+${options.bonusSuccess}` : `${options.bonusSuccess}`);

  const finalSuccess = result.totalSuccesses;

  // 详细头部
  const detailHeaderStr = `${options.diceCount}` 
    + (options.explodeAt !== 10 ? `a${options.explodeAt}` : "")
    + (options.successAt !== 8 ? `k${options.successAt}` : "")
    + (options.sides !== 10 ? `m${options.sides}` : "");

  const roundsStr = result.rounds.map((round, index) => {
    const diceStrs = round.map(pt => {
        let str = `${pt}`;
        const isSuccess = pt >= options.successAt;
        const isExplode = pt >= options.explodeAt;
        if (isSuccess) str = `${str}*`;
        if (isExplode) str = `<${str}>`;
        return str;
    }).join(",");
    return `\n第 ${index + 1} 轮: {${diceStrs}}`;
  }).join("");
  
  const header = `<${operatorName}>掷出了 ${simpleCmd}${bonusText}=${finalSuccess}`;
  const detailHeader = `[${detailHeaderStr}${bonusText}]=成功${result.totalSuccesses}/${result.totalRollsCount} 轮数:${result.rounds.length}`;
  const detailBlock = `${detailHeader}${roundsStr}`;
  
  return `${header}${detailBlock}\n成功数=${finalSuccess}`;
}

export const cmdWw = new CommandExecutor(
  "ww",
  [],
  "WW无限规则检定（支持自定义加骰、面数、成功线、属性引用）",
  [".ww 5", ".ww 力量+近战a8", ".ww 5a9", ".ww 5m9k7", ".ww 5+1"],
  ".ww [数量/表达式]a[加骰]m[面数]k[成功线] +[附加成功]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const isForceToast = UTILS.doesHaveArg(args, "h");
    
    // 获取角色属性以支持表达式
    let getValueFunc = undefined;
    const roleId = mentioned[mentioned.length - 1]?.roleId; // 优先使用提到的最后一个角色（或者逻辑上应该是发起者/第一个提及者？）
    // 通常骰子指令如果mention了别人，是用别人的属性？
    // standard: .st usually modifies mentioned[0]. 
    // .r usually uses mentioned[0] or current.
    // 假设使用 mentioned[0] 作为判定主体。
    const targetRole = mentioned.length > 0 ? mentioned[0] : undefined;
    
    if (targetRole) {
        // 获取属性列表
        const abilityList = cpi.getRoleAbilityList(targetRole.roleId);
        if (abilityList) {
            getValueFunc = (key: string) => {
                const val = UTILS.getRoleAbilityValue(abilityList, key);
                return val ? Number.parseFloat(val) : 0;
            };
        }
    }

    try {
      const options = parseWwCommandArgs(args, getValueFunc);
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
