import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { roll } from "@/components/common/dicer/dice";
import UTILS from "@/components/common/dicer/utils/utils";

const executorPublic = new RuleNameSpace(
  0,
  "通用",
  [""],
  "通用指令集",
);

export default executorPublic;

const cmdR = new CommandExecutor(
  "r",
  ["r"],
  "掷骰",
  [".r 1d100", ".r 3d6*5"],
  ".r [掷骰表达式]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const isForceToast = UTILS.doesHaveArg(args, "h");
    let input = args.join("");
    if (!input) {
      input = "1d100";
    }
    try {
      const diceResult = roll(input);
      if (isForceToast) {
        cpi.sendToast(`掷骰结果：${input} = ${diceResult.expanded} = ${diceResult.result}`);
        cpi.replyMessage(`${mentioned[mentioned.length - 1].roleName}进行了一次暗骰`);
        return true;
      }
      cpi.replyMessage(`掷骰结果：${input} = ${diceResult.expanded} = ${diceResult.result}`);
      return true;
    }
    catch (error) {
      cpi.replyMessage(`掷骰错误：${error ?? "未知错误"}`);
      return false;
    }
  },
);
executorPublic.addCmd(cmdR);

/**
 * 属性设置指令
 */
const cmdSt = new CommandExecutor(
  "st",
  [],
  "属性设置",
  [".st 力量70", ".st show 敏捷", ".st 力量+10", ".st 敏捷-5"],
  ".st [属性名][属性值] / .st show [属性名]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const role = mentioned[0];
    const input = args.join("");
    // 修改对象存储变化详情：{ 属性名: { 原值, 操作符, 变化值, 新值 } }
    const abilityChanges: {
      [key: string]: { old: number; op: string; val: number; new: number };
    } = {};
    // 使用正则匹配所有属性+数值的组合
    const matches = input.matchAll(/([^\d+-]+)([+-]?)(\d+)/g);
    const curAbility = cpi.getRoleAbilityList(role.roleId);
    if (!curAbility) {
      cpi.sendToast("非法操作，当前角色不存在于提及列表中。");
      return false;
    }

    if (args[0]?.toLowerCase() === "show") {
      if (!("ability" in curAbility || "basic" in curAbility || "skill" in curAbility)) {
        cpi.sendToast("当前角色没有属性信息，请先设置属性。");
        return false;
      }

      const showProps = args.slice(1).filter(arg => arg.trim() !== "");
      if (showProps.length === 0) {
        cpi.sendToast("请指定要展示的属性");
        return false;
      }

      const result: string[] = [];
      for (const prop of showProps) {
        const key = prop.toLowerCase();
        const value = UTILS.getRoleAbilityValue(curAbility, key) ?? 0; // 修改这里，添加默认值0

        result.push(`${key}: ${value}`);
      }

      cpi.sendToast(`${role?.roleName || "当前角色"}的属性展示：\n${result.join("\n")}`);
      return true;
    }

    // st 实现
    for (const match of matches) {
      const rawKey = match[1].trim();
      const operator = match[2];
      const value = Number.parseInt(match[3], 10);

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
 * 自定义变量设置指令
 */
const cmdSet = new CommandExecutor(
  "set",
  ["set", "alias"],
  "设置自定义变量",
  [".set 手枪 1d8+1d4", ".set 闪电旋风劈 6d10"],
  ".set [变量名] [变量内容]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const role = mentioned[0];
    if (!role) {
      cpi.replyMessage("错误：未找到指定角色");
      return false;
    }

    // 检查参数是否充足
    if (args.length < 1) {
      cpi.replyMessage("错误：请指定变量名称");
      return false;
    }

    const varName = args[0].trim();
    // 变量内容：从第二个参数开始，将所有参数合并为一个字符串
    const varContent = args.slice(1).join(" ").trim();

    // 获取当前角色能力信息
    const curAbility = cpi.getRoleAbilityList(role.roleId);
    if (!curAbility) {
      cpi.replyMessage("错误：无法获取角色信息");
      return false;
    }

    // 确保record对象存在
    if (!curAbility.record) {
      curAbility.record = {};
    }

    // 存储变量到record字段
    const oldValue = curAbility.record[varName];
    curAbility.record[varName] = varContent;

    // 保存更新后的能力信息
    cpi.setRoleAbilityList(role.roleId, curAbility);

    // 生成回复消息
    let replyMsg = `变量设置成功：${role?.roleName || "当前角色"}的变量`;
    if (oldValue !== undefined) {
      replyMsg += `\n${varName} "${oldValue}" -> "${varContent}"`;
    }
    else {
      replyMsg += `\n${varName}: "${varContent}"`;
    }

    cpi.replyMessage(replyMsg);
    return true;
  },
);
executorPublic.addCmd(cmdSet);

/**
 * 自定义变量读取指令
 */
const cmdGet = new CommandExecutor(
  "get",
  [],
  "读取自定义变量",
  [".get 手枪", ".get 闪电旋风劈"],
  ".get [变量名]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const role = mentioned[0];
    if (!role) {
      cpi.replyMessage("错误：未找到指定角色");
      return false;
    }

    // 检查参数是否充足
    if (args.length < 1) {
      cpi.replyMessage("错误：请指定变量名称");
      return false;
    }

    const varName = args[0].trim();

    // 获取当前角色能力信息
    const curAbility = cpi.getRoleAbilityList(role.roleId);
    if (!curAbility) {
      cpi.replyMessage("错误：无法获取角色信息");
      return false;
    }

    // 检查record对象和变量是否存在
    if (!curAbility.record || !curAbility.record[varName]) {
      cpi.replyMessage(`错误：变量 "${varName}" 不存在`);
      return false;
    }

    const varContent = curAbility.record[varName];

    // 尝试用dice虚拟机解析变量内容
    try {
      const diceResult = roll(varContent);
      // 解析成功，返回结果
      cpi.replyMessage(`变量 "${varName}" 的内容：${varContent}\n解析结果：${diceResult.expanded} = ${diceResult.result}`);
    }
    // eslint-disable-next-line unused-imports/no-unused-vars
    catch (error) {
      // 解析失败，返回原始字符串
      cpi.replyMessage(`变量 "${varName}" 的内容：${varContent}`);
    }

    return true;
  },
);
executorPublic.addCmd(cmdGet);
