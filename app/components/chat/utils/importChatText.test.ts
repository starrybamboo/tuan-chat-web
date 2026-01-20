import { normalizeSpeakerName, parseImportedChatText } from "./importChatText";

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
