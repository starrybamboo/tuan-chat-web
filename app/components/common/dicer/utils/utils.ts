import type { RoomContextType } from "@/components/chat/core/roomContext";

import { AliasMap } from "@/components/common/dicer/utils/aliasMap";

import { tuanchat } from "../../../../../api/instance";

const DEFAULT_DICER_ROLE_ID = 2;
const DICER_ROLE_CACHE_TTL_MS = 10 * 60_000;
const SPACE_CACHE_TTL_MS = 10 * 60_000;
const ROLE_BIND_CACHE_TTL_MS = 10 * 60_000;
const USER_DICER_ROLE_CACHE_TTL_MS = 10 * 60_000;
const ROLE_DICE_TYPE_CACHE_TTL_MS = 30 * 60_000;

type ExpiringCacheEntry<T> = {
  value: T;
  expireAt: number;
};

type DicerRoleResolveOptions = {
  // 优先复用上层已有的空间快照，避免重复请求 getSpaceInfo。
  spaceSnapshot?: {
    extra?: unknown;
    dicerRoleId?: unknown;
  } | null;
  // 优先复用上层已有的当前角色快照，避免重复请求 getRole(curRoleId)。
  currentRoleSnapshot?: {
    roleId?: unknown;
    extra?: unknown;
  } | null;
};

const resolvedDicerRoleCache = new Map<string, ExpiringCacheEntry<number>>();
const spaceSnapshotCache = new Map<number, ExpiringCacheEntry<any>>();
const roleDicerBindCache = new Map<number, ExpiringCacheEntry<number | null>>();
const roleDiceTypeCache = new Map<number, ExpiringCacheEntry<boolean>>();
let userDicerRoleCache: ExpiringCacheEntry<number | null> | null = null;

const UTILS = {
  /**
   * 检查参数列表中是否包含某个参数，包含则移除该参数并返回true，否则返回false
   * @param args 参数列表
   * @param arg 要检查的参数
   * @returns 是否包含该参数
   */
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
    const trimmedValue = value.trim();
    // 纯数字（含正负号）直接写入，避免把 -20 识别成表达式导致缺少左操作数
    const isSignedNumberLiteral = /^[+-]?\d+(?:\.\d+)?$/.test(trimmedValue);
    // 仅在包含运算符且不是纯数字字面量时才执行表达式计算
    if (!isSignedNumberLiteral && /[+\-*/()]/.test(trimmedValue)) {
      value = String(calculateExpression(trimmedValue, role));
    }
    else {
      value = trimmedValue;
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

/**
 * 获取骰子角色ID
 * @param roomContext 房间上下文对象
 * @returns 骰子角色ID
 */
async function getDicerRoleIdRaw(roomContext: RoomContextType, options?: DicerRoleResolveOptions): Promise<number> {
  const spaceId = Number(roomContext.spaceId ?? 0);
  const space = await getSpaceSnapshot(spaceId, options);
  const extraRecord = normalizeRecord(space?.extra);
  const rawAllowCustom = extraRecord.allowCustomDicerRole;
  const allowCustomDicerRole = rawAllowCustom === undefined
    ? true
    : rawAllowCustom === true
      || rawAllowCustom === "true"
      || rawAllowCustom === 1
      || rawAllowCustom === "1";
  const currentRoleId = Number(roomContext.curRoleId);
  // 旁白/未选角色（<=0）统一走空间骰娘，避免触发 getRole(-1) 后回退到默认 2。
  const hasSelectedRole = Number.isFinite(currentRoleId) && currentRoleId > 0;

  if (allowCustomDicerRole && hasSelectedRole) {
    // 首先尝试获取角色绑定的骰娘角色id
    const roleDicerRoleId = await getRoleBoundDicerRoleId(currentRoleId, options);
    if (roleDicerRoleId != null) {
      return roleDicerRoleId;
    }
    // 如果没有绑定，则尝试从用户配置中获取骰娘角色id
    const userDicerRoleId = await getUserBoundDicerRoleId();
    if (userDicerRoleId != null) {
      return userDicerRoleId;
    }
  }

  // 如果关闭自定义或未绑定，则尝试从空间配置中获取骰娘角色id
  return toPositiveRoleId(extraRecord.dicerRoleId ?? space?.dicerRoleId ?? DEFAULT_DICER_ROLE_ID)
    ?? DEFAULT_DICER_ROLE_ID;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    }
    catch {
      return {};
    }
  }
  return {};
}

function readCacheValue<T>(entry: ExpiringCacheEntry<T> | null | undefined): T | undefined {
  if (!entry) {
    return undefined;
  }
  if (entry.expireAt <= Date.now()) {
    return undefined;
  }
  return entry.value;
}

function writeCacheValue<T>(value: T, ttlMs: number): ExpiringCacheEntry<T> {
  return {
    value,
    expireAt: Date.now() + ttlMs,
  };
}

function toPositiveRoleId(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return Math.trunc(n);
}

function buildResolvedDicerRoleCacheKey(roomContext: RoomContextType): string {
  const spaceId = Number(roomContext.spaceId ?? 0);
  const roleId = Number(roomContext.curRoleId ?? 0);
  return `${spaceId}:${roleId}`;
}

async function getSpaceSnapshot(spaceId: number, options?: DicerRoleResolveOptions): Promise<any> {
  if (options?.spaceSnapshot && typeof options.spaceSnapshot === "object") {
    return options.spaceSnapshot;
  }
  const cached = readCacheValue(spaceSnapshotCache.get(spaceId));
  if (cached !== undefined) {
    return cached;
  }
  const spaceInfo = await tuanchat.spaceController.getSpaceInfo(spaceId);
  const space = spaceInfo.data;
  spaceSnapshotCache.set(spaceId, writeCacheValue(space, SPACE_CACHE_TTL_MS));
  return space;
}

async function getRoleBoundDicerRoleId(roleId: number, options?: DicerRoleResolveOptions): Promise<number | null> {
  const roleSnapshot = options?.currentRoleSnapshot;
  if (roleSnapshot && toPositiveRoleId(roleSnapshot.roleId) === roleId) {
    const roleExtra = normalizeRecord(roleSnapshot.extra);
    const snapshotRoleId = toPositiveRoleId(roleExtra.dicerRoleId);
    roleDicerBindCache.set(roleId, writeCacheValue(snapshotRoleId, ROLE_BIND_CACHE_TTL_MS));
    return snapshotRoleId;
  }

  const cached = readCacheValue(roleDicerBindCache.get(roleId));
  if (cached !== undefined) {
    return cached;
  }

  const roleRes = await tuanchat.roleController.getRole(roleId);
  const roleDicerRoleId = toPositiveRoleId(roleRes.data?.extra?.dicerRoleId);
  roleDicerBindCache.set(roleId, writeCacheValue(roleDicerRoleId, ROLE_BIND_CACHE_TTL_MS));
  return roleDicerRoleId;
}

async function getUserBoundDicerRoleId(): Promise<number | null> {
  const cached = readCacheValue(userDicerRoleCache);
  if (cached !== undefined) {
    return cached;
  }
  const myInfoResult = await tuanchat.userController.getMyUserInfo();
  const userExtra = normalizeRecord(myInfoResult.data?.extra);
  const userDicerRoleId = toPositiveRoleId(userExtra.dicerRoleId);
  userDicerRoleCache = writeCacheValue(userDicerRoleId, USER_DICER_ROLE_CACHE_TTL_MS);
  return userDicerRoleId;
}

async function isDiceMaidenRole(roleId: number): Promise<boolean> {
  if (roleId === DEFAULT_DICER_ROLE_ID) {
    return true;
  }
  const cached = readCacheValue(roleDiceTypeCache.get(roleId));
  if (cached !== undefined) {
    return cached;
  }
  const roleRes = await tuanchat.roleController.getRole(roleId);
  const roleData = roleRes.data;
  const isDiceMaiden = Boolean(roleData?.roleName && roleData?.type === 1);
  roleDiceTypeCache.set(roleId, writeCacheValue(isDiceMaiden, ROLE_DICE_TYPE_CACHE_TTL_MS));
  return isDiceMaiden;
}

async function getDicerRoleId(roomContext: RoomContextType, options?: DicerRoleResolveOptions): Promise<number> {
  // 检查当前骰娘id是否有效
  const cacheKey = buildResolvedDicerRoleCacheKey(roomContext);
  const cachedResolved = readCacheValue(resolvedDicerRoleCache.get(cacheKey));
  if (cachedResolved !== undefined) {
    return cachedResolved;
  }
  try {
    const dicerRoleId = await getDicerRoleIdRaw(roomContext, options);
    const normalizedDicerRoleId = toPositiveRoleId(dicerRoleId) ?? DEFAULT_DICER_ROLE_ID;
    const resolvedRoleId = (await isDiceMaidenRole(normalizedDicerRoleId))
      ? normalizedDicerRoleId
      : DEFAULT_DICER_ROLE_ID;
    resolvedDicerRoleCache.set(cacheKey, writeCacheValue(resolvedRoleId, DICER_ROLE_CACHE_TTL_MS));
    return resolvedRoleId;
  }
  catch (error) {
    console.error("getDicerRoleId error", error);
    resolvedDicerRoleCache.set(cacheKey, writeCacheValue(DEFAULT_DICER_ROLE_ID, 5_000));
    return DEFAULT_DICER_ROLE_ID;
  }
}
