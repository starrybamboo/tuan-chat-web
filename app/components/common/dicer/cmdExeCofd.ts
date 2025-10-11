import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { parseDiceExpression, rollDice } from "@/components/common/dicer/dice";
import UNTIL from "@/components/common/dicer/utils";

const ruleCofd = new RuleNameSpace(
    4,
    "CofD",
    [],
    "CofD指令集",
);

export default ruleCofd;

const cmdWw = new CommandExecutor(
    "ww",
    [],
    "进行CofD检定",
    [".ww 10a10k8", ".ww 5a8k6", ".ww 7k6"],
    "ww [骰池数]a[加骰条件]?k[成功条件]?",
    async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
        if (args.length === 0) {
            cpi.sendMsg(prop, "错误：缺少参数，格式应为 .ww [骰池数]a[加骰条件]?k[成功条件]?");
            return false;
        }

        // 解析参数
        const input = args[0].toLowerCase();

        // 使用正则表达式解析参数格式
        const match = input.match(/^(\d+)(?:a(\d+))?k(\d+)$/);
        if (!match) {
            cpi.sendMsg(prop, "错误：参数格式不正确，应为 [骰池数]a[加骰条件]?k[成功条件]，例如 .ww 10a10k8");
            return false;
        }

        const diceCount = parseInt(match[1]);
        const againValue = match[2] ? parseInt(match[2]) : 10; // 缺省值为10
        const successValue = parseInt(match[3]); // 成功条件

        if (diceCount <= 0 || diceCount > 1000) {
            cpi.sendMsg(prop, "错误：骰子数必须在1-1000之间");
            return false;
        }

        if (againValue < 1 || againValue > 10) {
            cpi.sendMsg(prop, "错误：加骰条件必须在1-10之间");
            return false;
        }

        if (successValue < 1 || successValue > 10) {
            cpi.sendMsg(prop, "错误：成功条件必须在1-10之间");
            return false;
        }

        if (againValue < successValue) {
            cpi.sendMsg(prop, "错误：加骰条件必须大于等于成功条件");
            return false;
        }
        // 进行投掷
        const result = rollCofdDice(diceCount, againValue, successValue);

        cpi.sendMsg(prop, result);
        return true;
    },
);
ruleCofd.addCmd(cmdWw);

/**
 * @param diceCount 初始骰池数
 * @param againValue 加骰条件（≥此值加骰）
 * @param successValue 成功条件（≥此值成功）
 * @returns 格式化的结果字符串
 */
function rollCofdDice(diceCount: number, againValue: number, successValue: number): string {
    let totalSuccesses = 0;
    let round = 1;
    const allRolls: (number[] | string)[] = [];
    let currentDice = diceCount;
    let totalDiceRolled = 0;

    // 第一轮投掷
    let currentRolls: number[] = [];
    for (let i = 0; i < currentDice; i++) {
        const roll = Math.floor(Math.random() * 10) + 1;
        currentRolls.push(roll);
        if (roll >= successValue) {
            totalSuccesses++;
        }
    }
    totalDiceRolled += currentDice;

    // 如果骰子数超过25，使用简化记录
    if (totalDiceRolled <= 25) {
        allRolls.push([...currentRolls]);
    }

    //加骰
    let extraDice = currentRolls.filter(roll => roll >= againValue).length;

    while (extraDice > 0) {
        round++;
        currentDice = extraDice;
        currentRolls = [];

        for (let i = 0; i < currentDice; i++) {
            const roll = Math.floor(Math.random() * 10) + 1;
            currentRolls.push(roll);
            if (roll >= successValue) {
                totalSuccesses++;
            }
        }
        totalDiceRolled += currentDice;

        // 如果总骰子数超过25，停止记录具体数值
        if (totalDiceRolled <= 25) {
            allRolls.push([...currentRolls]);
        }

        extraDice = currentRolls.filter(roll => roll >= againValue).length;
    }

    // 构建结果字符串
    let resultString = `${diceCount}a${againValue}k${successValue}=[成功${totalSuccesses} 轮数:${round} `;

    if (totalDiceRolled <= 25) {
        // 详细记录模式
        const formattedRolls = allRolls.map((roundRolls, roundIndex) => {
            const isFirstRound = roundIndex === 0;
            const formattedDice = (roundRolls as number[]).map(roll => {
                let result = roll.toString();
                const isSuccess = roll >= successValue;
                const triggersAgain = roll >= againValue;

                if (isSuccess) {
                    result += "*";
                }
                if (triggersAgain && !isFirstRound) {
                    result = `<${result}>`;
                }
                return result;
            });
            return `{${formattedDice.join(",")}}`;
        });
        resultString += `${formattedRolls.join(",")}`;
    } else {
        // 简化记录模式 - 只显示骰子数量信息
        resultString += `(共${totalDiceRolled}枚骰子)`;
    }

    resultString += `]=${totalSuccesses}`;
    return resultString;
}
ruleCofd.addCmd(cmdWw);
const cmdRa = new CommandExecutor(
    "ra",
    [],
    "基于角色属性进行World of Darkness风格检定",
    [".ra 力量+体质 a10k8", ".ra 敏捷-体型 k6", ".ra 智力+教育+幸运"],
    "ra <属性表达式> [a(加骰条件)]?[k(成功条件)]?",
    async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
        if (args.length === 0) {
            cpi.sendMsg(prop, "错误：缺少参数，格式应为 .ra <属性表达式> [a(加骰条件)]?[k(成功条件)]?");
            return false;
        }

        // 获取角色能力
        const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
        if (!curAbility?.ability && !curAbility?.skill && !curAbility?.basic) {
            cpi.sendMsg(prop, "错误：未找到角色能力数据");
            return false;
        }

        // 合并所有参数为一个字符串
        const input = args.join(" ").toLowerCase();

        // 使用正则表达式分离属性表达式和可调参数
        const paramMatch = input.match(/(a\d+k\d+)$|(a\d+)$|(k\d+)$/);
        let attributeExpr = input;
        let againValue = 10; // 默认加骰条件
        let successValue = 8; // 默认成功条件

        if (paramMatch) {
            // 提取可调参数部分
            const paramStr = paramMatch[0];
            attributeExpr = input.substring(0, input.length - paramStr.length).trim();

            // 解析加骰条件
            const aMatch = paramStr.match(/a(\d+)/);
            if (aMatch) {
                againValue = parseInt(aMatch[1]);
            }

            // 解析成功条件
            const kMatch = paramStr.match(/k(\d+)/);
            if (kMatch) {
                successValue = parseInt(kMatch[1]);
            }
        }

        // 验证参数范围
        if (againValue < 1 || againValue > 10) {
            cpi.sendMsg(prop, "错误：加骰条件必须在1-10之间");
            return false;
        }

        if (successValue < 1 || successValue > 10) {
            cpi.sendMsg(prop, "错误：成功条件必须在1-10之间");
            return false;
        }

        // 解析属性表达式并计算骰池数
        const diceCount = await calculateAttributeExpression(attributeExpr, curAbility, cpi, prop);
        if (diceCount === null) {
            return false; // 错误信息已在函数内部发送
        }

        if (diceCount <= 0) {
            cpi.sendMsg(prop, "错误：计算后的骰池数必须大于0");
            return false;
        }

        if (diceCount > 1000) {
            cpi.sendMsg(prop, "错误：计算后的骰池数不能超过1000");
            return false;
        }

        // 进行投掷
        const result = rollCofdDice(diceCount, againValue, successValue);

        cpi.sendMsg(prop, result);
        return true;
    },
);
ruleCofd.addCmd(cmdRa);

/**
 * 解析属性表达式并计算骰池数
 * @param expr 属性表达式，如 "力量+体质-幸运"
 * @param ability 角色能力数据
 * @param cpi CPI实例
 * @param prop 执行器属性
 * @returns 计算后的骰池数，如果出错返回null
 */
async function calculateAttributeExpression(
    expr: string,
    ability: any,
    cpi: CPI,
    prop: ExecutorProp
): Promise<number | null> {
    // 清理表达式，移除多余空格
    expr = expr.replace(/\s+/g, '');

    // 使用正则表达式分割表达式为操作数和运算符
    const tokens = expr.split(/([+-])/);
    if (tokens.length === 0 || tokens[0] === '') {
        cpi.sendMsg(prop, "错误：属性表达式为空");
        return null;
    }

    let result = 0;
    let currentOperator = '+';

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token === '+' || token === '-') {
            currentOperator = token;
            continue;
        }

        // 处理属性名
        const attributeName = token.trim();
        if (!attributeName) {
            continue;
        }

        // 查找属性值
        let attributeValue = UNTIL.getRoleAbilityValue(ability, attributeName);

        if (attributeValue === undefined || attributeValue === null) {
            cpi.sendMsg(prop, `错误：未找到属性"${attributeName}"`);
            return null;
        }

        const value = parseInt(attributeValue);
        if (isNaN(value)) {
            cpi.sendMsg(prop, `错误：属性"${attributeName}"的值不是有效数字`);
            return null;
        }

        // 根据运算符计算结果
        if (currentOperator === '+') {
            result += value;
        } else {
            result -= value;
        }
    }

    return result;
}
const cmdRi = new CommandExecutor(
    "ri",
    [],
    "进行先机检定（敏捷+沉着+1d10）",
    [".ri"],
    "ri",
    async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
        // 获取角色能力
        const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
        if (!curAbility?.ability && !curAbility?.skill && !curAbility?.basic) {
            cpi.sendMsg(prop, "错误：未找到角色能力数据");
            return false;
        }

        // 获取敏捷属性值
        let dexterityValue = UNTIL.getRoleAbilityValue(curAbility, "敏捷");
        if (dexterityValue === undefined || dexterityValue === null) {
            // 尝试英文名查找
            dexterityValue = UNTIL.getRoleAbilityValue(curAbility, "dex");
        }

        if (dexterityValue === undefined || dexterityValue === null) {
            cpi.sendMsg(prop, "错误：未找到角色的敏捷属性");
            return false;
        }

        // 获取沉着属性值
        let composureValue = UNTIL.getRoleAbilityValue(curAbility, "沉着");
        if (composureValue === undefined || composureValue === null) {
            // 尝试英文名查找
            composureValue = UNTIL.getRoleAbilityValue(curAbility, "composure");
        }

        if (composureValue === undefined || composureValue === null) {
            cpi.sendMsg(prop, "错误：未找到角色的沉着属性");
            return false;
        }

        // 转换为数字
        const dex = parseInt(dexterityValue);
        const comp = parseInt(composureValue);

        if (isNaN(dex) || isNaN(comp)) {
            cpi.sendMsg(prop, "错误：敏捷或沉着属性值不是有效数字");
            return false;
        }

        // 掷骰1d10
        const diceRoll = Math.floor(Math.random() * 10) + 1;

        // 计算总值
        const total = diceRoll + dex + comp;

        // 构建结果消息
        const result = `先机检定：1d10(${diceRoll}) + 敏捷(${dex}) + 沉着(${comp}) = ${total}`;

        cpi.sendMsg(prop, result);
        return true;
    },
);
ruleCofd.addCmd(cmdRi);