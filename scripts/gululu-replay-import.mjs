/* eslint-disable regexp/no-super-linear-backtracking, regexp/optimal-quantifier-concatenation, regexp/no-useless-non-capturing-group, regexp/no-dupe-disjunctions, regexp/prefer-d, regexp/no-useless-escape, regexp/prefer-character-class */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_SOURCE_ROOT = "D:/gululu-cache/output/opus-88";
const DEFAULT_OUT_DIR = "D:/gululu-cache/output/opus-88/tuanchat-import";
const DEFAULT_FROM_FLOOR = 1;
const DEFAULT_TO_FLOOR = 62;

const IMAGE_MARKDOWN_PATTERN = /!\[image\]\(([^)]+)\)/g;
const FLOOR_PATTERN = /^## 第(?<floor>\d+)楼\s*\r?\n\s*> 时间: (?<time>[^\r\n]+)\s*(?<body>.*?)(?=^## 第\d+楼|(?![\s\S]))/gms;
const DICE_PATTERN = /(?:【[^】]*(?:\d*d\d+|\d+d\d+|1d|d\d+)[^】]*】|\[[0-9]*d[0-9]+[:：=][^\]]*\])/i;
const BGM_LINE_PATTERN = /^\s*BGM\s*[:：]\s*(?<name>.+?)\s*$/i;
const SPEAKER_LINE_PATTERN = /^\s*(?<speaker>[^:：\r\n]{1,18})\s*[:：]\s*(?<content>.*)$/;
const LOOSE_SPEAKER_QUOTE_PATTERN = /^\s*(?<speaker>[\p{Script=Han}A-Za-z0-9·]{1,10})\s*[“"‘'](?<content>.*)$/u;
const IGNORED_SPEAKER_PATTERN = /^(?:BGM|HP|Hp|Atk|ATK|攻击|技能|必杀技|PS|T\d+|\d+)$/;
const LOOSE_SPEAKER_DENY_PATTERN = /^(?:除了|虽然|如果|因为|不过|然后|于是|这里|这时|然而|但是|而且|那么|顺便|实际原因|收下吧)$/;

export function normalizeGululuImagePath(rawPath) {
  return rawPath.trim().replace(/\\/g, "/").replace(/^\.\.\/images\//, "");
}

function normalizeLineBreaks(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function trimSpeakerName(name) {
  return String(name ?? "").trim().replace(/^[“”「」『』]+|[“”「」『』]+$/g, "").trim();
}

function trimLooseQuotedContent(content) {
  return String(content ?? "").trim().replace(/[”"’']+$/g, "").trim();
}

function isIgnorableSpeakerName(name) {
  return IGNORED_SPEAKER_PATTERN.test(trimSpeakerName(name));
}

function hasDiceRoll(line) {
  return DICE_PATTERN.test(line);
}

function parseBgmLine(line) {
  const matched = line.match(BGM_LINE_PATTERN);
  return matched?.groups?.name?.trim() || null;
}

function parseSpeakerLine(line) {
  const matched = line.match(SPEAKER_LINE_PATTERN);
  if (!matched?.groups) {
    const quoteMatched = line.match(LOOSE_SPEAKER_QUOTE_PATTERN);
    if (!quoteMatched?.groups) {
      return null;
    }
    const speakerName = trimSpeakerName(quoteMatched.groups.speaker);
    if (!speakerName || isIgnorableSpeakerName(speakerName) || LOOSE_SPEAKER_DENY_PATTERN.test(speakerName)) {
      return null;
    }
    return {
      content: trimLooseQuotedContent(quoteMatched.groups.content),
      speakerName,
    };
  }
  const speakerName = trimSpeakerName(matched.groups.speaker);
  if (!speakerName || isIgnorableSpeakerName(speakerName)) {
    return null;
  }
  return {
    content: matched.groups.content.trim(),
    speakerName,
  };
}

function isNumberedOptionLine(line) {
  return /^\s*(?:\d+|[一二三四五六七八九十]+)[\s.、]/.test(line);
}

function shouldInferDialogFromImage(line) {
  const normalized = line.trim();
  if (!normalized || normalized.length > 48 || isNumberedOptionLine(normalized)) {
    return false;
  }
  if (/^[（(【\[]/.test(normalized)) {
    return false;
  }
  if (/^[—-]/.test(normalized)) {
    return false;
  }
  if (/^[“"「『]/.test(normalized)) {
    return true;
  }
  return /[？！!?]|[，,].*(?:你|我)|(?:你|我|吗|呢|吧|啊|哦|哎|呀|喂|请|抱歉|对不起|谢谢)/.test(normalized);
}

function splitImageSegments(body) {
  const normalized = normalizeLineBreaks(body);
  const segments = [];
  let currentIndex = 0;
  let currentImagePath;
  for (const matched of normalized.matchAll(IMAGE_MARKDOWN_PATTERN)) {
    const text = normalized.slice(currentIndex, matched.index);
    if (text.trim()) {
      segments.push({ imagePath: currentImagePath, text });
    }
    currentImagePath = normalizeGululuImagePath(matched[1]);
    currentIndex = matched.index + matched[0].length;
  }
  const tail = normalized.slice(currentIndex);
  if (tail.trim()) {
    segments.push({ imagePath: currentImagePath, text: tail });
  }
  return segments;
}

export function parseGululuFloors(markdown) {
  const floors = [];
  const normalized = normalizeLineBreaks(markdown);
  for (const matched of normalized.matchAll(FLOOR_PATTERN)) {
    floors.push({
      body: matched.groups.body.trim(),
      floor: Number(matched.groups.floor),
      time: matched.groups.time.trim(),
    });
  }
  return floors;
}

export function buildImageSpeakerVotes(floors) {
  const votes = new Map();
  for (const floor of floors) {
    for (const segment of splitImageSegments(floor.body)) {
      if (!segment.imagePath) {
        continue;
      }
      const firstContentLine = segment.text
        .split("\n")
        .map(line => line.trim())
        .find(Boolean);
      if (!firstContentLine) {
        continue;
      }
      const speaker = parseSpeakerLine(firstContentLine)?.speakerName;
      if (!speaker) {
        continue;
      }
      const imageVotes = votes.get(segment.imagePath) ?? new Map();
      imageVotes.set(speaker, (imageVotes.get(speaker) ?? 0) + 1);
      votes.set(segment.imagePath, imageVotes);
    }
  }
  return votes;
}

export function buildImageSpeakerMap(votes, options = {}) {
  const minVotes = options.minVotes ?? 2;
  const result = new Map();
  for (const [imagePath, imageVotes] of votes) {
    const sorted = [...imageVotes.entries()].sort((left, right) => right[1] - left[1]);
    const [top, second] = sorted;
    if (!top || top[1] < minVotes) {
      continue;
    }
    result.set(imagePath, {
      ambiguous: Boolean(second && second[1] * 2 > top[1]),
      speakerName: top[0],
      votes: top[1],
    });
  }
  return result;
}

function pushTextMessage(messages, state, message) {
  const content = message.content.trim();
  if (!content) {
    return;
  }
  messages.push({
    floor: state.floor.floor,
    imagePath: state.imagePath,
    sourceTime: state.floor.time,
    ...message,
  });
}

function parseSegmentLines(segment, floor, imageSpeakerMap) {
  const messages = [];
  const state = { floor, imagePath: segment.imagePath };
  const inferredSpeaker = segment.imagePath ? imageSpeakerMap.get(segment.imagePath)?.speakerName : undefined;
  let activeNarration = [];

  const flushNarration = () => {
    if (activeNarration.length === 0) {
      return;
    }
    pushTextMessage(messages, state, {
      content: activeNarration.join("\n"),
      kind: "narration",
    });
    activeNarration = [];
  };

  for (const rawLine of normalizeLineBreaks(segment.text).split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushNarration();
      continue;
    }

    const bgmName = parseBgmLine(line);
    if (bgmName) {
      flushNarration();
      pushTextMessage(messages, state, {
        bgmName,
        content: `BGM：${bgmName}`,
        kind: "bgm",
      });
      continue;
    }

    if (hasDiceRoll(line)) {
      flushNarration();
      pushTextMessage(messages, state, {
        content: line,
        kind: "dice",
      });
      continue;
    }

    const speakerLine = parseSpeakerLine(line);
    if (speakerLine) {
      flushNarration();
      pushTextMessage(messages, state, {
        content: speakerLine.content,
        inferred: false,
        kind: "dialog",
        speakerName: speakerLine.speakerName,
      });
      continue;
    }

    if (inferredSpeaker && segment.imagePath && shouldInferDialogFromImage(line)) {
      pushTextMessage(messages, state, {
        content: line,
        inferred: true,
        kind: "dialog",
        speakerName: inferredSpeaker,
      });
      continue;
    }

    activeNarration.push(line);
  }
  flushNarration();
  return messages;
}

function buildReviewedImageMap(manifest) {
  const entries = manifest?.entries ?? [];
  return new Map(entries.map(entry => [normalizeGululuImagePath(entry.sourceRelPath), {
    assetKind: entry.assetKind,
    candidateCharacter: entry.candidateCharacter,
    confidence: entry.confidence,
    confirmedCharacter: entry.confirmedCharacter || (entry.confirmed ? entry.candidateCharacter : ""),
    outputRelPath: entry.outputRelPath,
    reviewStatus: entry.reviewStatus,
    sourceRelPath: normalizeGululuImagePath(entry.sourceRelPath),
  }]));
}

function mergeReviewedImageSpeakers(imageSpeakerMap, reviewedImageMap) {
  if (!reviewedImageMap) {
    return imageSpeakerMap;
  }
  const merged = new Map(imageSpeakerMap);
  for (const [imagePath, review] of reviewedImageMap) {
    if (!review.confirmedCharacter) {
      continue;
    }
    merged.set(imagePath, {
      ambiguous: false,
      reviewStatus: "confirmed",
      speakerName: review.confirmedCharacter,
      votes: Number.POSITIVE_INFINITY,
    });
  }
  return merged;
}

function buildRoleCardDrafts(reviewedImageMap) {
  if (!reviewedImageMap) {
    return [];
  }
  const roles = new Map();
  for (const review of reviewedImageMap.values()) {
    const roleName = review.confirmedCharacter || review.candidateCharacter;
    if (!roleName) {
      continue;
    }
    const role = roles.get(roleName) ?? {
      avatarCandidates: [],
      defaultAvatar: null,
      manualConfirmed: false,
      roleName,
    };
    const candidate = {
      assetKind: review.assetKind,
      confidence: review.confidence,
      confirmed: Boolean(review.confirmedCharacter),
      outputRelPath: review.outputRelPath,
      reviewStatus: review.reviewStatus,
      sourceRelPath: review.sourceRelPath,
    };
    role.avatarCandidates.push(candidate);
    if (candidate.confirmed) {
      role.manualConfirmed = true;
      role.defaultAvatar ??= candidate;
    }
    roles.set(roleName, role);
  }
  return [...roles.values()]
    .map(role => ({
      ...role,
      avatarCandidates: role.avatarCandidates.sort((left, right) => {
        if (left.confirmed !== right.confirmed) {
          return left.confirmed ? -1 : 1;
        }
        return right.confidence - left.confidence;
      }),
    }))
    .sort((left, right) => left.roleName.localeCompare(right.roleName, "zh-Hans-CN"));
}

export function buildGululuReplayImportPackage(floors, options = {}) {
  const selectedFloors = floors.filter(floor => floor.floor >= options.fromFloor && floor.floor <= options.toFloor);
  const reviewedImageMap = options.reviewManifest ? buildReviewedImageMap(options.reviewManifest) : null;
  const imageSpeakerMap = mergeReviewedImageSpeakers(
    buildImageSpeakerMap(buildImageSpeakerVotes(floors), { minVotes: 2 }),
    reviewedImageMap,
  );
  const messages = selectedFloors.flatMap((floor) => {
    return splitImageSegments(floor.body).flatMap(segment => parseSegmentLines(segment, floor, imageSpeakerMap));
  });

  const rolesByName = new Map();
  for (const message of messages) {
    if (message.kind !== "dialog" || !message.speakerName) {
      continue;
    }
    const role = rolesByName.get(message.speakerName) ?? {
      avatarImages: new Map(),
      name: message.speakerName,
    };
    if (message.imagePath) {
      const avatar = role.avatarImages.get(message.imagePath) ?? {
        count: 0,
        firstFloor: message.floor,
        imagePath: message.imagePath,
      };
      avatar.count += 1;
      role.avatarImages.set(message.imagePath, avatar);
    }
    rolesByName.set(message.speakerName, role);
  }

  const roles = [...rolesByName.values()]
    .map(role => ({
      avatarImages: [...role.avatarImages.values()].sort((left, right) => right.count - left.count),
      defaultAvatarPath: [...role.avatarImages.values()].sort((left, right) => right.count - left.count)[0]?.imagePath,
      name: role.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));

  const messageStats = messages.reduce((stats, message) => {
    stats[message.kind] = (stats[message.kind] ?? 0) + 1;
    if (message.inferred) {
      stats.inferredDialog = (stats.inferredDialog ?? 0) + 1;
    }
    return stats;
  }, {});

  return {
    imageReview: reviewedImageMap
      ? {
          roleCardDrafts: buildRoleCardDrafts(reviewedImageMap),
          source: options.reviewManifest?.opus,
          version: options.reviewManifest?.version,
        }
      : undefined,
    messages,
    roles,
    source: {
      floorCount: selectedFloors.length,
      fromFloor: options.fromFloor,
      title: options.title,
      toFloor: options.toFloor,
    },
    stats: {
      ...messageStats,
      roleCount: roles.length,
      totalMessages: messages.length,
    },
  };
}

export function buildImportText(importPackage) {
  const speakerByKind = {
    bgm: "BGM",
    dice: "骰娘",
    narration: "旁白",
  };
  return importPackage.messages.map((message) => {
    const speaker = message.kind === "dialog" ? message.speakerName : speakerByKind[message.kind];
    return `[${speaker}]：${message.content}`;
  }).join("\n");
}

function parseCliArgs(argv) {
  const args = {
    from: DEFAULT_FROM_FLOOR,
    outDir: DEFAULT_OUT_DIR,
    root: DEFAULT_SOURCE_ROOT,
    to: DEFAULT_TO_FLOOR,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = argv[++index];
    }
    else if (arg === "--out-dir") {
      args.outDir = argv[++index];
    }
    else if (arg === "--from") {
      args.from = Number(argv[++index]);
    }
    else if (arg === "--to") {
      args.to = Number(argv[++index]);
    }
    else if (arg === "--image-review-manifest") {
      args.imageReviewManifest = argv[++index];
    }
  }
  return args;
}

async function readAllPartMarkdown(sourceRoot) {
  const partsDir = path.join(sourceRoot, "parts");
  const metaPath = path.join(sourceRoot, "meta.json");
  const { readdir } = await import("node:fs/promises");
  const meta = JSON.parse(await readFile(metaPath, "utf8"));
  const partNames = await readdir(partsDir);
  const texts = [];
  for (let index = 1; index <= meta.partCount; index++) {
    const partPrefix = `part-${String(index).padStart(4, "0")}_`;
    const resolvedPartName = partNames.find(name => name.startsWith(partPrefix) && name.endsWith(".md"));
    if (!resolvedPartName) {
      throw new Error(`未找到分片: ${partPrefix}*.md`);
    }
    texts.push(await readFile(path.join(partsDir, resolvedPartName), "utf8"));
  }
  return { meta, markdown: texts.join("\n\n") };
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const { meta, markdown } = await readAllPartMarkdown(args.root);
  const floors = parseGululuFloors(markdown);
  const importPackage = buildGululuReplayImportPackage(floors, {
    fromFloor: args.from,
    reviewManifest: args.imageReviewManifest
      ? JSON.parse(await readFile(args.imageReviewManifest, "utf8"))
      : undefined,
    title: meta.title,
    toFloor: args.to,
  });

  await import("node:fs/promises").then(fs => fs.mkdir(args.outDir, { recursive: true }));
  const baseName = `opus-${meta.opusId}-floors-${args.from}-${args.to}`;
  const jsonPath = path.join(args.outDir, `${baseName}.tuanchat-replay-import.json`);
  const textPath = path.join(args.outDir, `${baseName}.chat-import.txt`);
  await writeFile(jsonPath, `${JSON.stringify(importPackage, null, 2)}\n`, "utf8");
  await writeFile(textPath, `${buildImportText(importPackage)}\n`, "utf8");
  console.log(JSON.stringify({
    jsonPath,
    stats: importPackage.stats,
    textPath,
  }, null, 2));
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
