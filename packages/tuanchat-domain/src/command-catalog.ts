import type { CommandInfo } from "./command-request";

const PUBLIC_COMMANDS: CommandInfo[] = [
  { name: "r", alias: ["r"], description: "掷骰", examples: [".r 1d100", ".r 3d6*5", ".r"], usage: ".r [掷骰表达式]" },
  { name: "rd", alias: ["rd"], description: "快捷掷单骰", examples: [".rd", ".rd20", ".rd 6"], usage: ".rd [骰子面数/表达式]" },
  { name: "ri", alias: [], description: "读取敏捷先攻", examples: [".ri"], usage: ".ri" },
  { name: "st", alias: [], description: "属性设置", examples: [".st 力量70", ".st show", ".st show 敏捷", ".st 力量+10"], usage: ".st [属性名][属性值] / .st show [属性名]..." },
  { name: "set", alias: ["set", "alias"], description: "设置自定义变量", examples: [".set 手枪 1d8+1d4", ".set 闪电旋风劈 6d10"], usage: ".set [变量名] [变量内容]" },
  { name: "get", alias: ["use"], description: "读取自定义变量", examples: [".get 手枪", ".get 闪电旋风劈"], usage: ".get [变量名]" },
  { name: "setdice", alias: ["sd"], description: "设置默认骰子", examples: [".setdice 100", ".setdice 20", ".sd 6"], usage: ".setdice [面数]" },
  { name: "ww", alias: [], description: "骰池", examples: [".ww 5", ".ww 力量+近战a8", ".ww 5a9"], usage: ".ww [数量/表达式]a[加骰]m[面数]k[成功线]" },
];

const COC_COMMANDS: CommandInfo[] = [
  { name: "rc", alias: ["ra"], description: "进行技能检定", examples: [".rc 侦查 50", ".rc 侦查 +10", ".rc p 手枪", ".rc 力量"], usage: "rc [奖励/惩罚骰]? [技能名] [技能值]?" },
  { name: "rcb", alias: ["rab"], description: "进行带奖励骰的技能检定", examples: [".rcb 侦查", ".rcb 力量+10", ".rcb 力量90 2"], usage: "rcb [技能名/技能值] [奖励骰数量]?" },
  { name: "rcp", alias: ["rap"], description: "进行带惩罚骰的技能检定", examples: [".rcp 侦查", ".rcp 力量-10", ".rcp 90 2"], usage: "rcp [技能名/技能值] [惩罚骰数量]?" },
  { name: "rh", alias: ["暗骰"], description: "进行基础暗骰（结果仅自己可见）", examples: [".rh", ".rh 20", ".rh 3d6"], usage: "rh [骰子格式]?" },
  { name: "rch", alias: ["rah"], description: "进行技能/属性暗骰检定（结果仅自己可见）", examples: [".rch 侦查", ".rch 力量+10", ".rch 90"], usage: "rch [技能名] [技能值]?" },
  { name: "en", alias: [], description: "进行成长检定", examples: [".en 教育"], usage: ".en [技能名]" },
  { name: "sc", alias: [], description: "进行理智检定", examples: [".sc 1\\1d6"], usage: ".sc [成功扣除]/[失败扣除]" },
  { name: "ti", alias: [], description: "抽取临时症状", examples: [".ti"], usage: ".ti" },
  { name: "li", alias: [], description: "抽取总结症状", examples: [".li"], usage: ".li" },
  { name: "setcoc", alias: [], description: "设置COC房规", examples: [".setcoc 2", ".setcoc"], usage: "setcoc [房规编号]?" },
];

const DND_COMMANDS: CommandInfo[] = [
  { name: "ra", alias: ["rc"], description: "属性/技能检定", examples: [".ra 力量", ".ra 运动", ".ra 力量+2"], usage: ".ra [属性/技能名] [调整值]?" },
  { name: "rs", alias: [], description: "豁免检定", examples: [".rs 敏捷", ".rs 体质"], usage: ".rs [属性名] [调整值]?" },
  { name: "ri", alias: [], description: "投掷先攻", examples: [".ri", ".ri +2"], usage: ".ri [调整值]?" },
  { name: "rab", alias: ["rcb"], description: "优势检定", examples: [".rab 隐匿", ".rab 力量"], usage: ".rab [属性/技能名]" },
  { name: "rap", alias: ["rcp"], description: "劣势检定", examples: [".rap 隐匿", ".rap 力量"], usage: ".rap [属性/技能名]" },
  { name: "ds", alias: ["death"], description: "死亡豁免", examples: [".ds"], usage: ".ds" },
  { name: "find", alias: ["f"], description: "查询法术", examples: [".find 飞弹", ".find magic missile"], usage: ".find [法术名]" },
];

const FU_COMMANDS: CommandInfo[] = [
  { name: "fu", alias: [], description: "最终物语规则的掷骰", examples: [".fu 8 10", ".fu mw +2", ".fu mig wlp"], usage: ".fu [属性值|属性名] [属性值|属性名] [调整值]?" },
];

const RULE_CATALOGS = new Map<number, CommandInfo[]>([
  [1, COC_COMMANDS],
  [2, DND_COMMANDS],
  [3, FU_COMMANDS],
  [7, DND_COMMANDS],
]);

export function getCommandCatalog(ruleId: number | null): CommandInfo[] {
  const ruleCmds = RULE_CATALOGS.get(ruleId ?? 0) ?? [];
  return [...PUBLIC_COMMANDS, ...ruleCmds];
}

export function filterCommandCatalog(commands: CommandInfo[], query: string): CommandInfo[] {
  const q = query.toLowerCase();
  return commands.filter(cmd =>
    cmd.name.toLowerCase().startsWith(q)
    || cmd.alias.some(a => a.toLowerCase().startsWith(q))
    || cmd.description.includes(q),
  );
}
