import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { roll } from "@/components/common/dicer/dice";
import UNTIL from "@/components/common/dicer/utils";

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
  async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
    const isForceToast = UNTIL.doesHaveArg(args, "h");
    let input = args.join("");
    if (!input) {
      input = "1d100";
    }
    try {
      const diceResult = roll(input);
      if (isForceToast) {
        cpi.sendToast(`掷骰结果：${input} = ${diceResult.expanded} = ${diceResult.result}`);
        cpi.sendMsg(prop, `${mentioned[mentioned.length - 1].roleName}进行了一次暗骰`);
        return true;
      }
      cpi.sendMsg(prop, `掷骰结果：${input} = ${diceResult.expanded} = ${diceResult.result}`);
      return true;
    }
    catch (error) {
      cpi.sendMsg(prop, `掷骰错误：${error ?? "未知错误"}`);
      return false;
    }
  },
);
executorPublic.addCmd(cmdR);

const cmdSt = new CommandExecutor(
  "st",
  [],
  "属性设置",
  [".st 力量70", ".st show 敏捷", ".st 力量+10", ".st 敏捷-5"],
  ".st [属性名][属性值] / .st show [属性名]",
  async (args: string[], mentioned: UserRole[], cpi: CPI, _prop: ExecutorProp): Promise<boolean> => {
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

    // st show 实现，目前仍使用聊天文本返回结果
    // TODO 添加弹出窗口响应`st show`的属性展示
    if (args[0]?.toLowerCase() === "show") {
      if (!curAbility?.ability) {
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
        const normalizedKey = prop.toLowerCase();
        const key = ABILITY_MAP[normalizedKey] || prop;
        const value = curAbility.ability[key] ?? 0; // 修改这里，添加默认值0

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
      const normalizedKey = rawKey.toLowerCase();
      const key = ABILITY_MAP[normalizedKey] || rawKey;

      if (!curAbility?.ability) {
        curAbility.ability = {};
      }

      const currentValue = Number.parseInt(curAbility.ability[key] ?? "0"); // 原有值（默认0）
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
      curAbility.ability[key] = String(newValue);
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
    cpi.sendMsg(_prop, `属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${updateDetails}`);
    // cpi.sendToast( `属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${updateDetails}`);
    return true;
  },
);
executorPublic.addCmd(cmdSt);
