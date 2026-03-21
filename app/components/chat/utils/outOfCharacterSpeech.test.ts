import { buildOutOfCharacterSpeechContent, isOutOfCharacterSpeech } from "./outOfCharacterSpeech";

describe("isOutOfCharacterSpeech", () => {
  it("识别英文左括号开头的消息", () => {
    expect(isOutOfCharacterSpeech("(场外一句话)")).toBe(true);
  });

  it("识别中文左括号开头的消息", () => {
    expect(isOutOfCharacterSpeech("（场外一句话）")).toBe(true);
  });

  it("非括号开头的消息不算场外发言", () => {
    expect(isOutOfCharacterSpeech("KP说：开始吧")).toBe(false);
  });

  it("前面有空格时不算场外发言", () => {
    expect(isOutOfCharacterSpeech(" (不是严格开头)")).toBe(false);
  });

  it("空内容不算场外发言", () => {
    expect(isOutOfCharacterSpeech("")).toBe(false);
    expect(isOutOfCharacterSpeech(undefined)).toBe(false);
    expect(isOutOfCharacterSpeech(null)).toBe(false);
  });
});

describe("buildOutOfCharacterSpeechContent", () => {
  it("会为普通文本补上最外层全角括号", () => {
    expect(buildOutOfCharacterSpeechContent("这是一句场外发言")).toBe("（这是一句场外发言）");
  });

  it("会先去掉首尾空白再包裹", () => {
    expect(buildOutOfCharacterSpeechContent("  这是一句场外发言  ")).toBe("（这是一句场外发言）");
  });

  it("已有括号时仍会补上最外层全角括号", () => {
    expect(buildOutOfCharacterSpeechContent("(场外发言)")).toBe("（(场外发言)）");
    expect(buildOutOfCharacterSpeechContent("（场外发言）")).toBe("（（场外发言））");
  });

  it("空白内容不生成场外发言", () => {
    expect(buildOutOfCharacterSpeechContent("")).toBeNull();
    expect(buildOutOfCharacterSpeechContent("   ")).toBeNull();
    expect(buildOutOfCharacterSpeechContent(undefined)).toBeNull();
    expect(buildOutOfCharacterSpeechContent(null)).toBeNull();
  });
});
