import { resolveCommandInlineCompletion } from "./commandInlineCompletion";

describe("resolveCommandInlineCompletion", () => {
  it("为精确公共骰子命令补全示例参数", () => {
    expect(resolveCommandInlineCompletion({ text: ".r", ruleId: 1 })).toMatchObject({
      commandName: "r",
      completedText: ".r 1d100",
      suffix: " 1d100",
    });
  });

  it("保留中文句号命令前缀", () => {
    expect(resolveCommandInlineCompletion({ text: "。r", ruleId: 1 })).toMatchObject({
      completedText: "。r 1d100",
      suffix: " 1d100",
    });
  });

  it("为规则命令补全示例参数", () => {
    expect(resolveCommandInlineCompletion({ text: ".rc", ruleId: 1 })).toMatchObject({
      commandName: "rc",
      completedText: ".rc 侦查 50",
      suffix: " 侦查 50",
    });
  });

  it("为命令名前缀补全剩余命令名", () => {
    expect(resolveCommandInlineCompletion({ text: ".setd", ruleId: 1 })).toMatchObject({
      commandName: "setdice",
      completedText: ".setdice ",
      suffix: "ice ",
    });
  });

  it("为已经输入的示例参数补全剩余部分", () => {
    expect(resolveCommandInlineCompletion({ text: ".r 1", ruleId: 1 })).toMatchObject({
      completedText: ".r 1d100",
      suffix: "d100",
    });
  });

  it("不会为普通文本或未知命令生成补全", () => {
    expect(resolveCommandInlineCompletion({ text: "普通消息", ruleId: 1 })).toBeNull();
    expect(resolveCommandInlineCompletion({ text: ".unknown", ruleId: 1 })).toBeNull();
  });

  it("不会跨多行生成补全", () => {
    expect(resolveCommandInlineCompletion({ text: ".r\n下一行", ruleId: 1 })).toBeNull();
  });
});
