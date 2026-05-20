import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import sharp from "sharp";

const IMAGE_PROFILES = {
  low: {
    maxEdge: 200,
    maxBytes: 30 * 1024,
    quality: 72,
  },
  medium: {
    maxEdge: 512,
    maxBytes: 150 * 1024,
    quality: 76,
  },
};

const DEFAULT_CONCURRENCY = 6;
const DEFAULT_SAMPLE_LIMIT = 30;
const PROGRESS_EVERY = 200;

await main();

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const execute = Boolean(args.execute);
  const filesRoot = resolveRequiredDir(args.root, "root");
  const backupRoot = path.resolve(filesRoot, "..", "..", "..", "..", "..");
  const reportName = execute ? "media-image-variant-repair-execute-report.json" : "media-image-variant-repair-dry-run.json";
  const reportPath = path.resolve(args.report ?? path.join(backupRoot, reportName));
  const concurrency = toPositiveInteger(args.concurrency, DEFAULT_CONCURRENCY, "concurrency");
  const sampleLimit = toPositiveInteger(args.sampleLimit, DEFAULT_SAMPLE_LIMIT, "sample-limit");

  console.log(`[dry-run] files root: ${filesRoot}`);
  console.log(`[dry-run] report path: ${reportPath}`);
  console.log(`[mode] ${execute ? "execute" : "dry-run"}`);
  console.log(`[config] concurrency=${concurrency} sampleLimit=${sampleLimit}`);

  const groups = await collectImageTriples(filesRoot);
  console.log(`[scan] found image triples: ${groups.length}`);

  const stats = createStats(filesRoot, backupRoot, reportPath);
  stats.mode = execute ? "execute" : "dry-run";
  const candidateResults = [];
  let processed = 0;

  await runWithConcurrency(groups, concurrency, async (group) => {
    processed += 1;
    try {
      const result = await analyzeGroup(group, execute);
      mergeStats(stats, result);
      if (result.kind === "candidate") {
        candidateResults.push(result);
      }
    }
    catch (error) {
      stats.failedGroups += 1;
      if (stats.failedSamples.length < sampleLimit) {
        stats.failedSamples.push({
          key: `${group.shard}/${group.fileId}`,
          fileRoot: normalizePath(group.fileRoot),
          error: error?.message ?? String(error),
        });
      }
      console.warn(`[warn] failed to analyze ${group.shard}/${group.fileId}: ${error?.message ?? error}`);
    }
    if (processed % PROGRESS_EVERY === 0 || processed === groups.length) {
      console.log(`[progress] ${processed}/${groups.length} processed, candidates=${stats.candidateGroups}, estSavings=${formatBytes(stats.estimatedSavingsBytes)}`);
    }
  });

  candidateResults.sort((a, b) => b.estimatedSavingsBytes - a.estimatedSavingsBytes);
  const report = buildReport(stats, candidateResults, sampleLimit);

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  printSummary(report, execute);
}

async function collectImageTriples(filesRoot) {
  const shardEntries = await fs.readdir(filesRoot, { withFileTypes: true });
  const groups = [];

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
      const lowPath = path.join(fileRoot, "image", "low.webp");
      const mediumPath = path.join(fileRoot, "image", "medium.webp");
      if (await existsAll(originalPath, lowPath, mediumPath)) {
        groups.push({
          shard: shardEntry.name,
          fileId: fileEntry.name,
          fileRoot,
          originalPath,
          lowPath,
          mediumPath,
        });
      }
    }
  }

  return groups;
}

async function analyzeGroup(group, execute) {
  const originalStat = await fs.stat(group.originalPath);
  const lowStat = await fs.stat(group.lowPath);
  const mediumStat = await fs.stat(group.mediumPath);

  const sizeEqualOriginalLow = originalStat.size === lowStat.size;
  const sizeEqualOriginalMedium = originalStat.size === mediumStat.size;
  const sizeEqualLowMedium = lowStat.size === mediumStat.size;

  if (!(sizeEqualOriginalLow && sizeEqualOriginalMedium && sizeEqualLowMedium)) {
    return {
      kind: "nonCandidate",
      scannedGroups: 1,
      sizeEqualGroups: 0,
      exactDuplicateGroups: 0,
    };
  }

  const [originalHash, lowHash, mediumHash] = await Promise.all([
    hashFile(group.originalPath),
    hashFile(group.lowPath),
    hashFile(group.mediumPath),
  ]);

  const allThreeEqual = originalHash === lowHash && originalHash === mediumHash;
  if (!allThreeEqual) {
    return {
      kind: "hashMismatch",
      scannedGroups: 1,
      sizeEqualGroups: 1,
      exactDuplicateGroups: 0,
    };
  }

  const originalBuffer = await fs.readFile(group.originalPath);
  const originalMeta = await sharp(originalBuffer, { animated: true }).metadata();
  const lowEstimate = await buildVariantOutput(originalBuffer, IMAGE_PROFILES.low);
  const mediumEstimate = await buildVariantOutput(originalBuffer, IMAGE_PROFILES.medium);

  const currentTotalBytes = originalStat.size + lowStat.size + mediumStat.size;
  const estimatedTotalBytes = originalStat.size + lowEstimate.bytes + mediumEstimate.bytes;
  const estimatedSavingsBytes = currentTotalBytes - estimatedTotalBytes;
  const maxEdge = Math.max(originalMeta.width ?? 0, originalMeta.height ?? 0);
  const format = originalMeta.format ?? "unknown";

  if (execute) {
    await writeVariantFile(group.lowPath, lowEstimate.buffer);
    await writeVariantFile(group.mediumPath, mediumEstimate.buffer);
  }

  return {
    kind: "candidate",
    executed: execute,
    scannedGroups: 1,
    sizeEqualGroups: 1,
    exactDuplicateGroups: 1,
    currentTotalBytes,
    currentVariantBytes: lowStat.size + mediumStat.size,
    estimatedTotalBytes,
    estimatedVariantBytes: lowEstimate.bytes + mediumEstimate.bytes,
    estimatedSavingsBytes,
    originalBytes: originalStat.size,
    estimatedLowBytes: lowEstimate.bytes,
    estimatedMediumBytes: mediumEstimate.bytes,
    originalWidth: originalMeta.width ?? null,
    originalHeight: originalMeta.height ?? null,
    format,
    maxEdge,
    key: `${group.shard}/${group.fileId}`,
    relativeOriginalPath: normalizePath(path.relative(group.fileRoot, group.originalPath)),
    relativeLowPath: normalizePath(path.relative(group.fileRoot, group.lowPath)),
    relativeMediumPath: normalizePath(path.relative(group.fileRoot, group.mediumPath)),
    fileRoot: group.fileRoot,
  };
}

async function buildVariantOutput(originalBuffer, profile) {
  let best = null;
  const qualityCandidates = [
    profile.quality,
    Math.max(10, Math.round(profile.quality * 0.85)),
    Math.max(10, Math.round(profile.quality * 0.7)),
    Math.max(10, Math.round(profile.quality * 0.55)),
    Math.max(10, Math.round(profile.quality * 0.4)),
  ];

  for (const quality of qualityCandidates) {
    const buffer = await sharp(originalBuffer, { animated: false })
      .rotate()
      .resize({
        width: profile.maxEdge,
        height: profile.maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 })
      .toBuffer();
    if (!best || buffer.length < best.bytes) {
      best = { buffer, bytes: buffer.length, quality };
    }
    if (buffer.length <= profile.maxBytes) {
      return { buffer, bytes: buffer.length, quality };
    }
  }

  return best;
}

async function writeVariantFile(targetPath, buffer) {
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, targetPath);
}

function buildReport(stats, candidateResults, sampleLimit) {
  const bucketTotal = stats.candidateGroups || 1;
  return {
    backupRoot: stats.backupRoot,
    filesRoot: stats.filesRoot,
    reportPath: stats.reportPath,
    mode: stats.mode,
    generatedAt: new Date().toISOString(),
    imageProfiles: IMAGE_PROFILES,
    summary: {
      scannedGroups: stats.scannedGroups,
      failedGroups: stats.failedGroups,
      sizeEqualGroups: stats.sizeEqualGroups,
      exactDuplicateGroups: stats.exactDuplicateGroups,
      candidateGroups: stats.candidateGroups,
      updatedGroups: stats.updatedGroups,
      candidateRateOfTriples: roundPercent(stats.candidateGroups, stats.scannedGroups),
      currentTotalBytes: stats.currentTotalBytes,
      currentVariantBytes: stats.currentVariantBytes,
      estimatedTotalBytes: stats.estimatedTotalBytes,
      estimatedVariantBytes: stats.estimatedVariantBytes,
      estimatedSavingsBytes: stats.estimatedSavingsBytes,
      estimatedSavingsMiB: roundMiB(stats.estimatedSavingsBytes),
      avgOriginalBytes: stats.candidateGroups > 0 ? Math.round(stats.originalBytes / stats.candidateGroups) : 0,
      avgEstimatedLowBytes: stats.candidateGroups > 0 ? Math.round(stats.estimatedLowBytes / stats.candidateGroups) : 0,
      avgEstimatedMediumBytes: stats.candidateGroups > 0 ? Math.round(stats.estimatedMediumBytes / stats.candidateGroups) : 0,
      avgSavingsBytesPerGroup: stats.candidateGroups > 0 ? Math.round(stats.estimatedSavingsBytes / stats.candidateGroups) : 0,
      formatBreakdown: sortObjectByValue(stats.formatBreakdown),
      maxEdgeBreakdown: {
        le200: {
          count: stats.maxEdgeBuckets.le200,
          percent: roundPercent(stats.maxEdgeBuckets.le200, bucketTotal),
        },
        le512: {
          count: stats.maxEdgeBuckets.le512,
          percent: roundPercent(stats.maxEdgeBuckets.le512, bucketTotal),
        },
        gt512: {
          count: stats.maxEdgeBuckets.gt512,
          percent: roundPercent(stats.maxEdgeBuckets.gt512, bucketTotal),
        },
      },
    },
    failedSamples: stats.failedSamples,
    topSavings: candidateResults.slice(0, sampleLimit).map(toReportRow),
  };
}

function createStats(filesRoot, backupRoot, reportPath) {
  return {
    filesRoot,
    backupRoot,
    reportPath,
    mode: "dry-run",
    scannedGroups: 0,
    failedGroups: 0,
    sizeEqualGroups: 0,
    exactDuplicateGroups: 0,
    candidateGroups: 0,
    updatedGroups: 0,
    currentTotalBytes: 0,
    currentVariantBytes: 0,
    estimatedTotalBytes: 0,
    estimatedVariantBytes: 0,
    estimatedSavingsBytes: 0,
    originalBytes: 0,
    estimatedLowBytes: 0,
    estimatedMediumBytes: 0,
    formatBreakdown: {},
    maxEdgeBuckets: {
      le200: 0,
      le512: 0,
      gt512: 0,
    },
    failedSamples: [],
  };
}

function mergeStats(stats, result) {
  stats.scannedGroups += result.scannedGroups ?? 0;
  stats.sizeEqualGroups += result.sizeEqualGroups ?? 0;
  stats.exactDuplicateGroups += result.exactDuplicateGroups ?? 0;

  if (result.kind !== "candidate") {
    return;
  }

  stats.candidateGroups += 1;
  if (result.executed) {
    stats.updatedGroups += 1;
  }
  stats.currentTotalBytes += result.currentTotalBytes;
  stats.currentVariantBytes += result.currentVariantBytes;
  stats.estimatedTotalBytes += result.estimatedTotalBytes;
  stats.estimatedVariantBytes += result.estimatedVariantBytes;
  stats.estimatedSavingsBytes += result.estimatedSavingsBytes;
  stats.originalBytes += result.originalBytes;
  stats.estimatedLowBytes += result.estimatedLowBytes;
  stats.estimatedMediumBytes += result.estimatedMediumBytes;

  stats.formatBreakdown[result.format] = (stats.formatBreakdown[result.format] ?? 0) + 1;

  if (result.maxEdge <= IMAGE_PROFILES.low.maxEdge) {
    stats.maxEdgeBuckets.le200 += 1;
  }
  else if (result.maxEdge <= IMAGE_PROFILES.medium.maxEdge) {
    stats.maxEdgeBuckets.le512 += 1;
  }
  else {
    stats.maxEdgeBuckets.gt512 += 1;
  }
}

function toReportRow(row) {
  return {
    key: row.key,
    fileRoot: normalizePath(row.fileRoot),
    format: row.format,
    originalWidth: row.originalWidth,
    originalHeight: row.originalHeight,
    originalBytes: row.originalBytes,
    originalMiB: roundMiB(row.originalBytes),
    currentVariantBytes: row.currentVariantBytes,
    currentVariantMiB: roundMiB(row.currentVariantBytes),
    estimatedLowBytes: row.estimatedLowBytes,
    estimatedMediumBytes: row.estimatedMediumBytes,
    estimatedVariantBytes: row.estimatedVariantBytes,
    estimatedVariantMiB: roundMiB(row.estimatedVariantBytes),
    estimatedSavingsBytes: row.estimatedSavingsBytes,
    estimatedSavingsMiB: roundMiB(row.estimatedSavingsBytes),
    relativeOriginalPath: row.relativeOriginalPath,
    relativeLowPath: row.relativeLowPath,
    relativeMediumPath: row.relativeMediumPath,
  };
}

function printSummary(report, execute) {
  const { summary } = report;
  console.log("");
  console.log("=== Dry Run Summary ===");
  console.log(`mode: ${execute ? "execute" : "dry-run"}`);
  console.log(`image triples scanned: ${summary.scannedGroups}`);
  console.log(`failed groups: ${summary.failedGroups}`);
  console.log(`exact duplicate triples: ${summary.candidateGroups} (${summary.candidateRateOfTriples}%)`);
  if (execute) {
    console.log(`updated groups: ${summary.updatedGroups}`);
  }
  console.log(`estimated savings: ${formatBytes(summary.estimatedSavingsBytes)} (${summary.estimatedSavingsMiB} MiB)`);
  console.log(`current variant bytes: ${formatBytes(summary.currentVariantBytes)}`);
  console.log(`estimated variant bytes: ${formatBytes(summary.estimatedVariantBytes)}`);
  console.log(`avg savings per group: ${formatBytes(summary.avgSavingsBytesPerGroup)}`);
  console.log(`maxEdge <= 200: ${summary.maxEdgeBreakdown.le200.count} (${summary.maxEdgeBreakdown.le200.percent}%)`);
  console.log(`200 < maxEdge <= 512: ${summary.maxEdgeBreakdown.le512.count} (${summary.maxEdgeBreakdown.le512.percent}%)`);
  console.log(`maxEdge > 512: ${summary.maxEdgeBreakdown.gt512.count} (${summary.maxEdgeBreakdown.gt512.percent}%)`);
  console.log(`report written: ${report.reportPath}`);
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

async function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  const buffer = await fs.readFile(filePath);
  hash.update(buffer);
  return hash.digest("hex");
}

async function existsAll(...paths) {
  const checks = await Promise.all(paths.map(async (entry) => {
    try {
      const stat = await fs.stat(entry);
      return stat.isFile();
    }
    catch {
      return false;
    }
  }));
  return checks.every(Boolean);
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

function normalizePath(input) {
  return input.split(path.sep).join(path.posix.sep);
}

function roundPercent(part, total) {
  if (!total) {
    return 0;
  }
  return Math.round((part * 10000) / total) / 100;
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
  node scripts/dry-run-media-image-variant-repair.mjs --root <media/v1/files> [--report <json>] [--concurrency 6] [--sample-limit 30]

Example:
  node scripts/dry-run-media-image-variant-repair.mjs ^
    --root D:/A_collection/server-backups/tuanchat-server-data-20260507_043831.no-redis/minio/avatar/media/v1/files

Execute:
  node scripts/dry-run-media-image-variant-repair.mjs ^
    --root D:/A_collection/server-backups/tuanchat-server-data-20260507_043831.no-redis/minio/avatar/media/v1/files ^
    --execute
`);
}
