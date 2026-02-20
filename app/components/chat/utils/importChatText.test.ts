import { isDicerSpeakerName, normalizeSpeakerName, parseImportedChatText } from "./importChatText";

describe("parseImportedChatText", () => {
  it("解析标准格式（含中文冒号）", () => {
    const input = [
      "[KP]：你看那里，那里好像有两个人在讨论多数表决呢。",
      "[蓝色的人]： “我赞成多数表决，这才能体现公平性。”",
      "",
      "  [红色的人] ：胡说八道  ",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(3);
    expect(res.messages[0]).toMatchObject({ lineNumber: 1, speakerName: "KP" });
    expect(res.messages[1]).toMatchObject({ lineNumber: 2, speakerName: "蓝色的人" });
    expect(res.messages[2]).toMatchObject({ lineNumber: 4, speakerName: "红色的人", content: "胡说八道" });
  });

  it("解析QQ聊天记录格式（支持多行消息）", () => {
    const input = [
      "木落(303451945) 2022/03/21 19:06:53",
      "房前有两棵树",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:07:37",
      "打开扩展 coc7",
      "检测到可能冲突的扩展，建议关闭: dnd5e",
      "",
      "芝士雪豹（303451945） 2022-03-21 19:14:24",
      "就这样吧",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(3);
    expect(res.messages[0]).toMatchObject({ lineNumber: 1, speakerName: "木落", content: "房前有两棵树" });
    expect(res.messages[1]).toMatchObject({
      lineNumber: 4,
      speakerName: "海豹一号机",
      content: "打开扩展 coc7\n检测到可能冲突的扩展，建议关闭: dnd5e",
    });
    expect(res.messages[2]).toMatchObject({ lineNumber: 8, speakerName: "芝士雪豹", content: "就这样吧" });
  });

  it("qq格式头行没有正文时记为无效", () => {
    const input = [
      "木落(303451945) 2022/03/21 19:06:53",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:07:37",
      "ok",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.messages).toHaveLength(1);
    expect(res.messages[0]).toMatchObject({ lineNumber: 3, speakerName: "海豹一号机", content: "ok" });
    expect(res.invalidLines.map(i => i.lineNumber)).toEqual([1]);
  });

  it("解析用户提供的qq长聊天记录样例", () => {
    const input = [
      "木落(303451945) 2022/03/21 19:06:53",
      "房前有两棵树",
      "",
      "木落(303451945) 2022/03/21 19:07:06",
      "一棵是枣树，另一颗也是枣树",
      "",
      "木落(303451945) 2022/03/21 19:07:10",
      ".ra 灵感",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:07:10",
      "由于a 灵感，<木落>掷出了 D20=5",
      "",
      "木落(303451945) 2022/03/21 19:07:20",
      "啊没开扩展",
      "",
      "木落(303451945) 2022/03/21 19:07:37",
      ".ext coc7 on",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:07:37",
      "打开扩展 coc7",
      "检测到可能冲突的扩展，建议关闭: dnd5e",
      "",
      "木落(303451945) 2022/03/21 19:07:55",
      ".ra 灵感60",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:07:55",
      "<木落>的灵感60检定结果为: d100=1/60, ([1d100=1]) 大成功！",
      "",
      "木落(303451945) 2022/03/21 19:08:21",
      "（？？？？？）",
      "",
      "木落(303451945) 2022/03/21 19:08:23",
      ".setcoc",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:08:23",
      "当前房规: 0",
      "",
      "木落(303451945) 2022/03/21 19:13:44",
      ".r",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:13:44",
      "<木落>掷出了 D20=7",
      "",
      "木落(303451945) 2022/03/21 19:14:02",
      ".nn 芝士雪豹",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:14:02",
      "<木落>(303451945)的昵称被设定为<芝士雪豹>",
      "",
      "芝士雪豹(303451945) 2022/03/21 19:14:05",
      ",r",
      "",
      "芝士雪豹(303451945) 2022/03/21 19:14:12",
      ".r",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:14:12",
      "<芝士雪豹>掷出了 D20=15",
      "",
      "芝士雪豹(303451945) 2022/03/21 19:14:24",
      "就这样吧",
      "",
      "芝士雪豹(303451945) 2022/03/21 19:14:29",
      "草草结束",
      "",
      "芝士雪豹(303451945) 2022/03/21 19:14:35",
      ".log end",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:14:35",
      "故事落下了帷幕。",
      "记录已经关闭。",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(23);
    expect(res.messages[0]).toMatchObject({ speakerName: "木落", content: "房前有两棵树" });
    expect(res.messages[6]).toMatchObject({
      speakerName: "海豹一号机",
      content: "打开扩展 coc7\n检测到可能冲突的扩展，建议关闭: dnd5e",
    });
    expect(res.messages[16]).toMatchObject({ speakerName: "芝士雪豹", content: ",r" });
    expect(res.messages[22]).toMatchObject({
      speakerName: "海豹一号机",
      content: "故事落下了帷幕。\n记录已经关闭。",
    });
  });

  it("忽略空行并记录无效行", () => {
    const input = [
      "",
      "这是一行无效内容",
      "[A]: ok",
      "[]: empty",
      "[B]：",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.messages).toHaveLength(1);
    expect(res.messages[0]).toMatchObject({ lineNumber: 3, speakerName: "A", content: "ok" });
    expect(res.invalidLines.map(i => i.lineNumber)).toEqual([2, 4, 5]);
  });
});

describe("normalizeSpeakerName", () => {
  it("去除首尾空白并压缩空白", () => {
    expect(normalizeSpeakerName("  KP  ")).toBe("KP");
    expect(normalizeSpeakerName("蓝色   的人")).toBe("蓝色 的人");
  });
});

describe("isDicerSpeakerName", () => {
  it("识别骰娘名称（含英文别名）", () => {
    expect(isDicerSpeakerName("骰娘")).toBe(true);
    expect(isDicerSpeakerName(" Dice ")).toBe(true);
    expect(isDicerSpeakerName("dicer")).toBe(true);
    expect(isDicerSpeakerName("dicebot")).toBe(true);
    expect(isDicerSpeakerName("KP")).toBe(false);
    expect(isDicerSpeakerName("蓝色的人")).toBe(false);
  });
});
