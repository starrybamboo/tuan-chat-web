import type { RoleAbility } from "../types";

import { AliasMap } from "./aliasMap";

const DEFAULT_DICER_ROLE_ID = 2;

type AbilitySection = "skill" | "ability" | "basic";

const UTILS = {
  doesHaveArg: (args: string[], arg: string) => {
    const normalizedArgs = args.map(item => item.trim().toLowerCase());
    const index = normalizedArgs.indexOf(arg.toLowerCase());
    if (index < 0) {
      return false;
    }
    args.splice(index, 1);
    return true;
  },

  sleep: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  setRoleAbilityValue: (
    role: RoleAbility,
    key: string,
    value: string,
    defaultType: AbilitySection,
    type: "auto" | AbilitySection = "auto",
  ): void => {
    const trimmedValue = value.trim();
    const isSignedNumberLiteral = /^[+-]?\d+(?:\.\d+)?$/.test(trimmedValue);
    const nextValue = !isSignedNumberLiteral && /[+\-*/()]/.test(trimmedValue)
      ? String(calculateExpression(trimmedValue, role))
      : trimmedValue;

    if (type === "auto") {
      setRoleAbilityValueAuto(role, key, nextValue, defaultType);
      return;
    }

    role[type] = {
      ...role[type],
      [key]: nextValue,
    };
  },

  getRoleAbilityValue: (
    role: RoleAbility,
    key: string,
    type: "auto" | AbilitySection = "auto",
  ): string | undefined => {
    if (type === "auto") {
      return getRoleAbilityValueAuto(role, key);
    }
    return role[type]?.[key];
  },

  calculateExpression,

  initAliasMap: (aliasMapSet: { [key: string]: Map<string, string> }): void => {
    AliasMap.getInstance(aliasMapSet);
  },

  getAlias(alias: string, ruleCode: string): string {
    return AliasMap.getInstance().getAlias(alias, ruleCode);
  },

  async getDicerRoleId(
    roomContext: { curRoleId?: number; spaceId?: number },
    options?: {
      currentRoleSnapshot?: { extra?: unknown; roleId?: unknown } | null;
      spaceSnapshot?: { dicerRoleId?: unknown; extra?: unknown } | null;
    },
  ): Promise<number> {
    const spaceExtra = normalizeRecord(options?.spaceSnapshot?.extra);
    const currentRoleId = Number(roomContext.curRoleId);
    const roleSnapshot = options?.currentRoleSnapshot;
    const roleExtra = normalizeRecord(roleSnapshot?.extra);
    const roleDicerRoleId = Number.isFinite(currentRoleId)
      && currentRoleId > 0
      && toPositiveRoleId(roleSnapshot?.roleId) === Math.trunc(currentRoleId)
      ? toPositiveRoleId(roleExtra.dicerRoleId)
      : null;
    const resolved = roleDicerRoleId ?? toPositiveRoleId(spaceExtra.dicerRoleId ?? options?.spaceSnapshot?.dicerRoleId);
    return resolved ?? DEFAULT_DICER_ROLE_ID;
  },
};

export default UTILS;

function setRoleAbilityValueAuto(role: RoleAbility, key: string, value: string, defaultType: AbilitySection) {
  if (role.basic && key in role.basic) {
    role.basic[key] = value;
    return;
  }
  if (role.ability && key in role.ability) {
    role.ability[key] = value;
    return;
  }
  if (role.skill && key in role.skill) {
    role.skill[key] = value;
    return;
  }

  role[defaultType] = {
    ...role[defaultType],
    [key]: value,
  };
}

function getRoleAbilityValueAuto(role: RoleAbility, key: string): string | undefined {
  if (role.basic && key in role.basic) {
    return role.basic[key];
  }
  if (role.ability && key in role.ability) {
    return role.ability[key];
  }
  if (role.skill && key in role.skill) {
    return role.skill[key];
  }
  return undefined;
}

function calculateExpression(expression: string, role: RoleAbility): number {
  const tokens = tokenize(expression.replace(/\s+/g, ""));
  const postfix = shuntingYard(tokens, role);
  return evaluatePostfix(postfix);
}

function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/[0-9.]/.test(char)) {
      let value = char;
      index += 1;
      while (index < expression.length && /[0-9.]/.test(expression[index])) {
        value += expression[index];
        index += 1;
      }
      if (!/^\d+(?:\.\d+)?$/.test(value)) {
        throw new Error(`无效的数字格式: ${value}`);
      }
      tokens.push(value);
      continue;
    }

    if (/[+\-*/()]/.test(char)) {
      tokens.push(char);
      index += 1;
      continue;
    }

    let variable = char;
    index += 1;
    while (index < expression.length && !/[0-9+\-*/().]/.test(expression[index])) {
      variable += expression[index];
      index += 1;
    }
    tokens.push(variable);
  }

  return tokens;
}

const OPERATOR_PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
};

function shuntingYard(tokens: string[], role: RoleAbility): (number | string)[] {
  const output: (number | string)[] = [];
  const operators: string[] = [];

  for (const token of tokens) {
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      output.push(Number(token));
      continue;
    }

    if (!/[+\-*/()]/.test(token)) {
      const mappedKey = UTILS.getAlias(token, String(role.ruleId));
      output.push(Number(UTILS.getRoleAbilityValue(role, mappedKey) ?? 0));
      continue;
    }

    if (token === "(") {
      operators.push(token);
      continue;
    }

    if (token === ")") {
      while (operators.length > 0 && operators[operators.length - 1] !== "(") {
        output.push(operators.pop()!);
      }
      if (operators.length === 0) {
        throw new Error("括号不匹配");
      }
      operators.pop();
      continue;
    }

    while (
      operators.length > 0
      && operators[operators.length - 1] !== "("
      && OPERATOR_PRECEDENCE[operators[operators.length - 1]] >= OPERATOR_PRECEDENCE[token]
    ) {
      output.push(operators.pop()!);
    }
    operators.push(token);
  }

  while (operators.length > 0) {
    const operator = operators.pop()!;
    if (operator === "(") {
      throw new Error("括号不匹配");
    }
    output.push(operator);
  }

  return output;
}

function evaluatePostfix(postfix: (number | string)[]): number {
  const stack: number[] = [];

  for (const token of postfix) {
    if (typeof token === "number") {
      stack.push(token);
      continue;
    }

    if (stack.length < 2) {
      throw new Error(`无效的表达式，运算符 ${token} 缺少操作数`);
    }

    const right = stack.pop()!;
    const left = stack.pop()!;
    switch (token) {
      case "+":
        stack.push(left + right);
        break;
      case "-":
        stack.push(left - right);
        break;
      case "*":
        stack.push(left * right);
        break;
      case "/":
        if (right === 0) {
          throw new Error("除数不能为零");
        }
        stack.push(Math.floor(left / right));
        break;
      default:
        throw new Error(`未知的运算符: ${token}`);
    }
  }

  if (stack.length !== 1) {
    throw new Error("无效的表达式");
  }
  return stack[0];
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  }
  catch {
    return {};
  }
}

function toPositiveRoleId(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : null;
}
