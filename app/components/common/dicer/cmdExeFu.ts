import { /* CommandExecutor, */ RuleNameSpace } from "./cmd";

const executorFu = new RuleNameSpace(
  3,
  "fu",
  ["最终物语"],
  "最终物语规则的指令集",
);

export default executorFu;

// const cmdFu = new CommandExecutor(
//   "fu",
//   ["ra", "rc"],
//   "最终物语规则的掷骰",
//   [".ra 1d100", " .rc 1d100"],
//   ".ra [掷骰表达式]（进行属性检定） /.rc [掷骰表达式]（进行对抗检定）",
//   async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {

//     return true;
//   },
// );
