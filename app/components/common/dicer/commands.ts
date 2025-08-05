export type command = {
  name: string;
  /**
   * 命令的相对重要度，数字越大越重要，越会排在指令提示框的下面
   */
  importance: number;
  description: string;
};

export const diceCommands: command[] = [
  {
    name: "r",
    importance: 5,
    description: "掷骰（例：.r3d6 骰3个6面骰，多个骰子可叠加如.r2d6+1d4）",
  },
  {
    name: "set",
    importance: 4,
    description: "设置默认骰（例：.set 10 设置默认骰为10面，使用.rd时自动调用）",
  },
  {
    name: "st",
    importance: 5,
    description: "属性设置（例：.st 幸运 65 将幸运属性设为65，支持多属性.st 力量70 敏捷60）",
  },
  {
    name: "rc",
    importance: 5,
    description: "技能检定（例：.rc 侦查 进行侦查检定，自动与属性值比较生成成功等级）",
  },
  {
    name: "sc",
    importance: 2,
    description: "理智检定（例：.sc 1/1d6 成功扣1，失败扣1d6）",
  },
  {
    name: "ri",
    importance: 4,
    description: "投掷先攻（例：.ri([加值])([角色名])或.ri([表达式])([角色名])",
  },
  // {
  //   name: "en",
  //   importance: 3,
  //   description: "技能成长（例：.en 急救 进行成长检定，成功后增加1d10点技能值",
  // },
  // {
  //   name: "ti",
  //   importance: 2,
  //   description: "临时疯狂症状（例：.ti 骰1d10获取临时疯狂症状，持续轮数=当前san值/10）",
  // },
  // {
  //   name: "li",
  //   importance: 2,
  //   description: "总结疯狂症状（例：.li 骰1d10获取总结疯狂症状，效果持续至恢复理智）",
  // },
  {
    name: "help",
    importance: 4,
    description: "显示所有指令帮助（支持.help sc 查看特定指令详细说明）",
  },
];

export const webgalCommands: command[] = [
  {
    name: "changeBg:none -next",
    importance: 5,
    description: "取消背景（无停顿）",
  },
  {
    name: "changeBg:none",
    importance: 5,
    description: "取消背景",
  },
];
