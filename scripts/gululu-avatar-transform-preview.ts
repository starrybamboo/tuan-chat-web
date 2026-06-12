import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  buildGululuImportedSpriteTransform,
  readGululuImportedSpriteImageMetadata,
  type GululuImportedSpriteImageMetadata,
} from "./gululu-authoring-live-import";

type LiveImportPlanAvatar = {
  assetKind?: string;
  displayName?: string;
  fileName?: string;
  filePath?: string;
  imagePath?: string;
  roleKey?: string;
  usageKey?: string;
};

type LiveImportPlan = {
  avatars?: LiveImportPlanAvatar[];
};

type PreviewArgs = {
  assetKind?: string;
  input?: string;
  max: number;
  outDir?: string;
  roles?: string[];
};

const WEBGAL_STAGE_WIDTH = 2560;
const WEBGAL_STAGE_HEIGHT = 1440;
const TILE_SCALE = 0.25;
const TILE_WIDTH = Math.round(WEBGAL_STAGE_WIDTH * TILE_SCALE);
const TILE_HEIGHT = Math.round(WEBGAL_STAGE_HEIGHT * TILE_SCALE);
const LABEL_HEIGHT = 64;

function readValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv: string[]): PreviewArgs {
  const args: PreviewArgs = { max: 24 };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--input") {
      args.input = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--out-dir") {
      args.outDir = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--roles") {
      args.roles = readValue(argv, index, arg).split(",").map(role => role.trim()).filter(Boolean);
      index++;
    }
    else if (arg === "--asset-kind") {
      args.assetKind = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--max") {
      const max = Number(readValue(argv, index, arg));
      if (!Number.isInteger(max) || max <= 0) {
        throw new Error("--max must be a positive integer");
      }
      args.max = max;
      index++;
    }
  }
  return args;
}

function roleNameFromKey(roleKey: string | undefined) {
  return roleKey?.startsWith("role:") ? roleKey.slice("role:".length) : "";
}

function escapeXml(value: string | undefined) {
  return String(value ?? "").replace(/[&<>]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]!));
}

function visibleBoundsFromMetadata(metadata: GululuImportedSpriteImageMetadata) {
  return metadata.visibleBounds ?? {
    height: metadata.height ?? 0,
    width: metadata.width ?? 0,
    x: 0,
    y: 0,
  };
}

async function readPlan(inputPath: string) {
  return JSON.parse(await readFile(inputPath, "utf8")) as LiveImportPlan;
}

function selectPreviewAvatars(plan: LiveImportPlan, args: PreviewArgs) {
  const roleFilter = new Set(args.roles ?? []);
  const selected: LiveImportPlanAvatar[] = [];
  const seenRoles = new Set<string>();
  for (const avatar of plan.avatars ?? []) {
    const roleName = roleNameFromKey(avatar.roleKey);
    if (!roleName || seenRoles.has(roleName)) {
      continue;
    }
    if (roleFilter.size > 0 && !roleFilter.has(roleName)) {
      continue;
    }
    if (args.assetKind && avatar.assetKind !== args.assetKind) {
      continue;
    }
    if (!avatar.filePath || !existsSync(avatar.filePath)) {
      continue;
    }
    selected.push(avatar);
    seenRoles.add(roleName);
    if (selected.length >= args.max) {
      break;
    }
  }
  return selected;
}

function computeRenderMetrics(metadata: GululuImportedSpriteImageMetadata) {
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const visibleBounds = visibleBoundsFromMetadata(metadata);
  const transform = buildGululuImportedSpriteTransform(metadata);
  const containScale = width > 0 && height > 0
    ? Math.min(WEBGAL_STAGE_WIDTH / width, WEBGAL_STAGE_HEIGHT / height)
    : 1;
  const renderWidth = width * containScale * (transform.scale ?? 1);
  const renderHeight = height * containScale * (transform.scale ?? 1);
  return {
    containScale,
    renderHeight,
    renderWidth,
    transform,
    visibleHeight: visibleBounds.height * containScale * (transform.scale ?? 1),
    visibleWidth: visibleBounds.width * containScale * (transform.scale ?? 1),
  };
}

function labelSvg(params: {
  avatar: LiveImportPlanAvatar;
  metadata: GululuImportedSpriteImageMetadata;
  metrics: ReturnType<typeof computeRenderMetrics>;
  roleName: string;
}) {
  const { avatar, metadata, metrics, roleName } = params;
  const title = `${roleName} / ${avatar.displayName ?? avatar.usageKey ?? avatar.fileName ?? ""}`;
  const line = `visible ${Math.round(metrics.visibleHeight)}px, scale ${metrics.transform.scale}, y ${metrics.transform.positionY}`;
  const source = `${metadata.width}x${metadata.height} ${avatar.assetKind ?? ""}`;
  return Buffer.from(`
<svg width="${TILE_WIDTH}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#111827"/>
  <text x="14" y="24" font-size="18" fill="#f9fafb" font-family="Arial, sans-serif">${escapeXml(title)}</text>
  <text x="14" y="45" font-size="14" fill="#cbd5e1" font-family="Arial, sans-serif">${escapeXml(line)} · ${escapeXml(source)}</text>
</svg>`);
}

function stageSvg() {
  return Buffer.from(`
<svg width="${TILE_WIDTH}" height="${TILE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#e5e7eb"/>
  <line x1="0" x2="${TILE_WIDTH}" y1="${Math.round(1020 * TILE_SCALE)}" y2="${Math.round(1020 * TILE_SCALE)}" stroke="#ef4444" stroke-width="2" stroke-dasharray="8 6"/>
  <line x1="0" x2="${TILE_WIDTH}" y1="${Math.round(990 * TILE_SCALE)}" y2="${Math.round(990 * TILE_SCALE)}" stroke="#2563eb" stroke-width="2" stroke-dasharray="8 6"/>
  <text x="12" y="${Math.round(1020 * TILE_SCALE) - 8}" font-size="13" fill="#ef4444" font-family="Arial, sans-serif">full-body bottom 1020</text>
  <text x="12" y="${Math.round(990 * TILE_SCALE) - 8}" font-size="13" fill="#2563eb" font-family="Arial, sans-serif">avatar bottom 990</text>
</svg>`);
}

async function renderTile(avatar: LiveImportPlanAvatar) {
  const roleName = roleNameFromKey(avatar.roleKey);
  const metadata = await readGululuImportedSpriteImageMetadata(avatar.filePath!);
  const metrics = computeRenderMetrics(metadata);
  const resizedWidth = Math.max(1, Math.round(metrics.renderWidth * TILE_SCALE));
  const resizedHeight = Math.max(1, Math.round(metrics.renderHeight * TILE_SCALE));
  const left = Math.round((WEBGAL_STAGE_WIDTH / 2 + (metrics.transform.positionX ?? 0) - metrics.renderWidth / 2) * TILE_SCALE);
  const top = Math.round((WEBGAL_STAGE_HEIGHT / 2 + (metrics.transform.positionY ?? 0) - metrics.renderHeight / 2) * TILE_SCALE);
  const sprite = await sharp(avatar.filePath!)
    .rotate()
    .resize(resizedWidth, resizedHeight, { fit: "fill" })
    .png()
    .toBuffer();
  const stage = await sharp(stageSvg())
    .png()
    .composite([{ input: sprite, left, top }])
    .toBuffer();
  const tile = await sharp({
    create: {
      background: "#111827",
      channels: 4,
      height: TILE_HEIGHT + LABEL_HEIGHT,
      width: TILE_WIDTH,
    },
  })
    .composite([
      { input: stage, left: 0, top: 0 },
      { input: labelSvg({ avatar, metadata, metrics, roleName }), left: 0, top: TILE_HEIGHT },
    ])
    .png()
    .toBuffer();
  return {
    metrics: {
      assetKind: avatar.assetKind,
      displayName: avatar.displayName,
      filePath: avatar.filePath,
      imagePath: avatar.imagePath,
      roleName,
      transform: metrics.transform,
      visibleHeight: Math.round(metrics.visibleHeight),
      visibleWidth: Math.round(metrics.visibleWidth),
    },
    tile,
  };
}

function summarizeVisibleHeights(items: Array<{ metrics: { visibleHeight: number } }>) {
  const values = items.map(item => item.metrics.visibleHeight);
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    average: values.length ? Math.round(sum / values.length) : 0,
    max: values.length ? Math.max(...values) : 0,
    min: values.length ? Math.min(...values) : 0,
  };
}

export async function runGululuAvatarTransformPreview(argv: string[]) {
  const args = parseArgs(argv);
  if (!args.input) {
    throw new Error("--input is required");
  }
  const inputPath = path.resolve(args.input);
  const outDir = path.resolve(args.outDir ?? `${path.dirname(inputPath)}/avatar-transform-preview`);
  const plan = await readPlan(inputPath);
  const selected = selectPreviewAvatars(plan, args);
  if (selected.length === 0) {
    throw new Error("没有找到可预览的头像；请检查 --roles、--asset-kind 和 plan.avatars[].filePath");
  }
  await mkdir(outDir, { recursive: true });
  const tiles = await Promise.all(selected.map(renderTile));
  const columns = Math.min(3, Math.max(1, tiles.length));
  const rows = Math.ceil(tiles.length / columns);
  const sheetPath = path.join(outDir, "avatar-transform-preview.png");
  const reportPath = path.join(outDir, "avatar-transform-preview.json");
  await sharp({
    create: {
      background: "#0f172a",
      channels: 4,
      height: rows * (TILE_HEIGHT + LABEL_HEIGHT),
      width: columns * TILE_WIDTH,
    },
  })
    .composite(tiles.map((tile, index) => ({
      input: tile.tile,
      left: (index % columns) * TILE_WIDTH,
      top: Math.floor(index / columns) * (TILE_HEIGHT + LABEL_HEIGHT),
    })))
    .png()
    .toFile(sheetPath);
  const report = {
    inputPath,
    sheetPath,
    stats: {
      selected: tiles.length,
      visibleHeight: summarizeVisibleHeights(tiles),
    },
    avatars: tiles.map(tile => tile.metrics),
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { report, reportPath, sheetPath };
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  runGululuAvatarTransformPreview(process.argv.slice(2))
    .then(({ report, reportPath, sheetPath }) => {
      process.stdout.write(`${JSON.stringify({
        reportPath,
        sheetPath,
        stats: report.stats,
      }, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
