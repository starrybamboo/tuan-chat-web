import type { RoomContextType } from "@/components/chat/roomContext";

import { AliasMap } from "@/components/common/dicer/utils/aliasMap";

import { tuanchat } from "../../../../../api/instance";

const UTILS = {
  /** 检查参数列表中是否包含某个参数，包含则移除该参数并返回true，否则返回false */
  doesHaveArg: (args: string[], arg: string) => {
    // 转化为小写并去除空格
    const argsFmt = args.map(arg => arg.trim().toLowerCase());
    const res = argsFmt.includes(arg.toLowerCase());
    // 如果包含该参数，则移除该参数
    const index = argsFmt.indexOf(arg.toLowerCase());
    if (res) {
      args.splice(index, 1);
    }
    return res;
  },

  /**
   * 延迟指定毫秒数
   * @param ms 延迟的毫秒数
   * @returns 返回一个Promise，在指定时间后resolve
   */
  sleep: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * 设置角色能力值
   * @param role 角色能力对象
   * @param key 要设置的键
   * @param value 要设置的值
   * @param deafult_type 默认类型，当type为"auto"时，如果没有找到对应的键，则设置到该类型中
   * @param type 设置类型，默认为"auto"，表示自动根据键名判断类型，也可以指定为"skill"、"ability"或"basic"
   */
  setRoleAbilityValue: (role: RoleAbility, key: string, value: string, deafult_type: "skill" | "ability" | "basic", type: "auto" | "skill" | "ability" | "basic" = "auto"): void => {
    // 首先确认value是否是表达式，即检查如果含有四则运算符
    if (/[+\-*/()]/.test(value)) {
      // 如果是表达式，直接设置为字符串
      value = String(calculateExpression(value, role));
    }
    switch (type) {
      case "basic":
        if (!role.basic) {
          role.basic = {};
        }
        role.basic[key] = value;
        break;
      case "ability":
        if (!role.ability) {
          role.ability = {};
        }
        role.ability[key] = value;
        break;
      case "skill":
        if (!role.skill) {
          role.skill = {};
        }
        role.skill[key] = value;
        break;
      default:
        // 自动设置类型
        setRoleAbilityValueAuto(role, key, value, deafult_type);
        break;
    }
  },

  /**
   * 获取角色能力值
   * @param role 角色能力对象
   * @param key 要获取的键
   * @param type 获取类型，默认为"auto"，表示自动根据键名判断类型，也可以指定为"skill"、"ability"或"basic"
   * @returns 对应的值，如果没有找到则返回undefined
   */
  getRoleAbilityValue: (role: RoleAbility, key: string, type: "auto" | "skill" | "ability" | "basic" = "auto"): string | undefined => {
    switch (type) {
      case "basic":
        if (role.basic && key in role.basic) {
          return role.basic[key];
        }
        break;
      case "ability":
        if (role.ability && key in role.ability) {
          return role.ability[key];
        }
        break;
      case "skill":
        if (role.skill && key in role.skill) {
          return role.skill[key];
        }
        break;
      default:
        // 自动获取类型
        return getRoleAbilityValueAuto(role, key);
    }
  },
  calculateExpression,
  initAliasMap: (aliasMapSet: { [key: string]: Map <string, string> }): void => {
    AliasMap.getInstance(aliasMapSet);
  },
  getAlias(alias: string, ruleCode: string) {
    return AliasMap.getInstance().getAlias(alias, ruleCode);
  },
  /**
   * 获取骰子角色ID
   * @param roomContext 房间上下文对象
   * @returns 骰子角色ID
   */
  getDicerRoleId,
};

export default UTILS;

/**
 * 根据角色能力值自动设置角色能力，会依次遍历basic、ability、skill中的键，如果没有找到则设置到default_type中
 * @param role 原角色能力对象
 * @param key 要设置的键
 * @param value 要设置的值
 * @param default_type 默认类型
 */
function setRoleAbilityValueAuto(role: RoleAbility, key: string, value: string, default_type: string) {
  // 先尝试在basic中查找
  if (role.basic && key in role.basic) {
    role.basic[key] = value;
    return;
  }
  // 再尝试在ability中查找
  if (role.ability && key in role.ability) {
    role.ability[key] = value;
    return;
  }
  // 再尝试在skill中查找
  if (role.skill && key in role.skill) {
    role.skill[key] = value;
    return;
  }
  // 都没有找到，则设置到默认类型中
  switch (default_type) {
    case "basic":
      if (!role.basic) {
        role.basic = {};
      }
      role.basic[key] = value;
      break;
    case "ability":
      if (!role.ability) {
        role.ability = {};
      }
      role.ability[key] = value;
      break;
    case "skill":
      if (!role.skill) {
        role.skill = {};
      }
      role.skill[key] = value;
      break;
    default:
      // 默认类型不合法
      break;
  }
}

/**
 * 根据角色能力值自动获取角色能力，会依次遍历basic、ability、skill中的键，如果没有找到则返回undefined
 * @param role 原角色能力对象
 * @param key 要获取的键
 * @returns 对应的值，如果没有找到则返回undefined
 */
function getRoleAbilityValueAuto(role: RoleAbility, key: string): string | undefined {
  // 先尝试在basic中查找
  if (role.basic && key in role.basic) {
    return role.basic[key];
  }
  // 再尝试在ability中查找
  if (role.ability && key in role.ability) {
    return role.ability[key];
  }
  // 再尝试在skill中查找
  if (role.skill && key in role.skill) {
    return role.skill[key];
  }
  // 都没有找到
  return undefined;
}

/**
 * 表达式计算器，支持四则运算、括号和变量替换
 * @param expression 输入的表达式字符串（不含空格）
 * @param role 角色能力对象，用于变量替换
 * @returns 计算结果
 * @throws 当表达式无效或计算出错时抛出错误
 */
function calculateExpression(expression: string, role: RoleAbility): number {
  // 去除表达式中的空格
  expression = expression.replace(/\s+/g, "");
  // 词法分析：将表达式拆分为token
  const tokens = tokenize(expression);

  // 转换为逆波兰表达式（后缀表达式）
  const postfix = shuntingYard(tokens, role);

  // 计算逆波兰表达式
  return evaluatePostfix(postfix);
}

/**
 * 词法分析：将表达式拆分为数字、变量、运算符和括号
 */
function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  const length = expression.length;
  let i = 0;

  while (i < length) {
    const char = expression[i];

    // 处理数字（整数和小数）
    if (/[0-9.]/.test(char)) {
      let num = char;
      i++;

      while (i < length && /[0-9.]/.test(expression[i])) {
        num += expression[i];
        i++;
      }

      // 验证数字格式
      if (!/^\d+(?:\.\d+)?$/.test(num)) {
        throw new Error(`无效的数字格式: ${num}`);
      }

      tokens.push(num);
    }
    // 处理运算符和括号
    else if (/[+\-*/()]/.test(char)) {
      tokens.push(char);
      i++;
    }
    // 处理空白符
    else if (/[ \t\n\r]/.test(char)) {
      i++;
    }
    // 处理变量（非数字和运算符的字符）
    else {
      let variable = char;
      i++;

      while (i < length && !/[0-9+\-*/().]/.test(expression[i])) {
        variable += expression[i];
        i++;
      }

      tokens.push(variable);
    }
  }

  return tokens;
}

/**
 * 运算符优先级映射
 */
const operatorPrecedence: { [key: string]: number } = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
};

/**
 * 中缀表达式转后缀表达式（逆波兰表达式）
 */
function shuntingYard(tokens: string[], role: RoleAbility): (number | string)[] {
  const output: (number | string)[] = [];
  const operators: string[] = [];

  for (const token of tokens) {
    // 数字直接加入输出队列
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      output.push(Number(token));
    }
    // 变量替换为对应的值，未定义则为0
    else if (!/[+\-*/()]/.test(token)) {
      const fmtToken = UTILS.getAlias(token, String(role.ruleId));
      const value = UTILS.getRoleAbilityValue(role, fmtToken) ?? 0;
      output.push(Number(value)); // 确保是数字类型
    }
    // 左括号入栈
    else if (token === "(") {
      operators.push(token);
    }
    // 右括号处理
    else if (token === ")") {
      // 弹出运算符直到遇到左括号
      while (operators.length > 0 && operators[operators.length - 1] !== "(") {
        output.push(operators.pop()!);
      }

      // 如果没有找到左括号，说明括号不匹配
      if (operators.length === 0) {
        throw new Error("括号不匹配");
      }

      // 弹出左括号但不加入输出队列
      operators.pop();
    }
    // 运算符处理
    else {
      // 弹出优先级更高或相等的运算符
      while (
        operators.length > 0
        && operators[operators.length - 1] !== "("
        && operatorPrecedence[operators[operators.length - 1]] >= operatorPrecedence[token]
      ) {
        output.push(operators.pop()!);
      }

      operators.push(token);
    }
  }

  // 弹出剩余的运算符
  while (operators.length > 0) {
    const op = operators.pop()!;
    // 如果还有左括号，说明括号不匹配
    if (op === "(") {
      throw new Error("括号不匹配");
    }
    output.push(op);
  }

  return output;
}

/**
 * 计算逆波兰表达式
 */
function evaluatePostfix(postfix: (number | string)[]): number {
  const stack: number[] = [];

  for (const token of postfix) {
    if (typeof token === "number") {
      stack.push(token);
    }
    else {
      // 确保有足够的操作数
      if (stack.length < 2) {
        throw new Error(`无效的表达式，运算符 ${token} 缺少操作数`);
      }

      const b = stack.pop()!;
      const a = stack.pop()!;
      let result: number;

      switch (token) {
        case "+":
          result = a + b;
          break;
        case "-":
          result = a - b;
          break;
        case "*":
          result = a * b;
          break;
        case "/":
          if (b === 0) {
            throw new Error("除数不能为零");
          }
          // 结果向下取整
          result = Math.floor(a / b);
          break;
        default:
          throw new Error(`未知的运算符: ${token}`);
      }

      stack.push(result);
    }
  }

  // 栈中应该只剩下一个结果
  if (stack.length !== 1) {
    throw new Error("无效的表达式");
  }

  return stack[0];
}

async function getDicerRoleId(roomContext: RoomContextType): Promise<number> {
  const spaceInfo = await tuanchat.spaceController.getSpaceInfo(roomContext.spaceId ?? 0);
  const space = spaceInfo.data;
  const extra: Record<string, string> = JSON.parse(space?.extra ?? "{}");
  const dicerRoleId = Number(extra?.dicerRoleId) ?? 2;
  if (Number.isNaN(dicerRoleId)) {
    return 2;
  }
  // 检查当前骰娘id是否有效（通过获取骰娘角色昵称来判断）
  const dicerRole = await tuanchat.roleController.getRole(dicerRoleId);
  if (!dicerRole.success) {
    return 2;
  }
  return dicerRoleId;
}
