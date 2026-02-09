import { formatAnkoDiceMessage } from "./diceTable";

describe("formatAnkoDiceMessage", () => {
  it("高亮表格选项（骰式不在首行）", () => {
    const input = [
      "看样子还蛮清楚的，是在日本修行时听同伴们说过了吗，还是自学的？",
      "【1d10:10】",
      "1 这就是天朝格斗家的知识量",
      "2 与boy聊天中得知",
      "3 涉川老其实是历史宅",
      "4 还有余地！",
      "5 花山，你还会学历史啊",
      "6 这就是天朝格斗家的知识量",
      "7 这就是天朝格斗家的知识量",
      "8 还有余地！",
      "9 涉川老其实是历史宅",
      "10 勇，勇次郎？！",
    ].join("\n");

    const expected = [
      "看样子还蛮清楚的，是在日本修行时听同伴们说过了吗，还是自学的？",
      "【1d10:[10](style=color:#FF6B00)】",
      "1 这就是天朝格斗家的知识量",
      "2 与boy聊天中得知",
      "3 涉川老其实是历史宅",
      "4 还有余地！",
      "5 花山，你还会学历史啊",
      "6 这就是天朝格斗家的知识量",
      "7 这就是天朝格斗家的知识量",
      "8 还有余地！",
      "9 涉川老其实是历史宅",
      "[10 勇，勇次郎？！](style=color:#FF6B00)",
    ].join("\n");

    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toBe(expected);
  });

  it("支持详情表达式并高亮结果", () => {
    const input = "烈海王的说明【1d70：39+30=69】（30为圣人与月之头脑的智商补正）";
    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toContain("烈海王的说明【1d70：39+30=[69](style=color:#FF6B00)】");
  });

  it("支持行内结果高亮", () => {
    const input = "烈海王的态度是【1d100：72】（越1越愧疚，越100越我无所谓）";
    const expected = "烈海王的态度是【1d100：[72](style=color:#FF6B00)】（越1越愧疚，越100越我无所谓）";

    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toBe(expected);
  });

  it("支持点号列表选项", () => {
    const input = [
      "1d8",
      "1. 剑阶",
      "2. 弓阶",
      "3. 枪阶",
      "4. 骑阶",
      "5. 魔法师",
      "6. 暗杀者",
      "7. 狂阶",
      "8. 其他",
    ].join("\n");

    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toMatch(/1d8[:：]\[\d+\]\(style=color:#FF6B00\)/);
  });

  it("支持全角编号列表", () => {
    const input = [
      "1d8",
      "１．剑阶",
      "２．弓阶",
      "３．枪阶",
      "４．骑阶",
      "５．魔法师",
      "６．暗杀者",
      "７．狂阶",
      "８．其他",
    ].join("\n");

    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toMatch(/1d8[:：]\[\d+\]\(style=color:#FF6B00\)/);
  });

  it("支持分行的公式掷骰", () => {
    const input = [
      "兄弟的实力（越大越强）",
      "1d80 + 20",
    ].join("\n");

    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toMatch(/1d80\s*\+\s*20：\[\d+\]\(style=color:#FF6B00\)/);
  });

  it("支持带样式标记的标题行", () => {
    const input = [
      "兄弟的[高达](style=color:#FFD700)有多大 1d4",
      "1. 好...好大【迫真机甲】",
      "2. 小小的也很可爱【外骨骼】",
      "3. 可大可小【这里就用魔法解决】",
      "4. 可大可小【单纯有很多套】",
    ].join("\n");

    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toContain("[高达](style=color:#FFD700)");
    expect(result).toMatch(/1d4[:：]\[\d\]\(style=color:#FF6B00\)/);
    expect(result).toMatch(/\[\d+[.)）．。、:：]\s*.*\]\(style=color:#FF6B00\)/);
  });

  it("在选项行内补全子骰结果", () => {
    const input = [
      "兄弟的master是个怎样的人",
      "1. 冯诺依曼派的35岁疲惫上班族（男）",
      "2. 图灵派的linux大神（男？）",
      "3. 雌小鬼萝莉妈妈",
      "4. 不做人的机械飞升，而且是神奇的可以使用魔法的机器",
      "5. O可梦大师",
      "6. 以为是[圣杯战争](style=color:#FF6B00)所以来参加圣杯战争的热血男高中生",
      "7.",
      "8.",
      "9.",
      "10.大成功/大失败【1d2】",
    ].join("\n");

    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toMatch(/10[.)）．。、:：]\s*大成功\/大失败【1d2[:：]\d】/);
  });

  it("支持同一行的自由文本骰式", () => {
    const input = "主人公性质 庸俗 1d100";
    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toMatch(/主人公性质 庸俗 1d100[:：]\[\d+\]\(style=color:#FF6B00\)/);
  });

  it("支持逗号分隔的选项行", () => {
    const input = [
      "为什么主人公如此渴望根源1d10:10",
      "1. 希望以血族的身份光明的活在这个世界上",
      "2. 程序员喜欢技术有什么问题吗？",
      "3. 其实.....我早就想当图灵派的人了。",
      "4. 希望解决掉自己鲜血成瘾的问题",
      "5. 朝闻道。。。。",
      "6. 只要技术强大，就可以改变世界口牙！",
      "7. 强大，我需要强大。",
      "8, 单身35年就没见过女性，所以追求欠打",
      "9, 想要成为正义的伙伴（你也是吗？）",
      "10, 大成功/大失败【1d2：2】",
    ].join("\n");

    const result = formatAnkoDiceMessage(input, 100);

    expect(result).toContain("为什么主人公如此渴望根源1d10:[10](style=color:#FF6B00)");
    expect(result).toContain("[10, 大成功/大失败【1d2：2】](style=color:#FF6B00)");
  });
});
