import { formatAnkoDiceMessage } from "./diceTable";

describe("formatAnkoDiceMessage", () => {
  it("高亮表格选项（骰式不在首行）", () => {
    const input = [
      "看样子还蛮清楚的，是在日本修行时听同伴们说过了吗，还是自学的？",
      "【1d10:10】",
      "1 这就是天朝格斗家的知识量",
      "2 与boy聊天中得知",
      "10 勇，勇次郎？！",
    ].join("\n");

    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toContain("【1d10:[10](style=color:#FF6B00)】");
    expect(result).toContain("[10 勇，勇次郎？！](style=color:#FF6B00)");
  });

  it("支持详情表达式并高亮结果", () => {
    const input = "烈海王的说明【1d70：39+30=69】（30为圣人与月之头脑的智商补正）";
    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toContain("烈海王的说明【1d70：39+30=[69](style=color:#FF6B00)】");
  });

  it("支持行内结果高亮", () => {
    const input = "神子的震惊程度【1d100:41】(越1越无所谓，越100越开什么玩笑)";
    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toContain("神子的震惊程度【1d100:[41](style=color:#FF6B00)】");
  });
});
