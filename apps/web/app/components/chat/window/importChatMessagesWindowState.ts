export type ImportChatWindowMode = "plain" | "rgl";

export type ImportChatWindowReadinessInput = {
  activeMessageCount: number;
  hasRglParseError: boolean;
  importMode: ImportChatWindowMode;
  isImporting: boolean;
  isImportingRglAssets: boolean;
  missingSpeakerCount: number;
  supportsRglImport: boolean;
};

export type ImportChatWindowReadiness = {
  blockedReason: string;
  canImport: boolean;
};

export function getImportChatWindowReadiness(input: ImportChatWindowReadinessInput): ImportChatWindowReadiness {
  if (input.isImportingRglAssets) {
    return {
      blockedReason: "素材导入中，请等待完成",
      canImport: false,
    };
  }

  if (input.isImporting) {
    return {
      blockedReason: "正在导入消息",
      canImport: false,
    };
  }

  if (input.activeMessageCount === 0) {
    return {
      blockedReason: "请先粘贴文本或上传 .txt/.rgl/.md 文件",
      canImport: false,
    };
  }

  if (input.importMode === "rgl" && !input.supportsRglImport) {
    return {
      blockedReason: "当前入口暂不支持 RGL 素材解析",
      canImport: false,
    };
  }

  if (input.importMode === "rgl" && input.hasRglParseError) {
    return {
      blockedReason: "请先修正 RGL 解析错误",
      canImport: false,
    };
  }

  if (input.importMode === "plain" && input.missingSpeakerCount > 0) {
    return {
      blockedReason: `还有 ${input.missingSpeakerCount} 个角色未匹配`,
      canImport: false,
    };
  }

  return {
    blockedReason: "已准备好导入",
    canImport: true,
  };
}
