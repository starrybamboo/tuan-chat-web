import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";
import type { RoleAvatarCreateRequest } from "@tuanchat/openapi-client/models/RoleAvatarCreateRequest";
import type { RoleCreateRequest } from "@tuanchat/openapi-client/models/RoleCreateRequest";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  applyGululuLiveImportPlan,
  buildGululuImportedSpriteTransform,
  buildGululuLiveImportPlan,
  ensureRoomInSidebarTree,
  parseLiveImportArgs,
  runGululuAuthoringLiveImport,
} from "./gululu-authoring-live-import";

type ApiSuccess<T = undefined> = T extends undefined
  ? { success: true }
  : { data: T; success: true };

type MockFn = (...args: any[]) => any;

function createImportPackage() {
  return {
    messages: [
      {
        content: "用消力化解！",
        floor: 1,
        imagePath: "gululu/retsu.png",
        kind: "dialog" as const,
        roleName: "烈海王",
        sourceTime: "2022-01-22 20:38",
        speakerName: "烈",
      },
      {
        content: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避",
        floor: 1,
        kind: "dice" as const,
      },
      {
        content: "那么烈啊，你要去往何处呢【1d13:9】",
        floor: 1,
        kind: "dice" as const,
        options: [
          "1 博丽神社",
          "2 红魔馆（是红海皇！）",
        ],
        rollText: "那么烈啊，你要去往何处呢【1d13：】",
      },
      {
        content: "【1d20:18+80=98】",
        floor: 1,
        kind: "dice" as const,
        rollText: "【1d20+80：】",
      },
      {
        bgmName: "远野幻想物语",
        content: "BGM：远野幻想物语",
        floor: 1,
        kind: "bgm" as const,
      },
    ],
    roles: [
      {
        aliases: [{ count: 1, name: "烈" }],
        avatarImages: [{ count: 1, firstFloor: 1, imagePath: "gululu/retsu.png" }],
        defaultAvatarPath: "gululu/retsu.png",
        name: "烈海王",
      },
    ],
    source: {
      floorCount: 1,
      fromFloor: 1,
      title: "烈海王似乎打算在幻想乡挑战强者们的样子",
      toFloor: 1,
    },
  };
}

async function writeNamedAvatarManifest(params: {
  assetKind?: string;
  items: Array<{
    displayName?: string;
    file: string;
    sourceRelPaths?: string[];
    usageKey?: string;
  }>;
  namedRoot: string;
  role: string;
}) {
  const assetKind = params.assetKind ?? "character-avatar-bust";
  const dir = path.join(params.namedRoot, params.role, assetKind);
  await mkdir(dir, { recursive: true });
  for (const item of params.items) {
    await writeFile(path.join(dir, item.file), "fixture", "utf8");
  }
  await writeFile(path.join(dir, "avatar-manifest.json"), `${JSON.stringify({
    assetKind,
    count: params.items.length,
    items: params.items.map((item, index) => ({
      displayName: item.displayName,
      file: item.file,
      members: (item.sourceRelPaths ?? []).map((sourceRelPath, memberIndex) => ({
        id: `I${String(index + 1).padStart(3, "0")}-${memberIndex + 1}`,
        sourceCandidates: [{ copied: true, file: `KEEP_SOURCE_${memberIndex + 1}.png`, sourceRelPath }],
        sourceRelPath,
      })),
      representativeSourceRelPath: item.sourceRelPaths?.[0] ?? "",
      usageKey: item.usageKey,
    })),
    role: params.role,
  }, null, 2)}\n`, "utf8");
}

async function writeCleanIndex(params: {
  cleanRoot: string;
  rows: Array<{
    aggregatedSourceRelPaths?: string[];
    assetKind: string;
    character: string;
    outputRelPath: string;
    sourceRelPath: string;
  }>;
}) {
  const columns = [
    "sourceRelPath",
    "outputRelPath",
    "sha256",
    "visualGroupId",
    "assetKind",
    "renderUse",
    "character",
    "locationName",
    "decisionStatus",
    "visualStatus",
    "confidence",
    "mattingAllowed",
    "needsMatting",
    "mattingStatus",
    "normalizedFromAssetKind",
    "normalizationReason",
    "aggregatedSourceCount",
    "aggregatedSourceRelPaths",
    "materializedAs",
    "transparentRelPath",
    "alphaMaskRelPath",
    "evidenceSummary",
    "notes",
  ];
  await mkdir(params.cleanRoot, { recursive: true });
  await writeFile(path.join(params.cleanRoot, "index.csv"), [
    columns.join(","),
    ...params.rows.map((row, index) => [
      row.sourceRelPath,
      row.outputRelPath,
      `sha-${index + 1}`,
      `visual-${index + 1}`,
      row.assetKind,
      row.assetKind.includes("sprite") ? "stage" : "chat-avatar",
      row.character,
      "",
      "ai-confirmed",
      "ai-confirmed",
      "0.99",
      "false",
      "false",
      "not-needed",
      "",
      "",
      String(row.aggregatedSourceRelPaths?.length ?? 1),
      (row.aggregatedSourceRelPaths ?? [row.sourceRelPath]).join("|"),
      "source-copy",
      "",
      "",
      "fixture",
      "",
    ].join(",")),
  ].join("\n"), "utf8");
  for (const row of params.rows) {
    const filePath = path.join(params.cleanRoot, row.outputRelPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "fixture", "utf8");
  }
}

describe("gululu-authoring-live-import", () => {
  it("解析 live import CLI 参数", () => {
    const args = parseLiveImportArgs([
      "--apply",
      "--skip-avatar-upload",
      "--skip-named-avatars",
      "--resume-existing-avatars",
      "--input",
      "import.json",
      "--named-avatar-root",
      "named-avatars",
      "--room-name",
      "安科文 GAL 导入",
      "--target-room-id",
      "62",
      "--target-space-id",
      "88",
      "--dicer-role-id",
      "2",
      "--dicer-avatar-id",
      "3",
      "--base-url",
      "http://localhost:8081",
      "--auth-token",
      "token",
    ]);

    expect(args).toMatchObject({
      apply: true,
      authToken: "token",
      baseUrl: "http://localhost:8081",
      dicerAvatarId: 3,
      dicerRoleId: 2,
      input: "import.json",
      namedAvatarRoot: "named-avatars",
      roomName: "安科文 GAL 导入",
      resumeExistingAvatars: true,
      skipNamedAvatars: true,
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 88,
    });
  });

  it("会生成复用通用原语的真实导入计划", () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      opusId: 88,
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 8801,
    });

    expect(plan.source).toMatchObject({
      key: "opus-88:floors:1-1",
      workId: "opus-88",
    });
    expect(plan.roles).toEqual([
      expect.objectContaining({
        createRoleRequest: expect.objectContaining({
          roleName: "烈海王",
          spaceId: 8801,
          type: 2,
        }),
        key: "role:烈海王",
      }),
    ]);
    expect(plan.avatars).toEqual([
      expect.objectContaining({
        avatarTitle: { label: "原文配图" },
        imagePath: "gululu/retsu.png",
        key: "role:烈海王:image:gululu/retsu.png",
        sourceImagePaths: ["gululu/retsu.png"],
        upload: false,
      }),
    ]);

    const dialog = plan.messages[0]!;
    expect(dialog).toMatchObject({
      avatarKey: "role:烈海王:image:gululu/retsu.png",
      kind: "dialog",
      roleKey: "role:烈海王",
      request: {
        content: "用消力化解！",
        customRoleName: "烈",
        messageType: MESSAGE_TYPE.TEXT,
        roomId: 62,
      },
    });

    const descriptionOnlyDice = plan.messages[1]!;
    expect(descriptionOnlyDice.request).toMatchObject({
      content: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避",
      customRoleName: "骰娘",
      messageType: MESSAGE_TYPE.TEXT,
      roleId: -1,
    });

    const dice = plan.messages[2]!;
    expect(dice.request).toMatchObject({
      content: "那么烈啊，你要去往何处呢【1d13：】\n1 博丽神社\n2 红魔馆（是红海皇！）",
      customRoleName: "骰娘",
      extra: {
        diceResult: { result: "那么烈啊，你要去往何处呢【1d13:9】" },
        diceTurn: {
          command: "那么烈啊，你要去往何处呢【1d13：】\n1 博丽神社\n2 红魔馆（是红海皇！）",
          replies: [{ content: "那么烈啊，你要去往何处呢【1d13:9】", customRoleName: "骰娘" }],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
    });

    const bareDice = plan.messages[3]!;
    expect(bareDice.request).toMatchObject({
      content: "【1d20+80：】",
      customRoleName: "骰娘",
      extra: {
        diceResult: { result: "【1d20:18+80=98】" },
        diceTurn: {
          command: "【1d20+80：】",
          replies: [{ content: "【1d20:18+80=98】", customRoleName: "骰娘" }],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
    });

    expect(plan.messages[4]!.request).toMatchObject({
      content: "[BGM] 远野幻想物语",
      customRoleName: "BGM",
      messageType: MESSAGE_TYPE.TEXT,
    });
    expect(plan.warnings).toEqual(["BGM 暂以文本事件保留：远野幻想物语"]);
  });

  it("会把角色卡事件写成独立角色卡文本消息", () => {
    const importPackage = createImportPackage();
    importPackage.messages.push({
      content: "烈海王；Atk 144；Hp 13；技能：消力、四千年传承",
      floor: 1,
      kind: "role_card" as const,
    });

    const plan = buildGululuLiveImportPlan(importPackage, {
      skipAvatarUpload: true,
      sourceKey: "opus-88:floors:1-1",
      targetRoomId: 62,
      targetSpaceId: 8801,
    });

    expect(plan.messages.at(-1)).toMatchObject({
      kind: "role_card",
      request: {
        content: "烈海王；Atk 144；Hp 13；技能：消力、四千年传承",
        customRoleName: "角色卡",
        messageType: MESSAGE_TYPE.TEXT,
        roleId: -1,
      },
    });
  });

  it("会从最终 named-avatars manifest 导入语义头像并把原图对白映射到语义头像", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "gululu-live-import-named-"));
    try {
      const namedRoot = path.join(tempDir, "image-role-review-clean-vision-final", "named-avatars");
      const cleanRoot = path.dirname(namedRoot);
      await writeNamedAvatarManifest({
        items: [
          {
            displayName: "严肃睁眼",
            file: "neutral_three_quarter_open_front_closed_focused__v001.png",
            sourceRelPaths: ["gululu/retsu.png", "gululu/retsu-duplicate.png"],
            usageKey: "neutral_three_quarter_open_front_closed_focused",
          },
          {
            displayName: "闭眼微笑",
            file: "happy_three_quarter_closed_front_smile__v001.png",
            sourceRelPaths: ["gululu/retsu-smile.png"],
            usageKey: "happy_three_quarter_closed_front_smile",
          },
        ],
        namedRoot,
        role: "烈海王",
      });
      await writeNamedAvatarManifest({
        items: [{
          displayName: "平静",
          file: "calm_front_open_front_closed__v001.png",
          usageKey: "calm_front_open_front_closed",
        }],
        namedRoot,
        role: "八意永琳",
      });
      await writeCleanIndex({
        cleanRoot,
        rows: [{
          aggregatedSourceRelPaths: ["gululu/retsu-stage.png", "gululu/retsu-stage-duplicate.png"],
          assetKind: "character-sprite",
          character: "烈",
          outputRelPath: "role-sprites/烈海王/retsu-stage__v001.png",
          sourceRelPath: "gululu/retsu-stage.png",
        }],
      });
      await mkdir(path.join(tempDir, "gululu"), { recursive: true });
      await writeFile(path.join(tempDir, "gululu", "retsu-raw.png"), "fixture", "utf8");

      const importPackage = createImportPackage();
      importPackage.messages.push({
        content: "这张原文图不在 named manifest，但 final index 有处理后资源",
        floor: 2,
        imagePath: "gululu/retsu-stage.png",
        kind: "dialog" as const,
        roleName: "烈海王",
        speakerName: "烈",
      });
      importPackage.messages.push({
        content: "这张原文图不在 final index 时也不能退回默认头像",
        floor: 3,
        imagePath: "gululu/retsu-raw.png",
        kind: "dialog" as const,
        roleName: "烈海王",
        speakerName: "烈",
      });

      const plan = buildGululuLiveImportPlan(importPackage, {
        namedAvatarRoot: namedRoot,
        skipAvatarUpload: false,
        sourceRoot: tempDir,
        targetRoomId: 62,
        targetSpaceId: 8801,
      });

      expect(plan.roles.map(role => role.name)).toEqual(expect.arrayContaining(["八意永琳", "烈海王"]));
      expect(plan.avatars).toEqual(expect.arrayContaining([
        expect.objectContaining({
          avatarTitle: { label: "严肃睁眼" },
          displayName: "严肃睁眼",
          fileName: "neutral_three_quarter_open_front_closed_focused__v001.png",
          imagePath: "image-role-review-clean-vision-final/named-avatars/烈海王/character-avatar-bust/neutral_three_quarter_open_front_closed_focused__v001.png",
          key: "role:烈海王:image:image-role-review-clean-vision-final/named-avatars/烈海王/character-avatar-bust/neutral_three_quarter_open_front_closed_focused__v001.png",
          sourceImagePaths: ["gululu/retsu.png", "gululu/retsu-duplicate.png"],
          upload: true,
          usageKey: "neutral_three_quarter_open_front_closed_focused",
        }),
        expect.objectContaining({
          assetKind: "character-sprite",
          avatarTitle: { label: "立绘：retsu-stage__v001" },
          bindingImagePath: "image-role-review-clean-vision-final/role-sprites/烈海王/retsu-stage__v001.png",
          fileName: "retsu-stage__v001.png",
          filePath: expect.stringContaining("retsu-stage__v001.png"),
          imagePath: "image-role-review-clean-vision-final/role-sprites/烈海王/retsu-stage__v001.png",
          key: "role:烈海王:image:image-role-review-clean-vision-final/role-sprites/烈海王/retsu-stage__v001.png",
          originMediaKind: "sprite",
          sourceImagePaths: ["gululu/retsu-stage.png", "gululu/retsu-stage-duplicate.png"],
          spriteFileName: "retsu-stage__v001.png",
          spriteImagePath: "image-role-review-clean-vision-final/role-sprites/烈海王/retsu-stage__v001.png",
          spriteSourceImagePaths: ["gululu/retsu-stage.png", "gululu/retsu-stage-duplicate.png"],
          upload: true,
        }),
        expect.objectContaining({
          imagePath: "gululu/retsu-raw.png",
          key: "role:烈海王:image:gululu/retsu-raw.png",
          sourceImagePaths: ["gululu/retsu-raw.png"],
          upload: true,
        }),
        expect.objectContaining({
          avatarTitle: { label: "平静" },
          key: "role:八意永琳:image:image-role-review-clean-vision-final/named-avatars/八意永琳/character-avatar-bust/calm_front_open_front_closed__v001.png",
        }),
      ]));
      expect(plan.avatars.some(avatar => avatar.imagePath === "gululu/retsu.png")).toBe(false);
      expect(plan.messages[0]).toMatchObject({
        avatarKey: "role:烈海王:image:image-role-review-clean-vision-final/named-avatars/烈海王/character-avatar-bust/neutral_three_quarter_open_front_closed_focused__v001.png",
        roleKey: "role:烈海王",
      });
      expect(plan.messages[5]).toMatchObject({
        avatarKey: "role:烈海王:image:image-role-review-clean-vision-final/role-sprites/烈海王/retsu-stage__v001.png",
        roleKey: "role:烈海王",
        source: { imagePath: "gululu/retsu-stage.png" },
      });
      expect(plan.messages[6]).toMatchObject({
        avatarKey: "role:烈海王:image:gululu/retsu-raw.png",
        roleKey: "role:烈海王",
        source: { imagePath: "gululu/retsu-raw.png" },
      });
    }
    finally {
      await rm(tempDir, { recursive: true });
    }
  });

  it("会把嵌套骰链写成同一条 diceTurn 的多条回复", () => {
    const plan = buildGululuLiveImportPlan({
      messages: [{
        content: "【1d10：9】",
        diceReplies: [
          "【1d10：10】",
          "10 大成功/大失败【1d2：2】",
          "【1d10：9】",
        ],
        floor: 53,
        kind: "dice",
        options: [
          "1 师匠，请指导我",
          "9 与铃仙交流",
          "10 大成功/大失败【1d2：】",
        ],
        rollText: "【1d10：】",
      }],
      roles: [],
      source: {
        floorCount: 1,
        fromFloor: 53,
        title: "烈海王似乎打算在幻想乡挑战强者们的样子",
        toFloor: 53,
      },
    }, {
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 8801,
    });

    expect(plan.messages).toHaveLength(1);
    expect(plan.messages[0]!.request).toMatchObject({
      content: "【1d10：】\n1 师匠，请指导我\n9 与铃仙交流\n10 大成功/大失败【1d2：】",
      extra: {
        diceResult: { result: "【1d10：10】\n10 大成功/大失败【1d2：2】\n【1d10：9】" },
        diceTurn: {
          command: "【1d10：】\n1 师匠，请指导我\n9 与铃仙交流\n10 大成功/大失败【1d2：】",
          replies: [
            { content: "【1d10：10】", customRoleName: "骰娘" },
            { content: "10 大成功/大失败【1d2：2】", customRoleName: "骰娘" },
            { content: "【1d10：9】", customRoleName: "骰娘" },
          ],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
    });
  });

  it("会按全身、头像和宽漫画头像计算不同默认 transform", () => {
    const fullBody = buildGululuImportedSpriteTransform({
      hasAlpha: true,
      height: 725,
      visibleBounds: { height: 706, width: 556, x: 12, y: 10 },
      width: 580,
    });
    const stageSprite = buildGululuImportedSpriteTransform({
      hasAlpha: true,
      height: 725,
      visibleBounds: { height: 706, width: 556, x: 12, y: 10 },
      width: 580,
    }, { renderKind: "stage-sprite" });
    const headBust = buildGululuImportedSpriteTransform({
      hasAlpha: true,
      height: 370,
      visibleBounds: { height: 370, width: 377, x: 17, y: 0 },
      width: 395,
    });
    const wideHeadBust = buildGululuImportedSpriteTransform({
      hasAlpha: true,
      height: 319,
      visibleBounds: { height: 319, width: 529, x: 0, y: 0 },
      width: 529,
    });
    const mangaAvatar = buildGululuImportedSpriteTransform({ hasAlpha: false, height: 253, width: 580 });

    expect(fullBody).toMatchObject({
      alpha: 1,
      positionX: 0,
      rotation: 0,
    });
    expect(fullBody).toEqual(stageSprite);
    expect(fullBody.scale!).toBeGreaterThan(1);
    expect(fullBody.positionY!).toBeGreaterThan(0);
    expect(fullBody.scale!).toBeGreaterThan(headBust.scale!);
    expect(fullBody.positionY!).toBeGreaterThan(headBust.positionY!);
    expect(headBust.positionY!).toBeGreaterThan(-100);
    expect(wideHeadBust.scale!).toBeGreaterThan(0.44);
    expect(mangaAvatar.scale!).toBeLessThanOrEqual(0.42);
    expect(mangaAvatar.positionY!).toBeGreaterThan(0);
  });

  it("dry-run 只写计划文件，不调用 live client", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "gululu-live-import-"));
    try {
      const inputPath = path.join(tempDir, "opus-88-floors-1-1.tuanchat-replay-import.json");
      const outputPath = path.join(tempDir, "plan.json");
      await writeFile(inputPath, `${JSON.stringify(createImportPackage(), null, 2)}\n`, "utf8");

      const result = await runGululuAuthoringLiveImport([
        "--input",
        inputPath,
        "--out",
        outputPath,
        "--target-room-id",
        "62",
        "--target-space-id",
        "8801",
        "--skip-avatar-upload",
        "--opus-id",
        "88",
      ]);

      const written = JSON.parse(await readFile(outputPath, "utf8"));
      expect(result.outputPath).toBe(path.resolve(outputPath));
      expect(result.result).toBeUndefined();
      expect(written.stats).toMatchObject({
        avatars: 1,
        messages: 5,
        roles: 1,
      });
    }
    finally {
      await rm(tempDir, { recursive: true });
    }
  });

  it("apply 会按角色、房间角色、头像、消息的通用 API 顺序执行", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      skipAvatarUpload: false,
      sourceRoot: "D:/fixture",
      targetRoomId: 62,
      targetSpaceId: 8801,
    });
    plan.avatars[0]!.filePath = "D:/fixture/images/gululu/retsu.png";
    plan.avatars[0]!.upload = true;
    const calls: string[] = [];
    const client = {
      avatarController: {
        setRoleAvatar: vi.fn<MockFn>(async (request) => {
          calls.push(`avatar.create:${request.roleId}`);
          return { data: 2001, success: true };
        }),
        updateRoleAvatar: vi.fn<MockFn>(async (request) => {
          calls.push(`avatar.update:${request.avatarId}:${request.avatarFileId ?? "no-media"}`);
          return { data: request, success: true };
        }),
      },
      chatController: {
        sendMessage1: vi.fn<MockFn>(async (request) => {
          calls.push(`message:${request.messageType}:${request.roleId ?? "none"}:${request.avatarId ?? "none"}`);
          return { data: { messageId: calls.length + 1000 }, success: true };
        }),
      },
      roleController: {
        createRole: vi.fn<MockFn>(async (request) => {
          calls.push(`role.create:${request.roleName}`);
          return { data: 1001, success: true };
        }),
      },
      roomRoleController: {
        addRole: vi.fn<MockFn>(async (request) => {
          calls.push(`roomRole.add:${request.roleIdList.join(",")}`);
          return { success: true };
        }),
        roomNpcRole: vi.fn<MockFn>(async () => {
          calls.push("roomRole.list");
          return { data: [], success: true };
        }),
      },
    };

    const result = await applyGululuLiveImportPlan(plan, client, {
      uploadAvatarImage: vi.fn<MockFn>(async ({ filePath }) => {
        calls.push(`media.upload:${filePath}`);
        return {
          mediaFileId: 3001,
          spriteTransform: {
            alpha: 1,
            positionX: 0,
            positionY: -180,
            rotation: 0,
            scale: 0.32,
          },
        };
      }),
    });

    expect(calls).toEqual([
      "roomRole.list",
      "role.create:烈海王",
      "roomRole.add:1001",
      "avatar.create:1001",
      "media.upload:D:/fixture/images/gululu/retsu.png",
      "avatar.update:2001:3001",
      "message:1:1001:2001",
      "message:1:-1:-1",
      "message:6:-1:-1",
      "message:6:-1:-1",
      "message:1:-1:-1",
    ]);
    expect(result.roles).toEqual([{ action: "created", key: "role:烈海王", roleId: 1001 }]);
    expect(result.avatars[0]).toMatchObject({
      avatarId: 2001,
      avatarFileId: 3001,
      mediaFileId: 3001,
      originFileId: 3001,
      spriteFileId: 3001,
      spriteTransform: {
        positionY: -180,
        scale: 0.32,
      },
    });
    const updateRequest = client.avatarController.updateRoleAvatar.mock.calls[0]![0];
    expect(updateRequest).toMatchObject({
      avatarFileId: 3001,
      originFileId: 3001,
      spriteFileId: 3001,
      spriteTransform: {
        positionY: -180,
        scale: 0.32,
      },
    });
    expect(client.chatController.sendMessage1).toHaveBeenCalledTimes(5);
    expect(client.chatController.sendMessage1.mock.calls[2]![0]).toMatchObject({
      content: "那么烈啊，你要去往何处呢【1d13：】\n1 博丽神社\n2 红魔馆（是红海皇！）",
      extra: {
        diceTurn: {
          command: "那么烈啊，你要去往何处呢【1d13：】\n1 博丽神社\n2 红魔馆（是红海皇！）",
          replies: [{ content: "那么烈啊，你要去往何处呢【1d13:9】", customRoleName: "骰娘" }],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
    });
    expect(client.chatController.sendMessage1.mock.calls[3]![0]).toMatchObject({
      content: "【1d20+80：】",
      extra: {
        diceTurn: {
          command: "【1d20+80：】",
          replies: [{ content: "【1d20:18+80=98】", customRoleName: "骰娘" }],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
    });
  });

  it("apply 会把立绘媒体同时写入头像字段和立绘字段，并使用立绘 transform", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      skipAvatarUpload: false,
      sourceRoot: "D:/fixture",
      targetRoomId: 62,
      targetSpaceId: 8801,
    });
    plan.avatars[0]!.filePath = "D:/fixture/role-sprites/retsu-stage.png";
    plan.avatars[0]!.spriteFilePath = "D:/fixture/role-sprites/retsu-stage.png";
    plan.avatars[0]!.spriteImagePath = "image-role-review-clean-vision-final/role-sprites/烈海王/retsu-stage.png";
    plan.avatars[0]!.originMediaKind = "sprite";
    plan.avatars[0]!.upload = true;

    const client = {
      avatarController: {
        setRoleAvatar: vi.fn<MockFn>(async () => ({ data: 2001, success: true })),
        updateRoleAvatar: vi.fn<MockFn>(async request => ({ data: request, success: true })),
      },
      chatController: {
        sendMessage1: vi.fn<MockFn>(async () => ({ data: { messageId: 1 }, success: true })),
      },
      roleController: {
        createRole: vi.fn<MockFn>(async () => ({ data: 1001, success: true })),
      },
      roomRoleController: {
        addRole: vi.fn<MockFn>(async () => ({ success: true })),
        roomNpcRole: vi.fn<MockFn>(async () => ({ data: [], success: true })),
      },
    };

    await applyGululuLiveImportPlan(plan, client, {
      uploadAvatarImage: vi.fn<MockFn>(async ({ filePath }) => ({
        mediaFileId: filePath.includes("role-sprites") ? 3002 : 3001,
        spriteTransform: filePath.includes("role-sprites")
          ? { alpha: 1, positionX: 0, positionY: -180, rotation: 0, scale: 0.32 }
          : { alpha: 1, positionX: 0, positionY: 20, rotation: 0, scale: 0.5 },
      })),
    });

    expect(client.avatarController.updateRoleAvatar.mock.calls[0]![0]).toMatchObject({
      avatarFileId: 3002,
      originFileId: 3002,
      spriteFileId: 3002,
      spriteTransform: {
        positionY: -180,
        scale: 0.32,
      },
    });
  });

  it("apply 可以先创建新房间再把导入消息写入真实 roomId", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      roomName: "安科文 1-62 楼 named avatar 导入",
      skipAvatarUpload: true,
      targetSpaceId: 8801,
    });
    expect(plan.messages.every(message => message.request.roomId === -1)).toBe(true);
    const calls: string[] = [];
    const client = {
      avatarController: {
        setRoleAvatar: vi.fn<(request: RoleAvatarCreateRequest) => Promise<ApiSuccess<number>>>(async request => {
          calls.push(`avatar.create:${request.roleId}`);
          return { data: 2001, success: true };
        }),
        updateRoleAvatar: vi.fn<(request: RoleAvatar) => Promise<ApiSuccess<RoleAvatar>>>(
          async request => ({ data: request, success: true }),
        ),
      },
      chatController: {
        sendMessage1: vi.fn<(request: ChatMessageRequest) => Promise<ApiSuccess<{ messageId: number }>>>(
          async request => {
            calls.push(`message.room:${request.roomId}`);
            return { data: { messageId: 3001 }, success: true };
          },
        ),
      },
      roleController: {
        createRole: vi.fn<(request: RoleCreateRequest) => Promise<ApiSuccess<number>>>(async request => {
          calls.push(`role.create:${request.roleName}`);
          return { data: 1001, success: true };
        }),
      },
      roomRoleController: {
        addRole: vi.fn<(request: { roleIdList: number[]; roomId: number; type?: number }) => Promise<ApiSuccess>>(
          async request => {
            calls.push(`roomRole.add:${request.roomId}:${request.roleIdList.join(",")}`);
            return { success: true };
          },
        ),
        roomNpcRole: vi.fn<(roomId: number) => Promise<ApiSuccess<never[]>>>(async roomId => {
          calls.push(`roomRole.list:${roomId}`);
          return { data: [], success: true };
        }),
      },
      spaceController: {
        createRoom: vi.fn<
          (request: { roomName?: string; spaceId: number; userIdList?: number[] }) => Promise<ApiSuccess<{
            name?: string;
            roomId: number;
            spaceId?: number;
          }>>
        >(async request => {
          calls.push(`room.create:${request.spaceId}:${request.roomName}`);
          return { data: { name: request.roomName, roomId: 7001, spaceId: request.spaceId }, success: true };
        }),
      },
    };

    const result = await applyGululuLiveImportPlan(plan, client);

    expect(result.room).toEqual({
      action: "created",
      name: "安科文 1-62 楼 named avatar 导入",
      roomId: 7001,
      spaceId: 8801,
    });
    expect(plan.target.roomId).toBe(7001);
    expect(calls).toEqual(expect.arrayContaining([
      "room.create:8801:安科文 1-62 楼 named avatar 导入",
      "roomRole.list:7001",
      "roomRole.add:7001:1001",
    ]));
    expect(client.chatController.sendMessage1).toHaveBeenCalledTimes(5);
    expect(client.chatController.sendMessage1.mock.calls.every(call => call[0].roomId === 7001)).toBe(true);
  });

  it("apply 会复用同名 NPC 角色并避免重复拉入房间", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 8801,
    });
    const client = {
      avatarController: {
        setRoleAvatar: vi.fn<MockFn>(async (_request: unknown) => ({ data: 2001, success: true })),
        updateRoleAvatar: vi.fn<MockFn>(async request => ({ data: request, success: true })),
      },
      chatController: {
        sendMessage1: vi.fn<MockFn>(async (_request: unknown) => ({ data: { messageId: 1 }, success: true })),
      },
      roleController: {
        createRole: vi.fn<MockFn>(async (_request: unknown) => ({ data: 0, success: true })),
      },
      roomRoleController: {
        addRole: vi.fn<MockFn>(async (_request: unknown) => ({ success: true })),
        roomNpcRole: vi.fn<MockFn>(async () => ({
          data: [{ roleId: 1001, roleName: "烈海王", type: 2, userId: 7 }],
          success: true,
        })),
      },
    };

    const result = await applyGululuLiveImportPlan(plan, client);

    expect(result.roles).toEqual([{ action: "reused", key: "role:烈海王", roleId: 1001 }]);
    expect(client.roleController.createRole).not.toHaveBeenCalled();
    expect(client.roomRoleController.addRole).not.toHaveBeenCalled();
    expect(client.chatController.sendMessage1.mock.calls[0]![0]).toMatchObject({
      avatarId: 2001,
      roleId: 1001,
    });
  });

  it("ensureRoomInSidebarTree 会把导入房间追加到频道分类", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 8801,
    });
    const setSidebarTree = vi.fn<MockFn>(async (request: { treeJson: string }) => ({
      data: { treeJson: request.treeJson, version: 8 },
      success: true,
    }));
    const client = {
      avatarController: {
        setRoleAvatar: vi.fn<MockFn>(),
        updateRoleAvatar: vi.fn<MockFn>(),
      },
      chatController: {
        sendMessage1: vi.fn<MockFn>(),
      },
      roleController: {
        createRole: vi.fn<MockFn>(),
      },
      roomController: {
        getUserRooms: vi.fn<MockFn>(async () => ({
          data: {
            rooms: [
              { name: "旧房间", roomId: 1 },
              { name: "1-62楼复刻导入", roomId: 62 },
            ],
            spaceId: 8801,
          },
          success: true,
        })),
      },
      roomRoleController: {
        addRole: vi.fn<MockFn>(),
        roomNpcRole: vi.fn<MockFn>(),
      },
      spaceSidebarTreeController: {
        getSidebarTree: vi.fn<MockFn>(async () => ({
          data: {
            treeJson: JSON.stringify({
              categories: [{
                categoryId: "cat:channels",
                items: [{ fallbackTitle: "旧房间", nodeId: "room:1", targetId: 1, type: "room" }],
                name: "频道",
              }],
              schemaVersion: 2,
            }),
            version: 7,
          },
          success: true,
        })),
        setSidebarTree,
      },
    };

    const result = await ensureRoomInSidebarTree(plan, client);

    expect(result).toEqual({
      action: "added",
      roomId: 62,
      spaceId: 8801,
      version: 8,
    });
    expect(setSidebarTree).toHaveBeenCalledWith(expect.objectContaining({
      expectedVersion: 7,
      spaceId: 8801,
    }));
    const writtenTree = JSON.parse(setSidebarTree.mock.calls[0]![0].treeJson);
    expect(writtenTree.categories[0].items).toEqual([
      { fallbackTitle: "旧房间", nodeId: "room:1", targetId: 1, type: "room" },
      { fallbackTitle: "1-62楼复刻导入", nodeId: "room:62", targetId: 62, type: "room" },
    ]);
  });

  it("ensureRoomInSidebarTree 已存在导入房间时不会重复写侧边栏", async () => {
    const plan = buildGululuLiveImportPlan(createImportPackage(), {
      skipAvatarUpload: true,
      targetRoomId: 62,
      targetSpaceId: 8801,
    });
    const client = {
      avatarController: {
        setRoleAvatar: vi.fn<MockFn>(),
        updateRoleAvatar: vi.fn<MockFn>(),
      },
      chatController: {
        sendMessage1: vi.fn<MockFn>(),
      },
      roleController: {
        createRole: vi.fn<MockFn>(),
      },
      roomRoleController: {
        addRole: vi.fn<MockFn>(),
        roomNpcRole: vi.fn<MockFn>(),
      },
      spaceSidebarTreeController: {
        getSidebarTree: vi.fn<MockFn>(async () => ({
          data: {
            treeJson: JSON.stringify({
              categories: [{
                categoryId: "cat:channels",
                items: [{ fallbackTitle: "1-62楼复刻导入", nodeId: "room:62", targetId: 62, type: "room" }],
                name: "频道",
              }],
              schemaVersion: 2,
            }),
            version: 9,
          },
          success: true,
        })),
        setSidebarTree: vi.fn<MockFn>(),
      },
    };

    const result = await ensureRoomInSidebarTree(plan, client);

    expect(result).toEqual({
      action: "already-present",
      roomId: 62,
      spaceId: 8801,
      version: 9,
    });
    expect(client.spaceSidebarTreeController.setSidebarTree).not.toHaveBeenCalled();
  });
});
