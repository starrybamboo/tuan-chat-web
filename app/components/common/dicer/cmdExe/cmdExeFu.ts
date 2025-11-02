import { roll } from "@/components/common/dicer/dice";
import UTILS from "@/components/common/dicer/utils/utils";

import { CommandExecutor, RuleNameSpace } from "../cmd";

// noinspection NonAsciiCharacters
const PROPERTY_NAMES_MAP: Record<string, string> = {
  灵巧度: "敏捷",
  dex: "敏捷",
  灵巧: "敏捷",
  敏捷: "敏捷",
  敏捷值: "敏捷",
  洞察力: "洞察",
  ins: "洞察",
  洞察: "洞察",
  洞察值: "洞察",
  感知: "洞察",
  感知值: "洞察",
  力量值: "力量",
  mig: "力量",
  力量: "力量",
  意志力: "意志",
  wlp: "意志",
  意志: "意志",
  意志值: "意志",
};

const PROPERTY_SHORTS_MAP: Record<string, string> = {
  dd: "dex dex",
  di: "dex ins",
  dm: "dex mig",
  dw: "dex wlp",
  id: "ins dex",
  ii: "ins ins",
  im: "ins mig",
  iw: "ins wlp",
  md: "mig dex",
  mi: "mig ins",
  mm: "mig mig",
  mw: "mig wlp",
  wd: "wlp dex",
  wi: "wlp ins",
  wm: "wlp mig",
  ww: "wlp wlp",
};

const executorFu = new RuleNameSpace(
  3,
  "fu",
  ["最终物语"],
  "最终物语规则的指令集",
  new Map<string, string>(Object.entries(PROPERTY_NAMES_MAP)),
);

export default executorFu;

// 重载st指令
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

    if (args[0]?.toLowerCase() === "show") {
      if (!("ability" in curAbility || "basic" in curAbility || "skill" in curAbility)) {
        cpi.sendToast("当前角色没有属性信息，请先设置属性。");
        return false;
      }

      // TODO: 展示全部属性的功能
      const showProps = args.slice(1).filter(arg => arg.trim() !== "");
      if (showProps.length === 0) {
        cpi.sendToast("请指定要展示的属性");
        return false;
      }

      const result: string[] = [];
      for (const prop of showProps) {
        const normalizedKey = prop.toLowerCase();
        const key = PROPERTY_NAMES_MAP[normalizedKey] || prop;
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
      const normalizedKey = rawKey.toLowerCase();
      const key = PROPERTY_NAMES_MAP[normalizedKey] || rawKey;

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
    cpi.sendMsg(_prop, `属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${updateDetails}`);
    // cpi.sendToast( `属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${updateDetails}`);
    return true;
  },
);
executorFu.addCmd(cmdSt);

const cmdFu = new CommandExecutor(
  "fu",
  [],
  "最终物语规则的掷骰",
  [".fu 8 10", " .fu mw +2", ".fu mig wlp"],
  ".fu [属性值|属性名] [属性值|属性名] [调整值]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    // 所有参数转为小写
    args = args.map(arg => arg.toLowerCase());
    const isForceToasted = UTILS.doesHaveArg(args, "h");

    // 解析参数
    // 1. 以正负号开头的数字
    const signedNumbers = args.filter(str => /^[+-]\d+(?:\.\d+)?$/.test(str));
    // 设为补正值
    const [bonus] = signedNumbers;

    // 2. 无符号数字
    const unsignedNumbers = args.filter(str => /^\d+(?:\.\d+)?$/.test(str));

    // 3. 其他
    const names = args.filter(str =>
      !/^[+-]\d+(?:\.\d+)?$/.test(str)
      && !/^\d+(?:\.\d+)?$/.test(str),
    );

    // 转化得到实际检定需要的骰面，获取顺序为先获取无符号数字作为具体数值，再获取属性名对应的数值，取满即停。

    const fmtDices: number[] = [];

    // 把数值放入fmtDices
    for (const numStr of unsignedNumbers) {
      const num = Number.parseInt(numStr);
      if (!Number.isNaN(num) && num > 0) {
        fmtDices.push(num);
        if (fmtDices.length >= 2) {
          break;
        }
      }
    }

    // 如果fmtDices长度小于2，则尝试从属性名中获取值
    if (fmtDices.length < 2) {
      if (!curAbility.basic) {
        cpi.sendToast("没有设置属性值，无法进行掷骰");
        return false;
      }

      const fmtNames: string[] = [];

      // 遍历names解析属性值并标准化，将结果放入fmtNames
      for (const name of names) {
        try {
          // 1. 先查找简写
          if (name in PROPERTY_SHORTS_MAP) {
            fmtNames.push(...PROPERTY_SHORTS_MAP[name].split(" "));
          }
          // 2. 对于其他内容，进行属性名映射
          else if (name in PROPERTY_NAMES_MAP) {
            fmtNames.push(PROPERTY_NAMES_MAP[name]);
          }
        }
        catch (error) {
          console.error("解析属性名时出错:", error);
          cpi.sendToast("解析属性名时出错，请检查输入");
          return false;
        }
      }

      // 把属性值放入fmtDices
      for (const name of fmtNames) {
        if (name in curAbility.basic) {
          const valStr = curAbility.basic[name];
          const val = Number.parseInt(valStr);
          if (!Number.isNaN(val) && val > 0) {
            fmtDices.push(val);
          }
          if (fmtDices.length >= 2) {
            break;
          }
        }
      }
    }

    // 如果最终仍然无法获取两个骰面，则返回错误
    if (fmtDices.length < 2) {
      cpi.sendToast("无法从给定的信息中获取两个有效的骰面值");
      return false;
    }

    // 取前两个骰面
    const [dice1, dice2] = fmtDices;
    // 计算掷骰结果
    const diceRes = fuRoll(dice1, dice2, bonus);
    // 如果是强制弹窗，则弹窗显示结果，否则只发送消息
    if (isForceToasted) {
      cpi.sendToast(`检定结果：${diceRes.expand} , HR为${diceRes.hr}`);
      return true;
    }
    cpi.sendMsg(prop, `检定结果：${diceRes.expand} , HR为${diceRes.hr}`);
    return true;
  },
);
executorFu.addCmd(cmdFu);

function fuRoll(dice1: number, dice2: number, bonusStr?: string): { result: number; hr: number; expand: string } {
  const diceRes1 = roll(`1d${dice1}`).result;
  const diceRes2 = roll(`1d${dice2}`).result;
  const bonus = bonusStr ? Number.parseInt(bonusStr) : 0;
  const hr = Math.max(diceRes1, diceRes2);
  let result: number = 0;
  if (Number.isNaN(bonus)) {
    result = diceRes1 + diceRes2;
  }
  else {
    result = diceRes1 + diceRes2 + bonus;
  }
  const expand = `d${dice1}+d${dice2}${bonusStr ?? ""}=d${dice1}[${diceRes1}]+d${dice2}[${diceRes2}]${bonusStr ?? ""}=${result}`;
  return { result, hr, expand };
}
