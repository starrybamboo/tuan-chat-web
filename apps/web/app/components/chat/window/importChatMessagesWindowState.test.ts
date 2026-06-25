import { describe, expect, it } from "vitest";

import { getImportChatWindowReadiness, type ImportChatWindowReadinessInput } from "./importChatMessagesWindowState";

const baseInput: ImportChatWindowReadinessInput = {
  activeMessageCount: 1,
  hasRglParseError: false,
  importMode: "rgl",
  isImporting: false,
  isImportingRglAssets: false,
  missingSpeakerCount: 0,
  supportsRglImport: true,
};

describe("getImportChatWindowReadiness", () => {
  it("blocks message import while RGL assets are importing", () => {
    expect(getImportChatWindowReadiness({
      ...baseInput,
      activeMessageCount: 0,
      isImportingRglAssets: true,
    })).toEqual({
      blockedReason: "素材导入中，请等待完成",
      canImport: false,
    });
  });

  it("blocks duplicate message import while messages are importing", () => {
    expect(getImportChatWindowReadiness({
      ...baseInput,
      isImporting: true,
    })).toEqual({
      blockedReason: "正在导入消息",
      canImport: false,
    });
  });

  it("blocks RGL import when the entry has no resolver support", () => {
    expect(getImportChatWindowReadiness({
      ...baseInput,
      supportsRglImport: false,
    })).toEqual({
      blockedReason: "当前入口暂不支持 RGL 素材解析",
      canImport: false,
    });
  });

  it("blocks RGL import when parsing failed", () => {
    expect(getImportChatWindowReadiness({
      ...baseInput,
      hasRglParseError: true,
    })).toEqual({
      blockedReason: "请先修正 RGL 解析错误",
      canImport: false,
    });
  });

  it("blocks plain import when speakers are not mapped", () => {
    expect(getImportChatWindowReadiness({
      ...baseInput,
      importMode: "plain",
      missingSpeakerCount: 2,
    })).toEqual({
      blockedReason: "还有 2 个角色未匹配",
      canImport: false,
    });
  });

  it("allows ready RGL and plain imports", () => {
    expect(getImportChatWindowReadiness(baseInput)).toEqual({
      blockedReason: "已准备好导入",
      canImport: true,
    });

    expect(getImportChatWindowReadiness({
      ...baseInput,
      importMode: "plain",
    })).toEqual({
      blockedReason: "已准备好导入",
      canImport: true,
    });
  });
});
