import { describe, expect, it } from "vitest";

import type { RealtimeWebgalGameConfig } from "./realtimeRenderStore";

import { buildRealtimeRenderCloudSettingsSnapshot, useRealtimeRenderStore } from "./realtimeRenderStore";

function createGameConfig(overrides: Partial<RealtimeWebgalGameConfig> = {}): RealtimeWebgalGameConfig {
  return {
    allowOpenFullSettings: true,
    baseTemplate: "tuanchat",
    coverFromRoomAvatarEnabled: true,
    defaultLanguage: "",
    description: "",
    enableAppreciation: true,
    gameIconFromRoomAvatarEnabled: true,
    gameNameFromRoomNameEnabled: true,
    originalStartupLogoUrl: "",
    originalTitleImageUrl: "",
    packageName: "",
    showPanicEnabled: false,
    speakerFocusEnabled: true,
    startupLogoFromRoomAvatarEnabled: false,
    startupLogoUrl: "",
    titleImageUrl: "",
    typingSoundEnabled: false,
    figureDefaultEnterDuration: 100,
    figureDefaultExitDuration: 100,
    typingSoundInterval: 1.5,
    typingSoundPunctuationPause: 100,
    typingSoundSeUrl: "",
    ...overrides,
  };
}

function buildSnapshot(gameConfig: RealtimeWebgalGameConfig) {
  return buildRealtimeRenderCloudSettingsSnapshot({
    autoFigureEnabled: true,
    gameConfig,
    roomContentAlertThreshold: 78,
    terrePortOverride: 3001,
    ttsApiUrl: "http://127.0.0.1:9000",
  });
}

describe("buildRealtimeRenderCloudSettingsSnapshot", () => {
  it("默认使用团剧共创 WebGAL 模板", () => {
    expect(useRealtimeRenderStore.getState().gameConfig.baseTemplate).toBe("tuanchat");
  });

  it("默认使用 100ms 立绘进出场配置", () => {
    expect(useRealtimeRenderStore.getState().gameConfig.figureDefaultEnterDuration).toBe(100);
    expect(useRealtimeRenderStore.getState().gameConfig.figureDefaultExitDuration).toBe(100);
  });

  it("同槽位存在 fileId 时不再把 legacy URL 写入云端配置", () => {
    const snapshot = buildSnapshot(createGameConfig({
      originalStartupLogoFileId: 1004,
      originalStartupLogoUrl: "https://legacy.example/startup-original.webp",
      originalTitleImageFileId: 1002,
      originalTitleImageUrl: "https://legacy.example/title-original.webp",
      startupLogoFileId: 1003,
      startupLogoUrl: "https://legacy.example/startup.webp",
      titleImageFileId: 1001,
      titleImageUrl: "https://legacy.example/title.webp",
      typingSoundSeFileId: 2001,
      typingSoundSeMediaType: "audio",
      typingSoundSeUrl: "https://legacy.example/typing.webm",
    }));

    expect(snapshot).toMatchObject({
      originalStartupLogoFileId: 1004,
      originalStartupLogoUrl: "",
      originalTitleImageFileId: 1002,
      originalTitleImageUrl: "",
      startupLogoFileId: 1003,
      startupLogoUrl: "",
      titleImageFileId: 1001,
      titleImageUrl: "",
      typingSoundSeFileId: 2001,
      typingSoundSeMediaType: "audio",
      typingSoundSeUrl: "",
    });
  });

  it("没有 fileId 的历史配置 URL 仍作为迁移兼容值保留", () => {
    const snapshot = buildSnapshot(createGameConfig({
      originalStartupLogoUrl: "https://legacy.example/startup-original.webp",
      originalTitleImageUrl: "https://legacy.example/title-original.webp",
      startupLogoUrl: "https://legacy.example/startup.webp",
      titleImageUrl: "https://legacy.example/title.webp",
      typingSoundSeUrl: "https://legacy.example/typing.webm",
    }));

    expect(snapshot).toMatchObject({
      originalStartupLogoUrl: "https://legacy.example/startup-original.webp",
      originalTitleImageUrl: "https://legacy.example/title-original.webp",
      startupLogoUrl: "https://legacy.example/startup.webp",
      titleImageUrl: "https://legacy.example/title.webp",
      typingSoundSeUrl: "https://legacy.example/typing.webm",
    });
  });
});
