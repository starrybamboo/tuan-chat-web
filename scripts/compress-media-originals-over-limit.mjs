import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import sharp from "sharp";

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_LIMIT_MIB = 4;
const DEFAULT_SAMPLE_LIMIT = 50;
const PROGRESS_EVERY = 5;

const SCALE_STEPS = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3];
const PNG_QUALITIES = [80, 65, 50];
const JPEG_QUALITIES = [85, 75, 65, 55, 45, 35];
const WEBP_QUALITIES = [85, 75, 65, 55, 45, 35];
const GIF_CONFIGS = [
  { colours: 256, interFrameMaxError: 8 },
  { colours: 128, interFrameMaxError: 8 },
  { colours: 128, interFrameMaxError: 12 },
  { colours: 64, interFrameMaxError: 12 },
];

await main();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const execute = Boolean(args.execute);
  const filesRoot = resolveRequiredDir(args.root, "root");
  const limitMiB = toPositiveNumber(args.limitMiB ?? args["limit-mib"], DEFAULT_LIMIT_MIB, "limit-mib");
  const limitBytes = Math.round(limitMiB * 1024 * 1024);
  const concurrency = toPositiveInteger(args.concurrency, DEFAULT_CONCURRENCY, "concurrency");
  const sampleLimit = toPositiveInteger(args.sampleLimit ?? args["sample-limit"], DEFAULT_SAMPLE_LIMIT, "sample-limit");
  const backupRoot = path.resolve(filesRoot, "..", "..", "..", "..", "..");
  const reportPath = path.resolve(args.report ?? path.join(
    backupRoot,
    execute ? "media-original-compress-execute-report.json" : "media-original-compress-dry-run-report.json",
  ));
  const sqlPath = path.resolve(args.sql ?? path.join(
    backupRoot,
    execute ? "media-original-compress-execute-media-file.sql" : "media-original-compress-dry-run-media-file.sql",
  ));

  console.log(`[mode] ${execute ? "execute" : "dry-run"}`);
  console.log(`[root] ${filesRoot}`);
  console.log(`[limit] ${limitBytes} bytes (${limitMiB} MiB)`);
  console.log(`[config] concurrency=${concurrency} sampleLimit=${sampleLimit}`);
  console.log(`[report] ${reportPath}`);
  console.log(`[sql] ${sqlPath}`);

  const candidates = await collectCandidates(filesRoot, limitBytes);
  console.log(`[scan] found ${candidates.length} original files over limit`);

  const stats = createStats({
    filesRoot,
    backupRoot,
    reportPath,
    sqlPath,
    limitBytes,
    limitMiB,
    mode: execute ? "execute" : "dry-run",
  });

  const results = [];
  let processed = 0;

  await runWithConcurrency(candidates, concurrency, async (candidate) => {
    processed += 1;
    try {
      const result = await processCandidate(candidate, limitBytes, execute);
      results.push(result);
      mergeStats(stats, result);
    }
    catch (error) {
      stats.failedCount += 1;
      if (stats.failedSamples.length < sampleLimit) {
        stats.failedSamples.push({
          key: candidate.key,
          fileRoot: normalizePath(candidate.fileRoot),
          error: error?.message ?? String(error),
        });
      }
      console.warn(`[warn] failed ${candidate.key}: ${error?.message ?? error}`);
    }

    if (processed % PROGRESS_EVERY === 0 || processed === candidates.length) {
      console.log(`[progress] ${processed}/${candidates.length} processed, updated=${stats.updatedCount}, saved=${formatBytes(stats.savedBytes)}`);
    }
  });

  results.sort((left, right) => right.savedBytes - left.savedBytes);
  const report = buildReport(stats, results, sampleLimit);
  const sql = buildSql(results, execute);

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(sqlPath, sql, "utf8");

  printSummary(report);
}

async function collectCandidates(filesRoot, limitBytes) {
  const shardEntries = await fs.readdir(filesRoot, { withFileTypes: true });
  const candidates = [];

  for (const shardEntry of shardEntries) {
    if (!shardEntry.isDirectory()) {
      continue;
    }
    const shardPath = path.join(filesRoot, shardEntry.name);
    const fileEntries = await fs.readdir(shardPath, { withFileTypes: true });
    for (const fileEntry of fileEntries) {
      if (!fileEntry.isDirectory()) {
        continue;
      }
      const fileRoot = path.join(shardPath, fileEntry.name);
      const originalPath = path.join(fileRoot, "original");
      try {
        const stat = await fs.stat(originalPath);
        if (!stat.isFile() || stat.size <= limitBytes) {
          continue;
        }
        const metadata = await sharp(originalPath, { animated: true }).metadata();
        const format = metadata.format ?? "unknown";
        if (!isSupportedFormat(format)) {
          continue;
        }
        candidates.push({
          shard: shardEntry.name,
          fileId: Number.parseInt(fileEntry.name, 10),
          key: `${shardEntry.name}/${fileEntry.name}`,
          fileRoot,
          originalPath,
          originalBytes: stat.size,
          originalWidth: metadata.width ?? null,
          originalHeight: metadata.height ?? null,
          pages: metadata.pages ?? 1,
          format,
        });
      }
      catch {
        continue;
      }
    }
  }

  return candidates;
}

async function processCandidate(candidate, limitBytes, execute) {
  const input = await fs.readFile(candidate.originalPath);
  const optimized = await optimizeOriginal(input, candidate, limitBytes);
  if (optimized.buffer.length > limitBytes) {
    throw new Error(`无法压缩到 ${limitBytes} bytes 以内，最优结果 ${optimized.buffer.length} bytes`);
  }

  if (optimized.buffer.length >= input.length) {
    throw new Error(`压缩后未变小：before=${input.length}, after=${optimized.buffer.length}`);
  }

  const sha256 = hashBuffer(optimized.buffer);
  if (execute) {
    await writeFileAtomically(candidate.originalPath, optimized.buffer);
  }

  return {
    key: candidate.key,
    fileId: candidate.fileId,
    fileRoot: candidate.fileRoot,
    originalPath: candidate.originalPath,
    format: candidate.format,
    pages: candidate.pages,
    originalWidth: candidate.originalWidth,
    originalHeight: candidate.originalHeight,
    beforeBytes: input.length,
    afterBytes: optimized.buffer.length,
    savedBytes: input.length - optimized.buffer.length,
    sha256,
    strategy: optimized.strategy,
    executed: execute,
  };
}

async function optimizeOriginal(input, candidate, limitBytes) {
  switch (candidate.format) {
    case "png":
      return await optimizeRaster(input, candidate, limitBytes, "png");
    case "jpeg":
      return await optimizeRaster(input, candidate, limitBytes, "jpeg");
    case "webp":
      return await optimizeRaster(input, candidate, limitBytes, "webp");
    case "gif":
      return await optimizeGif(input, candidate, limitBytes);
    default:
      throw new Error(`不支持的格式: ${candidate.format}`);
  }
}

async function optimizeRaster(input, candidate, limitBytes, format) {
  let best = null;
  for (const scale of SCALE_STEPS) {
    const dimensions = scaledDimensions(candidate.originalWidth, candidate.originalHeight, scale);
    for (const quality of rasterQualities(format)) {
      const pipeline = sharp(input)
        .resize({
          width: dimensions.width,
          height: dimensions.height,
          fit: "inside",
          withoutEnlargement: true,
        });

      const buffer = await applyRasterEncoding(pipeline, format, quality);
      const strategy = { format, scale, quality, width: dimensions.width, height: dimensions.height };
      if (!best || buffer.length < best.buffer.length) {
        best = { buffer, strategy };
      }
      if (buffer.length <= limitBytes) {
        return { buffer, strategy };
      }
    }
  }

  return best;
}

async function applyRasterEncoding(pipeline, format, quality) {
  switch (format) {
    case "png":
      return await pipeline
        .png({
          compressionLevel: 9,
          palette: true,
          quality,
          effort: 10,
        })
        .withMetadata()
        .toBuffer();
    case "jpeg":
      return await pipeline
        .jpeg({
          quality,
          mozjpeg: true,
        })
        .withMetadata()
        .toBuffer();
    case "webp":
      return await pipeline
        .webp({
          quality,
          effort: 6,
        })
        .withMetadata()
        .toBuffer();
    default:
      throw new Error(`未知栅格格式: ${format}`);
  }
}

async function optimizeGif(input, candidate, limitBytes) {
  let best = null;
  for (const scale of SCALE_STEPS) {
    const dimensions = scaledDimensions(candidate.originalWidth, candidate.originalHeight, scale);
    for (const config of GIF_CONFIGS) {
      const buffer = await sharp(input, { animated: true })
        .resize({
          width: dimensions.width,
          height: dimensions.height,
          fit: "inside",
          withoutEnlargement: true,
        })
        .gif({
          effort: 10,
          reuse: true,
          colours: config.colours,
          interFrameMaxError: config.interFrameMaxError,
        })
        .toBuffer();

      const strategy = {
        format: "gif",
        scale,
        colours: config.colours,
        interFrameMaxError: config.interFrameMaxError,
        width: dimensions.width,
        height: dimensions.height,
      };
      if (!best || buffer.length < best.buffer.length) {
        best = { buffer, strategy };
      }
      if (buffer.length <= limitBytes) {
        return { buffer, strategy };
      }
    }
  }

  return best;
}

function scaledDimensions(width, height, scale) {
  const safeWidth = Math.max(1, width ?? 1);
  const safeHeight = Math.max(1, height ?? 1);
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

function rasterQualities(format) {
  switch (format) {
    case "png":
      return PNG_QUALITIES;
    case "jpeg":
      return JPEG_QUALITIES;
    case "webp":
      return WEBP_QUALITIES;
    default:
      return [80];
  }
}

function isSupportedFormat(format) {
  return ["png", "jpeg", "webp", "gif"].includes(format);
}

async function writeFileAtomically(targetPath, buffer) {
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, targetPath);
}

function buildReport(stats, results, sampleLimit) {
  return {
    backupRoot: stats.backupRoot,
    filesRoot: stats.filesRoot,
    reportPath: stats.reportPath,
    sqlPath: stats.sqlPath,
    generatedAt: new Date().toISOString(),
    mode: stats.mode,
    limitBytes: stats.limitBytes,
    limitMiB: stats.limitMiB,
    summary: {
      candidateCount: stats.candidateCount,
      updatedCount: stats.updatedCount,
      failedCount: stats.failedCount,
      beforeBytes: stats.beforeBytes,
      beforeMiB: roundMiB(stats.beforeBytes),
      afterBytes: stats.afterBytes,
      afterMiB: roundMiB(stats.afterBytes),
      savedBytes: stats.savedBytes,
      savedMiB: roundMiB(stats.savedBytes),
      averageBeforeBytes: stats.candidateCount > 0 ? Math.round(stats.beforeBytes / stats.candidateCount) : 0,
      averageAfterBytes: stats.candidateCount > 0 ? Math.round(stats.afterBytes / stats.candidateCount) : 0,
      averageSavedBytes: stats.candidateCount > 0 ? Math.round(stats.savedBytes / stats.candidateCount) : 0,
      formatBreakdown: sortObjectByValue(stats.formatBreakdown),
    },
    failedSamples: stats.failedSamples,
    topSavings: results.slice(0, sampleLimit).map(toReportRow),
    updatedFiles: results.map(toReportRow),
  };
}

function buildSql(results, execute) {
  const lines = [
    "-- media_file original size/sha256 alignment",
    `-- mode: ${execute ? "execute" : "dry-run"}`,
    `-- generatedAt: ${new Date().toISOString()}`,
    "BEGIN;",
  ];

  for (const result of results) {
    lines.push(
      `UPDATE media_file SET size_bytes = ${result.afterBytes}, sha256 = '${result.sha256}', updated_at = NOW() WHERE id = ${result.fileId};`,
    );
  }

  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

function createStats({ filesRoot, backupRoot, reportPath, sqlPath, limitBytes, limitMiB, mode }) {
  return {
    filesRoot,
    backupRoot,
    reportPath,
    sqlPath,
    limitBytes,
    limitMiB,
    mode,
    candidateCount: 0,
    updatedCount: 0,
    failedCount: 0,
    beforeBytes: 0,
    afterBytes: 0,
    savedBytes: 0,
    formatBreakdown: {},
    failedSamples: [],
  };
}

function mergeStats(stats, result) {
  stats.candidateCount += 1;
  if (result.executed) {
    stats.updatedCount += 1;
  }
  stats.beforeBytes += result.beforeBytes;
  stats.afterBytes += result.afterBytes;
  stats.savedBytes += result.savedBytes;
  stats.formatBreakdown[result.format] = (stats.formatBreakdown[result.format] ?? 0) + 1;
}

function toReportRow(result) {
  return {
    key: result.key,
    fileId: result.fileId,
    fileRoot: normalizePath(result.fileRoot),
    originalPath: normalizePath(result.originalPath),
    format: result.format,
    pages: result.pages,
    originalWidth: result.originalWidth,
    originalHeight: result.originalHeight,
    beforeBytes: result.beforeBytes,
    beforeMiB: roundMiB(result.beforeBytes),
    afterBytes: result.afterBytes,
    afterMiB: roundMiB(result.afterBytes),
    savedBytes: result.savedBytes,
    savedMiB: roundMiB(result.savedBytes),
    strategy: result.strategy,
    sha256: result.sha256,
  };
}

function printSummary(report) {
  const { summary } = report;
  console.log("");
  console.log("=== Original Compress Summary ===");
  console.log(`mode: ${report.mode}`);
  console.log(`candidates: ${summary.candidateCount}`);
  console.log(`updated: ${summary.updatedCount}`);
  console.log(`failed: ${summary.failedCount}`);
  console.log(`before: ${formatBytes(summary.beforeBytes)} (${summary.beforeMiB} MiB)`);
  console.log(`after: ${formatBytes(summary.afterBytes)} (${summary.afterMiB} MiB)`);
  console.log(`saved: ${formatBytes(summary.savedBytes)} (${summary.savedMiB} MiB)`);
  console.log(`report written: ${report.reportPath}`);
  console.log(`sql written: ${report.sqlPath}`);
}

async function runWithConcurrency(items, concurrency, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (true) {
      const currentIndex = index;
      index += 1;
      if (currentIndex >= items.length) {
        return;
      }
      await worker(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(runners);
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--help" || entry === "-h") {
      args.help = true;
      continue;
    }
    if (!entry.startsWith("--")) {
      continue;
    }
    const key = entry.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function resolveRequiredDir(input, label) {
  if (!input) {
    throw new Error(`缺少 --${label}`);
  }
  return path.resolve(String(input));
}

function toPositiveInteger(input, fallback, label) {
  if (input == null) {
    return fallback;
  }
  const value = Number.parseInt(String(input), 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${label} 必须是正整数`);
  }
  return value;
}

function toPositiveNumber(input, fallback, label) {
  if (input == null) {
    return fallback;
  }
  const value = Number.parseFloat(String(input));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${label} 必须是正数`);
  }
  return value;
}

function normalizePath(input) {
  return input.split(path.sep).join(path.posix.sep);
}

function roundMiB(bytes) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "0 B";
  }
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function sortObjectByValue(input) {
  return Object.fromEntries(
    Object.entries(input).sort((left, right) => right[1] - left[1]),
  );
}

function printHelp() {
  console.log(`Usage:
  node scripts/compress-media-originals-over-limit.mjs --root <media/v1/files> [--limit-mib 4] [--concurrency 3] [--execute]

Example:
  node scripts/compress-media-originals-over-limit.mjs ^
    --root D:/A_collection/server-backups/tuanchat-server-data-20260507_043831.no-redis/minio/avatar/media/v1/files ^
    --limit-mib 4

Execute:
  node scripts/compress-media-originals-over-limit.mjs ^
    --root D:/A_collection/server-backups/tuanchat-server-data-20260507_043831.no-redis/minio/avatar/media/v1/files ^
    --limit-mib 4 ^
    --execute
`);
}
