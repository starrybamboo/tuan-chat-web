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
  async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
    const isForceToast = UTILS.doesHaveArg(args, "h");
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
