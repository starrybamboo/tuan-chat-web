#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  buildGululuReplayImportPackage,
  parseGululuFloors,
} from "./gululu-replay-import.mjs";

const DEFAULT_ROOT = "D:\\gululu-cache\\output\\opus-88-owner-only-refetch-v3";
const IMAGE_MARKDOWN_PATTERN = /!\[image\]\(([^)]+)\)/g;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);
const BGM_LINE_PATTERN = /^\s*BGM\s*[:：]\s*(?<name>.+?)\s*$/i;
const SPEAKER_LINE_PATTERN = /^\s*(?<speaker>[^:：\r\n]{1,18})\s*[:：]\s*(?<content>.*)$/;
const DICE_PATTERN = /(?:【[^】]*(?:\d*d\d+|\d+d\d+|1d|d\d+)[^】]*】|\[[0-9]*d[0-9]+[:：=][^\]]*\])/i;
const SCENE_TILDE_PATTERN = /^\s*[~～](?<label>[^~～]{1,48})[~～]\s*$/;
const SCENE_DASH_PATTERN = /^\s*[—-]{2,}(?<label>[^—-]{1,48})[—-]{2,}\s*$/;
const LOCATION_WORDS = [
  "永远亭",
  "神灵庙",
  "博丽神社",
  "红魔馆",
  "命莲寺",
  "人间之里",
  "太阳花田",
  "雾之湖",
  "旧地狱",
  "地灵殿",
  "辉针城",
  "白玉楼",
  "妖怪之山",
  "迷途竹林",
  "魔法森林",
  "守矢神社",
  "香霖堂",
  "月之都",
  "神心会馆",
  "地下竞技场",
  "医务室",
  "图书馆",
  "三途河",
  "铃奈庵",
  "稗田邸",
];
const IGNORED_SPEAKERS = new Set(["ATK", "Atk", "BGM", "HP", "Hp", "技能", "攻击", "必杀技", "种族"]);

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
    forceFeatures: args.has("force-features"),
    fromFloor: Number(args.get("from") ?? 1),
    manifestPath: args.get("manifest") ?? path.join(root, "image-role-review-copy", "manifest.json"),
    outDir: path.resolve(args.get("out-dir") ?? path.join(root, "cleaning-review-ai-first-v1")),
    root,
    toFloor: Number(args.get("to") ?? Number.MAX_SAFE_INTEGER),
  };
}

function normalizeLineBreaks(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function normalizeRelPath(rawPath) {
  return String(rawPath ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\.\/images\//, "")
    .replace(/^images\//, "")
    .replace(/^\/+/, "");
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

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(file, fallback = null) {
  if (!(await pathExists(file))) return fallback;
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function readCsvIfExists(file) {
  if (!(await pathExists(file))) return [];
  return parseCsv(await fs.readFile(file, "utf8"));
}

async function readAllPartMarkdown(root) {
  const meta = JSON.parse(await fs.readFile(path.join(root, "meta.json"), "utf8"));
  const partsDir = path.join(root, "parts");
  const names = await fs.readdir(partsDir);
  const parts = [];
  for (let index = 1; index <= meta.partCount; index += 1) {
    const prefix = `part-${String(index).padStart(4, "0")}_`;
    const name = names.find((candidate) => candidate.startsWith(prefix) && candidate.endsWith(".md"));
    if (!name) throw new Error(`未找到分片: ${prefix}*.md`);
    parts.push({
      name,
      text: await fs.readFile(path.join(partsDir, name), "utf8"),
    });
  }
  return { markdown: parts.map((part) => part.text).join("\n\n"), meta, parts };
}

async function listImages(dir, baseDir = dir) {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await listImages(absPath, baseDir));
      continue;
    }
    if (!entry.isFile() || !IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    const stat = await fs.stat(absPath);
    result.push({
      absPath,
      fileSize: stat.size,
      mtimeMs: stat.mtimeMs,
      sourceRelPath: normalizeRelPath(path.relative(baseDir, absPath)),
    });
  }
  return result.sort((left, right) => left.sourceRelPath.localeCompare(right.sourceRelPath));
}

async function sha256File(file) {
  return crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

function shortHash(value, length = 12) {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, length);
}

function parseSpeakerLine(line) {
  const matched = String(line ?? "").match(SPEAKER_LINE_PATTERN);
  if (!matched?.groups) return null;
  const speaker = matched.groups.speaker.trim().replace(/^[“”「」『』]+|[“”「」『』]+$/g, "").trim();
  if (!speaker || IGNORED_SPEAKERS.has(speaker) || /^(?:T\d+|\d+)$/.test(speaker) || speaker.length > 12) {
    return null;
  }
  return { content: matched.groups.content.trim(), speaker };
}

function extractImageContexts(floors) {
  const contextsByImage = new Map();
  for (const floor of floors) {
    const matches = [...floor.body.matchAll(IMAGE_MARKDOWN_PATTERN)];
    for (const [index, matched] of matches.entries()) {
      const relPath = normalizeRelPath(matched[1]);
      const nextStart = matched.index + matched[0].length;
      const nextEnd = matches[index + 1]?.index ?? floor.body.length;
      const prevStart = matches[index - 1] ? matches[index - 1].index + matches[index - 1][0].length : 0;
      const beforeLines = normalizeLineBreaks(floor.body.slice(prevStart, matched.index))
        .split("\n").map((line) => line.trim()).filter(Boolean).slice(-5);
      const afterLines = normalizeLineBreaks(floor.body.slice(nextStart, nextEnd))
        .split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 5);
      const speakerBefore = beforeLines.map(parseSpeakerLine).filter(Boolean).at(-1)?.speaker ?? "";
      const speakerAfter = afterLines.map(parseSpeakerLine).find(Boolean)?.speaker ?? "";
      const contexts = contextsByImage.get(relPath) ?? [];
      contexts.push({
        after: afterLines.join(" / ").slice(0, 320),
        before: beforeLines.join(" / ").slice(0, 320),
        floor: floor.floor,
        imageIndexInFloor: index + 1,
        nearbySpeakers: [...new Set([speakerBefore, speakerAfter].filter(Boolean))],
        speakerAfter,
        speakerBefore,
        time: floor.time,
      });
      contextsByImage.set(relPath, contexts);
    }
  }
  return contextsByImage;
}

function parseSceneMarker(line) {
  const trimmed = String(line ?? "").trim();
  const matched = trimmed.match(SCENE_TILDE_PATTERN) ?? trimmed.match(SCENE_DASH_PATTERN);
  if (!matched?.groups?.label) {
    return null;
  }
  const label = matched.groups.label.trim();
  const locationName = LOCATION_WORDS.find((word) => label.includes(word)) ?? "";
  return {
    label,
    locationName,
    markerKind: trimmed.startsWith("—") || trimmed.startsWith("-") ? "dash" : "tilde",
  };
}

function buildSceneEvents(floors) {
  const sceneEvents = [];
  for (const floor of floors) {
    for (const [lineIndex, rawLine] of normalizeLineBreaks(floor.body).split("\n").entries()) {
      const marker = parseSceneMarker(rawLine);
      if (!marker) continue;
      sceneEvents.push({
        eventIndex: `scene-${sceneEvents.length + 1}`,
        floor: floor.floor,
        lineIndex: lineIndex + 1,
        locationName: marker.locationName,
        markerKind: marker.markerKind,
        notes: marker.locationName ? "" : "作者标志行，但未归一化为地点",
        sceneId: `scene-${String(sceneEvents.length + 1).padStart(5, "0")}`,
        sceneLabel: marker.label,
        source: "author-scene-marker",
        sourceText: rawLine.trim(),
      });
    }
  }
  return sceneEvents;
}

function buildSceneLookup(sceneEvents) {
  const byFloor = new Map();
  for (const scene of sceneEvents) {
    const items = byFloor.get(scene.floor) ?? [];
    items.push(scene);
    byFloor.set(scene.floor, items);
  }
  return byFloor;
}

function floorAuditRows(floors, meta) {
  const seen = new Set();
  const rows = [];
  let previous = 0;
  for (const floor of floors) {
    const duplicate = seen.has(floor.floor);
    const gap = previous && floor.floor > previous + 1 ? `${previous + 1}-${floor.floor - 1}` : "";
    rows.push({
      duplicate,
      floor: floor.floor,
      gapBefore: gap,
      hasBody: Boolean(floor.body?.trim()),
      outOfOrder: previous > floor.floor,
      time: floor.time,
    });
    seen.add(floor.floor);
    previous = floor.floor;
  }
  const maxFloor = Math.max(...floors.map((floor) => floor.floor));
  return {
    maxFloor,
    rows,
    summary: {
      duplicateFloors: rows.filter((row) => row.duplicate).length,
      floorCount: floors.length,
      maxFloor,
      metaPartCount: meta.partCount,
      missingRanges: rows.map((row) => row.gapBefore).filter(Boolean),
    },
  };
}

function aHashFromGray(data) {
  const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
  let hash = 0n;
  for (let index = 0; index < 64; index += 1) {
    if (data[index] >= avg) hash |= 1n << BigInt(index);
  }
  return hash.toString();
}

function dHashFromGray(data, width = 9, height = 8) {
  let hash = 0n;
  let bit = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      if (data[y * width + x] > data[y * width + x + 1]) hash |= 1n << BigInt(bit);
      bit += 1;
    }
  }
  return hash.toString();
}

function hamming64(a, b) {
  let value = BigInt.asUintN(64, BigInt(a ?? 0) ^ BigInt(b ?? 0));
  let count = 0;
  while (value) {
    value &= value - 1n;
    count += 1;
  }
  return count;
}

function rmse(left, right) {
  if (!left || !right || left.length !== right.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const delta = left[index] - right[index];
    sum += delta * delta;
  }
  return Math.sqrt(sum / left.length);
}

async function grayRaw(image, width, height) {
  return image.clone().resize(width, height, { fit: "fill" }).greyscale().raw().toBuffer();
}

function colorStats(rgbBuffer) {
  let chromaSum = 0;
  let colorful = 0;
  let whiteCorners = 0;
  const pixels = rgbBuffer.length / 3;
  for (let index = 0; index < rgbBuffer.length; index += 3) {
    const r = rgbBuffer[index];
    const g = rgbBuffer[index + 1];
    const b = rgbBuffer[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = (max - min) / 255;
    chromaSum += chroma;
    if (chroma > 0.08) colorful += 1;
  }
  const cornerIndexes = [0, 63, 64 * 63, 64 * 64 - 1];
  for (const pixelIndex of cornerIndexes) {
    const offset = pixelIndex * 3;
    const r = rgbBuffer[offset];
    const g = rgbBuffer[offset + 1];
    const b = rgbBuffer[offset + 2];
    if (r > 238 && g > 238 && b > 238 && Math.max(r, g, b) - Math.min(r, g, b) < 12) {
      whiteCorners += 1;
    }
  }
  return {
    colorfulRatio: Number((colorful / pixels).toFixed(4)),
    meanChroma: Number((chromaSum / pixels).toFixed(4)),
    whiteBackgroundLikely: whiteCorners >= 3,
  };
}

function edgeDensity(grayBuffer, width = 64, height = 64) {
  let edges = 0;
  let total = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const current = grayBuffer[y * width + x];
      if (Math.abs(current - grayBuffer[y * width + x + 1]) > 36) edges += 1;
      if (Math.abs(current - grayBuffer[(y + 1) * width + x]) > 36) edges += 1;
      total += 2;
    }
  }
  return Number((edges / total).toFixed(4));
}

async function computeFeature(image) {
  const meta = await sharp(image.absPath, { failOn: "none" }).metadata();
  const full = sharp(image.absPath, { failOn: "none" }).rotate().flatten({ background: "#ffffff" });
  const trimmed = sharp(image.absPath, { failOn: "none" })
    .rotate()
    .flatten({ background: "#ffffff" })
    .trim({ background: "#ffffff", threshold: 18 });
  const fullGray64 = await grayRaw(full, 8, 8);
  const trimGray64 = await grayRaw(trimmed, 8, 8);
  const fullDGray = await grayRaw(full, 9, 8);
  const trimDGray = await grayRaw(trimmed, 9, 8);
  const fullVector = Array.from(await grayRaw(full, 16, 16));
  const trimVector = Array.from(await grayRaw(trimmed, 16, 16));
  const rgb64 = await sharp(image.absPath, { failOn: "none" })
    .rotate()
    .resize(64, 64, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const gray64 = await sharp(image.absPath, { failOn: "none" })
    .rotate()
    .resize(64, 64, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
  const colors = colorStats(rgb64);
  return {
    aspectRatio: Number(((meta.width ?? 0) / Math.max(1, meta.height ?? 1)).toFixed(4)),
    colorfulRatio: colors.colorfulRatio,
    edgeDensity: edgeDensity(gray64),
    featureVersion: "aHash-dHash-rmse-color-v1",
    fileSize: image.fileSize,
    fullAHash: aHashFromGray(fullGray64),
    fullDHash: dHashFromGray(fullDGray),
    fullPHash: null,
    fullVector,
    hasAlpha: Boolean(meta.hasAlpha),
    height: meta.height ?? 0,
    meanChroma: colors.meanChroma,
    pHashStatus: "not-computed",
    sha256: image.sha256,
    sourceRelPath: image.sourceRelPath,
    trimAHash: aHashFromGray(trimGray64),
    trimDHash: dHashFromGray(trimDGray),
    trimPHash: null,
    trimVector,
    whiteBackgroundLikely: colors.whiteBackgroundLikely,
    width: meta.width ?? 0,
  };
}

function buildBrokenImageFeature(image, error) {
  return {
    aspectRatio: 0,
    colorfulRatio: 0,
    edgeDensity: 0,
    featureError: String(error?.message ?? error),
    featureVersion: "aHash-dHash-rmse-color-v1",
    fileSize: image.fileSize,
    fullAHash: "0",
    fullDHash: "0",
    fullPHash: null,
    fullVector: Array.from({ length: 256 }, () => 0),
    hasAlpha: false,
    height: 0,
    meanChroma: 0,
    pHashStatus: "not-computed",
    sha256: image.sha256,
    sourceRelPath: image.sourceRelPath,
    trimAHash: "0",
    trimDHash: "0",
    trimPHash: null,
    trimVector: Array.from({ length: 256 }, () => 0),
    whiteBackgroundLikely: false,
    width: 0,
  };
}

async function loadFeatureCache(cachePath) {
  if (!(await pathExists(cachePath))) return new Map();
  const cache = new Map();
  const text = await fs.readFile(cachePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = JSON.parse(line);
    cache.set(item.sha256, item);
  }
  return cache;
}

async function buildFeatures(images, cachePath, force) {
  const cache = force ? new Map() : await loadFeatureCache(cachePath);
  const bySha = new Map();
  for (const image of images) {
    if (!bySha.has(image.sha256)) bySha.set(image.sha256, image);
  }
  let computed = 0;
  for (const image of bySha.values()) {
    if (cache.has(image.sha256)) continue;
    computed += 1;
    if (computed % 100 === 0) console.log(`computed image features: ${computed}`);
    try {
      cache.set(image.sha256, await computeFeature(image));
    } catch (error) {
      console.warn(`feature failed, using placeholder: ${image.sourceRelPath}: ${error.message}`);
      cache.set(image.sha256, buildBrokenImageFeature(image, error));
    }
  }
  const ordered = [...cache.values()].filter((item) => bySha.has(item.sha256));
  await fs.writeFile(cachePath, `${ordered.map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
  return {
    cacheHits: bySha.size - computed,
    computed,
    features: ordered,
  };
}

function minHashDistance(left, right) {
  return Math.min(
    hamming64(left.fullAHash, right.fullAHash),
    hamming64(left.fullDHash, right.fullDHash),
    hamming64(left.trimAHash, right.trimAHash),
    hamming64(left.trimDHash, right.trimDHash),
  );
}

function buildSimilarityCandidates(features) {
  const candidates = [];
  for (let i = 0; i < features.length; i += 1) {
    for (let j = i + 1; j < features.length; j += 1) {
      const left = features[i];
      const right = features[j];
      const hashDistanceMin = minHashDistance(left, right);
      if (hashDistanceMin > 4) continue;
      const fullRmse = rmse(left.fullVector, right.fullVector);
      const trimRmse = rmse(left.trimVector, right.trimVector);
      const lowColorPair = left.meanChroma <= 0.04 && right.meanChroma <= 0.04;
      const nearRaster = hashDistanceMin <= 1 && Math.min(fullRmse, trimRmse) <= 8;
      const sameMangaCandidate = lowColorPair && hashDistanceMin <= 4 && trimRmse <= 45;
      if (!nearRaster && !sameMangaCandidate) continue;
      candidates.push({
        candidateGroupId: `sim-${String(candidates.length + 1).padStart(6, "0")}`,
        candidateKind: nearRaster ? "near-identical" : "same-manga-frame-candidate",
        candidateRelPath: right.sourceRelPath,
        candidateSha256: right.sha256,
        featureSignals: `minHashDistance=${hashDistanceMin};fullRmse=${fullRmse.toFixed(2)};trimRmse=${trimRmse.toFixed(2)};pHash=not-computed`,
        fullRmse: Number(fullRmse.toFixed(2)),
        hashDistanceMin,
        requiresReview: true,
        reviewNotes: "",
        reviewResult: "",
        sameCharacterCandidate: "",
        sourceAssetKind: "",
        sourceRelPath: left.sourceRelPath,
        sourceSha256: left.sha256,
        trimRmse: Number(trimRmse.toFixed(2)),
      });
    }
  }
  return candidates
    .sort((left, right) => left.hashDistanceMin - right.hashDistanceMin || left.trimRmse - right.trimRmse)
    .slice(0, 20000);
}

class UnionFind {
  constructor(keys) {
    this.parent = new Map(keys.map((key) => [key, key]));
  }
  find(key) {
    const parent = this.parent.get(key) ?? key;
    if (parent === key) return key;
    const root = this.find(parent);
    this.parent.set(key, root);
    return root;
  }
  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) this.parent.set(rightRoot, leftRoot);
  }
}

function chooseCanonical(features) {
  return [...features].sort((left, right) => {
    const areaDelta = right.width * right.height - left.width * left.height;
    if (areaDelta !== 0) return areaDelta;
    if (right.fileSize !== left.fileSize) return right.fileSize - left.fileSize;
    return left.sourceRelPath.localeCompare(right.sourceRelPath);
  })[0];
}

function buildPriorMaps(manifest, cleanIndexRows) {
  const bySource = new Map();
  const bySha = new Map();
  for (const entry of manifest?.entries ?? []) {
    const normalized = {
      assetKind: entry.assetKind,
      bucket: entry.bucket,
      candidateCharacter: entry.candidateCharacter,
      confidence: Number(entry.confidence ?? 0),
      confirmed: Boolean(entry.confirmed),
      confirmedCharacter: entry.confirmedCharacter,
      excluded: Boolean(entry.excluded),
      notes: entry.notes,
      reviewStatus: entry.reviewStatus,
      sha256: entry.sha256,
      sourceRelPath: normalizeRelPath(entry.sourceRelPath),
    };
    bySource.set(normalized.sourceRelPath, normalized);
    if (normalized.sha256 && !bySha.has(normalized.sha256)) bySha.set(normalized.sha256, normalized);
  }
  const cleanBySource = new Map(cleanIndexRows.map((row) => [normalizeRelPath(row.sourceRelPath), row]));
  const cleanBySha = new Map(cleanIndexRows.map((row) => [row.sha256, row]));
  return { bySha, bySource, cleanBySha, cleanBySource };
}

function programTypeHint(feature) {
  if (feature.featureError) return "unreadable";
  if (feature.meanChroma <= 0.035 && feature.colorfulRatio <= 0.04) return "manga-like";
  if (feature.aspectRatio >= 1.45 && feature.colorfulRatio > 0.08) return "background-like";
  if (feature.colorfulRatio > 0.12) return "color-character-like";
  return "uncertain";
}

function decideType({ cleanRow, feature, prior }) {
  const hint = programTypeHint(feature);
  const confirmedCharacter = prior?.confirmedCharacter || prior?.candidateCharacter || cleanRow?.character || "";
  const oldMatted = Boolean(cleanRow?.transparentRelPath || cleanRow?.mattingStatus === "processed");
  if (feature?.featureError) {
    return {
      assetKind: "unknown",
      confidence: 0.1,
      evidenceSummary: `图片无法解析：${feature.featureError}`,
      renderUse: "none",
      reviewStatus: "needs-human-review",
    };
  }
  if (prior?.excluded) {
    return {
      assetKind: "reference-only",
      confidence: 0.78,
      evidenceSummary: "旧 manifest 标记 excluded，作为参考证据保留",
      renderUse: "reference",
      reviewStatus: "ai-confirmed",
    };
  }
  if (hint === "manga-like" && confirmedCharacter) {
    return {
      assetKind: "manga-avatar",
      confidence: 0.86,
      evidenceSummary: "低彩度/线稿特征明显，并有旧角色确认；按漫画头像处理，禁止抠图",
      renderUse: "chat-avatar",
      reviewStatus: "ai-confirmed",
    };
  }
  if (hint === "manga-like") {
    return {
      assetKind: "manga-panel",
      confidence: 0.68,
      evidenceSummary: "低彩度/线稿特征明显，但缺少单角色证据",
      renderUse: "reference",
      reviewStatus: "needs-human-review",
    };
  }
  if (!confirmedCharacter && hint === "background-like") {
    return {
      assetKind: "background",
      confidence: 0.62,
      evidenceSummary: "宽幅彩色图且缺少角色证据，作为背景候选",
      renderUse: "background",
      reviewStatus: "needs-human-review",
    };
  }
  if (confirmedCharacter) {
    const stageLike = feature.whiteBackgroundLikely || oldMatted || feature.hasAlpha || feature.aspectRatio < 0.85;
    return {
      assetKind: stageLike ? "character-avatar-bust" : "character-avatar-chat",
      confidence: prior?.confirmed ? 0.9 : 0.74,
      evidenceSummary: "旧 manifest/上下文提供角色证据；非漫画图按角色素材候选处理",
      renderUse: stageLike ? "stage" : "chat-avatar",
      reviewStatus: prior?.confirmed ? "ai-confirmed" : "needs-human-review",
    };
  }
  return {
    assetKind: "unknown",
    confidence: 0.35,
    evidenceSummary: "缺少角色、背景或参考图的稳定证据",
    renderUse: "none",
    reviewStatus: "needs-human-review",
  };
}

function buildVisualGroups(features, imagesBySha, cleanRows, duplicateRows) {
  const keys = features.map((feature) => feature.sha256);
  const uf = new UnionFind(keys);
  const relationHints = new Map();
  const variantGroups = new Map();
  for (const row of duplicateRows) {
    if (!row.canonicalSha256 || !row.duplicateSha256) continue;
    uf.union(row.canonicalSha256, row.duplicateSha256);
    relationHints.set(row.canonicalSha256, { character: row.character, relationType: "visualDuplicate", visualGroupId: row.visualGroupId });
    relationHints.set(row.duplicateSha256, { character: row.character, relationType: "visualDuplicate", visualGroupId: row.visualGroupId });
  }
  for (const row of cleanRows) {
    if (row.visualRelationType === "variantGroup" && row.visualGroupId) {
      const items = variantGroups.get(row.visualGroupId) ?? [];
      items.push(row.sha256);
      variantGroups.set(row.visualGroupId, items);
      relationHints.set(row.sha256, { character: row.character, relationType: "variantGroup", visualGroupId: row.visualGroupId });
    }
  }
  for (const shas of variantGroups.values()) {
    for (let index = 1; index < shas.length; index += 1) {
      uf.union(shas[0], shas[index]);
    }
  }
  const featuresBySha = new Map(features.map((feature) => [feature.sha256, feature]));
  const groupsByRoot = new Map();
  for (const feature of features) {
    const root = uf.find(feature.sha256);
    const items = groupsByRoot.get(root) ?? [];
    items.push(feature);
    groupsByRoot.set(root, items);
  }
  const groups = [];
  for (const [index, members] of [...groupsByRoot.values()].entries()) {
    const hints = members.map((member) => relationHints.get(member.sha256)).filter(Boolean);
    const hint = hints.find((item) => item.relationType === "visualDuplicate") ?? hints.find(Boolean);
    const physical = members.length === 1 && (imagesBySha.get(members[0].sha256)?.length ?? 0) > 1;
    const relationType = hint?.relationType ?? (physical ? "physicalDuplicate" : "single");
    const canonical = relationType === "variantGroup" ? null : chooseCanonical(members);
    const visualGroupId = hint?.visualGroupId ?? `${relationType}-${String(index + 1).padStart(5, "0")}`;
    groups.push({
      aggregatedFloors: [],
      aggregatedScenes: [],
      aggregatedSpeakers: [],
      assetKindSummary: "",
      canonicalRelPath: canonical?.sourceRelPath ?? "",
      canonicalSha256: canonical?.sha256 ?? "",
      conflictReason: "",
      contactSheetPath: "",
      groupRelationType: relationType,
      memberEvidencePackIds: [],
      memberSha256s: members.map((member) => member.sha256),
      memberSourceRelPaths: members.flatMap((member) => imagesBySha.get(member.sha256)?.map((image) => image.sourceRelPath) ?? [member.sourceRelPath]),
      relationConfidence: relationType === "single" ? 1 : 0.92,
      reviewedBy: relationType === "single" || relationType === "physicalDuplicate" ? "program" : "cached-review",
      reviewRunId: relationType === "single" || relationType === "physicalDuplicate" ? "" : "ai-run-cached-visual-relations",
      reviewStatus: relationType === "single" || relationType === "physicalDuplicate" ? "auto" : "ai-confirmed",
      visualGroupId,
    });
  }
  return {
    groups,
    groupBySha: new Map(groups.flatMap((group) => group.memberSha256s.map((sha) => [sha, group]))),
    featuresBySha,
  };
}

function buildRoleCandidate({ contexts, group, packs, priorBySha, typeLabels }) {
  const roleVotes = new Map();
  for (const sha of group.memberSha256s) {
    const prior = priorBySha.get(sha);
    const role = prior?.confirmedCharacter || prior?.candidateCharacter;
    if (role) roleVotes.set(role, (roleVotes.get(role) ?? 0) + (prior?.confirmed ? 3 : 1));
  }
  for (const context of contexts) {
    for (const speaker of context.nearbySpeakers ?? []) {
      roleVotes.set(speaker, (roleVotes.get(speaker) ?? 0) + 0.4);
    }
  }
  const sorted = [...roleVotes.entries()].sort((left, right) => right[1] - left[1]);
  const [top, second] = sorted;
  const groupTypeLabels = group.memberSha256s.flatMap((sha) => typeLabels.filter((label) => label.sha256 === sha));
  const assetKind = groupTypeLabels.find((label) => label.assetKind !== "unknown")?.assetKind ?? "unknown";
  const renderUse = groupTypeLabels.find((label) => label.assetKind !== "unknown")?.renderUse ?? "none";
  const nonRole = ["background", "reference-only", "manga-panel", "author-asset", "excluded", "unknown"].includes(assetKind);
  const locationName = assetKind === "background"
    ? packs.map((pack) => pack.locationName).find(Boolean) ?? ""
    : "";
  const confidence = nonRole
    ? 0.82
    : top ? Math.min(0.94, 0.55 + top[1] / Math.max(4, top[1] + (second?.[1] ?? 0))) : 0.3;
  const conflictReason = second && second[1] * 0.7 > top?.[1] ? `候选角色接近: ${top[0]}=${top[1]}, ${second[0]}=${second[1]}` : "";
  return {
    assetKind,
    candidateRoleName: nonRole ? "" : (top?.[0] ?? ""),
    confidence: Number(confidence.toFixed(3)),
    conflictReason,
    evidencePackIds: group.memberEvidencePackIds.join("|"),
    locationName,
    pathEvidence: "",
    renderUse,
    reviewRunId: "ai-run-programmatic-pilot-v1",
    reviewStatus: !nonRole && top && confidence >= 0.85 && !conflictReason ? "ai-confirmed" : "needs-human-review",
    speakerEvidence: contexts.flatMap((context) => context.nearbySpeakers ?? []).filter(Boolean).join("|"),
    visualEvidence: `${group.groupRelationType};${group.reviewedBy}`,
    visualGroupId: group.visualGroupId,
  };
}

function buildAiReviewRuns(startedAt, finishedAt, stats) {
  return [
    {
      confidencePolicy: {
        typeLabelAutoConfirm: 0.78,
        visualGroupingAutoConfirm: "sha256 only; cached old visual report accepted as cached-review",
        roleAutoConfirm: 0.85,
      },
      errorSummary: "",
      finishedAt,
      inputRefs: [
        "parts/*.md",
        "images/**",
        "image-role-review-copy/manifest.json",
        "image-role-review-clean-human-full/index.csv",
        "image-role-review-clean-human-full/reports/visual-duplicates-removed.csv",
      ],
      model: "programmatic-pilot-no-batch-vision-api",
      outputRefs: [
        "image-evidence-packs.jsonl",
        "image-type-labels.csv",
        "image-visual-groups.csv",
        "role-classification-candidates.csv",
        "anomaly-queue.csv",
      ],
      promptVersion: "gululu-ai-first-cleaning-review-2026-06-06",
      reviewRunId: "ai-run-programmatic-pilot-v1",
      startedAt,
      status: "partial",
      taskKind: "image-type-labeling+visual-grouping+role-classification",
      notes: "本轮先生成完整证据包和可重跑缓存；需要接入批量视觉 LLM 后复写 ai-confirmed 结论。",
      stats,
    },
    {
      confidencePolicy: "cached visual duplicate report imported only when source report exists",
      errorSummary: "",
      finishedAt,
      inputRefs: ["image-role-review-clean-human-full/reports/visual-duplicates-removed.csv"],
      model: "cached-review",
      outputRefs: ["image-visual-groups.csv", "image-relations.csv"],
      promptVersion: "legacy-clean-report",
      reviewRunId: "ai-run-cached-visual-relations",
      startedAt,
      status: "succeeded",
      taskKind: "visual-grouping",
    },
  ];
}

async function writeJson(file, data) {
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function writeCsv(file, rows, columns) {
  await fs.writeFile(file, `${toCsv(rows, columns)}\n`, "utf8");
}

async function writeJsonl(file, rows) {
  await fs.writeFile(file, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function imageHtml(relPath, rootRelativePrefix = "..") {
  return `<img loading="lazy" src="${rootRelativePrefix}/images/${relPath.replaceAll("\\", "/")}" alt="${relPath}">`;
}

async function makeContactSheet({ items, outPath, root, title }) {
  const tileW = 160;
  const tileH = 190;
  const labelH = 34;
  const cols = 5;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const width = cols * tileW;
  const height = rows * tileH + 34;
  const composites = [];
  const header = Buffer.from(`<svg width="${width}" height="34"><rect width="100%" height="100%" fill="#111"/><text x="12" y="22" fill="white" font-size="16">${title}</text></svg>`);
  composites.push({ input: header, left: 0, top: 0 });
  for (const [index, item] of items.entries()) {
    const left = (index % cols) * tileW;
    const top = 34 + Math.floor(index / cols) * tileH;
    const absPath = path.join(root, "images", item.sourceRelPath);
    let image;
    try {
      image = await sharp(absPath, { failOn: "none" })
        .resize(tileW, tileH - labelH, { fit: "inside", background: "#f7f7f7" })
        .png()
        .toBuffer();
    } catch {
      image = Buffer.from(`<svg width="${tileW}" height="${tileH - labelH}"><rect width="100%" height="100%" fill="#ddd"/><text x="8" y="40" font-size="13" fill="#333">bad image</text></svg>`);
    }
    const label = Buffer.from(`<svg width="${tileW}" height="${labelH}"><rect width="100%" height="100%" fill="#f7f7f7"/><text x="4" y="13" font-size="10">${String(item.label ?? "").replace(/[<&>]/g, "")}</text><text x="4" y="27" font-size="10">${item.sourceRelPath.slice(0, 28)}</text></svg>`);
    composites.push({ input: image, left, top });
    composites.push({ input: label, left, top: top + tileH - labelH });
  }
  await sharp({
    create: {
      background: "#ffffff",
      channels: 3,
      height,
      width,
    },
  }).composite(composites).png().toFile(outPath);
}

async function writeDashboard(outDir, summary, sampleSheets, anomalyRows, roleRows, typeCounts) {
  const topRoles = roleRows
    .filter((row) => row.candidateRoleName)
    .reduce((map, row) => map.set(row.candidateRoleName, (map.get(row.candidateRoleName) ?? 0) + 1), new Map());
  const roleList = [...topRoles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  const html = `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>Gululu AI-first 清洗试验</title>
<style>
body{font-family:system-ui,"Microsoft YaHei",sans-serif;margin:0;background:#f5f5f2;color:#1f2933}
main{max-width:1180px;margin:0 auto;padding:24px}
h1{font-size:28px;margin:0 0 8px}
h2{font-size:18px;margin-top:28px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.metric{background:white;border:1px solid #ddd;border-radius:6px;padding:12px}
.metric b{display:block;font-size:22px}
table{border-collapse:collapse;width:100%;background:white}
th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;vertical-align:top}
th{background:#e9ecef;text-align:left}
.sheets{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.sheets img{width:100%;background:white;border:1px solid #ccc}
a{color:#0f766e}
</style>
<main>
<h1>Gululu AI-first 清洗试验</h1>
<p>输出根目录：${outDir}</p>
<section class="grid">
${[
    ["楼层", summary.floors.floorCount],
    ["原始图片", summary.images.totalFiles],
    ["唯一 sha256", summary.images.uniqueSha256],
    ["证据包", summary.images.evidencePacks],
    ["视觉组", summary.images.visualGroups],
    ["异常", summary.review.anomalies],
    ["抽样项", summary.review.samples],
    ["BGM", summary.content.bgm],
  ].map(([label, value]) => `<div class="metric"><span>${label}</span><b>${value}</b></div>`).join("")}
</section>
<h2>类型分布</h2>
<table><tr><th>assetKind</th><th>count</th></tr>${Object.entries(typeCounts).map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`).join("")}</table>
<h2>候选角色 Top 20</h2>
<table><tr><th>role</th><th>groups</th></tr>${roleList.map(([role, count]) => `<tr><td>${role}</td><td>${count}</td></tr>`).join("")}</table>
<h2>异常样例</h2>
<table><tr><th>kind</th><th>severity</th><th>reason</th><th>paths</th></tr>${anomalyRows.slice(0, 50).map((row) => `<tr><td>${row.anomalyKind}</td><td>${row.severity}</td><td>${row.conflictReason}</td><td>${row.sourceRelPaths}</td></tr>`).join("")}</table>
<h2>抽样图板</h2>
<div class="sheets">${sampleSheets.map((sheet) => `<figure><img src="${sheet.relPath}" alt="${sheet.title}"><figcaption>${sheet.title}</figcaption></figure>`).join("")}</div>
<h2>关键文件</h2>
<ul>
${["summary.json", "image-evidence-packs.jsonl", "image-type-labels.csv", "image-visual-groups.csv", "role-classification-candidates.csv", "anomaly-queue.csv", "final-sampling-review.csv"].map((file) => `<li><a href="${file}">${file}</a></li>`).join("")}
</ul>
</main>
</html>`;
  await fs.writeFile(path.join(outDir, "review.html"), html, "utf8");
}

async function main() {
  const startedAt = new Date().toISOString();
  const args = parseArgs(process.argv);
  await fs.mkdir(args.outDir, { recursive: true });
  await fs.mkdir(path.join(args.outDir, "cache"), { recursive: true });
  await fs.mkdir(path.join(args.outDir, "contact-sheets"), { recursive: true });

  const { markdown, meta, parts } = await readAllPartMarkdown(args.root);
  const floors = parseGululuFloors(markdown).filter((floor) => floor.floor >= args.fromFloor && floor.floor <= args.toFloor);
  const allFloors = parseGululuFloors(markdown);
  const sceneEvents = buildSceneEvents(floors);
  const sceneByFloor = buildSceneLookup(sceneEvents);
  const contextsByImage = extractImageContexts(floors);
  const imageRoot = path.join(args.root, "images");
  const images = await listImages(imageRoot);
  for (const [index, image] of images.entries()) {
    if (index % 500 === 0) console.log(`hashing images: ${index}/${images.length}`);
    image.sha256 = await sha256File(image.absPath);
  }
  const imagesBySha = new Map();
  for (const image of images) {
    const items = imagesBySha.get(image.sha256) ?? [];
    items.push(image);
    imagesBySha.set(image.sha256, items);
  }

  const manifest = await readJsonIfExists(args.manifestPath, { entries: [] });
  const cleanIndexRows = await readCsvIfExists(path.join(args.root, "image-role-review-clean-human-full", "index.csv"));
  const duplicateRows = await readCsvIfExists(path.join(args.root, "image-role-review-clean-human-full", "reports", "visual-duplicates-removed.csv"));
  const priorMaps = buildPriorMaps(manifest, cleanIndexRows);
  const featureResult = await buildFeatures(images, path.join(args.outDir, "cache", "image-features.jsonl"), args.forceFeatures);
  const featuresBySha = new Map(featureResult.features.map((feature) => [feature.sha256, feature]));

  const importPackage = buildGululuReplayImportPackage(floors, {
    fromFloor: args.fromFloor,
    reviewManifest: manifest,
    title: meta.title,
    toFloor: args.toFloor,
  });
  const contentEvents = importPackage.messages.map((message, index) => ({
    content: message.content,
    eventIndex: index + 1,
    floor: message.floor,
    imageBindingKind: message.imagePath ? "explicit-segment" : "",
    imagePath: message.imagePath ?? "",
    inferred: Boolean(message.inferred),
    kind: message.kind === "dialog" && message.inferred ? "inferredDialog" : message.kind,
    performanceUse: "perform",
    roleName: message.roleName ?? "",
    sceneId: sceneByFloor.get(message.floor)?.[0]?.sceneId ?? "",
    sourceText: message.content,
    sourceTextHash: shortHash(`${message.floor}:${message.content}`, 16),
    sourceTime: message.sourceTime ?? "",
    speakerName: message.speakerName ?? "",
    reviewStatus: message.inferred ? "needs-human-review" : "auto",
  }));

  const sourceInventory = {
    generatedAt: startedAt,
    imageFiles: images.length,
    imageRoot,
    meta,
    partFiles: parts.map((part) => part.name),
    sourceRoot: args.root,
  };
  const floorAudit = floorAuditRows(allFloors, meta);
  const speakerAliases = importPackage.roles.flatMap((role) => role.aliases.map((alias) => ({
    aliasSource: "import-parser",
    count: alias.count,
    firstFloor: "",
    notes: "",
    roleName: role.name,
    speakerName: alias.name,
    status: "ai-confirmed",
  })));
  const bgmRows = contentEvents.filter((event) => event.kind === "bgm").map((event) => ({
    eventIndex: event.eventIndex,
    floor: event.floor,
    localFilePath: "",
    matchStatus: "unresolved",
    mediaId: "",
    normalizedName: event.content.replace(/^\s*BGM\s*[:：]\s*/i, "").trim(),
    notes: "未提供本地 BGM manifest",
    originalName: event.content.replace(/^\s*BGM\s*[:：]\s*/i, "").trim(),
  }));
  const messageImageBindings = contentEvents.filter((event) => event.imagePath).map((event) => ({
    allowedAsAvatar: "",
    assetKind: "",
    bindingKind: event.imageBindingKind,
    evidencePackId: "",
    eventIndex: event.eventIndex,
    floor: event.floor,
    imageDecisionStatus: "",
    notes: "",
    reviewStatus: event.inferred ? "needs-human-review" : "auto",
    roleName: event.roleName,
    sourceRelPath: normalizeRelPath(event.imagePath),
    speakerName: event.speakerName,
    visualGroupId: "",
  }));

  const evidencePacks = images.map((image) => {
    const contexts = contextsByImage.get(image.sourceRelPath) ?? [];
    const feature = featuresBySha.get(image.sha256);
    const scenes = contexts.flatMap((context) => sceneByFloor.get(context.floor) ?? []);
    return {
      allFloors: [...new Set(contexts.map((context) => context.floor))],
      contextAfter: contexts[0]?.after ?? "",
      contextBefore: contexts[0]?.before ?? "",
      evidencePackId: `ep-${image.sha256.slice(0, 12)}-${shortHash(image.sourceRelPath, 8)}`,
      featureRefs: [`image-feature-index.json#${image.sha256}`],
      fileSize: image.fileSize,
      firstFloor: contexts[0]?.floor ?? "",
      height: feature?.height ?? 0,
      mime: path.extname(image.sourceRelPath).slice(1).toLowerCase(),
      nearbyEvents: contexts.slice(0, 3).map((context) => ({ after: context.after, before: context.before, floor: context.floor })),
      nearbySpeakers: [...new Set(contexts.flatMap((context) => context.nearbySpeakers ?? []))],
      programTypeHints: {
        featureError: feature?.featureError,
        colorfulRatio: feature?.colorfulRatio,
        edgeDensity: feature?.edgeDensity,
        hasAlpha: feature?.hasAlpha,
        lowColor: feature ? feature.meanChroma <= 0.035 && feature.colorfulRatio <= 0.04 : false,
        meanChroma: feature?.meanChroma,
        programTypeHint: feature ? programTypeHint(feature) : "unknown",
        whiteBackgroundLikely: feature?.whiteBackgroundLikely,
      },
      sceneId: scenes[0]?.sceneId ?? "",
      sceneLabel: scenes[0]?.sceneLabel ?? "",
      locationName: scenes[0]?.locationName ?? "",
      sha256: image.sha256,
      sourcePostMeta: contexts[0] ? { time: contexts[0].time } : {},
      sourceRelPath: image.sourceRelPath,
      width: feature?.width ?? 0,
    };
  });
  const evidenceBySha = new Map(evidencePacks.map((pack) => [pack.sha256, pack]));
  const evidenceBySource = new Map(evidencePacks.map((pack) => [pack.sourceRelPath, pack]));

  const typeLabels = evidencePacks.map((pack) => {
    const feature = featuresBySha.get(pack.sha256);
    const prior = priorMaps.bySource.get(pack.sourceRelPath) ?? priorMaps.bySha.get(pack.sha256);
    const cleanRow = priorMaps.cleanBySource.get(pack.sourceRelPath) ?? priorMaps.cleanBySha.get(pack.sha256);
    const type = decideType({ cleanRow, feature, prior });
    return {
      assetKind: type.assetKind,
      confidence: type.confidence,
      evidencePackId: pack.evidencePackId,
      evidenceSummary: type.evidenceSummary,
      llmTypeLabel: type.assetKind,
      programTypeHint: feature ? programTypeHint(feature) : "unknown",
      renderUse: type.renderUse,
      reviewRunId: "ai-run-programmatic-pilot-v1",
      reviewStatus: type.reviewStatus,
      sha256: pack.sha256,
      sourceRelPath: pack.sourceRelPath,
    };
  });
  const typeBySource = new Map(typeLabels.map((label) => [label.sourceRelPath, label]));

  const similarityCandidates = buildSimilarityCandidates(featureResult.features);
  const visual = buildVisualGroups(featureResult.features, imagesBySha, cleanIndexRows, duplicateRows);
  const visualGroups = visual.groups.map((group) => {
    const packs = group.memberSourceRelPaths.map((relPath) => evidenceBySource.get(relPath)).filter(Boolean);
    const labels = group.memberSourceRelPaths.map((relPath) => typeBySource.get(relPath)).filter(Boolean);
    const assetCounts = labels.reduce((counts, label) => ({ ...counts, [label.assetKind]: (counts[label.assetKind] ?? 0) + 1 }), {});
    return {
      ...group,
      aggregatedFloors: [...new Set(packs.flatMap((pack) => pack.allFloors))].join("|"),
      aggregatedScenes: [...new Set(packs.map((pack) => pack.sceneLabel).filter(Boolean))].join("|"),
      aggregatedSpeakers: [...new Set(packs.flatMap((pack) => pack.nearbySpeakers))].join("|"),
      assetKindSummary: JSON.stringify(assetCounts),
      memberEvidencePackIds: packs.map((pack) => pack.evidencePackId).join("|"),
      memberSha256s: group.memberSha256s.join("|"),
      memberSourceRelPaths: group.memberSourceRelPaths.join("|"),
    };
  });
  const visualBySha = visual.groupBySha;

  const roleCandidates = visual.groups.map((group) => {
    const groupContexts = group.memberSourceRelPaths.flatMap((relPath) => contextsByImage.get(relPath) ?? []);
    const groupLabels = typeLabels.filter((label) => group.memberSha256s.includes(label.sha256));
    const groupPacks = group.memberSourceRelPaths.map((relPath) => evidenceBySource.get(relPath)).filter(Boolean);
    const candidate = buildRoleCandidate({
      contexts: groupContexts,
      group: {
        ...group,
        memberEvidencePackIds: groupPacks.map((pack) => pack.evidencePackId),
      },
      packs: groupPacks,
      priorBySha: priorMaps.bySha,
      typeLabels: groupLabels,
    });
    return candidate;
  });
  const roleByGroupId = new Map(roleCandidates.map((row) => [row.visualGroupId, row]));

  const imageDecisions = evidencePacks.map((pack) => {
    const label = typeBySource.get(pack.sourceRelPath);
    const group = visualBySha.get(pack.sha256);
    const role = group ? roleByGroupId.get(group.visualGroupId) : null;
    const cleanRow = priorMaps.cleanBySource.get(pack.sourceRelPath) ?? priorMaps.cleanBySha.get(pack.sha256);
    const feature = featuresBySha.get(pack.sha256);
    const mattingAllowed = ["character-sprite", "character-avatar-bust"].includes(label.assetKind) && label.renderUse === "stage";
    const needsMatting = Boolean(mattingAllowed && !feature?.hasAlpha && feature?.whiteBackgroundLikely);
    const oldMatted = Boolean(cleanRow?.transparentRelPath || cleanRow?.mattingStatus === "processed");
    return {
      aiReviewRunIds: "ai-run-programmatic-pilot-v1",
      allSourceRelPaths: imagesBySha.get(pack.sha256)?.map((image) => image.sourceRelPath).join("|") ?? pack.sourceRelPath,
      anomalyStatus: "",
      assetKind: label.assetKind,
      candidateRoleName: role?.candidateRoleName ?? "",
      canonicalSha256: group?.canonicalSha256 ?? "",
      character: role?.reviewStatus === "ai-confirmed" ? role.candidateRoleName : "",
      confidence: Math.min(label.confidence, role?.confidence ?? 1),
      decisionStatus: label.reviewStatus === "ai-confirmed" && (!role?.candidateRoleName || role.reviewStatus === "ai-confirmed") ? "ai-confirmed" : "needs-human-review",
      duplicateSourceRelPaths: imagesBySha.get(pack.sha256)?.filter((image) => image.sourceRelPath !== pack.sourceRelPath).map((image) => image.sourceRelPath).join("|") ?? "",
      evidencePackId: pack.evidencePackId,
      evidenceSummary: [label.evidenceSummary, role?.visualEvidence, role?.speakerEvidence].filter(Boolean).join("；"),
      exclude: ["excluded", "reference-only", "manga-panel", "author-asset", "unknown"].includes(label.assetKind),
      featureCandidateCount: similarityCandidates.filter((candidate) => candidate.sourceSha256 === pack.sha256 || candidate.candidateSha256 === pack.sha256).length,
      locationName: pack.locationName ?? "",
      mattingAllowed,
      mattingStatus: mattingAllowed
        ? oldMatted ? "processed" : needsMatting ? "pending" : "not-needed"
        : oldMatted ? "rejected" : "not-needed",
      needsMatting,
      notes: oldMatted && !mattingAllowed ? "旧透明图存在，但新门禁拒绝消费" : "",
      relationReviewedBy: group?.reviewedBy ?? "program",
      relationStatus: group?.reviewStatus ?? "auto",
      renderUse: label.renderUse,
      roleConfidence: role?.confidence ?? "",
      samplingStatus: "not-sampled",
      sha256: pack.sha256,
      sourceRelPath: pack.sourceRelPath,
      visualGroupId: group?.visualGroupId ?? "",
      visualRelationType: group?.groupRelationType ?? "single",
      visualStatus: role?.reviewStatus ?? "unreviewed",
    };
  });

  const mattingRows = imageDecisions.map((decision) => ({
    alphaMaskRelPath: "",
    assetKind: decision.assetKind,
    mattingAllowed: decision.mattingAllowed,
    mattingModel: "",
    mattingStatus: decision.mattingStatus,
    needsMatting: decision.needsMatting,
    qaReason: decision.mattingAllowed ? "待端到端 QA" : "门禁不允许抠图",
    qaStatus: decision.mattingAllowed && decision.needsMatting ? "pending" : "not-required",
    renderUse: decision.renderUse,
    sha256: decision.sha256,
    sourceRelPath: decision.sourceRelPath,
    transparentRelPath: "",
  }));

  const anomalyRows = [];
  for (const decision of imageDecisions) {
    if (decision.decisionStatus === "needs-human-review") {
      const feature = featuresBySha.get(decision.sha256);
      anomalyRows.push({
        anomalyId: `anom-${String(anomalyRows.length + 1).padStart(5, "0")}`,
        anomalyKind: feature?.featureError ? "ai-output-invalid" : decision.assetKind === "unknown" ? "low-confidence-type" : "role-conflict",
        candidateRoleNames: decision.candidateRoleName,
        confidence: decision.confidence,
        conflictReason: feature?.featureError
          ? `图片无法解析：${feature.featureError}`
          : decision.assetKind === "unknown" ? "图片用途低置信" : "角色或用途未达到自动确认阈值",
        evidencePackIds: decision.evidencePackId,
        notes: "",
        resolutionRef: "",
        reviewStatus: "queued",
        severity: decision.assetKind === "unknown" ? "warning" : "info",
        sourceRelPaths: decision.sourceRelPath,
        suggestedAction: "抽样复核或二次 LLM 视觉判断",
        visualGroupId: decision.visualGroupId,
      });
    }
    if (decision.mattingStatus === "rejected") {
      anomalyRows.push({
        anomalyId: `anom-${String(anomalyRows.length + 1).padStart(5, "0")}`,
        anomalyKind: "matting-gate-violation",
        candidateRoleNames: decision.candidateRoleName,
        confidence: decision.confidence,
        conflictReason: "旧 clean 目录存在透明图，但新流程 mattingAllowed=false",
        evidencePackIds: decision.evidencePackId,
        notes: "",
        resolutionRef: "",
        reviewStatus: "queued",
        severity: "blocker",
        sourceRelPaths: decision.sourceRelPath,
        suggestedAction: "作废旧 __matted/transparent 产物，重新按 matting-decisions 生成",
        visualGroupId: decision.visualGroupId,
      });
    }
  }

  const typeCounts = typeLabels.reduce((counts, label) => {
    counts[label.assetKind] = (counts[label.assetKind] ?? 0) + 1;
    return counts;
  }, {});
  const sampleRows = [];
  const sampleSheets = [];
  const topRoles = [...roleCandidates.filter((row) => row.candidateRoleName).reduce((map, row) => {
    const items = map.get(row.candidateRoleName) ?? [];
    items.push(row);
    map.set(row.candidateRoleName, items);
    return map;
  }, new Map()).entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  for (const [roleName, rows] of topRoles) {
    const refs = rows.slice(0, 12).flatMap((row) => {
      const group = visual.groups.find((item) => item.visualGroupId === row.visualGroupId);
      return group?.memberSourceRelPaths.slice(0, 1).map((sourceRelPath) => ({ label: roleName, sourceRelPath })) ?? [];
    });
    const safeRole = roleName.replace(/[<>:"/\\|?*]/g, "_");
    const relPath = `contact-sheets/role-${safeRole}.png`;
    await makeContactSheet({ items: refs, outPath: path.join(args.outDir, relPath), root: args.root, title: `角色抽样 ${roleName}` });
    sampleSheets.push({ relPath, title: `角色抽样 ${roleName}` });
    sampleRows.push({
      failureSummary: "",
      followupAction: "",
      notes: "",
      reviewedBy: "human",
      reviewStatus: "needs-more-sampling",
      sampleId: `sample-${String(sampleRows.length + 1).padStart(4, "0")}`,
      sampleKind: "role-gallery",
      sampleRefs: relPath,
      sampleSize: refs.length,
      sampleSource: "top-frequency",
      targetKey: roleName,
    });
  }
  for (const assetKind of ["manga-avatar", "character-avatar-bust", "reference-only", "background", "unknown"]) {
    const refs = typeLabels.filter((label) => label.assetKind === assetKind).slice(0, 15).map((label) => ({
      label: assetKind,
      sourceRelPath: label.sourceRelPath,
    }));
    if (refs.length === 0) continue;
    const relPath = `contact-sheets/type-${assetKind}.png`;
    await makeContactSheet({ items: refs, outPath: path.join(args.outDir, relPath), root: args.root, title: `类型抽样 ${assetKind}` });
    sampleSheets.push({ relPath, title: `类型抽样 ${assetKind}` });
    sampleRows.push({
      failureSummary: "",
      followupAction: "",
      notes: "",
      reviewedBy: "human",
      reviewStatus: "needs-more-sampling",
      sampleId: `sample-${String(sampleRows.length + 1).padStart(4, "0")}`,
      sampleKind: "asset-kind",
      sampleRefs: relPath,
      sampleSize: refs.length,
      sampleSource: "risk-weighted",
      targetKey: assetKind,
    });
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    content: {
      bgm: bgmRows.length,
      dice: contentEvents.filter((event) => event.kind === "dice").length,
      inferredDialog: contentEvents.filter((event) => event.kind === "inferredDialog").length,
      messages: contentEvents.length,
      scene: sceneEvents.length,
    },
    features: {
      cacheHits: featureResult.cacheHits,
      computed: featureResult.computed,
      pHashStatus: "not-computed",
      similarityCandidates: similarityCandidates.length,
    },
    floors: floorAudit.summary,
    generatedAt: finishedAt,
    images: {
      evidencePacks: evidencePacks.length,
      totalFiles: images.length,
      uniqueSha256: imagesBySha.size,
      visualGroups: visualGroups.length,
    },
    outputRoot: args.outDir,
    review: {
      anomalies: anomalyRows.length,
      samples: sampleRows.length,
      typeCounts,
    },
    sourceRoot: args.root,
  };
  const aiReviewRuns = buildAiReviewRuns(startedAt, finishedAt, summary);

  await writeJson(path.join(args.outDir, "source-inventory.json"), sourceInventory);
  await writeCsv(path.join(args.outDir, "floor-audit.csv"), floorAudit.rows, ["floor", "time", "hasBody", "duplicate", "outOfOrder", "gapBefore"]);
  await writeJson(path.join(args.outDir, "content-events.json"), contentEvents);
  await writeCsv(path.join(args.outDir, "scene-events.csv"), sceneEvents, ["floor", "eventIndex", "sceneId", "sceneLabel", "locationName", "sourceText", "source", "markerKind", "lineIndex", "notes"]);
  await writeCsv(path.join(args.outDir, "speaker-aliases.csv"), speakerAliases, ["speakerName", "roleName", "aliasSource", "count", "firstFloor", "status", "notes"]);
  await writeCsv(path.join(args.outDir, "message-image-bindings.csv"), messageImageBindings, ["eventIndex", "floor", "sourceRelPath", "evidencePackId", "visualGroupId", "bindingKind", "speakerName", "roleName", "imageDecisionStatus", "assetKind", "allowedAsAvatar", "reviewStatus", "notes"]);
  await writeCsv(path.join(args.outDir, "bgm-manifest.csv"), bgmRows, ["eventIndex", "floor", "originalName", "normalizedName", "matchStatus", "localFilePath", "mediaId", "notes"]);
  await writeCsv(path.join(args.outDir, "event-corrections.csv"), [], ["eventKey", "floor", "sourceTextHash", "originalKind", "correctedKind", "performanceUse", "speakerName", "roleName", "imagePath", "sceneId", "reviewedBy", "status", "notes"]);
  await writeJsonl(path.join(args.outDir, "image-evidence-packs.jsonl"), evidencePacks);
  await writeCsv(path.join(args.outDir, "image-type-labels.csv"), typeLabels, ["evidencePackId", "sourceRelPath", "sha256", "programTypeHint", "llmTypeLabel", "assetKind", "renderUse", "confidence", "evidenceSummary", "reviewRunId", "reviewStatus"]);
  await writeJson(path.join(args.outDir, "image-feature-index.json"), featureResult.features.map((feature) => ({ ...feature, fullVector: undefined, trimVector: undefined })));
  await writeCsv(path.join(args.outDir, "image-similarity-candidates.csv"), similarityCandidates, ["candidateGroupId", "sourceSha256", "candidateSha256", "sourceRelPath", "candidateRelPath", "candidateKind", "hashDistanceMin", "fullRmse", "trimRmse", "featureSignals", "sourceAssetKind", "candidateAssetKind", "sameCharacterCandidate", "requiresReview", "reviewResult", "reviewNotes"]);
  await writeCsv(path.join(args.outDir, "image-visual-groups.csv"), visualGroups, ["visualGroupId", "groupRelationType", "canonicalSha256", "canonicalRelPath", "memberSha256s", "memberSourceRelPaths", "memberEvidencePackIds", "aggregatedFloors", "aggregatedSpeakers", "aggregatedScenes", "assetKindSummary", "relationConfidence", "reviewedBy", "reviewRunId", "contactSheetPath", "conflictReason", "reviewStatus"]);
  await writeCsv(path.join(args.outDir, "role-classification-candidates.csv"), roleCandidates, ["visualGroupId", "candidateRoleName", "assetKind", "renderUse", "locationName", "confidence", "evidencePackIds", "speakerEvidence", "visualEvidence", "pathEvidence", "conflictReason", "reviewRunId", "reviewStatus"]);
  await writeJson(path.join(args.outDir, "ai-review-runs.json"), aiReviewRuns);
  await writeCsv(path.join(args.outDir, "image-decisions.csv"), imageDecisions, ["sourceRelPath", "sha256", "evidencePackId", "visualGroupId", "allSourceRelPaths", "duplicateSourceRelPaths", "decisionStatus", "assetKind", "renderUse", "character", "candidateRoleName", "roleConfidence", "visualStatus", "locationName", "mattingAllowed", "needsMatting", "mattingStatus", "visualRelationType", "canonicalSha256", "relationStatus", "relationReviewedBy", "featureCandidateCount", "aiReviewRunIds", "confidence", "anomalyStatus", "samplingStatus", "exclude", "evidenceSummary", "notes"]);
  await writeJson(path.join(args.outDir, "image-decisions.json"), imageDecisions);
  await writeCsv(path.join(args.outDir, "image-relations.csv"), imageDecisions, ["sourceRelPath", "sha256", "visualRelationType", "visualGroupId", "canonicalSha256", "relationStatus", "relationReviewedBy", "notes"]);
  await writeCsv(path.join(args.outDir, "matting-decisions.csv"), mattingRows, ["sourceRelPath", "sha256", "assetKind", "renderUse", "mattingAllowed", "needsMatting", "mattingStatus", "mattingModel", "transparentRelPath", "alphaMaskRelPath", "qaStatus", "qaReason"]);
  await writeCsv(path.join(args.outDir, "anomaly-queue.csv"), anomalyRows, ["anomalyId", "anomalyKind", "severity", "evidencePackIds", "visualGroupId", "candidateRoleNames", "sourceRelPaths", "confidence", "conflictReason", "suggestedAction", "reviewStatus", "resolutionRef", "notes"]);
  await writeCsv(path.join(args.outDir, "final-sampling-review.csv"), sampleRows, ["sampleId", "sampleKind", "targetKey", "sampleSize", "sampleSource", "sampleRefs", "reviewedBy", "reviewStatus", "failureSummary", "followupAction", "notes"]);
  await writeJson(path.join(args.outDir, "summary.json"), summary);
  await writeDashboard(args.outDir, summary, sampleSheets, anomalyRows, roleCandidates, typeCounts);
  await fs.writeFile(path.join(args.outDir, "README.md"), [
    "# Gululu AI-first cleaning pilot",
    "",
    "这是按 `docs/reference/gululu-replay-data-cleaning-review.md` 生成的试验结果。",
    "",
    "- `cache/image-features.jsonl` 可复用，后续改规则重跑时不需要重新计算同 sha256 图片特征。",
    "- `review.html` 是本轮可视化入口。",
    "- 本轮没有接入批量视觉 LLM API；`ai-review-runs.json` 将该部分标记为 `partial`，但所有输入证据、候选和异常队列都已结构化保存。",
    "- 旧 clean 目录只作为 cached-review 证据，不作为原始事实层。",
    "",
  ].join("\n"), "utf8");

  console.log(JSON.stringify({ outDir: args.outDir, reviewHtml: path.join(args.outDir, "review.html"), summary }, null, 2));
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
