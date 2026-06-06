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
  return {
    force: args.has("force"),
    outDir: path.resolve(args.get("out-dir") ?? path.join(root, "image-role-review-clean-vision-full")),
    reviewDir: path.resolve(args.get("review-dir") ?? path.join(root, "cleaning-review-ai-first-v1")),
    root,
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

function normalizeRel(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function boolValue(value) {
  return /^(?:1|true|yes|y|是)$/i.test(String(value ?? ""));
}

function sanitizeSegment(value, fallback = "unknown") {
  const cleaned = String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
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

function outputBucket(row) {
  const assetKind = row.assetKind || "unknown";
  const role = sanitizeSegment(row.character || row.candidateRoleName || "unknown-role", "unknown-role");
  if (assetKind === "excluded") return ["excluded"];
  if (assetKind === "unknown") return ["unknown"];
  if (assetKind === "background") return ["background", sanitizeSegment(row.locationName, "unknown-location")];
  if (boolValue(row.needsMatting)) return ["needs-matting", role];
  if (assetKind === "reference-only" || assetKind === "manga-panel") {
    return ["reference", assetKind, role];
  }
  if (assetKind === "manga-avatar") return ["by-character", role, "manga-avatar"];
  if (assetKind.startsWith("character-")) return ["by-character", role, assetKind];
  return ["other", assetKind];
}

function outputFileName(index, row) {
  const extension = path.extname(row.sourceRelPath || "").toLowerCase() || ".png";
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

async function materializeRows(rows, options) {
  const indexRows = [];
  const missingRows = [];
  const countsByAssetKind = new Map();
  const countsByBucket = new Map();
  const countsByMattingStatus = new Map();

  for (const [index, row] of rows.entries()) {
    const bucket = outputBucket(row);
    const outputRelPath = normalizeRel(path.join(...bucket, outputFileName(index, row)));
    const outputAbsPath = path.join(options.outDir, outputRelPath.replaceAll("/", path.sep));
    const inputAbsPath = sourceAbsPath(options.root, row.sourceRelPath);
    increment(countsByAssetKind, row.assetKind || "unknown");
    increment(countsByBucket, bucket.join("/"));
    increment(countsByMattingStatus, row.mattingStatus || "unknown");
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
        mattingStatus: row.mattingStatus,
        materializedAs: boolValue(row.needsMatting) ? "source-copy-needs-matting" : "source-copy",
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
    "materializedAs",
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
    summaryByAssetKind: Object.fromEntries([...result.countsByAssetKind.entries()].sort()),
    summaryByBucket: Object.fromEntries([...result.countsByBucket.entries()].sort()),
    summaryByMattingStatus: Object.fromEntries([...result.countsByMattingStatus.entries()].sort()),
  };
  await fs.writeFile(path.join(options.outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await fs.writeFile(
    path.join(options.outDir, "README.md"),
    [
      "# Gululu Vision Clean Image Folder",
      "",
      "这个目录由 `image-decisions.vision.csv` 物化而来，原始 `images/` 不会被修改。",
      "",
      "- `by-character/`: 角色头像、漫画头像、已可直接复制的角色素材。",
      "- `needs-matting/`: 视觉门禁允许抠图，但本次只复制原图等待抠图/QA。",
      "- `reference/`: 漫画分镜和参考图，不进角色演出。",
      "- `background/`: 背景图候选。",
      "- `excluded/` 和 `unknown/`: 排除或低置信图片，保留用于终验。",
      "- `index.csv`: 每张复制图片对应的来源路径和视觉决策。",
      "- `reports/missing.csv`: 复制失败或缺失源文件。",
      "",
      "注意：本目录没有消费旧 `__matted` 透明图。漫画图只复制原图，`mattingAllowed=false`。",
      "",
    ].join("\n"),
    "utf8",
  );
  return summary;
}

async function main() {
  const options = parseArgs(process.argv);
  await resetOutDir(options.outDir, options.root, options.force);
  const rows = await readCsv(path.join(options.reviewDir, "image-decisions.vision.csv"));
  const result = await materializeRows(rows, options);
  const summary = await writeOutputs(result, options);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
