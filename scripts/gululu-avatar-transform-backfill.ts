import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process, { env } from "node:process";
import { fileURLToPath } from "node:url";

import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";

import { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import {
  buildGululuImportedSpriteTransform,
  readGululuImportedSpriteImageMetadata,
  type GululuImportedSpriteImageMetadata,
} from "./gululu-authoring-live-import";

type ApiResult<T> = {
  data?: T;
  errMsg?: string;
  success?: boolean;
};

type SourceLiveResult = {
  plan?: {
    avatars?: Array<{
      filePath?: string;
      imagePath?: string;
      key?: string;
    }>;
    source?: Record<string, unknown>;
  };
  result?: {
    avatars?: Array<{
      avatarId?: number;
      key?: string;
      mediaFileId?: number;
      roleId?: number;
    }>;
  };
};

type ImageMetadata = GululuImportedSpriteImageMetadata;

type BackfillPlanEntry = {
  avatarId: number;
  filePath: string;
  imagePath?: string;
  key: string;
  mediaFileId?: number;
  roleId?: number;
  spriteTransform: NonNullable<RoleAvatar["spriteTransform"]>;
};

export type GululuAvatarTransformBackfillPlan = {
  entries: BackfillPlanEntry[];
  source?: Record<string, unknown>;
  stats: {
    avatars: number;
    skipped: number;
  };
  warnings: string[];
};

export type GululuAvatarTransformBackfillArgs = {
  apply?: boolean;
  authToken?: string;
  baseUrl?: string;
  input?: string;
  out?: string;
  sourceRoot?: string;
};

type GululuAvatarTransformBackfillClient = {
  avatarController: {
    getRoleAvatar: (avatarId: number) => Promise<ApiResult<RoleAvatar>>;
    updateRoleAvatar: (requestBody: RoleAvatar) => Promise<ApiResult<RoleAvatar>>;
  };
};

type BuildBackfillPlanOptions = {
  readImageMetadata?: (filePath: string) => Promise<ImageMetadata>;
  sourceRoot?: string;
};

export type GululuAvatarTransformBackfillApplyResult = {
  avatars: Array<{
    avatarId: number;
    key: string;
    spriteTransform: NonNullable<RoleAvatar["spriteTransform"]>;
  }>;
};

function readValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function parseGululuAvatarTransformBackfillArgs(argv: string[]): GululuAvatarTransformBackfillArgs {
  const args: GululuAvatarTransformBackfillArgs = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--apply") {
      args.apply = true;
    }
    else if (arg === "--input") {
      args.input = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--out") {
      args.out = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--source-root") {
      args.sourceRoot = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--base-url") {
      args.baseUrl = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--auth-token") {
      args.authToken = readValue(argv, index, arg);
      index++;
    }
  }
  return args;
}

function assertApiSuccess<T>(result: ApiResult<T>, fallback: string) {
  if (!result?.success) {
    throw new Error(result?.errMsg || fallback);
  }
  return result.data;
}

function assertApiData<T>(result: ApiResult<T>, fallback: string) {
  const data = assertApiSuccess(result, fallback);
  if (data == null) {
    throw new Error(fallback);
  }
  return data;
}

function normalizeImagePath(rawPath: string | undefined) {
  return rawPath?.trim().replace(/\\/g, "/").replace(/^\.\.\/images\//, "") || "";
}

function resolveAvatarFilePath(
  avatar: { filePath?: string; imagePath?: string },
  sourceRoot: string | undefined,
) {
  const filePath = avatar.filePath?.trim();
  if (filePath) {
    return path.resolve(filePath);
  }
  const imagePath = normalizeImagePath(avatar.imagePath);
  if (!sourceRoot || !imagePath) {
    return "";
  }
  return path.resolve(sourceRoot, "images", imagePath);
}

async function readLocalImageMetadata(filePath: string): Promise<ImageMetadata> {
  return readGululuImportedSpriteImageMetadata(filePath);
}

export async function buildGululuAvatarTransformBackfillPlan(
  liveResult: SourceLiveResult,
  options: BuildBackfillPlanOptions = {},
): Promise<GululuAvatarTransformBackfillPlan> {
  const warnings: string[] = [];
  const readImageMetadata = options.readImageMetadata ?? readLocalImageMetadata;
  const planAvatarsByKey = new Map((liveResult.plan?.avatars ?? [])
    .filter(avatar => avatar.key)
    .map(avatar => [avatar.key!, avatar]));
  const entries: BackfillPlanEntry[] = [];

  for (const avatar of liveResult.result?.avatars ?? []) {
    const key = avatar.key?.trim();
    if (!key || !Number.isInteger(avatar.avatarId) || avatar.avatarId! <= 0) {
      warnings.push(`跳过缺少 key/avatarId 的头像结果：${JSON.stringify(avatar)}`);
      continue;
    }

    const sourceAvatar = planAvatarsByKey.get(key);
    if (!sourceAvatar) {
      warnings.push(`跳过找不到源计划头像的结果：${key}`);
      continue;
    }

    const filePath = resolveAvatarFilePath(sourceAvatar, options.sourceRoot);
    if (!filePath) {
      warnings.push(`跳过缺少本地图片路径的头像：${key}`);
      continue;
    }
    if (!existsSync(filePath)) {
      warnings.push(`跳过本地图片不存在的头像：${key} -> ${filePath}`);
      continue;
    }

    const metadata = await readImageMetadata(filePath);
    entries.push({
      avatarId: avatar.avatarId!,
      filePath,
      ...(sourceAvatar.imagePath ? { imagePath: normalizeImagePath(sourceAvatar.imagePath) } : {}),
      key,
      ...(avatar.mediaFileId ? { mediaFileId: avatar.mediaFileId } : {}),
      ...(avatar.roleId ? { roleId: avatar.roleId } : {}),
      spriteTransform: buildGululuImportedSpriteTransform(metadata),
    });
  }

  return {
    entries,
    source: liveResult.plan?.source,
    stats: {
      avatars: entries.length,
      skipped: warnings.length,
    },
    warnings,
  };
}

export async function applyGululuAvatarTransformBackfillPlan(
  plan: GululuAvatarTransformBackfillPlan,
  client: GululuAvatarTransformBackfillClient,
): Promise<GululuAvatarTransformBackfillApplyResult> {
  const avatars: GululuAvatarTransformBackfillApplyResult["avatars"] = [];
  for (const entry of plan.entries) {
    const existing = assertApiData(
      await client.avatarController.getRoleAvatar(entry.avatarId),
      `读取头像失败：${entry.avatarId}`,
    );
    assertApiSuccess(
      await client.avatarController.updateRoleAvatar({
        ...existing,
        avatarId: entry.avatarId,
        spriteTransform: entry.spriteTransform,
      }),
      `更新头像 transform 失败：${entry.avatarId}`,
    );
    avatars.push({
      avatarId: entry.avatarId,
      key: entry.key,
      spriteTransform: entry.spriteTransform,
    });
  }
  return { avatars };
}

function buildDefaultOutPath(inputPath: string, apply: boolean | undefined) {
  const suffix = apply ? ".avatar-transform-backfill-result.json" : ".avatar-transform-backfill-plan.json";
  return inputPath.replace(/\.json$/i, suffix);
}

async function readJsonFile<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function createClient(args: GululuAvatarTransformBackfillArgs): GululuAvatarTransformBackfillClient {
  return new TuanChat({
    BASE: args.baseUrl ?? "http://127.0.0.1:8081",
    TOKEN: args.authToken || env.TUANCHAT_AUTH_TOKEN,
  }) as unknown as GululuAvatarTransformBackfillClient;
}

export async function runGululuAvatarTransformBackfill(argv: string[]) {
  const args = parseGululuAvatarTransformBackfillArgs(argv);
  if (!args.input) {
    throw new Error("--input is required");
  }
  const inputPath = path.resolve(args.input);
  const liveResult = await readJsonFile<SourceLiveResult>(inputPath);
  const plan = await buildGululuAvatarTransformBackfillPlan(liveResult, {
    sourceRoot: args.sourceRoot ? path.resolve(args.sourceRoot) : undefined,
  });
  const outputPath = path.resolve(args.out ?? buildDefaultOutPath(inputPath, args.apply));

  if (!args.apply) {
    await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    return { outputPath, plan };
  }

  const client = createClient(args);
  const result = await applyGululuAvatarTransformBackfillPlan(plan, client);
  await writeFile(outputPath, `${JSON.stringify({ plan, result }, null, 2)}\n`, "utf8");
  return { outputPath, plan, result };
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  runGululuAvatarTransformBackfill(process.argv.slice(2))
    .then(({ outputPath, plan, result }) => {
      process.stdout.write(`${JSON.stringify({
        applied: Boolean(result),
        outputPath,
        stats: plan.stats,
      }, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
