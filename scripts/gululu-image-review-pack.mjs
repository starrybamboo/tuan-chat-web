/* eslint-disable regexp/no-super-linear-backtracking, regexp/optimal-quantifier-concatenation */
import { createHash } from "node:crypto";
import { copyFile, link, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_SOURCE_ROOT = "D:/gululu-cache/output/opus-88";
const DEFAULT_OUT_DIR = "D:/gululu-cache/output/opus-88/image-review-pack";

const IMAGE_MARKDOWN_PATTERN = /!\[image\]\(([^)]+)\)/g;
const FLOOR_PATTERN = /^## 第(?<floor>\d+)楼\s*\r?\n\s*> 时间: (?<time>[^\r\n]+)\s*(?<body>.*?)(?=^## 第\d+楼|(?![\s\S]))/gms;
const SPEAKER_LINE_PATTERN = /^\s*(?<speaker>[^:：\r\n]{1,18})\s*[:：]\s*(?<content>.*)$/;
const BROAD_PATH_SEGMENTS = new Set([
  "东方",
  "东方Project",
  "刃牙",
  "杂图",
  "其他",
  "未识别",
  "背景",
  "道具",
]);
const IGNORED_SPEAKERS = new Set([
  "ATK",
  "Atk",
  "BGM",
  "HP",
  "Hp",
  "冷知识",
  "必杀技",
  "技能",
  "种族",
  "攻击",
]);
const REVIEW_BUCKETS = new Set(["未识别", "低置信度", "冲突"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);

function normalizeLineBreaks(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function normalizeRelPath(rawPath) {
  return rawPath
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\.\/images\//, "")
    .replace(/^images\//, "")
    .replace(/^\/+/, "");
}

function safeSegment(value) {
  const normalized = String(value || "未识别")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return normalized || "未识别";
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted && char === "\"" && line[index + 1] === "\"") {
      current += "\"";
      index++;
      continue;
    }
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function parseSpeakerLine(line) {
  const matched = line.match(SPEAKER_LINE_PATTERN);
  if (!matched?.groups) {
    return null;
  }
  const speaker = matched.groups.speaker.trim().replace(/^[“”「」『』]+|[“”「」『』]+$/g, "").trim();
  if (
    !speaker
    || IGNORED_SPEAKERS.has(speaker)
    || /^(?:T\d+|\d+)$/.test(speaker)
    || /[【】[\]（）()/\d]/.test(speaker)
    || speaker.length > 12
  ) {
    return null;
  }
  return {
    content: matched.groups.content.trim(),
    speaker,
  };
}

function isQuotedDialogue(line) {
  const trimmed = line.trim();
  return trimmed.length > 0 && trimmed.length <= 80 && /^[“"「『]/.test(trimmed);
}

function scoreEvidence(evidence) {
  const scores = new Map();
  for (const item of evidence) {
    if (!item.character || item.character === "未知") {
      continue;
    }
    scores.set(item.character, (scores.get(item.character) ?? 0) + item.weight);
  }
  return [...scores.entries()].sort((left, right) => right[1] - left[1]);
}

function choosePathCharacter(relPath) {
  const segments = normalizeRelPath(relPath).split("/").slice(0, -1);
  for (let index = segments.length - 1; index >= 0; index--) {
    const segment = segments[index]?.trim();
    if (!segment || BROAD_PATH_SEGMENTS.has(segment) || /^th\d+/i.test(segment)) {
      continue;
    }
    return segment;
  }
  return null;
}

function parseFloors(markdown) {
  const floors = [];
  for (const matched of normalizeLineBreaks(markdown).matchAll(FLOOR_PATTERN)) {
    floors.push({
      body: matched.groups.body.trim(),
      floor: Number(matched.groups.floor),
      time: matched.groups.time.trim(),
    });
  }
  return floors;
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
      const afterLines = normalizeLineBreaks(floor.body.slice(nextStart, nextEnd))
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, 4);
      const beforeLines = normalizeLineBreaks(floor.body.slice(prevStart, matched.index))
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .slice(-4);
      const speakerAfter = afterLines.map(parseSpeakerLine).find(Boolean)?.speaker;
      const speakerBefore = beforeLines.map(parseSpeakerLine).filter(Boolean).at(-1)?.speaker;
      const context = {
        after: afterLines.join(" / ").slice(0, 240),
        before: beforeLines.join(" / ").slice(0, 240),
        floor: floor.floor,
        imageIndexInFloor: index + 1,
        quotedAfter: afterLines.find(isQuotedDialogue) ?? "",
        speakerAfter: speakerAfter ?? "",
        speakerBefore: speakerBefore ?? "",
        time: floor.time,
      };
      const contexts = contextsByImage.get(relPath) ?? [];
      contexts.push(context);
      contextsByImage.set(relPath, contexts);
    }
  }
  return contextsByImage;
}

async function readAllPartMarkdown(sourceRoot) {
  const partsDir = path.join(sourceRoot, "parts");
  const meta = JSON.parse(await readFile(path.join(sourceRoot, "meta.json"), "utf8"));
  const partNames = await readdir(partsDir);
  const texts = [];
  for (let index = 1; index <= meta.partCount; index++) {
    const partPrefix = `part-${String(index).padStart(4, "0")}_`;
    const partName = partNames.find(name => name.startsWith(partPrefix) && name.endsWith(".md"));
    if (!partName) {
      throw new Error(`未找到分片: ${partPrefix}*.md`);
    }
    texts.push(await readFile(path.join(partsDir, partName), "utf8"));
  }
  return { markdown: texts.join("\n\n"), meta };
}

async function listImages(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const images = [];
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      images.push(...await listImages(absolutePath, baseDir));
      continue;
    }
    if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      images.push({
        absolutePath,
        relPath: path.relative(baseDir, absolutePath).replace(/\\/g, "/"),
      });
    }
  }
  return images.sort((left, right) => left.relPath.localeCompare(right.relPath, "zh-Hans-CN"));
}

async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function readVisionCache(sourceRoot) {
  const cachePath = path.join(sourceRoot, "vision_classify_cache.jsonl");
  try {
    const text = await readFile(cachePath, "utf8");
    const resultByHash = new Map();
    for (const line of normalizeLineBreaks(text).split("\n")) {
      if (!line.trim()) {
        continue;
      }
      const item = JSON.parse(line);
      if (item.sha256 && item.result) {
        resultByHash.set(item.sha256, item.result);
      }
    }
    return resultByHash;
  }
  catch (error) {
    if (error.code === "ENOENT") {
      return new Map();
    }
    throw error;
  }
}

async function readCorrections(correctionsPath) {
  if (!correctionsPath) {
    return new Map();
  }
  try {
    const text = await readFile(correctionsPath, "utf8");
    const lines = normalizeLineBreaks(text).split("\n").filter(Boolean);
    const headers = parseCsvLine(lines.shift() ?? "");
    const rows = new Map();
    for (const line of lines) {
      const cells = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
      const key = row.sha256 || row.sourceRelPath;
      if (key) {
        rows.set(key, row);
      }
    }
    return rows;
  }
  catch (error) {
    if (error.code === "ENOENT") {
      return new Map();
    }
    throw error;
  }
}

function buildEvidence(image, contexts, vision) {
  const evidence = [];
  const pathCharacter = choosePathCharacter(image.relPath);
  if (pathCharacter) {
    evidence.push({
      character: pathCharacter,
      confidence: 0.82,
      detail: `来源路径: ${image.relPath}`,
      source: "path-directory",
      weight: 3,
    });
  }
  for (const context of contexts.slice(0, 8)) {
    if (context.speakerAfter) {
      evidence.push({
        character: context.speakerAfter,
        confidence: 0.78,
        detail: `第${context.floor}楼图片后对白`,
        source: "speaker-after",
        weight: 2.6,
      });
    }
    if (context.speakerBefore) {
      evidence.push({
        character: context.speakerBefore,
        confidence: 0.55,
        detail: `第${context.floor}楼图片前对白`,
        source: "speaker-before",
        weight: 1.2,
      });
    }
    if (context.quotedAfter && pathCharacter) {
      evidence.push({
        character: pathCharacter,
        confidence: 0.72,
        detail: `第${context.floor}楼图片后接引号对白`,
        source: "quoted-after-path",
        weight: 1.5,
      });
    }
  }
  if (vision && vision.character && vision.character !== "未知") {
    evidence.push({
      character: vision.character,
      confidence: Number(vision.confidence ?? 0),
      detail: `视觉分类: ${vision.franchise ?? "未知"} / ${vision.character}`,
      source: "vision-cache",
      weight: Number(vision.confidence ?? 0) * 2.5,
    });
  }
  return evidence;
}

function classifyImage(image, contexts, vision, correction) {
  const evidence = buildEvidence(image, contexts, vision);
  const scored = scoreEvidence(evidence);
  const [top, second] = scored;
  const correctedCharacter = correction?.confirmedCharacter?.trim();
  const excluded = /^(?:[1y是]|true|yes)$/i.test(correction?.exclude ?? "");

  if (excluded) {
    return {
      assetKind: correction?.assetKind || "excluded",
      bucket: "未识别",
      candidateCharacter: "",
      confidence: 0,
      confirmed: false,
      evidence,
      excluded: true,
      reviewStatus: "excluded",
    };
  }
  if (correctedCharacter) {
    return {
      assetKind: correction?.assetKind || "avatar",
      bucket: correctedCharacter,
      candidateCharacter: correctedCharacter,
      confidence: 1,
      confirmed: true,
      evidence,
      excluded: false,
      reviewStatus: "confirmed",
    };
  }
  if (!top) {
    return {
      assetKind: "unknown",
      bucket: "未识别",
      candidateCharacter: "",
      confidence: 0,
      confirmed: false,
      evidence,
      excluded: false,
      reviewStatus: "unknown",
    };
  }
  const conflict = Boolean(second && second[1] > top[1] * 0.72);
  const confidence = Math.min(0.98, top[1] / 5);
  if (conflict) {
    return {
      assetKind: "avatar-candidate",
      bucket: "冲突",
      candidateCharacter: top[0],
      confidence,
      confirmed: false,
      evidence,
      excluded: false,
      reviewStatus: "conflict",
    };
  }
  if (confidence < 0.55) {
    return {
      assetKind: "avatar-candidate",
      bucket: "低置信度",
      candidateCharacter: top[0],
      confidence,
      confirmed: false,
      evidence,
      excluded: false,
      reviewStatus: "low-confidence",
    };
  }
  return {
    assetKind: "avatar-candidate",
    bucket: top[0],
    candidateCharacter: top[0],
    confidence,
    confirmed: false,
    evidence,
    excluded: false,
    reviewStatus: "candidate",
  };
}

async function linkOrCopy(source, target) {
  try {
    await link(source, target);
    return "hardlink";
  }
  catch {
    await copyFile(source, target);
    return "copy";
  }
}

function buildCsv(entries) {
  const headers = [
    "sourceRelPath",
    "sha256",
    "bucket",
    "candidateCharacter",
    "confidence",
    "reviewStatus",
    "confirmedCharacter",
    "assetKind",
    "exclude",
    "notes",
    "outputRelPath",
    "firstFloor",
    "evidenceSummary",
  ];
  const rows = entries.map((entry) => {
    return [
      entry.sourceRelPath,
      entry.sha256,
      entry.bucket,
      entry.candidateCharacter,
      entry.confidence,
      entry.reviewStatus,
      entry.confirmedCharacter ?? "",
      entry.assetKind,
      entry.excluded ? "true" : "",
      entry.notes ?? "",
      entry.outputRelPath,
      entry.contexts[0]?.floor ?? "",
      entry.evidence.map(item => `${item.source}:${item.character}:${item.confidence}`).join(" | "),
    ].map(csvEscape).join(",");
  });
  return `${headers.join(",")}\n${rows.join("\n")}\n`;
}

function buildCorrectionsCsv(entries) {
  const headers = ["sourceRelPath", "sha256", "confirmedCharacter", "assetKind", "exclude", "notes"];
  const rows = entries.map(entry => [
    entry.sourceRelPath,
    entry.sha256,
    entry.confirmedCharacter ?? "",
    entry.assetKind === "unknown" ? "" : entry.assetKind,
    entry.excluded ? "true" : "",
    entry.notes ?? "",
  ].map(csvEscape).join(","));
  return `${headers.join(",")}\n${rows.join("\n")}\n`;
}

function buildSummary(entries) {
  const summary = {
    buckets: {},
    byCharacter: {},
    totalImages: entries.length,
  };
  for (const entry of entries) {
    summary.buckets[entry.reviewStatus] = (summary.buckets[entry.reviewStatus] ?? 0) + 1;
    if (!REVIEW_BUCKETS.has(entry.bucket)) {
      summary.byCharacter[entry.bucket] = (summary.byCharacter[entry.bucket] ?? 0) + 1;
    }
  }
  return summary;
}

function parseArgs(argv) {
  const args = {
    corrections: "",
    outDir: DEFAULT_OUT_DIR,
    root: DEFAULT_SOURCE_ROOT,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = argv[++index];
    }
    else if (arg === "--out-dir") {
      args.outDir = argv[++index];
    }
    else if (arg === "--corrections") {
      args.corrections = argv[++index];
    }
  }
  return args;
}

async function assertSafeOutputDir(root, outDir) {
  const resolvedRoot = path.resolve(root);
  const resolvedOutDir = path.resolve(outDir);
  if (!resolvedOutDir.startsWith(resolvedRoot)) {
    throw new Error(`输出目录必须在作品目录内: ${resolvedOutDir}`);
  }
  if (resolvedOutDir === resolvedRoot) {
    throw new Error("输出目录不能等于作品根目录");
  }
  await rm(resolvedOutDir, { force: true, recursive: true });
  await mkdir(resolvedOutDir, { recursive: true });
}

async function buildReviewPack(args) {
  const sourceRoot = path.resolve(args.root);
  const outDir = path.resolve(args.outDir);
  await assertSafeOutputDir(sourceRoot, outDir);

  const imagesDir = path.join(sourceRoot, "images");
  await stat(imagesDir);
  const [{ markdown, meta }, images, visionByHash, corrections] = await Promise.all([
    readAllPartMarkdown(sourceRoot),
    listImages(imagesDir),
    readVisionCache(sourceRoot),
    readCorrections(args.corrections),
  ]);
  const contextsByImage = extractImageContexts(parseFloors(markdown));
  const entries = [];

  for (const image of images) {
    const sha256 = await sha256File(image.absolutePath);
    const contexts = contextsByImage.get(image.relPath) ?? [];
    const correction = corrections.get(sha256) ?? corrections.get(image.relPath);
    const classification = classifyImage(image, contexts, visionByHash.get(sha256), correction);
    const ext = path.extname(image.relPath);
    const baseName = `${safeSegment(path.basename(image.relPath, ext))}_${sha256.slice(0, 10)}${ext}`;
    const bucket = safeSegment(classification.bucket);
    const outputRelPath = path.join("by-character", bucket, baseName).replace(/\\/g, "/");
    const outputPath = path.join(outDir, outputRelPath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    const materializedAs = await linkOrCopy(image.absolutePath, outputPath);
    entries.push({
      assetKind: classification.assetKind,
      bucket: classification.bucket,
      candidateCharacter: classification.candidateCharacter,
      confidence: Number(classification.confidence.toFixed(3)),
      confirmed: classification.confirmed,
      confirmedCharacter: correction?.confirmedCharacter ?? "",
      contexts,
      evidence: classification.evidence,
      excluded: classification.excluded,
      materializedAs,
      notes: correction?.notes ?? "",
      outputRelPath,
      reviewStatus: classification.reviewStatus,
      sha256,
      sourceAbsPath: image.absolutePath,
      sourceRelPath: image.relPath,
    });
  }

  const summary = buildSummary(entries);
  const manifest = {
    entries,
    generatedAt: new Date().toISOString(),
    opus: {
      opusId: meta.opusId,
      sourceRoot,
      title: meta.title,
    },
    summary,
    version: 1,
  };

  await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "manifest.csv"), buildCsv(entries), "utf8");
  await writeFile(path.join(outDir, "corrections.csv"), buildCorrectionsCsv(entries), "utf8");
  await writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "README.md"), [
    "# 咕噜噜图片核对包",
    "",
    "- `by-character/`：按候选角色或待核对桶分组的图片。",
    "- `manifest.json`：导入器使用的完整机器可读清单。",
    "- `manifest.csv`：方便表格查看的清单。",
    "- `corrections.csv`：人工修正入口。填写 `confirmedCharacter` 可确认角色，填写 `exclude=true` 可排除图片。",
    "- `summary.json`：本次分类统计。",
    "",
    "低置信度、冲突、未识别目录中的图片不要直接作为最终头像绑定；确认后在 `corrections.csv` 写入角色名再重跑脚本。",
    "",
  ].join("\n"), "utf8");

  return {
    outDir,
    summary,
  };
}

async function main() {
  const result = await buildReviewPack(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
