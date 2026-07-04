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
    figureDefaultEnterDuration: 0,
    figureDefaultExitDuration: 300,
    figureDefaultEnterAnimation: "tuanchat/default-enter",
    figureDefaultExitAnimation: "tuanchat/default-exit",
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

  it("默认使用 0ms 入场与 300ms 出场配置", () => {
    expect(useRealtimeRenderStore.getState().gameConfig.figureDefaultEnterDuration).toBe(0);
    expect(useRealtimeRenderStore.getState().gameConfig.figureDefaultExitDuration).toBe(300);
    expect(useRealtimeRenderStore.getState().gameConfig.figureDefaultEnterAnimation).toBe("tuanchat/default-enter");
    expect(useRealtimeRenderStore.getState().gameConfig.figureDefaultExitAnimation).toBe("tuanchat/default-exit");
  });

  it("不再把运行态 URL 写入云端配置", () => {
    const snapshot = buildSnapshot(createGameConfig({
      originalStartupLogoFileId: 1004,
      originalStartupLogoUrl: "https://runtime.example/startup-original.webp",
      originalTitleImageFileId: 1002,
      originalTitleImageUrl: "https://runtime.example/title-original.webp",
      startupLogoFileId: 1003,
      startupLogoUrl: "https://runtime.example/startup.webp",
      titleImageFileId: 1001,
      titleImageUrl: "https://runtime.example/title.webp",
      typingSoundSeFileId: 2001,
      typingSoundSeMediaType: "audio",
      typingSoundSeUrl: "https://runtime.example/typing.webm",
    }));

    expect(snapshot).toMatchObject({
      originalStartupLogoFileId: 1004,
      originalTitleImageFileId: 1002,
      startupLogoFileId: 1003,
      titleImageFileId: 1001,
      typingSoundSeFileId: 2001,
      typingSoundSeMediaType: "audio",
    });
    expect(snapshot).not.toHaveProperty("originalStartupLogoUrl");
    expect(snapshot).not.toHaveProperty("originalTitleImageUrl");
    expect(snapshot).not.toHaveProperty("startupLogoUrl");
    expect(snapshot).not.toHaveProperty("titleImageUrl");
    expect(snapshot).not.toHaveProperty("typingSoundSeUrl");
  });
});
