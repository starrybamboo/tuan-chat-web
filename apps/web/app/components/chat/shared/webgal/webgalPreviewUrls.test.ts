import { describe, expect, it } from "vitest";

import { buildWebGALEditorUrl } from "./webgalPreviewUrls";

describe("webgalPreviewUrls", () => {
  it("将 WebGAL 运行页 URL 转成同 base 的 Terre 编辑器 hash 路由", () => {
    expect(buildWebGALEditorUrl({
      previewUrl: "http://localhost/games/realtime_10788/index.html",
      terreBaseUrl: "http://localhost:3001",
    })).toBe("http://localhost/#/game/realtime_10788");
  });

  it("转换房间 scene 预览 URL 时去掉 index.html 和查询参数", () => {
    expect(buildWebGALEditorUrl({
      previewUrl: "http://localhost:3001/games/realtime_10788/index.html?scene=room_12845.txt",
      terreBaseUrl: "http://localhost:3001",
    })).toBe("http://localhost:3001/#/game/realtime_10788");
  });

  it("保留 /terre 代理 base", () => {
    expect(buildWebGALEditorUrl({
      previewUrl: "https://www.tuan.chat/terre/games/realtime_10788/index.html",
      terreBaseUrl: "https://www.tuan.chat/terre",
    })).toBe("https://www.tuan.chat/terre/#/game/realtime_10788");
  });

  it("已是编辑器 hash 路由时保持为规范编辑器 URL", () => {
    expect(buildWebGALEditorUrl({
      previewUrl: "http://localhost/#/game/realtime_10788",
      terreBaseUrl: "http://localhost:3001",
    })).toBe("http://localhost/#/game/realtime_10788");
  });

  it("没有 previewUrl 时使用 fallback game name", () => {
    expect(buildWebGALEditorUrl({
      previewUrl: null,
      fallbackGameName: "realtime_10788",
      terreBaseUrl: "http://localhost/",
    })).toBe("http://localhost/#/game/realtime_10788");
  });
});
