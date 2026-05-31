import type { ChatMessageResponse, Room } from "../../api";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { avatarUrl, mediaFileUrl } from "@/utils/mediaUrl";

vi.mock("./realtimeRendererImageAssets", () => ({
  createSquarePngBlobFromUrl: vi.fn(async (_url: string, size: number) => {
    return new Blob([Uint8Array.of(size & 0xff, (size >> 8) & 0xff)], { type: "image/png" });
  }),
}));

import { getPublishTemplatePreset } from "./publishTemplatePresets";
import { renderWebgalPublishPackage } from "./publishRenderer";
import { createSquarePngBlobFromUrl } from "./realtimeRendererImageAssets";

type RenderedPackage = Awaited<ReturnType<typeof renderWebgalPublishPackage>>;

function room(roomId: number, name: string): Room {
  return {
    roomId,
    name,
    status: 0,
  };
}

function message(overrides: Partial<ChatMessageResponse["message"]>): ChatMessageResponse {
  return {
    message: {
      messageId: overrides.messageId ?? 1,
      syncId: overrides.syncId ?? overrides.messageId ?? 1,
      roomId: overrides.roomId ?? 10,
      userId: 1,
      roleId: overrides.roleId,
      content: overrides.content ?? "",
      status: overrides.status ?? 0,
      messageType: overrides.messageType ?? MESSAGE_TYPE.TEXT,
      position: overrides.position ?? overrides.messageId ?? 1,
      annotations: overrides.annotations,
      extra: overrides.extra,
      customRoleName: overrides.customRoleName,
      avatarId: overrides.avatarId,
      webgal: overrides.webgal,
    },
  };
}

function externalImage(url: string) {
  return {
    source: { kind: "external", url },
    background: false,
    width: 1280,
    height: 720,
    fileName: "image.webp",
  };
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

function getFile(files: RenderedPackage["files"], path: string) {
  const file = files.find(item => item.path === path);
  expect(file).toBeTruthy();
  return file!;
}

function getFileContent(files: RenderedPackage["files"], path: string): string {
  return getFile(files, path).content;
}

describe("renderWebgalPublishPackage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an index entry that boots the shared engine from start.txt", async () => {
    const pkg = await renderWebgalPublishPackage({
      spaceName: "测试空间",
      sharedEngineUrl: "https://cdn.example.com/engine/loader.js",
      rooms: [room(10, "序章")],
      messagesByRoomId: {
        10: [],
      },
    });

    const content = getFileContent(pkg.files, "index.html");
    expect(pkg.entrypoint).toBe("index.html");
    expect(content).toContain("https://cdn.example.com/engine/loader.js");
    expect(content).toContain("autoStart: true");
    expect(content).toContain("\"game/scene/start.txt\"");
  });

  it("includes the default runtime support files required by the shared engine", async () => {
    const pkg = await renderWebgalPublishPackage({
      rooms: [room(10, "序章")],
      messagesByRoomId: {
        10: [],
      },
    });

    const preset = getPublishTemplatePreset("none");
    expect(getFileContent(pkg.files, "game/userStyleSheet.css")).toBe("");
    expect(getFileContent(pkg.files, "game/animation/animationTable.json")).toBe("[]\n");
    expect(getFileContent(pkg.files, "game/template/template.json"))
      .toBe(ensureTrailingNewline(normalizeLineEndings(preset.templateJson)));
    expect(getFileContent(pkg.files, "game/template/UI/Title/title.scss"))
      .toBe(normalizeLineEndings(preset.titleScss));
    expect(getFileContent(pkg.files, "game/template/Stage/TextBox/textbox.scss"))
      .toBe(normalizeLineEndings(preset.textboxScss));
    expect(getFileContent(pkg.files, "game/template/Stage/Choose/choose.scss"))
      .toBe(normalizeLineEndings(preset.chooseScss));

    const animationTable = getFile(pkg.files, "game/animation/animationTable.json");
    const userStylesheet = getFile(pkg.files, "game/userStyleSheet.css");
    expect(animationTable.contentType).toBe("application/json; charset=utf-8");
    expect(userStylesheet.contentType).toBe("text/css; charset=utf-8");
  });

  it("uses the configured base template preset", async () => {
    const pkg = await renderWebgalPublishPackage({
      rooms: [room(10, "序章")],
      messagesByRoomId: {
        10: [],
      },
      gameConfig: {
        baseTemplate: "black",
      },
    });

    const preset = getPublishTemplatePreset("black");
    expect(getFileContent(pkg.files, "game/template/template.json"))
      .toBe(ensureTrailingNewline(normalizeLineEndings(preset.templateJson)));
    expect(getFileContent(pkg.files, "game/template/UI/Title/title.scss"))
      .toBe(normalizeLineEndings(preset.titleScss));
    expect(getFileContent(pkg.files, "game/template/Stage/TextBox/textbox.scss"))
      .toBe(normalizeLineEndings(preset.textboxScss));
    expect(getFileContent(pkg.files, "game/template/Stage/Choose/choose.scss")).toBe("");
  });

  it("renders config media as direct OSS URLs instead of packaging binary assets", async () => {
    const pkg = await renderWebgalPublishPackage({
      spaceName: "配置测试",
      rooms: [room(10, "序章")],
      messagesByRoomId: {
        10: [],
      },
      coverAvatarFileId: 3001,
      gameConfig: {
        coverFromRoomAvatarEnabled: true,
        titleImageFileId: 1001,
        startupLogoFileId: 1002,
        typingSoundEnabled: true,
        typingSoundSeFileId: 1003,
        typingSoundSeMediaType: "audio",
      },
    });

    const content = getFileContent(pkg.files, "game/config.txt");
    expect(content).toContain(`Title_img:${mediaFileUrl(1001, "image", "medium")};`);
    expect(content).toContain(`Game_Logo:${mediaFileUrl(1002, "image", "medium")};`);
    expect(content).toContain(`TypingSoundSe:${mediaFileUrl(1003, "audio", "low")};`);
    expect(pkg.files.some(file => /1001|1002|1003/.test(file.path))).toBe(false);
  });

  it("syncs published game name from the space name when enabled", async () => {
    const pkg = await renderWebgalPublishPackage({
      spaceId: 42,
      spaceName: "测试空间",
      rooms: [room(10, "序章")],
      messagesByRoomId: {
        10: [],
      },
      gameConfig: {
        gameNameFromRoomNameEnabled: true,
      },
    });

    const configContent = getFileContent(pkg.files, "game/config.txt");
    const indexContent = getFileContent(pkg.files, "index.html");
    expect(configContent).toContain("Game_name:测试空间_42;");
    expect(indexContent).toContain("<title>测试空间_42</title>");
  });

  it("packages manifest and icon files when room avatar icons are enabled", async () => {
    const pkg = await renderWebgalPublishPackage({
      spaceId: 42,
      spaceName: "测试空间",
      rooms: [room(10, "序章")],
      messagesByRoomId: {
        10: [],
      },
      coverAvatarFileId: 3001,
      gameConfig: {
        description: "一段简介",
        gameIconFromRoomAvatarEnabled: true,
        gameNameFromRoomNameEnabled: true,
      },
    });

    expect(createSquarePngBlobFromUrl).toHaveBeenCalledTimes(3);
    expect(createSquarePngBlobFromUrl).toHaveBeenNthCalledWith(1, avatarUrl(3001), 180);
    expect(createSquarePngBlobFromUrl).toHaveBeenNthCalledWith(2, avatarUrl(3001), 192);
    expect(createSquarePngBlobFromUrl).toHaveBeenNthCalledWith(3, avatarUrl(3001), 512);

    const manifestContent = getFileContent(pkg.files, "manifest.json");
    expect(manifestContent).toContain("\"name\": \"测试空间_42\"");
    expect(manifestContent).toContain("\"description\": \"一段简介\"");
    expect(manifestContent).toContain("\"src\": \"./icons/icon-192-maskable.png\"");

    const indexContent = getFileContent(pkg.files, "index.html");
    expect(indexContent).toContain("rel=\"icon\"");
    expect(indexContent).toContain("rel=\"apple-touch-icon\"");
    expect(indexContent).toContain("rel=\"manifest\"");

    for (const path of [
      "icons/apple-touch-icon.png",
      "icons/icon-192.png",
      "icons/icon-192-maskable.png",
      "icons/icon-512.png",
      "icons/icon-512-maskable.png",
    ]) {
      const file = getFile(pkg.files, path);
      expect(file.contentType).toBe("image/png");
      expect(file.contentEncoding).toBe("base64");
      expect(file.content.length).toBeGreaterThan(0);
    }
  });

  it("renders a background image with the external media URL", async () => {
    const pkg = await renderWebgalPublishPackage({
      spaceName: "测试空间",
      rooms: [room(10, "序章")],
      messagesByRoomId: {
        10: [
          message({
            messageType: MESSAGE_TYPE.IMG,
            extra: {
              imageMessage: {
                ...externalImage("https://cdn.example.com/bg.webp"),
                background: true,
              },
            },
          }),
        ],
      },
    });

    const content = getFileContent(pkg.files, "game/scene/序章_10.txt");
    expect(content).toContain("changeBg:https://cdn.example.com/bg.webp -next;");
  });

  it("renders internal image messages with medium image URLs", async () => {
    const pkg = await renderWebgalPublishPackage({
      rooms: [room(10, "中景")],
      messagesByRoomId: {
        10: [
          message({
            messageType: MESSAGE_TYPE.IMG,
            annotations: [ANNOTATION_IDS.IMAGE_SHOW],
            extra: {
              imageMessage: {
                source: { kind: "internal", fileId: 2048 },
                background: false,
                width: 1280,
                height: 720,
                fileName: "figure.webp",
              },
            },
          }),
        ],
      },
    });

    const content = getFileContent(pkg.files, "game/scene/中景_10.txt");
    expect(content).toContain(mediaFileUrl(2048, "image", "medium"));
    expect(content).not.toContain(mediaFileUrl(2048, "image", "high"));
  });

  it("renders a shown image as a figure without packaging the media", async () => {
    const pkg = await renderWebgalPublishPackage({
      rooms: [room(10, "展示")],
      messagesByRoomId: {
        10: [
          message({
            messageType: MESSAGE_TYPE.IMG,
            annotations: [ANNOTATION_IDS.IMAGE_SHOW],
            extra: {
              imageMessage: externalImage("https://cdn.example.com/figure.webp"),
            },
          }),
        ],
      },
    });

    const content = getFileContent(pkg.files, "game/scene/展示_10.txt");
    expect(content).toContain("changeFigure:https://cdn.example.com/figure.webp -id=image_message");
    expect(pkg.files.some(file => file.path.includes("figure.webp"))).toBe(false);
  });

  it("renders BGM as a direct URL command", async () => {
    const pkg = await renderWebgalPublishPackage({
      rooms: [room(10, "音乐")],
      messagesByRoomId: {
        10: [
          message({
            messageType: MESSAGE_TYPE.SOUND,
            extra: {
              soundMessage: {
                source: { kind: "external", url: "https://cdn.example.com/bgm.webm" },
                second: 12,
                purpose: "bgm",
                volume: 70,
              },
            },
          }),
        ],
      },
    });

    const content = getFileContent(pkg.files, "game/scene/音乐_10.txt");
    expect(content).toContain("bgm:https://cdn.example.com/bgm.webm -volume=70 -next;");
  });

  it("renders text messages as dialogue and narrator lines", async () => {
    const pkg = await renderWebgalPublishPackage({
      rooms: [room(10, "对白")],
      roles: [{ userId: 1, roleId: 100, roleName: "明日香", type: 0 }],
      messagesByRoomId: {
        10: [
          message({
            messageId: 1,
            roleId: 100,
            content: "你好:欢迎;来到这里",
          }),
          message({
            messageId: 2,
            roleId: 0,
            content: "风声渐起",
          }),
        ],
      },
    });

    const content = getFileContent(pkg.files, "game/scene/对白_10.txt");
    expect(content).toContain("明日香: 你好：欢迎；来到这里;");
    expect(content).toContain(":风声渐起;");
  });

  it("renders workflow start and end scenes", async () => {
    const pkg = await renderWebgalPublishPackage({
      rooms: [room(10, "起点"), room(20, "分支")],
      workflowRoomMap: {
        start: ["10"],
        "10": ["20 成功"],
        endNodes: ["end:1"],
        "endNode:1": ["20"],
      },
      messagesByRoomId: {
        10: [],
        20: [],
      },
    });

    expect(getFileContent(pkg.files, "game/scene/start.txt")).toContain("changeScene:起点_10.txt;");
    expect(getFileContent(pkg.files, "game/scene/起点_10.txt")).toContain("changeScene:分支_20.txt;");
    expect(getFileContent(pkg.files, "game/scene/分支_20.txt")).toContain("changeScene:__tc_end_1.txt;");
    expect(getFileContent(pkg.files, "game/scene/__tc_end_1.txt")).toBe("end;\n");
  });
});
