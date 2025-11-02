import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";

const executorDnd = new RuleNameSpace(
  2,
  "dnd",
  [],
  "DnD指令集",
);

export default executorDnd;

const cmdRi = new CommandExecutor(
  "ri",
  [],
  "投掷先攻",
  [],
  ".ri([加值])([角色名]) / .ri([表达式])([角色名])",
  async (_args: string[], _mentioned: UserRole[], cpi: CPI, _prop: ExecutorProp): Promise<boolean> => {
    cpi.sendToast("功能开发中...");
    return false;
  },
);
executorDnd.addCmd(cmdRi);
