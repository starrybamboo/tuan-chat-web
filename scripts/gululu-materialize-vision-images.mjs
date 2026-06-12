#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";

function parseArgs(argv) {
  const args = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
      continue;
    }
    args.set(key, next);
    index += 1;
  }
  const root = path.resolve(args.get("root") ?? DEFAULT_ROOT);
  const reviewDir = path.resolve(args.get("review-dir") ?? path.join(root, "cleaning-review-ai-first-v1"));
  return {
    aggregate: args.has("aggregate"),
    characterAssetsOnly: args.has("character-assets-only"),
    featureIndex: args.get("feature-index") ?? path.join(reviewDir, "image-feature-index.json"),
    force: args.has("force"),
    mattingResults:
      args.get("matting-results") ??
      path.join(root, "cleaning-review-ai-first-v1", "matting-results.vision.json"),
    outDir: path.resolve(args.get("out-dir") ?? path.join(root, "image-role-review-clean-vision-full")),
    reviewDir,
    root,
    spritesOnly: args.has("sprites-only"),
  };
}

function csvCell(value) {
  const text = Array.isArray(value) || (value && typeof value === "object")
    ? JSON.stringify(value)
    : String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\"") {
      if (quoted && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  const [headers, ...body] = rows;
  if (!headers) return [];
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function readCsv(file) {
  return parseCsv(await fs.readFile(file, "utf8"));
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(file, fallback) {
  if (!(await pathExists(file))) return fallback;
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function normalizeRel(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function boolValue(value) {
  return /^(?:1|true|yes|y|是)$/i.test(String(value ?? ""));
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeSegment(value, fallback = "unknown") {
  const cleaned = String(value || fallback)
    .replace(/[\p{Cc}<>:"/\\|?*]/gu, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || fallback).slice(0, 90);
}

function sourceAbsPath(root, sourceRelPath) {
  return path.join(root, "images", normalizeRel(sourceRelPath).replaceAll("/", path.sep));
}

function sourceStem(sourceRelPath) {
  return sanitizeSegment(path.parse(normalizeRel(sourceRelPath)).name || "image", "image").slice(0, 70);
}

function buildFeatureMaps(features) {
  const bySource = new Map();
  const byHash = new Map();
  for (const feature of features) {
    if (feature.sourceRelPath) bySource.set(normalizeRel(feature.sourceRelPath), feature);
    if (feature.sha256 && !byHash.has(feature.sha256)) byHash.set(feature.sha256, feature);
  }
  return { byHash, bySource };
}

function featureForRow(row, featureMaps) {
  return featureMaps.bySource.get(normalizeRel(row.sourceRelPath)) ?? featureMaps.byHash.get(row.sha256) ?? null;
}

function isLowColorMangaCandidate(feature) {
  if (!feature || feature.featureError) return false;
  return numberValue(feature.meanChroma) <= 0.035 && numberValue(feature.colorfulRatio) <= 0.04;
}

function appendNote(notes, addition) {
  const existing = String(notes ?? "").trim();
  return existing ? `${existing}；${addition}` : addition;
}

function normalizeFinalRow(row, feature) {
  if (row.assetKind !== "manga-avatar" || !feature || isLowColorMangaCandidate(feature)) return row;
  const reason =
    `规则修正: 原 assetKind=manga-avatar，但未通过黑白灰漫画硬门禁` +
    `(colorfulRatio=${feature.colorfulRatio}, meanChroma=${feature.meanChroma})，按 character-avatar-bust 物化`;
  return {
    ...row,
    assetKind: "character-avatar-bust",
    mattingAllowed: "false",
    mattingStatus: "not-needed",
    needsMatting: "false",
    normalizedFromAssetKind: row.assetKind,
    normalizationReason: reason,
    notes: appendNote(row.notes, reason),
  };
}

function outputBucket(row, matting) {
  const assetKind = row.assetKind || "unknown";
  const role = sanitizeSegment(row.character || row.candidateRoleName || "unknown-role", "unknown-role");
  if (assetKind === "character-sprite" && matting) return ["role-sprites", role];
  if (["character-avatar-bust", "character-avatar-chat", "manga-avatar"].includes(assetKind)) {
    return ["avatars", role, assetKind];
  }
  if (assetKind === "excluded") return ["excluded"];
  if (assetKind === "unknown") return ["unknown"];
  if (assetKind === "background") return ["background", sanitizeSegment(row.locationName, "unknown-location")];
  if (boolValue(row.needsMatting) && !matting) return ["needs-matting", role];
  if (assetKind === "reference-only" || assetKind === "manga-panel") {
    return ["reference", assetKind, role];
  }
  if (assetKind === "manga-avatar") return ["by-character", role, "manga-avatar"];
  if (assetKind.startsWith("character-")) return ["by-character", role, assetKind];
  return ["other", assetKind];
}

function outputFileName(index, row, matting) {
  const extension = matting ? ".png" : path.extname(row.sourceRelPath || "").toLowerCase() || ".png";
  const sha = String(row.sha256 || "nohash").slice(0, 12);
  return `${String(index + 1).padStart(5, "0")}__${sourceStem(row.sourceRelPath)}__${sha}${extension}`;
}

async function resetOutDir(outDir, root, force) {
  const resolvedOut = path.resolve(outDir);
  const resolvedRoot = path.resolve(root);
  const rel = path.relative(resolvedRoot, resolvedOut);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`拒绝清理 sourceRoot 外目录: ${resolvedOut}`);
  }
  if (!path.basename(resolvedOut).includes("vision")) {
    throw new Error(`拒绝清理非 vision 输出目录: ${resolvedOut}`);
  }
  if (await pathExists(resolvedOut)) {
    if (!force) throw new Error(`输出目录已存在，请传 --force: ${resolvedOut}`);
    await fs.rm(resolvedOut, { force: true, recursive: true });
  }
  await fs.mkdir(path.join(resolvedOut, "reports"), { recursive: true });
}

function increment(map, key, count = 1) {
  map.set(key, (map.get(key) ?? 0) + count);
}

function aggregateRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const relation = row.visualRelationType || "single";
    const key = ["physicalDuplicate", "visualDuplicate"].includes(relation)
      ? `group:${row.visualGroupId || row.sha256 || row.sourceRelPath}`
      : relation === "variantGroup"
        ? `variant:${row.visualGroupId || "missing"}:${row.sha256 || row.sourceRelPath}`
        : `source:${row.sourceRelPath}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.values()].map((groupRows) => {
    const canonicalSha = groupRows.find((row) => row.canonicalSha256)?.canonicalSha256;
    const chosen =
      groupRows.find((row) => row.sha256 && row.sha256 === canonicalSha) ??
      [...groupRows].sort((left, right) => left.sourceRelPath.localeCompare(right.sourceRelPath))[0];
    return {
      ...chosen,
      aggregatedSourceCount: groupRows.length,
      aggregatedSourceRelPaths: groupRows.map((row) => row.sourceRelPath).join("|"),
    };
  });
}

function buildMattingMaps(mattingResults) {
  const bySource = new Map();
  const byHash = new Map();
  for (const row of mattingResults) {
    if (!["processed", "cached"].includes(row.status)) continue;
    if (row.sourceRelPath) bySource.set(normalizeRel(row.sourceRelPath), row);
    if (row.sha256 && !byHash.has(row.sha256)) byHash.set(row.sha256, row);
  }
  return { byHash, bySource };
}

function mattingForRow(row, mattingMaps) {
  if (!boolValue(row.needsMatting)) return null;
  return mattingMaps.bySource.get(normalizeRel(row.sourceRelPath)) ?? mattingMaps.byHash.get(row.sha256) ?? null;
}

async function materializeRows(rows, options, mattingMaps, featureMaps) {
  const indexRows = [];
  const missingRows = [];
  const countsByAssetKind = new Map();
  const countsByBucket = new Map();
  const countsByMattingStatus = new Map();
  const countsByNormalization = new Map();

  for (const [index, rawRow] of rows.entries()) {
    const row = normalizeFinalRow(rawRow, featureForRow(rawRow, featureMaps));
    const matting = mattingForRow(row, mattingMaps);
    if (options.spritesOnly && !(row.assetKind === "character-sprite" && matting)) {
      continue;
    }
    if (options.characterAssetsOnly) {
      const isMattedSprite = row.assetKind === "character-sprite" && matting;
      const isAvatar = ["character-avatar-bust", "character-avatar-chat", "manga-avatar"].includes(row.assetKind);
      if (!isMattedSprite && !isAvatar) continue;
    }
    const bucket = outputBucket(row, matting);
    const outputRelPath = normalizeRel(path.join(...bucket, outputFileName(index, row, matting)));
    const outputAbsPath = path.join(options.outDir, outputRelPath.replaceAll("/", path.sep));
    const inputAbsPath = matting
      ? path.join(options.reviewDir, normalizeRel(matting.transparentRelPath).replaceAll("/", path.sep))
      : sourceAbsPath(options.root, row.sourceRelPath);
    increment(countsByAssetKind, row.assetKind || "unknown");
    if (row.normalizedFromAssetKind) {
      increment(countsByNormalization, `${row.normalizedFromAssetKind}->${row.assetKind}`);
    }
    increment(countsByBucket, bucket.join("/"));
    increment(countsByMattingStatus, matting?.status ?? row.mattingStatus ?? "unknown");
    try {
      await fs.mkdir(path.dirname(outputAbsPath), { recursive: true });
      await fs.copyFile(inputAbsPath, outputAbsPath);
      indexRows.push({
        sourceRelPath: row.sourceRelPath,
        outputRelPath,
        sha256: row.sha256,
        visualGroupId: row.visualGroupId,
        assetKind: row.assetKind,
        renderUse: row.renderUse,
        character: row.character || row.candidateRoleName,
        locationName: row.locationName,
        decisionStatus: row.decisionStatus,
        visualStatus: row.visualStatus,
        confidence: row.confidence,
        mattingAllowed: row.mattingAllowed,
        needsMatting: row.needsMatting,
        mattingStatus: matting?.status ?? row.mattingStatus,
        normalizedFromAssetKind: row.normalizedFromAssetKind ?? "",
        normalizationReason: row.normalizationReason ?? "",
        aggregatedSourceCount: row.aggregatedSourceCount ?? 1,
        aggregatedSourceRelPaths: row.aggregatedSourceRelPaths || row.sourceRelPath,
        materializedAs: matting ? "matted-transparent" : boolValue(row.needsMatting) ? "source-copy-needs-matting" : "source-copy",
        transparentRelPath: matting?.transparentRelPath ?? "",
        alphaMaskRelPath: matting?.alphaMaskRelPath ?? "",
        evidenceSummary: row.evidenceSummary,
        notes: row.notes,
      });
    } catch (error) {
      missingRows.push({
        sourceRelPath: row.sourceRelPath,
        sha256: row.sha256,
        error: error.message,
      });
    }
  }

  return {
    countsByAssetKind,
    countsByBucket,
    countsByMattingStatus,
    countsByNormalization,
    indexRows,
    missingRows,
  };
}

async function writeOutputs(result, options) {
  const indexColumns = [
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
  await fs.writeFile(path.join(options.outDir, "index.csv"), `${toCsv(result.indexRows, indexColumns)}\n`, "utf8");
  await fs.writeFile(
    path.join(options.outDir, "reports", "missing.csv"),
    `${toCsv(result.missingRows, ["sourceRelPath", "sha256", "error"])}\n`,
    "utf8",
  );
  const summary = {
    copiedImages: result.indexRows.length,
    generatedAt: new Date().toISOString(),
    missingImages: result.missingRows.length,
    outputRoot: options.outDir,
    sourceRows: result.indexRows.length + result.missingRows.length,
    aggregate: options.aggregate,
    characterAssetsOnly: options.characterAssetsOnly,
    spritesOnly: options.spritesOnly,
    summaryByAssetKind: Object.fromEntries([...result.countsByAssetKind.entries()].sort()),
    summaryByBucket: Object.fromEntries([...result.countsByBucket.entries()].sort()),
    summaryByMattingStatus: Object.fromEntries([...result.countsByMattingStatus.entries()].sort()),
    summaryByNormalization: Object.fromEntries([...result.countsByNormalization.entries()].sort()),
  };
  await fs.writeFile(path.join(options.outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await fs.writeFile(
    path.join(options.outDir, "README.md"),
    [
      "# Gululu Vision Clean Image Folder",
      "",
      "这个目录由 `image-decisions.vision.csv` 物化而来，原始 `images/` 不会被修改。",
      "",
      "- `role-sprites/`: 放已聚合且已抠图的角色立绘。",
      "- `avatars/`: 放已聚合的头像、漫画头像、聊天头像；`character-avatar-*` 最终应透明化，`manga-avatar` 保留原图。",
      "- `by-character/`: 中间/全量物化模式下的旧兼容角色资源入口。",
      "- `needs-matting/`: 视觉门禁允许抠图，但本次只复制原图等待抠图/QA。",
      "- `reference/`: 漫画分镜和参考图，不进角色演出。",
      "- `background/`: 背景图候选。",
      "- `excluded/` 和 `unknown/`: 排除或低置信图片，保留用于终验。",
      "- `index.csv`: 每张复制图片对应的来源路径和视觉决策。",
      "- `reports/missing.csv`: 复制失败或缺失源文件。",
      "",
      "注意：本目录不会消费旧 `__matted` 透明图。`manga-avatar` 只允许黑白/低彩度漫画头像；明显彩色角色头像会在最终物化时修正为 `character-avatar-bust`。",
      "如果使用 `--character-assets-only` 生成最终审查目录，则目录只包含 `role-sprites/`、`avatars/` 和索引文件。",
      "如果使用 `--sprites-only` 生成最终审查目录，则目录只包含抠图后的 `role-sprites/` 和索引文件。",
      "",
    ].join("\n"),
    "utf8",
  );
  return summary;
}

async function main() {
  const options = parseArgs(process.argv);
  await resetOutDir(options.outDir, options.root, options.force);
  const rawRows = await readCsv(path.join(options.reviewDir, "image-decisions.vision.csv"));
  const rows = options.aggregate ? aggregateRows(rawRows) : rawRows;
  const mattingResultsJson = await readJsonIfExists(options.mattingResults, { results: [] });
  const mattingMaps = buildMattingMaps(mattingResultsJson.results ?? []);
  const features = await readJsonIfExists(options.featureIndex, []);
  const featureMaps = buildFeatureMaps(features);
  const result = await materializeRows(rows, options, mattingMaps, featureMaps);
  const summary = await writeOutputs(result, options);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
