import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { cmdWw } from "@/components/common/dicer/cmdExe/cmdExeWw";
import { openStShowCardWindow } from "@/components/common/dicer/cmdExe/stShowCard";
import { roll } from "@/components/common/dicer/dice";
import UTILS from "@/components/common/dicer/utils/utils";

const executorPublic = new RuleNameSpace(
  0,
  "通用",
  [""],
  "通用指令集",
);

export default executorPublic;

export async function executeStShowCommand(
  args: string[],
  role: UserRole | undefined,
  cpi: CPI,
): Promise<boolean> {
  if (!role) {
    cpi.sendToast("非法操作，当前角色不存在于提及列表中。");
    return false;
  }

  const curAbility = cpi.getRoleAbilityList(role.roleId);
  if (!curAbility) {
    cpi.sendToast("非法操作，当前角色不存在于提及列表中。");
    return false;
  }

  if (!("ability" in curAbility || "basic" in curAbility || "skill" in curAbility)) {
    cpi.sendToast("当前角色没有属性信息，请先设置属性。");
    return false;
  }

  const showProps = args.slice(1).filter(arg => arg.trim() !== "");
  if (cpi.showRoleAbilityCard) {
    await cpi.showRoleAbilityCard({
      ability: curAbility,
      roleName: role.roleName || "当前角色",
      requestedKeys: showProps,
    });
    return true;
  }
  await openStShowCardWindow({
    ability: curAbility,
    roleName: role.roleName || "当前角色",
    requestedKeys: showProps,
    ...(cpi.queryClient ? { queryClient: cpi.queryClient } : {}),
  });
  return true;
}

async function executeRollCommand(
  args: string[],
  cpi: CPI,
  options?: {
    fallbackInput?: string;
    prependInput?: string;
    role?: UserRole;
  },
): Promise<boolean> {
  const isForceToast = UTILS.doesHaveArg(args, "h");
  const rawInput = args.join("");
  const expressionAlias = resolveRollExpressionAlias(rawInput, options?.role, cpi);
  const input = expressionAlias?.expression ?? (rawInput
    ? `${options?.prependInput ?? ""}${rawInput}`
    : options?.fallbackInput ?? `1d${cpi.getSpaceData("defaultDice") || "100"}`);
  try {
    const diceResult = roll(input);
    const inputText = expressionAlias ? `${expressionAlias.alias} = ${input}` : input;
    if (isForceToast) {
      cpi.replyMessage(`掷骰结果：${inputText} = ${diceResult.expanded} = ${diceResult.result}`, {
        visibility: "kp_and_sender",
      });
      return true;
    }
    cpi.replyMessage(`掷骰结果：${inputText} = ${diceResult.expanded} = ${diceResult.result}`);
    return true;
  }
  catch (error) {
    cpi.replyMessage(`掷骰错误：${error ?? "未知错误"}`);
    return false;
  }
}

function resolveRollExpressionAlias(
  rawInput: string,
  role: UserRole | undefined,
  cpi: CPI,
): { alias: string; expression: string } | null {
  const alias = rawInput.trim();
  if (!alias || !role) {
    return null;
  }

  const ability = cpi.getRoleAbilityList(role.roleId);
  const expression = ability ? UTILS.getRoleAbilityValue(ability, alias)?.trim() : undefined;
  if (!expression || !/\d*d\d+/i.test(expression)) {
    return null;
  }
  return expression ? { alias, expression } : null;
}

function readPublicInitiativeValue(ability: RoleAbility): number | null {
  const keys = ["敏捷", "敏捷值", "dex", "Dex", "DEX"];
  for (const key of keys) {
    const value = UTILS.getRoleAbilityValue(ability, key);
    if (value == null) {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

async function readPublicInitiativeForRole(role: UserRole, cpi: CPI): Promise<number> {
  const ability = await cpi.getRoleAbilityList(role.roleId);
  const initiative = ability ? readPublicInitiativeValue(ability) : null;
  const value = initiative ?? 0;
  if (ability) {
    UTILS.setRoleAbilityValue(ability, "initiative", String(value), "skill", "skill");
    cpi.setRoleAbilityList(role.roleId, ability);
  }
  return value;
}

const cmdR = new CommandExecutor(
  "r",
  ["r"],
  "掷骰",
  [".r 1d100", ".r 3d6*5", ".r 手枪", ".r"],
  ".r [掷骰表达式/表达式别名]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    return executeRollCommand(args, cpi, {
      role: mentioned[0],
    });
  },
);
executorPublic.addCmd(cmdR);

const cmdRd = new CommandExecutor(
  "rd",
  ["rd"],
  "快捷掷单骰",
  [".rd", ".rd20", ".rd 6"],
  ".rd [骰子面数/表达式]",
  async (args: string[], _mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    return executeRollCommand(args, cpi, {
      fallbackInput: "1d100",
      prependInput: "1d",
    });
  },
);
executorPublic.addCmd(cmdRd);

const cmdRi = new CommandExecutor(
  "ri",
  [],
  "读取敏捷先攻",
  [".ri"],
  ".ri",
  async (_args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const roles = Array.from(new Map(
      mentioned
        .filter(role => typeof role.roleId === "number" && role.roleId > 0)
        .map(role => [role.roleId, role]),
    ).values());
    if (roles.length === 0) {
      cpi.sendToast("未指定角色");
      return false;
    }

    for (const role of roles) {
      await readPublicInitiativeForRole(role, cpi);
    }
    return true;
  },
);
executorPublic.addCmd(cmdRi);

/**
 * 属性设置指令
 */
const cmdSt = new CommandExecutor(
  "st",
  [],
  "属性设置",
  [".st 力量70", ".st show", ".st show 敏捷", ".st 力量+10", ".st 敏捷-5", ".st 力量 -25", ".st 手枪 1d4+1d8"],
  ".st [属性名][属性值/掷骰表达式] / .st show [属性名]...",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const role = mentioned[0];
    const input = args.join("");
    // 修改对象存储变化详情：{ 属性名: { ԭֵ, 操作符, 变化值, 新值 } }
    const abilityChanges: {
      [key: string]: { old: number; op: string; val: number; new: number };
    } = {};
    if (args[0]?.toLowerCase() === "show") {
      return executeStShowCommand(args, role, cpi);
    }

    const curAbility = cpi.getRoleAbilityList(role.roleId);
    if (!curAbility) {
      cpi.sendToast("非法操作，当前角色不存在于提及列表中。");
      return false;
    }

    if (args.length >= 2 && !/^[-+]?\d+$/.test(args[1].trim())) {
      const key = args[0].trim();
      const expression = args.slice(1).join("").trim();
      if (!key || !expression) {
        cpi.sendToast("错误：属性名或掷骰表达式不能为空");
        return false;
      }
      curAbility.skill = {
        ...curAbility.skill,
        [key]: expression,
      };
      cpi.setRoleAbilityList(role.roleId, curAbility);
      cpi.replyMessage(`掷骰表达式设置成功：${role?.roleName || "当前角色"}的${key} = ${expression}`);
      return true;
    }

    const applyChange = (rawKey: string, operator: string, value: number) => {
      // 统一转换为小写进行比较
      const key = rawKey.toLowerCase();

      const currentValue = Number.parseInt(UTILS.getRoleAbilityValue(curAbility, key) ?? "0"); // 原有值（默认0）
      let newValue: number;

      if (operator === "+") {
        newValue = currentValue + value; // 增量：原有值+新值
      }
      else if (operator === "-") {
        newValue = currentValue - value; // 减量：原有值-新值
      }
      else {
        newValue = value; // 无运算符：直接赋值
      }

      // 存储变化详情
      abilityChanges[key] = {
        old: currentValue,
        op: operator || "=", // 直接赋值时显示"="
        val: value,
        new: newValue,
      };

      // 更新属性
      UTILS.setRoleAbilityValue(curAbility, key, newValue.toString(), "skill", "auto");
    };

    // 空格分隔赋值：.st 力量 -25 -> 直接设置为 -25
    if (args.length === 2 && /^[-+]?\d+$/.test(args[1].trim())) {
      const rawKey = args[0].trim();
      const value = Number.parseInt(args[1].trim(), 10);
      applyChange(rawKey, "", value);
    }
    else {
      // 连写运算：.st 力量-25 / .st 力量+10
      const matches = input.matchAll(/([^\d+-]+)([+-]?)(\d+)/g);
      for (const match of matches) {
        const rawKey = match[1].trim();
        const operator = match[2];
        const value = Number.parseInt(match[3], 10);
        applyChange(rawKey, operator, value);
      }
    }
    // 生成包含变化过程的提示信息
    const changeEntries = Object.entries(abilityChanges)
      .map(([key, { old, op, val, new: newValue }]) => {
        if (op !== "=") {
          return `${key}: ${old}${op}${val}->${newValue}`; // 拼接格式："力量: 70+10=80" 或 "敏捷: 50-5=45" 或 "智力: =90"
        }
        else {
          return `${key}: ${old}->${newValue}`;
        }
      });
    // 拼接成带花括号和换行的格式
    const updateDetails = `{\n${changeEntries.join("\n")}\n}`;
    cpi.setRoleAbilityList(role.roleId, curAbility);
    cpi.replyMessage(`属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${updateDetails}`);
    return true;
  },
);
executorPublic.addCmd(cmdSt);

/**
 * 设置默认骰子面数指令
 */
const cmdSetDice = new CommandExecutor(
  "setdice",
  ["sd"],
  "设置默认骰子",
  [".setdice 100", ".setdice 20", ".sd 6"],
  ".setdice [面数]",
  async (args: string[], _mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const input = args.join("").trim();

    // 如果没有参数，显示当前默认骰子
    if (!input) {
      const currentDice = cpi.getSpaceData("defaultDice") || "100";
      cpi.sendToast(`当前默认骰子面数：D${currentDice}`);
      return true;
    }

    // 验证输入是否为有效数字
    const diceValue = Number.parseInt(input, 10);
    if (Number.isNaN(diceValue) || diceValue <= 0) {
      cpi.sendToast("错误：请输入有效的正整数");
      return false;
    }

    // 设置默认骰子面数
    cpi.setSpaceData("defaultDice", String(diceValue));
    cpi.replyMessage(`已设置默认骰子面数为 D${diceValue}`);

    return true;
  },
);
executorPublic.addCmd(cmdSetDice);

// WW 加骰检定：挂载到默认通用规则
executorPublic.addCmd(cmdWw);
