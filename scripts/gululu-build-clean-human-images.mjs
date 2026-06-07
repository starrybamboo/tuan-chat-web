#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";

function parseArgs(argv) {
  const args = new Map();
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
      continue;
    }
    args.set(key, next);
    i += 1;
  }
  const root = args.get("root") ?? DEFAULT_ROOT;
  return {
    root,
    manifest:
      args.get("manifest") ??
      path.join(root, "image-role-review-copy", "manifest.json"),
    candidates:
      args.get("candidates") ??
      path.join(root, "tuanchat-import-test", "full-image-cleaning-matting-candidates.json"),
    outDir:
      args.get("out-dir") ??
      path.join(root, "image-role-review-clean-human-full"),
    visualCorrections: args.get("visual-corrections") ?? "",
    requireVisualConfirmation: args.has("require-visual-confirmation"),
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

function normalizeRel(rel) {
  return String(rel ?? "").replaceAll("\\", "/");
}

function toDisplayRel(absPath, root) {
  return normalizeRel(path.relative(root, absPath));
}

function sanitizeSegment(value) {
  return String(value || "unknown")
    .replace(/[\p{Cc}<>:"/\\|?*]/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function stemFromRel(rel) {
  const parsed = path.parse(normalizeRel(rel));
  return sanitizeSegment(parsed.name || "image").slice(0, 80);
}

function extFromPath(file, fallback = ".png") {
  const ext = path.extname(file || "").toLowerCase();
  return ext || fallback;
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
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
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

async function readVisualCorrections(file) {
  if (!file) {
    return {
      bySource: new Map(),
      byHash: new Map(),
      count: 0,
    };
  }
  const text = await fs.readFile(file, "utf8");
  const rows = parseCsv(text).filter((row) =>
    row.visualCharacter?.trim() ||
    row.correctedCharacter?.trim() ||
    row.exclude?.trim() ||
    row.visualStatus?.trim(),
  );
  const bySource = new Map();
  const byHash = new Map();
  for (const row of rows) {
    const normalized = {
      sourceRelPath: normalizeRel(row.sourceRelPath),
      sha256: row.sha256,
      visualStatus: row.visualStatus || (row.visualCharacter || row.correctedCharacter ? "confirmed" : ""),
      visualCharacter: row.visualCharacter || row.correctedCharacter || "",
      assetKind: row.assetKind || row.visualAssetKind || "",
      exclude: /^(?:1|y|yes|true|是)$/i.test(row.exclude ?? ""),
      confidence: row.confidence || "",
      notes: row.notes || "",
    };
    if (normalized.sourceRelPath) bySource.set(normalized.sourceRelPath, normalized);
    if (normalized.sha256) byHash.set(normalized.sha256, normalized);
  }
  return {
    bySource,
    byHash,
    count: rows.length,
  };
}

function correctionForEntry(entry, visualCorrections) {
  const rel = normalizeRel(entry.sourceRelPath);
  return visualCorrections.bySource.get(rel) ?? visualCorrections.byHash.get(entry.sha256);
}

function sha1Short(value, length = 10) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, length);
}

function hamming64(a, b) {
  if (a == null || b == null) return 64;
  let x = BigInt.asUintN(64, BigInt(a) ^ BigInt(b));
  let count = 0;
  while (x) {
    x &= x - 1n;
    count += 1;
  }
  return count;
}

function rmse(a, b) {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum / a.length);
}

function aHashFromGray(data) {
  const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
  let hash = 0n;
  for (let i = 0; i < 64; i += 1) {
    if (data[i] >= avg) hash |= 1n << BigInt(i);
  }
  return hash.toString();
}

function dHashFromGray(data, width = 9, height = 8) {
  let hash = 0n;
  let bit = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const left = data[y * width + x];
      const right = data[y * width + x + 1];
      if (left > right) hash |= 1n << BigInt(bit);
      bit += 1;
    }
  }
  return hash.toString();
}

async function grayRaw(image, width, height) {
  return image
    .clone()
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
}

async function flattenedBase(file) {
  return sharp(file, { failOn: "none" })
    .rotate()
    .flatten({ background: "#ffffff" });
}

async function maybeTrimmedBase(file) {
  try {
    return sharp(file, { failOn: "none" })
      .rotate()
      .flatten({ background: "#ffffff" })
      .trim({ background: "#ffffff", threshold: 18 });
  } catch {
    return flattenedBase(file);
  }
}

async function computeImageFeature(item) {
  const file = item.sourceAbsPath;
  const meta = await sharp(file, { failOn: "none" }).metadata();
  const full = await flattenedBase(file);
  const trimmed = await maybeTrimmedBase(file);
  const fullAHash = aHashFromGray(await grayRaw(full, 8, 8));
  const fullDHash = dHashFromGray(await grayRaw(full, 9, 8));
  const trimAHash = aHashFromGray(await grayRaw(trimmed, 8, 8));
  const trimDHash = dHashFromGray(await grayRaw(trimmed, 9, 8));
  const fullVector = Array.from(await grayRaw(full, 16, 16));
  const trimVector = Array.from(await grayRaw(trimmed, 16, 16));
  return {
    fileSize: item.fileSize,
    width: item.width ?? meta.width ?? 0,
    height: item.height ?? meta.height ?? 0,
    fullAHash,
    fullDHash,
    trimAHash,
    trimDHash,
    fullVector,
    trimVector,
  };
}

class UnionFind {
  constructor(items) {
    this.parent = new Map(items.map((item) => [item.id, item.id]));
  }

  find(id) {
    const parent = this.parent.get(id);
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }

  groups(items) {
    const groups = new Map();
    for (const item of items) {
      const root = this.find(item.id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(item);
    }
    return [...groups.values()];
  }
}

function isLowColor(item) {
  return (
    Number(item.meanChroma ?? 0) <= 0.035 &&
    Number(item.colorfulRatio ?? 0) <= 0.04
  );
}

function isMangaLike(item) {
  return !item.isColorSpriteLike && isLowColor(item);
}

function minHashDistance(a, b) {
  return Math.min(
    hamming64(a.feature.fullAHash, b.feature.fullAHash),
    hamming64(a.feature.fullDHash, b.feature.fullDHash),
    hamming64(a.feature.trimAHash, b.feature.trimAHash),
    hamming64(a.feature.trimDHash, b.feature.trimDHash),
  );
}

function isSameMangaFrame(a, b) {
  if (!isMangaLike(a) || !isMangaLike(b)) return false;
  const minDist = minHashDistance(a, b);
  const trimRmse = rmse(a.feature.trimVector, b.feature.trimVector);
  const fullRmse = rmse(a.feature.fullVector, b.feature.fullVector);
  const areaA = Math.max(1, a.feature.width * a.feature.height);
  const areaB = Math.max(1, b.feature.width * b.feature.height);
  const areaRatio = Math.min(areaA, areaB) / Math.max(areaA, areaB);

  if (minDist <= 3 && trimRmse <= 42) return true;
  if (minDist <= 6 && trimRmse <= 34) return true;
  if (minDist <= 8 && trimRmse <= 24) return true;
  if (areaRatio >= 0.85 && minDist <= 5 && fullRmse <= 36) return true;
  return false;
}

function isNearIdenticalRaster(a, b) {
  const minDist = minHashDistance(a, b);
  const trimRmse = rmse(a.feature.trimVector, b.feature.trimVector);
  const fullRmse = rmse(a.feature.fullVector, b.feature.fullVector);
  return minDist <= 1 && Math.min(trimRmse, fullRmse) <= 6;
}

function isColorVariantCandidate(a, b) {
  const colorish =
    a.isColorSpriteLike ||
    b.isColorSpriteLike ||
    Number(a.colorfulRatio ?? 0) > 0.12 ||
    Number(b.colorfulRatio ?? 0) > 0.12;
  if (!colorish) return false;
  const minDist = minHashDistance(a, b);
  const trimRmse = rmse(a.feature.trimVector, b.feature.trimVector);
  return minDist <= 12 && trimRmse <= 70;
}

function chooseCanonical(items) {
  return [...items].sort((a, b) => {
    const areaDelta = b.feature.width * b.feature.height - a.feature.width * a.feature.height;
    if (areaDelta !== 0) return areaDelta;
    const sizeDelta = (b.feature.fileSize ?? 0) - (a.feature.fileSize ?? 0);
    if (sizeDelta !== 0) return sizeDelta;
    return a.sourceRelPath.localeCompare(b.sourceRelPath);
  })[0];
}

function findMatting(item, mattingBySource, mattingByHash) {
  for (const rel of item.allSourceRelPaths) {
    const candidate = mattingBySource.get(rel);
    if (candidate && ["processed", "cached"].includes(candidate.status)) return candidate;
  }
  const byHash = mattingByHash.get(item.sha256);
  if (byHash && ["processed", "cached"].includes(byHash.status)) return byHash;
  return null;
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function materialize(item, output, root) {
  await fs.mkdir(path.dirname(output.absPath), { recursive: true });
  await fs.copyFile(item.materializedSourceAbsPath, output.absPath);
  return toDisplayRel(output.absPath, root);
}

function buildItems(manifest, candidates, mattingResults, outDir, sourceRoot, options) {
  const candidateBySource = new Map(candidates.map((entry) => [normalizeRel(entry.sourceRelPath), entry]));
  const mattingBySource = new Map(mattingResults.map((entry) => [normalizeRel(entry.sourceRelPath), entry]));
  const mattingByHash = new Map();
  for (const result of mattingResults) {
    if (!mattingByHash.has(result.sha256)) mattingByHash.set(result.sha256, result);
  }

  const grouped = new Map();
  let confirmedInputImages = 0;
  let excludedImagesSkipped = 0;
  let visualExcludedImagesSkipped = 0;
  let visualCorrectionsApplied = 0;
  let visualConfirmedImages = 0;
  let visualUnconfirmedImagesSkipped = 0;
  for (const entry of manifest.entries ?? []) {
    if (entry.excluded || entry.reviewStatus === "excluded") {
      excludedImagesSkipped += 1;
      continue;
    }
    if (!entry.confirmed) continue;
    const correction = correctionForEntry(entry, options.visualCorrections);
    if (correction?.exclude) {
      visualExcludedImagesSkipped += 1;
      continue;
    }
    const isVisualConfirmed = correction?.visualStatus === "confirmed" && Boolean(correction.visualCharacter);
    if (isVisualConfirmed) visualConfirmedImages += 1;
    if (options.requireVisualConfirmation && !isVisualConfirmed) {
      visualUnconfirmedImagesSkipped += 1;
      continue;
    }
    const character =
      correction?.visualCharacter?.trim() ||
      entry.confirmedCharacter ||
      entry.candidateCharacter ||
      entry.bucket;
    if (!character) continue;
    if (correction?.visualCharacter?.trim() && correction.visualCharacter.trim() !== entry.confirmedCharacter) {
      visualCorrectionsApplied += 1;
    }
    confirmedInputImages += 1;
    const sourceRelPath = normalizeRel(entry.sourceRelPath);
    const sha256 = entry.sha256 || sourceRelPath;
    const groupKey = `${character}\u0000${sha256}`;
    const candidate = candidateBySource.get(sourceRelPath) ?? {};
    const sourceAbsPath =
      entry.sourceAbsPath ?? path.join(sourceRoot, "images", sourceRelPath.replaceAll("/", path.sep));
    const allSourceRelPaths = new Set([
      sourceRelPath,
      ...(entry.sourceRelPaths ?? []).map(normalizeRel),
      ...(entry.duplicateSourceRelPaths ?? []).map(normalizeRel),
    ]);
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        id: sha1Short(groupKey, 16),
        character,
        assetKind: correction?.assetKind || entry.assetKind || candidate.assetKind || "avatar",
        sourceRelPath,
        sourceAbsPath,
        sha256,
        allSourceRelPaths,
        duplicateSourceRelPaths: new Set(entry.duplicateSourceRelPaths ?? []),
        contexts: [...(entry.contexts ?? [])],
        confidence: entry.confidence ?? null,
        width: candidate.width,
        height: candidate.height,
        hasAlpha: candidate.hasAlpha,
        transparentRatio: candidate.transparentRatio,
        edgeWhiteRatio: candidate.edgeWhiteRatio,
        meanChroma: candidate.meanChroma,
        colorfulRatio: candidate.colorfulRatio,
        isColorSpriteLike: Boolean(candidate.isColorSpriteLike),
        shouldMatte: Boolean(candidate.shouldMatte),
        visualStatus: correction?.visualStatus ?? "",
        visualNotes: correction?.notes ?? "",
        sourceEntries: [entry],
      });
      continue;
    }
    const existing = grouped.get(groupKey);
    existing.sourceEntries.push(entry);
    existing.contexts.push(...(entry.contexts ?? []));
    for (const rel of allSourceRelPaths) existing.allSourceRelPaths.add(rel);
    for (const rel of entry.duplicateSourceRelPaths ?? []) existing.duplicateSourceRelPaths.add(rel);
  }

  const items = [...grouped.values()].map((item) => {
    item.allSourceRelPaths = [...item.allSourceRelPaths].map(normalizeRel).sort();
    item.duplicateSourceRelPaths = [...item.duplicateSourceRelPaths].map(normalizeRel).sort();
    const matting = findMatting(item, mattingBySource, mattingByHash);
    item.matting = matting;
    item.materializedSourceAbsPath = matting?.transparentRelPath
      ? path.join(outDir, matting.transparentRelPath.replaceAll("/", path.sep))
      : item.sourceAbsPath;
    return item;
  });

  return {
    items,
    confirmedInputImages,
    excludedImagesSkipped,
    visualExcludedImagesSkipped,
    visualCorrectionsApplied,
    visualConfirmedImages,
    visualUnconfirmedImagesSkipped,
  };
}

async function attachFileStats(items) {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const stat = await fs.stat(item.sourceAbsPath);
    item.fileSize = stat.size;
    item.feature = await computeImageFeature(item);
    if ((index + 1) % 100 === 0) {
      console.log(`features ${index + 1}/${items.length}`);
    }
  }
}

function groupByCharacter(items) {
  const byCharacter = new Map();
  for (const item of items) {
    if (!byCharacter.has(item.character)) byCharacter.set(item.character, []);
    byCharacter.get(item.character).push(item);
  }
  return byCharacter;
}

function annotateRelations(byCharacter) {
  const duplicateGroups = [];
  const variantGroups = [];
  for (const [character, items] of byCharacter) {
    const duplicateUf = new UnionFind(items);
    const variantUf = new UnionFind(items);
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        if (isSameMangaFrame(a, b) || (isMangaLike(a) && isMangaLike(b) && isNearIdenticalRaster(a, b))) {
          duplicateUf.union(a.id, b.id);
          continue;
        }
        if (isColorVariantCandidate(a, b)) {
          variantUf.union(a.id, b.id);
        }
      }
    }

    let duplicateIndex = 1;
    for (const group of duplicateUf.groups(items)) {
      if (group.length <= 1) continue;
      const canonical = chooseCanonical(group);
      const groupId = `${sanitizeSegment(character)}-visual-${String(duplicateIndex).padStart(3, "0")}`;
      duplicateIndex += 1;
      duplicateGroups.push({ character, groupId, canonical, items: group });
      for (const item of group) {
        item.visualGroupId = groupId;
        item.visualRelationType = "visualDuplicate";
        item.visualCanonicalSha256 = canonical.sha256;
        item.visualCanonicalSourceRelPath = canonical.sourceRelPath;
        item.hiddenByVisualDuplicate = item.id !== canonical.id;
      }
    }

    let variantIndex = 1;
    for (const group of variantUf.groups(items)) {
      const eligible = group.filter((item) => !item.visualRelationType);
      if (eligible.length <= 1) continue;
      const groupId = `${sanitizeSegment(character)}-variant-${String(variantIndex).padStart(3, "0")}`;
      variantIndex += 1;
      variantGroups.push({ character, groupId, items: eligible });
      for (const item of eligible) {
        item.visualGroupId = groupId;
        item.visualRelationType = "variantGroup";
        item.visualCanonicalSha256 = "";
        item.visualCanonicalSourceRelPath = "";
        item.hiddenByVisualDuplicate = false;
      }
    }

    for (const item of items) {
      if (!item.visualRelationType) {
        item.visualRelationType = "single";
        item.visualGroupId = "";
        item.visualCanonicalSha256 = "";
        item.visualCanonicalSourceRelPath = "";
        item.hiddenByVisualDuplicate = false;
      }
    }
  }
  return { duplicateGroups, variantGroups };
}

function outputName(item, sequence, duplicateGroupSizes) {
  const prefix = String(sequence).padStart(4, "0");
  const stem = stemFromRel(item.sourceRelPath);
  const matted = item.matting ? "__matted" : "";
  if (item.visualRelationType === "visualDuplicate") {
    const size = duplicateGroupSizes.get(item.visualGroupId) ?? 1;
    return `${prefix}__${stem}__dup${size}${matted}.png`;
  }
  if (item.visualRelationType === "variantGroup") {
    return `${prefix}__${stem}__variant${matted}${extFromPath(item.materializedSourceAbsPath)}`;
  }
  return `${prefix}__${stem}${matted}${extFromPath(item.materializedSourceAbsPath)}`;
}

async function rebuildOutputDir(outDir) {
  const resolvedOut = path.resolve(outDir);
  const byCharacter = path.join(resolvedOut, "by-character");
  const resolvedByCharacter = path.resolve(byCharacter);
  if (!resolvedByCharacter.startsWith(resolvedOut + path.sep)) {
    throw new Error(`Refusing to remove unexpected path: ${resolvedByCharacter}`);
  }
  await fs.rm(byCharacter, { recursive: true, force: true });
  await fs.mkdir(byCharacter, { recursive: true });
  await fs.mkdir(path.join(resolvedOut, "reports"), { recursive: true });
}

async function resetChildDir(parent, childName) {
  const resolvedParent = path.resolve(parent);
  const child = path.join(resolvedParent, childName);
  const resolvedChild = path.resolve(child);
  if (!resolvedChild.startsWith(resolvedParent + path.sep)) {
    throw new Error(`Refusing to remove unexpected path: ${resolvedChild}`);
  }
  await fs.rm(resolvedChild, { recursive: true, force: true });
  await fs.mkdir(resolvedChild, { recursive: true });
  return resolvedChild;
}

async function imageTile(item, label, tileW, tileH, labelH) {
  const image = await sharp(item.sourceAbsPath, { failOn: "none" })
    .resize(tileW, tileH - labelH, { fit: "inside", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .extend({ top: 0, bottom: labelH, left: 0, right: 0, background: "#ffffff" })
    .png()
    .toBuffer();
  const safeLabel = escapeXml(label);
  const labelSvg = Buffer.from(
    `<svg width="${tileW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="100%" height="100%" fill="#ffffff"/>` +
      `<text x="6" y="16" font-size="11" font-family="Arial, sans-serif" fill="#111">${safeLabel.slice(0, 36)}</text>` +
      `<text x="6" y="32" font-size="11" font-family="Arial, sans-serif" fill="#111">${safeLabel.slice(36, 72)}</text>` +
      `</svg>`,
  );
  return { image, labelSvg };
}

async function writeDuplicateContactSheets(duplicateGroups, outDir) {
  const sheetsDir = await resetChildDir(path.join(outDir, "reports"), "duplicate-contact-sheets");
  const tileW = 190;
  const tileH = 230;
  const labelH = 44;
  const cols = 4;
  const maxItemsPerSheet = 48;
  const rows = [];

  for (const group of duplicateGroups) {
    const ordered = [
      group.canonical,
      ...group.items
        .filter((item) => item.id !== group.canonical.id)
        .sort((a, b) => a.sourceRelPath.localeCompare(b.sourceRelPath)),
    ].slice(0, maxItemsPerSheet);
    const composites = [];
    for (let index = 0; index < ordered.length; index += 1) {
      const item = ordered[index];
      const label = `${index === 0 ? "CANON" : "DUP"} ${item.sourceRelPath}`;
      const { image, labelSvg } = await imageTile(item, label, tileW, tileH, labelH);
      const left = (index % cols) * tileW;
      const top = Math.floor(index / cols) * tileH;
      composites.push({ input: image, left, top });
      composites.push({ input: labelSvg, left, top: top + tileH - labelH });
    }
    const sheetRows = Math.max(1, Math.ceil(ordered.length / cols));
    const filename = `${sanitizeSegment(group.groupId)}.png`;
    const absPath = path.join(sheetsDir, filename);
    await sharp({
      create: {
        width: cols * tileW,
        height: sheetRows * tileH,
        channels: 3,
        background: "#f3f4f6",
      },
    })
      .composite(composites)
      .png()
      .toFile(absPath);
    rows.push({
      character: group.character,
      visualGroupId: group.groupId,
      sheetRelPath: toDisplayRel(absPath, outDir),
      groupSize: group.items.length,
      shownItems: ordered.length,
      canonicalSourceRelPath: group.canonical.sourceRelPath,
    });
  }
  return rows;
}

async function writeOutputs({ items, duplicateGroups, variantGroups, outDir, sourceRoot, counts }) {
  await rebuildOutputDir(outDir);
  const duplicateGroupSizes = new Map(
    duplicateGroups.map((group) => [group.groupId, group.items.length]),
  );
  const indexRows = [];
  const allSourceRows = [];
  const removedRows = [];
  const characterSummaries = [];
  const byCharacter = groupByCharacter(items);

  for (const [character, characterItems] of [...byCharacter.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    let sequence = 1;
    let outputCount = 0;
    let visualRemoved = 0;
    let mattedOutputCount = 0;
    const charDir = path.join(outDir, "by-character", sanitizeSegment(character));
    for (const item of characterItems.sort((a, b) => a.sourceRelPath.localeCompare(b.sourceRelPath))) {
      if (item.hiddenByVisualDuplicate) {
        visualRemoved += 1;
        const canonical = characterItems.find((candidate) => candidate.id !== item.id && candidate.sha256 === item.visualCanonicalSha256)
          ?? characterItems.find((candidate) => candidate.sourceRelPath === item.visualCanonicalSourceRelPath);
        removedRows.push({
          character,
          visualGroupId: item.visualGroupId,
          canonicalSourceRelPath: item.visualCanonicalSourceRelPath,
          canonicalSha256: item.visualCanonicalSha256,
          duplicateSourceRelPath: item.sourceRelPath,
          duplicateSha256: item.sha256,
          width: item.feature.width,
          height: item.feature.height,
          minHashDistanceToCanonical: canonical ? minHashDistance(item, canonical) : "",
          trimRmseToCanonical: canonical ? rmse(item.feature.trimVector, canonical.feature.trimVector).toFixed(2) : "",
        });
        for (const sourceRelPath of item.allSourceRelPaths) {
          allSourceRows.push({
            character,
            sourceRelPath,
            sourceSha256: item.sha256,
            outputRelPath: "",
            visualRelationType: item.visualRelationType,
            visualGroupId: item.visualGroupId,
            canonicalSourceRelPath: item.visualCanonicalSourceRelPath,
            canonicalSha256: item.visualCanonicalSha256,
            materializedAs: "hidden-visual-duplicate",
            mattingStatus: item.matting?.status ?? "",
          });
        }
        continue;
      }

      const name = outputName(item, sequence, duplicateGroupSizes);
      sequence += 1;
      outputCount += 1;
      if (item.matting) mattedOutputCount += 1;
      const outputAbsPath = path.join(charDir, name);
      const outputRelPath = await materialize(item, { absPath: outputAbsPath }, outDir);
      item.outputRelPath = outputRelPath;
      const hiddenDuplicateSources = items
        .filter((candidate) => candidate.hiddenByVisualDuplicate && candidate.visualCanonicalSourceRelPath === item.sourceRelPath)
        .flatMap((candidate) => candidate.allSourceRelPaths);
      const duplicateSourceRelPaths = [
        ...new Set([
          ...item.duplicateSourceRelPaths,
          ...item.allSourceRelPaths.filter((rel) => rel !== item.sourceRelPath),
          ...hiddenDuplicateSources,
        ]),
      ].sort();
      indexRows.push({
        character,
        outputRelPath,
        keptReason:
          item.visualRelationType === "visualDuplicate"
            ? "visualDuplicate-kept-canonical"
            : item.visualRelationType === "variantGroup"
              ? "variantGroup-kept-all"
              : "single-kept",
        sourceRelPath: item.sourceRelPath,
        sha256: item.sha256,
        duplicateSourceRelPaths,
        visualGroupId: item.visualGroupId,
        visualRelationType: item.visualRelationType,
        visualGroupSize: duplicateGroupSizes.get(item.visualGroupId) ?? (item.visualRelationType === "variantGroup" ? characterItems.filter((candidate) => candidate.visualGroupId === item.visualGroupId).length : 1),
        canonicalSha256: item.visualRelationType === "visualDuplicate" ? item.sha256 : item.visualCanonicalSha256,
        mattingStatus: item.matting?.status ?? "",
        transparentRelPath: item.matting?.transparentRelPath ?? "",
        width: item.feature.width,
        height: item.feature.height,
        meanChroma: item.meanChroma ?? "",
        colorfulRatio: item.colorfulRatio ?? "",
        materializedAs: item.matting ? "matted-transparent" : "source-copy",
        visualStatus: item.visualStatus,
        visualNotes: item.visualNotes,
      });
      for (const sourceRelPath of item.allSourceRelPaths) {
        allSourceRows.push({
          character,
          sourceRelPath,
          sourceSha256: item.sha256,
          outputRelPath,
          visualRelationType: item.visualRelationType,
          visualGroupId: item.visualGroupId,
          canonicalSourceRelPath: item.sourceRelPath,
          canonicalSha256: item.sha256,
          materializedAs: item.matting ? "matted-transparent" : "source-copy",
          mattingStatus: item.matting?.status ?? "",
        });
      }
    }
    characterSummaries.push({
      character,
      inputPhysicalImages: characterItems.length,
      outputImages: outputCount,
      visualDuplicateRemoved: visualRemoved,
      mattedOutputImages: mattedOutputCount,
      mangaLikeImages: characterItems.filter(isMangaLike).length,
      colorSpriteLikeImages: characterItems.filter((item) => item.isColorSpriteLike).length,
      variantGroupImages: characterItems.filter((item) => item.visualRelationType === "variantGroup").length,
    });
  }

  const indexColumns = [
    "character",
    "outputRelPath",
    "keptReason",
    "sourceRelPath",
    "sha256",
    "duplicateSourceRelPaths",
    "visualGroupId",
    "visualRelationType",
    "visualGroupSize",
    "canonicalSha256",
    "mattingStatus",
    "transparentRelPath",
    "width",
    "height",
    "meanChroma",
    "colorfulRatio",
      "materializedAs",
      "visualStatus",
      "visualNotes",
  ];
  const sourceColumns = [
    "character",
    "sourceRelPath",
    "sourceSha256",
    "outputRelPath",
    "visualRelationType",
    "visualGroupId",
    "canonicalSourceRelPath",
    "canonicalSha256",
    "materializedAs",
    "mattingStatus",
  ];
  const removedColumns = [
    "character",
    "visualGroupId",
    "canonicalSourceRelPath",
    "canonicalSha256",
    "duplicateSourceRelPath",
    "duplicateSha256",
    "width",
    "height",
    "minHashDistanceToCanonical",
    "trimRmseToCanonical",
  ];
  await fs.writeFile(path.join(outDir, "index.csv"), `${toCsv(indexRows, indexColumns)}\n`, "utf8");
  await fs.writeFile(path.join(outDir, "source-map.csv"), `${toCsv(allSourceRows, sourceColumns)}\n`, "utf8");
  await fs.writeFile(
    path.join(outDir, "reports", "visual-duplicates-removed.csv"),
    `${toCsv(removedRows, removedColumns)}\n`,
    "utf8",
  );
  const contactSheetRows = await writeDuplicateContactSheets(duplicateGroups, outDir);
  await fs.writeFile(
    path.join(outDir, "reports", "duplicate-contact-sheets.csv"),
    `${toCsv(contactSheetRows, [
      "character",
      "visualGroupId",
      "sheetRelPath",
      "groupSize",
      "shownItems",
      "canonicalSourceRelPath",
    ])}\n`,
    "utf8",
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceRoot,
    outputRoot: outDir,
    confirmedInputImages: counts.confirmedInputImages,
    physicalUniqueImages: items.length,
    excludedImagesSkipped: counts.excludedImagesSkipped,
    visualExcludedImagesSkipped: counts.visualExcludedImagesSkipped,
    visualCorrectionsInput: counts.visualCorrectionsInput,
    visualCorrectionsApplied: counts.visualCorrectionsApplied,
    visualConfirmedImages: counts.visualConfirmedImages,
    visualUnconfirmedImagesSkipped: counts.visualUnconfirmedImagesSkipped,
    requireVisualConfirmation: counts.requireVisualConfirmation,
    mattingCandidates: counts.mattingCandidates,
    mattedOutputsAvailable: items.filter((item) => item.matting).length,
    outputImages: indexRows.length,
    visualDuplicateRemoved: removedRows.length,
    duplicateGroups: duplicateGroups.length,
    variantGroups: variantGroups.length,
    variantGroupImages: items.filter((item) => item.visualRelationType === "variantGroup").length,
    mangaLikeImages: items.filter(isMangaLike).length,
    colorSpriteLikeImages: items.filter((item) => item.isColorSpriteLike).length,
    characters: characterSummaries.sort((a, b) => b.inputPhysicalImages - a.inputPhysicalImages),
    reports: {
      index: "index.csv",
      sourceMap: "source-map.csv",
      visualDuplicatesRemoved: "reports/visual-duplicates-removed.csv",
      duplicateContactSheets: "reports/duplicate-contact-sheets.csv",
      mattingResults: "reports/matting-results.json",
    },
  };
  await fs.writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await fs.writeFile(
    path.join(outDir, "README.md"),
    [
      "# 图片清洗输出",
      "",
      "- `by-character/`: 人类浏览主目录；视觉重复图只保留 canonical。",
      "- `processed/transparent/`: rembg:isnet-anime 透明化结果；主目录会优先引用这里的成功结果。",
      "- `index.csv`: 主目录每张输出图的来源、去重关系和抠图状态。",
      "- `source-map.csv`: 每个源图片路径映射到最终输出或 canonical。",
      "- `reports/visual-duplicates-removed.csv`: 被隐藏的视觉重复图清单。",
      "- `reports/duplicate-contact-sheets/`: 每个视觉重复组的 canonical/duplicate 抽样图板。",
      "- 原始 `images/` 未修改，重复图也没有从源目录删除。",
      "- 最终导入前应提供 `visual-corrections.csv` 并使用 `--require-visual-confirmation` 重建；否则该目录只能视为程序候选清洗结果。",
      "",
      "规则：黑白/漫画头像允许高置信视觉重复合并；彩色立绘和表情差分默认保留，只标记为 `variantGroup`。",
      "",
    ].join("\n"),
    "utf8",
  );
  return summary;
}

async function main() {
  const options = parseArgs(process.argv);
  const manifest = await readJson(options.manifest);
  const candidates = await readJson(options.candidates);
  const visualCorrections = await readVisualCorrections(options.visualCorrections);
  const mattingResultsPath = path.join(options.outDir, "reports", "matting-results.json");
  const mattingResultsJson = (await fileExists(mattingResultsPath))
    ? await readJson(mattingResultsPath)
    : { results: [] };
  const mattingResults = mattingResultsJson.results ?? [];
  const {
    items,
    confirmedInputImages,
    excludedImagesSkipped,
    visualExcludedImagesSkipped,
    visualCorrectionsApplied,
    visualConfirmedImages,
    visualUnconfirmedImagesSkipped,
  } = buildItems(
    manifest,
    Array.isArray(candidates) ? candidates : candidates.entries ?? candidates.results ?? [],
    mattingResults,
    options.outDir,
    options.root,
    {
      visualCorrections,
      requireVisualConfirmation: options.requireVisualConfirmation,
    },
  );

  console.log(`confirmed input images: ${confirmedInputImages}`);
  console.log(`physical unique images: ${items.length}`);
  console.log(`matting results: ${mattingResults.length}`);
  await attachFileStats(items);
  const byCharacter = groupByCharacter(items);
  const { duplicateGroups, variantGroups } = annotateRelations(byCharacter);
  const summary = await writeOutputs({
    items,
    duplicateGroups,
    variantGroups,
    outDir: options.outDir,
    sourceRoot: options.root,
    counts: {
      confirmedInputImages,
      excludedImagesSkipped,
      visualExcludedImagesSkipped,
      visualCorrectionsInput: visualCorrections.count,
      visualCorrectionsApplied,
      visualConfirmedImages,
      visualUnconfirmedImagesSkipped,
      requireVisualConfirmation: options.requireVisualConfirmation,
      mattingCandidates: mattingResults.length,
    },
  });
  console.log(JSON.stringify({
    outputRoot: options.outDir,
    outputImages: summary.outputImages,
    visualDuplicateRemoved: summary.visualDuplicateRemoved,
    mattedOutputsAvailable: summary.mattedOutputsAvailable,
    duplicateGroups: summary.duplicateGroups,
    variantGroups: summary.variantGroups,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
