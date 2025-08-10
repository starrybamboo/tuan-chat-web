import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { roll } from "@/components/common/dicer/dice";

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
    let input = args.join("");
    if (!input) {
      input = "1d";
    }
    try {
      const diceResult = roll(input);
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
  [".st 力量70", ".st show 敏捷"],
  ".st [属性名][属性值] / .st show [属性名]",
  async (args: string[], mentioned: UserRole[], cpi: CPI, _prop: ExecutorProp): Promise<boolean> => {
    const role = mentioned[0];
    const input = args.join("");
    const ability: { [key: string]: number } = {};
    // 使用正则匹配所有属性+数值的组合
    const matches = input.matchAll(/(\D+)(\d+)/g);
    const curAbility = await cpi.getRoleAbilityList(role.roleId);
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

    for (const match of matches) {
      const rawKey = match[1].trim();
      const value = Number.parseInt(match[2], 10);

      // 统一转换为小写进行比较
      const normalizedKey = rawKey.toLowerCase();

      if (!curAbility?.ability) {
        curAbility.ability = {};
      }

      // 查找映射关系
      if (ABILITY_MAP[normalizedKey]) {
        curAbility.ability[ABILITY_MAP[normalizedKey]] = value;
        ability[ABILITY_MAP[normalizedKey]] = value;
      }
      else {
        curAbility.ability[rawKey] = value;
        ability[rawKey] = value;
      }
    }

    cpi.setRoleAbilityList(role.roleId, curAbility);
    cpi.sendToast(`属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${JSON.stringify(ability)}`);
    return true;
  },
);
executorPublic.addCmd(cmdSt);
