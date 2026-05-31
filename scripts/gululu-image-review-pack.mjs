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
  "gululu",
  "remote",
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
const SAFE_ALIAS_OVERRIDES = new Map([
  ["阿空", "灵乌路空"],
  ["阿燐", "火焰猫燐"],
  ["阿求", "稗田阿求"],
  ["爱丽丝", "爱丽丝·玛格特洛依德"],
  ["白莲", "圣白莲"],
  ["布都", "物部布都"],
  ["橙", "橙"],
  ["弁弁", "九十九弁弁"],
  ["八桥", "九十九八桥"],
  ["堇子", "宇佐见堇子"],
  ["董子", "宇佐见堇子"],
  ["辉夜", "蓬莱山辉夜"],
  ["慧音", "上白泽慧音"],
  ["合欢乃", "坂田合欢"],
  ["华扇", "茨木华扇"],
  ["荷取", "河城荷取"],
  ["觉", "古明地觉"],
  ["影狼", "今泉影狼"],
  ["雷鼓", "堀川雷鼓"],
  ["蓝", "八云蓝"],
  ["老郭", "郭海皇"],
  ["灵梦", "博丽灵梦"],
  ["烈", "烈海王"],
  ["妹红", "藤原妹红"],
  ["米斯蒂娅", "米斯蒂娅·萝蕾拉"],
  ["魔理沙", "雾雨魔理沙"],
  ["猯藏", "二岩猯藏"],
  ["青娥", "霍青娥"],
  ["神子", "丰聪耳神子"],
  ["四季", "四季映姬"],
  ["探女", "稀神探女"],
  ["针妙丸", "少名针妙丸"],
  ["永琳", "八意永琳"],
  ["师匠", "八意永琳"],
  ["太子", "丰聪耳神子"],
  ["天子", "比那名居天子"],
  ["文文", "射命丸文"],
  ["小伞", "多多良小伞"],
  ["咲夜", "十六夜咲夜"],
  ["一轮", "云居一轮"],
  ["妖梦", "魂魄妖梦"],
  ["幽香", "风见幽香"],
  ["幽幽子", "西行寺幽幽子"],
  ["勇仪", "星熊勇仪"],
  ["早苗", "东风谷早苗"],
  ["茨华仙", "茨木华扇"],
  ["恋恋", "古明地恋"],
  ["梅莉", "玛艾露贝莉·赫恩"],
  ["梦烈", "烈海王"],
  ["鵺", "封兽鵺"],
  ["芙兰", "芙兰朵露·斯卡雷特"],
  ["芙兰朵露", "芙兰朵露·斯卡雷特"],
  ["霖之助", "森近霖之助"],
  ["正邪", "鬼人正邪"],
  ["紫", "八云紫"],
  ["紫苑", "依神紫苑"],
  ["女苑", "依神女苑"],
  ["萃香", "伊吹萃香"],
]);

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

function replaceInvalidPathChars(value) {
  return Array.from(value, char => ("<>:\"/\\|?*".includes(char) || char.charCodeAt(0) <= 0x1F) ? "_" : char).join("");
}

function safeSegment(value) {
  const normalized = replaceInvalidPathChars(String(value || "未识别"))
    .trim()
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

function normalizeLearnedAlias(character, aliasMap) {
  return aliasMap.get(character) ?? SAFE_ALIAS_OVERRIDES.get(character) ?? character;
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
      const hasManualCorrection = Boolean(
        row.confirmedCharacter?.trim()
        || /^(?:[1y是]|true|yes)$/i.test(row.exclude ?? "")
        || row.notes?.trim(),
      );
      for (const key of [row.sourceRelPath, row.sha256].filter(Boolean)) {
        const existing = rows.get(key);
        const existingHasManualCorrection = Boolean(
          existing?.confirmedCharacter?.trim()
          || /^(?:[1y是]|true|yes)$/i.test(existing?.exclude ?? "")
          || existing?.notes?.trim(),
        );
        if (!existing || hasManualCorrection || !existingHasManualCorrection) {
          rows.set(key, row);
        }
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

function isManualCorrection(row) {
  return Boolean(
    row?.confirmedCharacter?.trim()
    || /^(?:[1y是]|true|yes)$/i.test(row?.exclude ?? "")
    || row?.notes?.trim(),
  );
}

function correctionForImageRecord(image, corrections) {
  const byHash = corrections.get(image.sha256);
  if (isManualCorrection(byHash)) {
    return byHash;
  }
  for (const relPath of image.sourceRelPaths ?? [image.relPath]) {
    const byPath = corrections.get(relPath);
    if (isManualCorrection(byPath)) {
      return byPath;
    }
  }
  return byHash ?? corrections.get(image.relPath);
}

function mergeImageRecordsByHash(imageRecords, corrections) {
  const recordsByHash = new Map();
  for (const record of imageRecords) {
    const records = recordsByHash.get(record.sha256) ?? [];
    records.push(record);
    recordsByHash.set(record.sha256, records);
  }

  return [...recordsByHash.values()].map((records) => {
    const representative = records.find(record => isManualCorrection(corrections.get(record.relPath))) ?? records[0];
    const sourceRelPaths = records.map(record => record.relPath);
    return {
      ...representative,
      contexts: records.flatMap(record => record.contexts),
      duplicateCount: records.length,
      duplicateSourceRelPaths: sourceRelPaths.filter(relPath => relPath !== representative.relPath),
      sourceRelPaths,
    };
  });
}

function collectContextSpeakers(contexts) {
  return contexts
    .flatMap(context => [context.speakerAfter, context.speakerBefore])
    .filter(Boolean);
}

function getImageCanonicalEvidence(record) {
  const pathCharacter = choosePathCharacter(record.relPath);
  if (pathCharacter) {
    return {
      character: pathCharacter,
      source: "path-directory",
    };
  }
  if (record.vision?.character && record.vision.character !== "未知" && Number(record.vision.confidence ?? 0) >= 0.75) {
    return {
      character: record.vision.character,
      source: "vision-cache",
    };
  }
  return null;
}

function buildAliasKey(alias, canonical) {
  return `${alias}\u0000${canonical}`;
}

function isSafeAliasCandidate(alias) {
  return !/[？?：:【】[\]（）()~—\-&＆]/.test(alias)
    && !["的", "支援", "攻击", "受伤", "观感", "成就"].some(keyword => alias.includes(keyword));
}

function learnCharacterAliases(records) {
  const votes = new Map();
  for (const record of records) {
    const canonical = getImageCanonicalEvidence(record);
    if (!canonical?.character) {
      continue;
    }
    for (const speaker of collectContextSpeakers(record.contexts)) {
      if (!speaker || speaker === canonical.character || REVIEW_BUCKETS.has(speaker)) {
        continue;
      }
      const key = buildAliasKey(speaker, canonical.character);
      const current = votes.get(key) ?? {
        alias: speaker,
        canonical: canonical.character,
        evidenceCount: 0,
        examples: [],
        source: canonical.source,
      };
      current.evidenceCount += 1;
      if (current.examples.length < 4) {
        current.examples.push(record.relPath);
      }
      votes.set(key, current);
    }
  }

  const candidatesByAlias = new Map();
  for (const item of votes.values()) {
    if (!isSafeAliasCandidate(item.alias)) {
      continue;
    }
    const isNameContainment = item.canonical.includes(item.alias)
      || (item.alias.includes(item.canonical) && item.canonical.length >= 3);
    const safeOverride = SAFE_ALIAS_OVERRIDES.get(item.alias) === item.canonical;
    if (!isNameContainment && !safeOverride) {
      continue;
    }
    const current = candidatesByAlias.get(item.alias);
    if (!current || item.evidenceCount > current.evidenceCount) {
      candidatesByAlias.set(item.alias, {
        ...item,
        reason: safeOverride ? "safe-alias-override" : "name-containment",
      });
    }
  }

  const learnedAliases = [...candidatesByAlias.values()]
    .filter(item => item.alias !== item.canonical)
    .sort((left, right) => left.alias.localeCompare(right.alias, "zh-Hans-CN"));
  const aliasMap = new Map([...SAFE_ALIAS_OVERRIDES, ...learnedAliases.map(item => [item.alias, item.canonical])]);
  return { aliasMap, learnedAliases };
}

function buildEvidence(image, contexts, vision, aliasMap) {
  const evidence = [];
  const pathCharacter = choosePathCharacter(image.relPath);
  if (pathCharacter) {
    evidence.push({
      character: normalizeLearnedAlias(pathCharacter, aliasMap),
      confidence: 0.82,
      detail: `来源路径: ${image.relPath}`,
      originalCharacter: pathCharacter,
      source: "path-directory",
      weight: 3,
    });
  }
  for (const context of contexts.slice(0, 8)) {
    if (context.speakerAfter) {
      evidence.push({
        character: normalizeLearnedAlias(context.speakerAfter, aliasMap),
        confidence: 0.78,
        detail: `第${context.floor}楼图片后对白`,
        originalCharacter: context.speakerAfter,
        source: "speaker-after",
        weight: 2.6,
      });
    }
    if (context.speakerBefore) {
      evidence.push({
        character: normalizeLearnedAlias(context.speakerBefore, aliasMap),
        confidence: 0.55,
        detail: `第${context.floor}楼图片前对白`,
        originalCharacter: context.speakerBefore,
        source: "speaker-before",
        weight: 1.2,
      });
    }
    if (context.quotedAfter && pathCharacter) {
      evidence.push({
        character: normalizeLearnedAlias(pathCharacter, aliasMap),
        confidence: 0.72,
        detail: `第${context.floor}楼图片后接引号对白`,
        originalCharacter: pathCharacter,
        source: "quoted-after-path",
        weight: 1.5,
      });
    }
  }
  if (vision && vision.character && vision.character !== "未知") {
    evidence.push({
      character: normalizeLearnedAlias(vision.character, aliasMap),
      confidence: Number(vision.confidence ?? 0),
      detail: `视觉分类: ${vision.franchise ?? "未知"} / ${vision.character}`,
      originalCharacter: vision.character,
      source: "vision-cache",
      weight: Number(vision.confidence ?? 0) * 2.5,
    });
  }
  return evidence;
}

function classifyImage(image, contexts, vision, correction, aliasMap) {
  const evidence = buildEvidence(image, contexts, vision, aliasMap);
  const scored = scoreEvidence(evidence);
  const [top, second] = scored;
  const correctedCharacter = normalizeLearnedAlias(correction?.confirmedCharacter?.trim(), aliasMap);
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
  const keptMangaPanel = correction?.assetKind === "manga-panel"
    || correction?.notes?.includes("人物漫画分镜保留");
  if (keptMangaPanel) {
    // 人物漫画分镜需要保留，但未必能安全绑定到单个角色。
    return {
      assetKind: "manga-panel",
      bucket: correctedCharacter || "漫画分镜",
      candidateCharacter: correctedCharacter,
      confidence: correctedCharacter ? 1 : 0,
      confirmed: true,
      evidence,
      excluded: false,
      reviewStatus: "confirmed",
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

async function materializeImage(source, target, mode) {
  if (mode === "copy") {
    await copyFile(source, target);
    return "copy";
  }
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

function buildAliasesCsv(learnedAliases) {
  const headers = ["alias", "canonical", "evidenceCount", "reason", "source", "examples"];
  const rows = learnedAliases.map(item => [
    item.alias,
    item.canonical,
    item.evidenceCount,
    item.reason,
    item.source,
    item.examples.join(" | "),
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
    materialize: "hardlink",
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
    else if (arg === "--materialize") {
      args.materialize = argv[++index];
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
  const corrections = await readCorrections(args.corrections);
  await assertSafeOutputDir(sourceRoot, outDir);

  const imagesDir = path.join(sourceRoot, "images");
  await stat(imagesDir);
  const [{ markdown, meta }, images, visionByHash] = await Promise.all([
    readAllPartMarkdown(sourceRoot),
    listImages(imagesDir),
    readVisionCache(sourceRoot),
  ]);
  const contextsByImage = extractImageContexts(parseFloors(markdown));
  const imageRecords = [];
  for (const image of images) {
    const sha256 = await sha256File(image.absolutePath);
    imageRecords.push({
      ...image,
      contexts: contextsByImage.get(image.relPath) ?? [],
      sha256,
      vision: visionByHash.get(sha256),
    });
  }
  const { aliasMap, learnedAliases } = learnCharacterAliases(imageRecords);
  const uniqueImageRecords = mergeImageRecordsByHash(imageRecords, corrections);
  const entries = [];

  for (const image of uniqueImageRecords) {
    const correction = correctionForImageRecord(image, corrections);
    const classification = classifyImage(image, image.contexts, image.vision, correction, aliasMap);
    const ext = path.extname(image.relPath);
    const baseName = `${safeSegment(path.basename(image.relPath, ext))}_${image.sha256.slice(0, 10)}${ext}`;
    const bucket = safeSegment(classification.bucket);
    const reviewSubdir = REVIEW_BUCKETS.has(classification.bucket) && classification.candidateCharacter
      ? path.join(bucket, safeSegment(classification.candidateCharacter))
      : bucket;
    const outputRelPath = path.join("by-character", reviewSubdir, baseName).replace(/\\/g, "/");
    const outputPath = path.join(outDir, outputRelPath);
    await mkdir(path.dirname(outputPath), { recursive: true });
    const materializedAs = await materializeImage(image.absolutePath, outputPath, args.materialize);
    entries.push({
      assetKind: classification.assetKind,
      bucket: classification.bucket,
      candidateCharacter: classification.candidateCharacter,
      confidence: Number(classification.confidence.toFixed(3)),
      confirmed: classification.confirmed,
      confirmedCharacter: correction?.confirmedCharacter ?? "",
      contexts: image.contexts,
      evidence: classification.evidence,
      excluded: classification.excluded,
      materializedAs,
      notes: correction?.notes ?? "",
      outputRelPath,
      reviewStatus: classification.reviewStatus,
      sha256: image.sha256,
      sourceAbsPath: image.absolutePath,
      sourceRelPath: image.relPath,
      duplicateCount: image.duplicateCount,
      duplicateSourceRelPaths: image.duplicateSourceRelPaths,
      sourceRelPaths: image.sourceRelPaths,
    });
  }

  const summary = buildSummary(entries);
  const manifest = {
    entries,
    generatedAt: new Date().toISOString(),
    learnedAliases,
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
  await writeFile(path.join(outDir, "learned-aliases.csv"), buildAliasesCsv(learnedAliases), "utf8");
  await writeFile(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "README.md"), [
    "# 咕噜噜图片核对包",
    "",
    "- `by-character/`：按候选角色或待核对桶分组的图片。",
    "- `manifest.json`：导入器使用的完整机器可读清单。",
    "- `manifest.csv`：方便表格查看的清单。",
    "- `corrections.csv`：人工修正入口。填写 `confirmedCharacter` 可确认角色，填写 `exclude=true` 可排除图片。",
    "- `learned-aliases.csv`：图片反向学习出的角色别名归并表，请优先审查这里。",
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
