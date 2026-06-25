import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  applyGululuAvatarTransformBackfillPlan,
  buildGululuAvatarTransformBackfillPlan,
  parseGululuAvatarTransformBackfillArgs,
  runGululuAvatarTransformBackfill,
} from "./gululu-avatar-transform-backfill";

const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGD4DwABBAEAeG4G3QAAAABJRU5ErkJggg==",
  "base64",
);

type MockFn = (...args: any[]) => any;

function createLiveResult(filePath: string) {
  return {
    plan: {
      avatars: [
        {
          filePath,
          imagePath: "gululu/retsu.png",
          key: "role:烈海王:image:gululu/retsu.png",
        },
      ],
      source: { key: "opus-88:floors:1-62" },
    },
    result: {
      avatars: [
        {
          avatarId: 18967,
          key: "role:烈海王:image:gululu/retsu.png",
          mediaFileId: 30558,
          roleId: 15241,
        },
      ],
    },
  };
}

describe("gululu-avatar-transform-backfill", () => {
  it("解析回填 CLI 参数", () => {
    const args = parseGululuAvatarTransformBackfillArgs([
      "--apply",
      "--input",
      "live.json",
      "--out",
      "out.json",
      "--source-root",
      "D:/opus",
      "--base-url",
      "http://127.0.0.1:8081",
      "--auth-token",
      "token",
    ]);

    expect(args).toMatchObject({
      apply: true,
      authToken: "token",
      baseUrl: "http://127.0.0.1:8081",
      input: "live.json",
      out: "out.json",
      sourceRoot: "D:/opus",
    });
  });

  it("从已有 live import 结果和本地图片尺寸生成 transform 回填计划", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "gululu-avatar-transform-"));
    try {
      const imagePath = path.join(tempDir, "retsu.png");
      await writeFile(imagePath, "fixture", "utf8");
      const plan = await buildGululuAvatarTransformBackfillPlan(createLiveResult(imagePath), {
        readImageMetadata: vi.fn<MockFn>(async () => ({ height: 250, width: 500 })),
      });

      expect(plan.stats).toEqual({ avatars: 1, skipped: 0 });
      expect(plan.entries[0]).toMatchObject({
        avatarId: 18967,
        filePath: imagePath,
        imagePath: "gululu/retsu.png",
        key: "role:烈海王:image:gululu/retsu.png",
        mediaFileId: 30558,
        roleId: 15241,
        spriteTransform: {
          alpha: 1,
          positionX: 0,
          rotation: 0,
        },
      });
      expect(plan.entries[0]!.spriteTransform.scale).toBeLessThanOrEqual(0.42);
      expect(plan.entries[0]!.spriteTransform.positionY).toBeGreaterThanOrEqual(0);
    }
    finally {
      await rm(tempDir, { recursive: true });
    }
  });

  it("优先按实际 mediaFileId 的图片尺寸生成 transform", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "gululu-avatar-transform-"));
    try {
      const imagePath = path.join(tempDir, "source-wide.png");
      await writeFile(imagePath, "fixture", "utf8");
      const readImageMetadata = vi.fn<MockFn>(async () => ({ hasAlpha: false, height: 239, width: 580 }));
      const readMediaImageMetadata = vi.fn<MockFn>(async () => ({ hasAlpha: false, height: 350, width: 503 }));

      const plan = await buildGululuAvatarTransformBackfillPlan(createLiveResult(imagePath), {
        readImageMetadata,
        readMediaImageMetadata,
      });

      expect(readMediaImageMetadata).toHaveBeenCalledWith(30558);
      expect(readImageMetadata).not.toHaveBeenCalled();
      expect(plan.entries[0]).toMatchObject({
        mediaFileId: 30558,
        metadataSource: "media-file",
        spriteTransform: {
          positionY: -10,
          scale: 0.389,
        },
      });
    }
    finally {
      await rm(tempDir, { recursive: true });
    }
  });

  it("apply 只更新已有头像 transform 并保留已有媒体字段", async () => {
    const plan = {
      entries: [{
        avatarId: 18967,
        filePath: "D:/opus/images/gululu/retsu.png",
        key: "role:烈海王:image:gululu/retsu.png",
        mediaFileId: 30558,
        roleId: 15241,
        spriteTransform: {
          alpha: 1,
          positionX: 0,
          positionY: -180,
          rotation: 0,
          scale: 0.32,
        },
      }],
      stats: { avatars: 1, skipped: 0 },
      warnings: [],
    };
    const client = {
      avatarController: {
        getRoleAvatar: vi.fn<MockFn>(async () => ({
          data: {
            avatarFileId: 30558,
            avatarId: 18967,
            avatarTitle: { label: "默认" },
            category: "gululu-replay",
            originFileId: 30558,
            roleId: 15241,
            spriteFileId: 30558,
          },
          success: true,
        })),
        updateRoleAvatar: vi.fn<MockFn>(async request => ({ data: request, success: true })),
      },
    };

    const result = await applyGululuAvatarTransformBackfillPlan(plan, client);

    expect(result.avatars).toEqual([
      expect.objectContaining({
        avatarId: 18967,
        spriteTransform: expect.objectContaining({ positionY: -180, scale: 0.32 }),
      }),
    ]);
    expect(client.avatarController.updateRoleAvatar).toHaveBeenCalledWith(expect.objectContaining({
      avatarFileId: 30558,
      avatarId: 18967,
      originFileId: 30558,
      roleId: 15241,
      spriteFileId: 30558,
      spriteTransform: expect.objectContaining({ positionY: -180, scale: 0.32 }),
    }));
  });

  it("dry-run 会把回填计划写入文件", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "gululu-avatar-transform-"));
    try {
      const imagePath = path.join(tempDir, "retsu.png");
      const inputPath = path.join(tempDir, "live.json");
      const outputPath = path.join(tempDir, "plan.json");
      await writeFile(imagePath, TEST_PNG);
      await writeFile(inputPath, `${JSON.stringify(createLiveResult(imagePath), null, 2)}\n`, "utf8");

      const result = await runGululuAvatarTransformBackfill([
        "--input",
        inputPath,
        "--out",
        outputPath,
      ]);

      const written = JSON.parse(await readFile(outputPath, "utf8"));
      expect(result.outputPath).toBe(path.resolve(outputPath));
      expect(written.stats).toMatchObject({ avatars: 1, skipped: 0 });
      expect(written.entries[0]).toMatchObject({ avatarId: 18967 });
    }
    finally {
      await rm(tempDir, { recursive: true });
    }
  });
});
