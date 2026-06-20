import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it } from "vitest";

import {
  AuthoringPrimitiveError,
  buildStableInputHash,
  createInMemoryAuthoringPrimitives,
  normalizeAuthoringSource,
  stableStringify,
} from "./index";

describe("agent authoring primitives", () => {
  it("normalizes source metadata and builds stable input hashes", () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe("{\"a\":1,\"b\":2}");
    expect(buildStableInputHash({ b: 2, a: 1 })).toBe(buildStableInputHash({ a: 1, b: 2 }));
    expect(normalizeAuthoringSource({ kind: "gululu", workId: "88", segmentId: "1-62" })).toMatchObject({
      key: "gululu:88:1-62",
      kind: "gululu",
    });
  });

  it("returns structured errors for malformed batch requests", () => {
    const authoring = createInMemoryAuthoringPrimitives();

    expect(() => authoring.startBatch({
      source: { kind: "" },
      targetRoomId: 1,
    })).toThrow(AuthoringPrimitiveError);

    let caughtError: unknown;
    try {
      authoring.startBatch({ source: { kind: "" }, targetRoomId: 1 });
    }
    catch (error) {
      caughtError = error;
    }
    expect(caughtError).toMatchObject({
      code: "INVALID_REQUEST",
      details: { fieldName: "source.kind" },
    });
  });

  it("creates batches and rejects duplicate committed input unless forced", () => {
    const authoring = createInMemoryAuthoringPrimitives();
    const batch = authoring.startBatch({
      inputHash: "hash:demo",
      source: { key: "opus-88:1-62", kind: "gululu" },
      targetRoomId: 10,
    });

    expect(batch.status).toBe("pending");
    authoring.commitBatch(batch.batchId);

    expect(() => authoring.startBatch({
      inputHash: "hash:demo",
      source: { key: "opus-88:1-62", kind: "gululu" },
      targetRoomId: 10,
    })).toThrow(AuthoringPrimitiveError);

    const forced = authoring.startBatch({
      force: true,
      inputHash: "hash:demo",
      source: { key: "opus-88:1-62", kind: "gululu" },
      targetRoomId: 10,
    });
    expect(forced.batchId).not.toBe(batch.batchId);
  });

  it("executes typed command envelopes for CLI and API adapters", () => {
    const authoring = createInMemoryAuthoringPrimitives();
    const started = authoring.executeCommand({
      request: {
        inputHash: "hash:command",
        source: { key: "command:sample", kind: "manual" },
        targetRoomId: 21,
      },
      type: "batch.start",
    }) as { batch: { batchId: string; status: string } };
    const batchId = started.batch.batchId;
    expect(started.batch.status).toBe("pending");

    const roleResult = authoring.executeCommand({
      request: {
        batchId,
        normalizedName: "命令角色",
        sourceKey: "role:command",
      },
      type: "role.upsert",
    }) as { action: string; role: { roleId: number } };
    expect(roleResult.action).toBe("created");

    const avatarResult = authoring.executeCommand({
      request: {
        batchId,
        fileHash: "sha256:avatar-command",
        roleId: roleResult.role.roleId,
      },
      type: "avatar.upsert",
    }) as { action: string; avatar: { avatarId: number } };
    expect(avatarResult.action).toBe("created");

    const mediaResult = authoring.executeCommand({
      request: {
        batchId,
        purpose: "bgm",
        remoteUrl: "https://cdn.example.test/command.ogg",
      },
      type: "media.upsert",
    }) as { action: string; media: { mediaId: number } };
    expect(mediaResult.action).toBe("created");

    const unresolvedResult = authoring.executeCommand({
      request: {
        batchId,
        originalName: "待补音效",
        purpose: "se",
        reason: "missing source",
      },
      type: "media.unresolved",
    }) as { unresolvedMedia: { unresolvedMediaId: string } };
    expect(unresolvedResult.unresolvedMedia.unresolvedMediaId).toMatch(/^unresolved-/);

    const written = authoring.executeCommand({
      request: {
        batchId,
        messages: [{
          avatarId: avatarResult.avatar.avatarId,
          content: "通过通用命令写入",
          kind: "dialog",
          mediaId: mediaResult.media.mediaId,
          roleId: roleResult.role.roleId,
        }],
      },
      type: "message.batchWrite",
    }) as { messages: Array<{ content: string; messageType: number }> };
    expect(written.messages).toMatchObject([{ content: "通过通用命令写入" }]);

    const inspected = authoring.executeCommand({ batchId, type: "batch.inspect" }) as {
      report: { stats: { avatarsCreated: number; mediaCreated: number; messagesWritten: number; rolesCreated: number; unresolvedMedia: number } };
    };
    expect(inspected.report.stats).toMatchObject({
      avatarsCreated: 1,
      mediaCreated: 1,
      messagesWritten: 1,
      rolesCreated: 1,
      unresolvedMedia: 1,
    });

    const readiness = authoring.executeCommand({ batchId, type: "webgal.inspectReadiness" }) as {
      report: { exportable: boolean; messageCount: number };
    };
    expect(readiness.report).toMatchObject({
      exportable: false,
      messageCount: 1,
    });

    const committed = authoring.executeCommand({ batchId, type: "batch.commit" }) as { report: { batch: { status: string } } };
    expect(committed.report.batch.status).toBe("committed");

    const cleanupStarted = authoring.executeCommand({
      request: {
        source: { key: "command:cleanup", kind: "manual" },
        targetRoomId: 22,
      },
      type: "batch.start",
    }) as { batch: { batchId: string } };
    const cleaned = authoring.executeCommand({
      batchId: cleanupStarted.batch.batchId,
      type: "batch.cleanup",
    }) as { report: { batch: { status: string } } };
    expect(cleaned.report.batch.status).toBe("cleaned");
  });

  it("upserts roles, handles name collisions, and cleans draft-created roles", () => {
    const authoring = createInMemoryAuthoringPrimitives();
    const batch = authoring.startBatch({
      source: { key: "manual:roles", kind: "manual" },
      targetRoomId: 20,
    });

    const first = authoring.upsertRole({
      batchId: batch.batchId,
      normalizedName: "烈海王",
      sourceKey: "role:retsu",
    });
    const reused = authoring.upsertRole({
      batchId: batch.batchId,
      normalizedName: "烈海王",
      sourceKey: "role:retsu",
    });
    const collision = authoring.upsertRole({
      batchId: batch.batchId,
      displayName: "烈海王",
      normalizedName: "梦烈海王",
    });

    expect(first.action).toBe("created");
    expect(reused).toMatchObject({ action: "reused", roleId: first.roleId });
    expect(collision.displayName).toBe("烈海王(2)");

    const cleaned = authoring.cleanupBatch(batch.batchId);
    expect(cleaned.batch.status).toBe("cleaned");
    expect(authoring.snapshot().roles).toEqual([]);
  });

  it("upserts avatars, media, and unresolved media with batch resource accounting", () => {
    const authoring = createInMemoryAuthoringPrimitives();
    const batch = authoring.startBatch({
      source: { key: "opus-88:assets", kind: "gululu" },
      targetRoomId: 30,
    });
    const role = authoring.upsertRole({ batchId: batch.batchId, normalizedName: "八意永琳" });

    const avatar = authoring.upsertAvatar({
      batchId: batch.batchId,
      fileHash: "sha256:avatar",
      fileName: "eirin.png",
      roleId: role.roleId,
      sourceAssetKey: "images/eirin.png",
    });
    const avatarReuse = authoring.upsertAvatar({
      batchId: batch.batchId,
      fileHash: "sha256:avatar",
      roleId: role.roleId,
    });
    const media = authoring.upsertMedia({
      batchId: batch.batchId,
      fileHash: "sha256:bgm",
      fileName: "battle.ogg",
      purpose: "bgm",
      sourceKey: "bgm:battle",
    });
    const unresolved = authoring.recordUnresolvedMedia({
      batchId: batch.batchId,
      originalName: "未知BGM",
      purpose: "bgm",
      reason: "no local or remote candidate",
    });

    const report = authoring.inspectBatch(batch.batchId);
    expect(avatarReuse).toMatchObject({ action: "reused", avatarId: avatar.avatarId });
    expect(media).toMatchObject({ action: "created", purpose: "bgm" });
    expect(unresolved.unresolvedMediaId).toMatch(/^unresolved-/);
    expect(report.stats).toMatchObject({
      avatarsCreated: 1,
      avatarsReused: 1,
      mediaCreated: 1,
      rolesCreated: 1,
      unresolvedMedia: 1,
    });
  });

  it("writes dialog, narration, dice, and BGM messages with source metadata", () => {
    const authoring = createInMemoryAuthoringPrimitives();
    const batch = authoring.startBatch({
      source: { key: "opus-88:messages", kind: "gululu" },
      targetRoomId: 40,
    });
    const role = authoring.upsertRole({ batchId: batch.batchId, normalizedName: "丰聪耳神子" });
    const avatar = authoring.upsertAvatar({
      batchId: batch.batchId,
      fileHash: "sha256:miko",
      roleId: role.roleId,
    });
    const bgm = authoring.upsertMedia({
      batchId: batch.batchId,
      purpose: "bgm",
      remoteUrl: "https://cdn.example.com/bgm.ogg",
    });
    const unresolved = authoring.recordUnresolvedMedia({
      batchId: batch.batchId,
      originalName: "待补BGM",
      purpose: "bgm",
      reason: "not found",
    });

    const written = authoring.writeMessages({
      batchId: batch.batchId,
      messages: [
        {
          avatarId: avatar.avatarId,
          content: "烈，你捡了一条命呢",
          customRoleName: "神子",
          kind: "dialog",
          roleId: role.roleId,
          source: { eventIndex: 1, kind: "gululu", originalSpeaker: "神子", segmentId: "7" },
        },
        { content: "风声渐起", kind: "narration", source: { eventIndex: 2, kind: "gululu", segmentId: "7" } },
        {
          dice: {
            options: ["1 需要", "2 不需要"],
            result: "神子的急救【1d100:90】",
            rollText: "1d100",
          },
          kind: "dice",
          source: { eventIndex: 3, kind: "gululu", segmentId: "7" },
        },
        {
          dice: {
            description: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避",
          },
          kind: "dice",
          source: { eventIndex: 4, kind: "gululu", segmentId: "7" },
        },
        {
          kind: "bgm",
          mediaId: bgm.mediaId,
          source: { eventIndex: 5, kind: "gululu", originalMediaName: "battle", segmentId: "7" },
        },
        {
          kind: "bgm",
          source: { eventIndex: 6, kind: "gululu", originalMediaName: "待补BGM", segmentId: "7" },
          unresolvedMediaId: unresolved.unresolvedMediaId,
        },
      ],
    });

    expect(written.map(message => message.messageType)).toEqual([
      MESSAGE_TYPE.TEXT,
      MESSAGE_TYPE.TEXT,
      MESSAGE_TYPE.DICE,
      MESSAGE_TYPE.DICE,
      MESSAGE_TYPE.SOUND,
      MESSAGE_TYPE.TEXT,
    ]);
    expect(written[0]).toMatchObject({
      avatarId: avatar.avatarId,
      customRoleName: "神子",
      roleId: role.roleId,
    });
    expect(written[2]?.extra).toMatchObject({
      diceResult: { result: "神子的急救【1d100:90】" },
      authoredDice: { options: ["1 需要", "2 不需要"] },
    });
    expect(written[3]?.extra).toMatchObject({
      authoredDice: {
        description: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避",
      },
    });
    expect(written[3]?.extra).not.toHaveProperty("diceResult");
    expect(written[4]?.extra).toMatchObject({
      soundMessage: {
        purpose: "bgm",
        source: { fileId: bgm.mediaId, kind: "internal" },
      },
    });
    expect(written[5]?.extra).toMatchObject({
      authoredBgm: { unresolvedMediaId: unresolved.unresolvedMediaId },
    });
  });

  it("inspects committed batches and reports WebGAL readiness", () => {
    const authoring = createInMemoryAuthoringPrimitives();
    const batch = authoring.startBatch({
      source: { key: "opus-88:readiness", kind: "gululu" },
      targetRoomId: 50,
    });
    const role = authoring.upsertRole({ batchId: batch.batchId, normalizedName: "烈海王" });
    const unresolved = authoring.recordUnresolvedMedia({
      batchId: batch.batchId,
      originalName: "未知BGM",
      purpose: "bgm",
      reason: "not found",
    });

    authoring.writeMessages({
      batchId: batch.batchId,
      messages: [
        { content: "没有头像的对白", kind: "dialog", roleId: role.roleId },
        { kind: "bgm", unresolvedMediaId: unresolved.unresolvedMediaId },
      ],
    });

    const committed = authoring.commitBatch(batch.batchId);
    const readiness = authoring.inspectWebgalReadiness(batch.batchId);

    expect(committed.batch.status).toBe("committed");
    expect(committed.stats.messagesWritten).toBe(2);
    expect(readiness).toMatchObject({
      exportable: false,
      messageCount: 2,
      missingAvatarMessageIds: [1],
    });
    expect(readiness.unresolvedMedia[0]?.originalName).toBe("未知BGM");
  });

  it("runs a Gululu 1-62 style sample through generic authoring primitives", () => {
    const sample = {
      source: { kind: "gululu", key: "opus-88:floors:1-62", title: "烈海王似乎打算在幻想乡挑战强者们的样子" },
      stats: { bgm: 2, dialog: 2, dice: 1, messages: 6, narration: 1, unresolvedBgm: 1 },
    };
    const authoring = createInMemoryAuthoringPrimitives();
    const batch = authoring.startBatch({
      rawInput: sample,
      source: sample.source,
      targetRoomId: 62,
    });

    const retsu = authoring.upsertRole({
      batchId: batch.batchId,
      normalizedName: "烈海王",
      sourceKey: "role:retsu",
    });
    const miko = authoring.upsertRole({
      batchId: batch.batchId,
      normalizedName: "丰聪耳神子",
      sourceKey: "role:miko",
    });
    const retsuAvatar = authoring.upsertAvatar({
      batchId: batch.batchId,
      fileHash: "sha256:retsu",
      roleId: retsu.roleId,
      sourceAssetKey: "gululu/1001.png",
    });
    const mikoAvatar = authoring.upsertAvatar({
      batchId: batch.batchId,
      fileHash: "sha256:miko",
      roleId: miko.roleId,
      sourceAssetKey: "gululu/1002.png",
    });
    const resolvedBgm = authoring.upsertMedia({
      batchId: batch.batchId,
      fileHash: "sha256:bgm",
      fileName: "battle.ogg",
      purpose: "bgm",
      sourceKey: "bgm:battle",
    });
    const unresolvedBgm = authoring.recordUnresolvedMedia({
      batchId: batch.batchId,
      originalName: "原文待补BGM",
      purpose: "bgm",
      reason: "no candidate in manifest",
      source: { eventIndex: 5, kind: "gululu", originalMediaName: "原文待补BGM", segmentId: "62" },
    });

    authoring.writeMessages({
      batchId: batch.batchId,
      messages: [
        {
          avatarId: retsuAvatar.avatarId,
          content: "我会继续前进。",
          kind: "dialog",
          roleId: retsu.roleId,
          source: { eventIndex: 1, kind: "gululu", originalSpeaker: "烈", segmentId: "1" },
        },
        {
          avatarId: mikoAvatar.avatarId,
          content: "烈，你捡了一条命呢",
          customRoleName: "神子",
          kind: "dialog",
          roleId: miko.roleId,
          source: { eventIndex: 2, kind: "gululu", originalSpeaker: "神子", segmentId: "7" },
        },
        { content: "命运开始转动。", kind: "narration", source: { eventIndex: 3, kind: "gululu", segmentId: "7" } },
        {
          dice: {
            options: ["1 需要永琳", "2 不需要永琳"],
            result: "神子的急救【1d100:90】",
            rollText: "1d100",
          },
          kind: "dice",
          source: { eventIndex: 4, kind: "gululu", segmentId: "7" },
        },
        {
          kind: "bgm",
          mediaId: resolvedBgm.mediaId,
          source: { eventIndex: 5, kind: "gululu", originalMediaName: "battle", segmentId: "8" },
        },
        {
          kind: "bgm",
          source: { eventIndex: 6, kind: "gululu", originalMediaName: "原文待补BGM", segmentId: "62" },
          unresolvedMediaId: unresolvedBgm.unresolvedMediaId,
        },
      ],
    });

    const report = authoring.commitBatch(batch.batchId);
    const readiness = authoring.inspectWebgalReadiness(batch.batchId);

    expect(report.batch.source).toMatchObject(sample.source);
    expect(report.stats.messagesWritten).toBe(sample.stats.messages);
    expect(report.resources.roles).toHaveLength(2);
    expect(report.resources.avatars).toHaveLength(2);
    expect(report.resources.media).toHaveLength(1);
    expect(report.resources.unresolvedMedia).toHaveLength(sample.stats.unresolvedBgm);
    expect(readiness).toMatchObject({
      exportable: false,
      messageCount: 6,
      missingAvatarMessageIds: [],
    });
    expect(readiness.unresolvedMedia[0]).toMatchObject({
      originalName: "原文待补BGM",
      purpose: "bgm",
    });
  });
});
