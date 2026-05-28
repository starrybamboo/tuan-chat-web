import { isDicerSpeakerName, normalizeSpeakerName, parseImportedChatText } from "./importChatText";

describe("parseImportedChatText", () => {
  it("解析标记格式（支持[]与<>，含中文冒号）", () => {
    const input = [
      "[KP]：你看那里，那里好像有两个人在讨论多数表决呢。",
      "<蓝色的人>： “我赞成多数表决，这才能体现公平性。”",
      "",
      "  <红色的人> ：胡说八道  ",
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

  it("导入时忽略没有可访问地址的 mirai 图片占位消息", () => {
    const input = [
      "木落(303451945) 2022/03/21 19:06:53",
      "[mirai:image:{829E3684-0489-D929-ABCE-674F2992FDC4}.jpg]",
      "",
      "木落(303451945) 2022/03/21 19:06:54",
      "后续文字",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(1);
    expect(res.messages[0]).toMatchObject({ speakerName: "木落", content: "后续文字" });
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
    expect(res.messages).toHaveLength(15);
    expect(res.messages[0]).toMatchObject({ speakerName: "木落", content: "房前有两棵树" });
    expect(res.messages[2]).toMatchObject({
      speakerName: "木落",
      content: ".ra 灵感",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "由于a 灵感，<木落>掷出了 D20=5",
      },
    });
    expect(res.messages[4]).toMatchObject({
      speakerName: "木落",
      content: ".ext coc7 on",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "打开扩展 coc7\n检测到可能冲突的扩展，建议关闭: dnd5e",
      },
    });
    expect(res.messages[5]).toMatchObject({
      speakerName: "木落",
      content: ".ra 灵感60",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "<木落>的灵感60检定结果为: d100=1/60, ([1d100=1]) 大成功！",
      },
    });
    expect(res.messages[7]).toMatchObject({
      speakerName: "木落",
      content: ".setcoc",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "当前房规: 0",
      },
    });
    expect(res.messages[9]).toMatchObject({
      speakerName: "木落",
      content: ".nn 芝士雪豹",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "<木落>(303451945)的昵称被设定为<芝士雪豹>",
      },
    });
    expect(res.messages[10]).toMatchObject({ speakerName: "芝士雪豹", content: ",r" });
    expect(res.messages[13]).toMatchObject({ speakerName: "芝士雪豹", content: "草草结束" });
    expect(res.messages[14]).toMatchObject({ speakerName: "海豹一号机", content: "故事落下了帷幕。\n记录已经关闭。" });
    expect(res.messages[14]?.diceTurn).toBeUndefined();
  });

  it("把相邻的骰子指令和骰娘结果合并为 diceTurn", () => {
    const input = [
      "木落(303451945) 2022/03/21 19:07:10",
      ".ra 灵感",
      "",
      "海豹一号机(2589922907) 2022/03/21 19:07:10",
      "由于a 灵感，<木落>掷出了 D20=5",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(1);
    expect(res.messages[0]).toMatchObject({
      speakerName: "木落",
      content: ".ra 灵感",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "由于a 灵感，<木落>掷出了 D20=5",
      },
    });
  });

  it("解析回声工坊格式并合并相邻骰子指令", () => {
    const input = [
      "[海豹一号机]:新的故事开始了，祝旅途愉快！",
      "[海豹一号机]:记录已经开启。",
      "[木落]:（好的测试开始了）",
      "[木落]:从前有一座房子",
      "[木落]:房前有两棵树",
      "[木落]:一棵是枣树，另一颗也是枣树",
      "[木落]:.ra 灵感",
      "[海豹一号机]:由于a 灵感，<木落>掷出了 D20=5",
      "[木落]:啊没开扩展",
      "[木落]:.ext coc7 on",
      "[海豹一号机]:打开扩展 coc7",
      "[海豹一号机]:检测到可能冲突的扩展，建议关闭: dnd5e",
      "[木落]:.ra 灵感60",
      "[海豹一号机]:<木落>的灵感60检定结果为: d100=1/60, ([1d100=1]) 大成功！",
      "[木落]:（？？？？？）",
      "[木落]:.setcoc",
      "[海豹一号机]:当前房规: 0",
      "[木落]:.r",
      "[海豹一号机]:<木落>掷出了 D20=7",
      "[木落]:.nn 芝士雪豹",
      "[海豹一号机]:<木落>(303451945)的昵称被设定为<芝士雪豹>",
      "[芝士雪豹]:,r",
      "[芝士雪豹]:.r",
      "[海豹一号机]:<芝士雪豹>掷出了 D20=15",
      "[芝士雪豹]:就这样吧",
      "[芝士雪豹]:草草结束",
      "[芝士雪豹]:.log end",
      "[海豹一号机]:故事落下了帷幕。",
      "[海豹一号机]:记录已经关闭。",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(20);
    expect(res.messages[0]).toMatchObject({ speakerName: "海豹一号机", content: "新的故事开始了，祝旅途愉快！" });
    expect(res.messages[1]).toMatchObject({ speakerName: "海豹一号机", content: "记录已经开启。" });
    expect(res.messages[6]).toMatchObject({
      speakerName: "木落",
      content: ".ra 灵感",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "由于a 灵感，<木落>掷出了 D20=5",
      },
    });
    expect(res.messages[9]).toMatchObject({
      speakerName: "木落",
      content: ".ra 灵感60",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "<木落>的灵感60检定结果为: d100=1/60, ([1d100=1]) 大成功！",
      },
    });
    expect(res.messages[11]).toMatchObject({
      speakerName: "木落",
      content: ".setcoc",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "当前房规: 0",
      },
    });
    expect(res.messages[13]).toMatchObject({
      speakerName: "木落",
      content: ".nn 芝士雪豹",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "<木落>(303451945)的昵称被设定为<芝士雪豹>",
      },
    });
    expect(res.messages[15]).toMatchObject({
      speakerName: "芝士雪豹",
      content: ".r",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "<芝士雪豹>掷出了 D20=15",
      },
    });
    expect(res.messages[17]).toMatchObject({ speakerName: "芝士雪豹", content: "草草结束" });
    expect(res.messages[18]).toMatchObject({ speakerName: "海豹一号机", content: "故事落下了帷幕。" });
    expect(res.messages[19]).toMatchObject({ speakerName: "海豹一号机", content: "记录已经关闭。" });
    expect(res.messages[18]?.diceTurn).toBeUndefined();
    expect(res.messages[19]?.diceTurn).toBeUndefined();
  });

  it("兼容回声工坊的骰子前缀、KP 标记与语音尾标", () => {
    const input = [
      "[木落]:.ra 灵感",
      "# [海豹一号机,KP]:<木落>的灵感检定结果为: d100=12/60 成功{*}",
      "[木落,KP]:继续调查{*}",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(2);
    expect(res.messages[0]).toMatchObject({
      speakerName: "木落",
      content: ".ra 灵感",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "<木落>的灵感检定结果为: d100=12/60 成功",
      },
    });
    expect(res.messages[1]).toMatchObject({ speakerName: "木落", content: "继续调查" });
  });

  it("兼容预览复制出的时间、尖括号昵称和平台账号", () => {
    const input = [
      "2022/03/21 19:07:10 <木落(303451945)> .ra 灵感",
      "19:07:10 <海豹一号机(2589922907)> 由于a 灵感，<木落>掷出了 D20=5",
      "19:07:20 <木落> 啊没开扩展",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(2);
    expect(res.messages[0]).toMatchObject({
      speakerName: "木落",
      content: ".ra 灵感",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "由于a 灵感，<木落>掷出了 D20=5",
      },
    });
    expect(res.messages[1]).toMatchObject({ speakerName: "木落", content: "啊没开扩展" });
  });

  it("兼容论坛代码的 BBCode 颜色标签", () => {
    const input = [
      "[color=silver]19:07:10[/color][color=#ea580c] <木落(303451945)> .ra 灵感 [/color]",
      "[color=silver]19:07:10[/color][color=#64748b] <海豹一号机(2589922907)> 由于a 灵感，<木落>掷出了 D20=5 [/color]",
      "[color=silver]19:07:20[/color][color=#ea580c] <木落> 啊没开扩展 [/color]",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(2);
    expect(res.messages[0]).toMatchObject({
      speakerName: "木落",
      content: ".ra 灵感",
      diceTurn: {
        dicerSpeakerName: "海豹一号机",
        replyContent: "由于a 灵感，<木落>掷出了 D20=5",
      },
    });
    expect(res.messages[1]).toMatchObject({ speakerName: "木落", content: "啊没开扩展" });
  });

  it("兼容论坛代码内容多行导出的同角色文本块", () => {
    const input = [
      "[color=silver]<木落>[/color][color=#ea580c] 从前有一座房子",
      "房前有两棵树 [/color]",
      "[color=silver]<海豹一号机>[/color][color=#64748b] 记录模块已经启动。 [/color]",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(2);
    expect(res.messages[0]).toMatchObject({
      speakerName: "木落",
      content: "从前有一座房子\n房前有两棵树",
    });
    expect(res.messages[1]).toMatchObject({
      speakerName: "海豹一号机",
      content: "记录模块已经启动。",
    });
    expect(res.messages[1]?.diceTurn).toBeUndefined();
  });

  it("忽略 log 控制命令但保留骰娘独立发言", () => {
    const input = [
      "[海豹一号机]:新的故事开始了，祝旅途愉快！",
      "[海豹一号机]:记录已经开启。",
      "[木落]:正文",
      "[木落]:.log end",
      "[海豹一号机]:故事落下了帷幕。",
      "[海豹一号机]:记录已经关闭。",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.invalidLines).toHaveLength(0);
    expect(res.messages).toHaveLength(5);
    expect(res.messages.map(message => message.content)).toEqual([
      "新的故事开始了，祝旅途愉快！",
      "记录已经开启。",
      "正文",
      "故事落下了帷幕。",
      "记录已经关闭。",
    ]);
    expect(res.messages[0]?.diceTurn).toBeUndefined();
    expect(res.messages[3]?.diceTurn).toBeUndefined();
  });

  it("忽略空行并记录无效行", () => {
    const input = [
      "",
      "这是一行无效内容",
      "[A]: ok",
      "[]: empty",
      "[B]：",
      "<C>：",
    ].join("\n");

    const res = parseImportedChatText(input);

    expect(res.messages).toHaveLength(1);
    expect(res.messages[0]).toMatchObject({ lineNumber: 3, speakerName: "A", content: "ok" });
    expect(res.invalidLines.map(i => i.lineNumber)).toEqual([2, 4, 5, 6]);
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
    expect(isDicerSpeakerName("海豹一号机")).toBe(true);
    expect(isDicerSpeakerName(" Dice ")).toBe(true);
    expect(isDicerSpeakerName("dicer")).toBe(true);
    expect(isDicerSpeakerName("dicebot")).toBe(true);
    expect(isDicerSpeakerName("KP")).toBe(false);
    expect(isDicerSpeakerName("芝士雪豹")).toBe(false);
    expect(isDicerSpeakerName("蓝色的人")).toBe(false);
  });
});
