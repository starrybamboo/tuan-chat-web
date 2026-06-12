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
const IGNORED_SPEAKER_PATTERN = /^(?:BGM|HP|Hp|Atk|ATK|攻击|技能|必杀技|PS\d*|T\d+|\d+)$/;
const LOOSE_SPEAKER_DENY_PATTERN = /^(?:除了|虽然|如果|因为|不过|然后|于是|这里|这时|然而|但是|而且|那么|顺便|实际原因|收下吧)$/;
const ROLE_ALIAS_OVERRIDES = new Map([
  ["阿空", "灵乌路空"],
  ["阿燐", "火焰猫燐"],
  ["阿求", "稗田阿求"],
  ["爱丽丝", "爱丽丝·玛格特洛依德"],
  ["白莲", "圣白莲"],
  ["布都", "物部布都"],
  ["橙", "橙"],
  ["辉夜", "蓬莱山辉夜"],
  ["慧音", "上白泽慧音"],
  ["华扇", "茨木华扇"],
  ["觉", "古明地觉"],
  ["雷鼓", "堀川雷鼓"],
  ["蓝", "八云蓝"],
  ["老郭", "郭海皇"],
  ["灵梦", "博丽灵梦"],
  ["烈", "烈海王"],
  ["妹红", "藤原妹红"],
  ["魔理沙", "雾雨魔理沙"],
  ["猯藏", "二岩猯藏"],
  ["青娥", "霍青娥"],
  ["神子", "丰聪耳神子"],
  ["四季", "四季映姬"],
  ["永琳", "八意永琳"],
  ["师匠", "八意永琳"],
  ["太子", "丰聪耳神子"],
  ["天子", "比那名居天子"],
  ["文文", "射命丸文"],
  ["小伞", "多多良小伞"],
  ["咲夜", "十六夜咲夜"],
  ["妖梦", "魂魄妖梦"],
  ["幽香", "风见幽香"],
  ["幽幽子", "西行寺幽幽子"],
  ["勇仪", "星熊勇仪"],
  ["早苗", "东风谷早苗"],
  ["茨华仙", "茨木华扇"],
  ["恋恋", "古明地恋"],
  ["梅莉", "玛艾露贝莉·赫恩"],
  ["梦烈", "烈海王"],
  ["芙兰", "芙兰朵露"],
  ["紫", "八云紫"],
  ["紫苑", "依神紫苑"],
  ["女苑", "依神女苑"],
  ["萃香", "伊吹萃香"],
]);
const CANONICAL_ROLE_NAMES = new Set(ROLE_ALIAS_OVERRIDES.values());
const NON_DIALOG_SPEAKER_NAMES = new Set([
  "作者的独断",
  "历战的战士",
  "烈 海 王",
  "师匠的教导",
  "数值大的那一方胜利，之后进行伤害判定",
  "武术之爱",
  "消力",
  "完全消力",
  "攻消力",
  "两人",
]);
const DICE_DESCRIPTION_SPEAKER_NAMES = new Set([
  "历战的战士",
  "烈 海 王",
  "师匠的教导",
  "数值大的那一方胜利，之后进行伤害判定",
  "武术之爱",
  "消力",
  "完全消力",
  "攻消力",
]);
const NON_DIALOG_SPEAKER_PATTERN = /(?:的教导|的独断|的战士|之爱|那一方胜利|数值.*判定)$/;
const DICE_DESCRIPTION_SPEAKER_PATTERN = /(?:的教导|的战士|之爱|那一方胜利|数值.*判定)$/;
const RULE_CONTENT_PATTERN = /(?:【情报不明】|Atk|ATK|Hp|HP|战斗力|最终伤害|普通攻击|技能|判定|回避|大成功|大失败|所需值|无效|起效|发动时|造成伤害|CT\d|X\d|x\d|[+\-]\d|[／/]\d)/;

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

function normalizeRoleName(name) {
  const trimmed = trimSpeakerName(name);
  return ROLE_ALIAS_OVERRIDES.get(trimmed) ?? trimmed;
}

function isKnownCharacterSpeaker(name) {
  const trimmed = trimSpeakerName(name);
  return ROLE_ALIAS_OVERRIDES.has(trimmed) || CANONICAL_ROLE_NAMES.has(trimmed);
}

function shouldTreatSpeakerLineAsNarration(speakerName, content) {
  const speaker = trimSpeakerName(speakerName);
  if (!speaker) {
    return true;
  }
  if (NON_DIALOG_SPEAKER_NAMES.has(speaker) || NON_DIALOG_SPEAKER_PATTERN.test(speaker)) {
    return true;
  }
  if (/[，,。；;、]/.test(speaker) || /\p{Script=Han}\s+\p{Script=Han}/u.test(speaker)) {
    return true;
  }
  return !isKnownCharacterSpeaker(speaker) && RULE_CONTENT_PATTERN.test(content);
}

function isDiceDescriptionSpeakerLine(speakerName, content) {
  const speaker = trimSpeakerName(speakerName);
  if (!speaker) {
    return false;
  }
  if (DICE_DESCRIPTION_SPEAKER_NAMES.has(speaker) || DICE_DESCRIPTION_SPEAKER_PATTERN.test(speaker)) {
    return true;
  }
  return !isKnownCharacterSpeaker(speaker) && RULE_CONTENT_PATTERN.test(content);
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
  const content = matched.groups.content.trim();
  if (!speakerName || isIgnorableSpeakerName(speakerName) || shouldTreatSpeakerLineAsNarration(speakerName, content)) {
    return null;
  }
  return {
    content,
    speakerName,
  };
}

function parseDiceDescriptionLine(line) {
  const matched = line.match(SPEAKER_LINE_PATTERN);
  if (!matched?.groups) {
    return null;
  }
  const speakerName = trimSpeakerName(matched.groups.speaker);
  const content = matched.groups.content.trim();
  if (!isDiceDescriptionSpeakerLine(speakerName, content)) {
    return null;
  }
  return {
    content: `${speakerName}：${content}`,
  };
}

function parseNumberedOptionPrefix(line) {
  const matched = String(line ?? "").trim().match(/^(\d{1,3}|[一二三四五六七八九十]+)(?:[\s.、]|(?=[^\d\s.、:：]))/);
  if (!matched?.[1]) {
    return undefined;
  }
  if (/^\d+$/.test(matched[1])) {
    const parsed = Number(matched[1]);
    return parsed >= 0 && parsed <= 100 ? matched[1] : undefined;
  }
  return matched[1];
}

function isNumberedOptionLine(line) {
  return parseNumberedOptionPrefix(line) != null;
}

function parseNumberedOptionIndex(line) {
  const prefix = parseNumberedOptionPrefix(line);
  if (!prefix || !/^\d+$/.test(prefix)) {
    return undefined;
  }
  return Number(prefix);
}

function isNumberedOptionBlock(content) {
  const lines = normalizeLineBreaks(content).split("\n").map(line => line.trim()).filter(Boolean);
  return lines.length > 0 && lines.every(isNumberedOptionLine);
}

function inferDiceCommandExpression(expression, resultPart) {
  const trimmedExpression = String(expression ?? "").trim();
  if (!trimmedExpression || /[+\-*/／]/.test(trimmedExpression)) {
    return trimmedExpression;
  }
  const calculation = String(resultPart ?? "").trim().split("=")[0]?.trim() ?? "";
  const modifierMatch = calculation.match(/^[+-]?\d+(?<modifiers>(?:\s*[+\-*/／]\s*[+-]?\d+(?:\.\d+)?)+)$/);
  const modifiers = modifierMatch?.groups?.modifiers?.replace(/\s+/g, "");
  return modifiers ? `${trimmedExpression}${modifiers}` : trimmedExpression;
}

function stripDiceResultForCommand(content) {
  return String(content ?? "")
    .replace(/【([^】]*?(?:\d*d\d+|\d+d\d+|1d|d\d+)[^】]*?)[:：]([^】]*)】/gi, (_token, expression, resultPart) => {
      return `【${inferDiceCommandExpression(expression, resultPart)}：】`;
    })
    .replace(/\[([^\]]*?(?:\d*d\d+|\d+d\d+|1d|d\d+)[^\]]*?)[:：]([^\]]*)\]/gi, (_token, expression, resultPart) => {
      return `[${inferDiceCommandExpression(expression, resultPart)}:]`;
    });
}

function extractFirstDiceResultNumber(content) {
  const matched = String(content ?? "").match(/(?:【|\[)[^\]】]*?(?:\d*d\d+|\d+d\d+|1d|d\d+)[^\]】]*?[:：=]\s*([+-]?\d+)/i);
  if (!matched?.[1]) {
    return undefined;
  }
  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function replaceFirstDiceCommandWithResult(command, result) {
  const value = String(result);
  const source = String(command ?? "");
  const withChineseBrackets = source.replace(
    /【([^】]*?(?:\d*d\d+|\d+d\d+|1d|d\d+)[^】]*?)[:：]\s*】/i,
    (_token, expression) => `【${expression}：${value}】`,
  );
  if (withChineseBrackets !== source) {
    return withChineseBrackets;
  }
  return source.replace(
    /\[([^\]]*?(?:\d*d\d+|\d+d\d+|1d|d\d+)[^\]]*?):\s*\]/i,
    (_token, expression) => `[${expression}:${value}]`,
  );
}

function buildSelectedOptionDiceReply(message, optionIndex) {
  const command = stripDiceResultForCommand(message.content).trim();
  const selected = replaceFirstDiceCommandWithResult(command, optionIndex).trim();
  return selected && selected !== command ? selected : "";
}

function buildDiceReplyTexts(message) {
  const explicitReplies = Array.isArray(message.diceReplies)
    ? message.diceReplies.map(reply => String(reply ?? "").trim()).filter(Boolean)
    : [];
  if (explicitReplies.length > 0) {
    return explicitReplies;
  }
  const content = message.content?.trim() ?? "";
  return content ? [content] : [];
}

function appendUniqueText(items, text) {
  const trimmed = String(text ?? "").trim();
  if (trimmed && !items.includes(trimmed)) {
    items.push(trimmed);
  }
}

function buildDiceRollText(content, diceDescription) {
  const original = String(content ?? "").trim();
  const command = stripDiceResultForCommand(original).trim();
  if (!command || command === original) {
    return undefined;
  }
  const description = diceDescription?.trim();
  return [description, command].filter(Boolean).join("\n");
}

function shouldInferDialogFromImage(line) {
  const normalized = line.trim();
  if (!normalized || normalized.length > 48 || isNumberedOptionLine(normalized)) {
    return false;
  }
  if (SPEAKER_LINE_PATTERN.test(normalized)) {
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
      const roleName = normalizeRoleName(speaker);
      const imageVotes = votes.get(segment.imagePath) ?? new Map();
      imageVotes.set(roleName, (imageVotes.get(roleName) ?? 0) + 1);
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
  let activeDiceDescriptions = [];
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

  const flushDiceDescriptionOnly = () => {
    if (activeDiceDescriptions.length === 0) {
      return;
    }
    const description = activeDiceDescriptions.join("\n");
    pushTextMessage(messages, state, {
      content: description,
      diceDescription: description,
      kind: "dice",
    });
    activeDiceDescriptions = [];
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
      flushDiceDescriptionOnly();
      pushTextMessage(messages, state, {
        bgmName,
        content: `BGM：${bgmName}`,
        kind: "bgm",
      });
      continue;
    }

    if (hasDiceRoll(line)) {
      flushNarration();
      const diceDescription = activeDiceDescriptions.join("\n");
      activeDiceDescriptions = [];
      pushTextMessage(messages, state, {
        content: line,
        diceDescription: diceDescription || undefined,
        kind: "dice",
        rollText: buildDiceRollText(line, diceDescription),
      });
      continue;
    }

    const diceDescriptionLine = parseDiceDescriptionLine(line);
    if (diceDescriptionLine) {
      flushNarration();
      activeDiceDescriptions.push(diceDescriptionLine.content);
      continue;
    }

    const speakerLine = parseSpeakerLine(line);
    if (speakerLine) {
      flushNarration();
      flushDiceDescriptionOnly();
      pushTextMessage(messages, state, {
        content: speakerLine.content,
        inferred: false,
        kind: "dialog",
        roleName: normalizeRoleName(speakerLine.speakerName),
        speakerName: speakerLine.speakerName,
      });
      continue;
    }

    if (inferredSpeaker && segment.imagePath && shouldInferDialogFromImage(line)) {
      flushDiceDescriptionOnly();
      pushTextMessage(messages, state, {
        content: line,
        inferred: true,
        kind: "dialog",
        roleName: normalizeRoleName(inferredSpeaker),
        speakerName: inferredSpeaker,
      });
      continue;
    }

    flushDiceDescriptionOnly();
    activeNarration.push(line);
  }
  flushNarration();
  flushDiceDescriptionOnly();
  return messages;
}

export function mergeDiceOptionMessages(messages) {
  const merged = [];
  for (const message of messages) {
    const previous = merged.at(-1);
    if (
      previous?.kind === "dice"
      && message.kind === "dice"
      && previous.floor === message.floor
      && isNumberedOptionLine(message.content)
    ) {
      const optionLine = message.content.trim();
      const optionCommand = stripDiceResultForCommand(optionLine).trim();
      previous.options = [
        ...(previous.options ?? []),
        optionCommand,
      ];
      previous.rollText ??= stripDiceResultForCommand(previous.content);

      const optionIndex = parseNumberedOptionIndex(optionLine);
      const previousResult = previous.content?.trim() ?? "";
      const previousResultNumber = extractFirstDiceResultNumber(previousResult);
      const replies = [];
      if (optionIndex != null && previousResultNumber !== optionIndex) {
        appendUniqueText(replies, buildSelectedOptionDiceReply(previous, optionIndex));
      }
      else {
        appendUniqueText(replies, previousResult);
      }
      appendUniqueText(replies, optionLine);
      if (optionIndex != null && previousResultNumber !== optionIndex) {
        appendUniqueText(replies, previousResult);
      }
      previous.diceReplies = replies;
      previous.imagePath ??= message.imagePath;
      continue;
    }
    if (
      previous?.kind === "dice"
      && message.kind === "narration"
      && previous.floor === message.floor
      && isNumberedOptionBlock(message.content)
    ) {
      previous.options = [
        ...(previous.options ?? []),
        ...normalizeLineBreaks(message.content).split("\n").map(line => line.trim()).filter(Boolean),
      ];
      previous.rollText ??= stripDiceResultForCommand(previous.content);
      previous.imagePath ??= message.imagePath;
      continue;
    }
    merged.push(message);
  }
  return merged;
}

function buildDiceDisplayContent(message) {
  const content = message.content?.trim() ?? "";
  const description = message.diceDescription?.trim();
  const options = (message.options ?? []).map(option => option.trim()).filter(Boolean);
  const command = message.rollText?.trim() || (description && description !== content ? description : "");
  const replies = buildDiceReplyTexts(message);
  if (command) {
    return [command, ...options, ...replies].filter(Boolean).join("\n").trim();
  }
  if (options.length > 0) {
    return [content || description || "", ...options, ...replies].filter(Boolean).join("\n").trim();
  }
  if (description && description !== content) {
    return `${description}\n${content}`.trim();
  }
  return content || description || "";
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
  const messages = mergeDiceOptionMessages(selectedFloors.flatMap((floor) => {
    return splitImageSegments(floor.body).flatMap(segment => parseSegmentLines(segment, floor, imageSpeakerMap));
  }));

  const rolesByName = new Map();
  for (const message of messages) {
    if (message.kind !== "dialog" || !message.speakerName) {
      continue;
    }
    const roleName = message.roleName || normalizeRoleName(message.speakerName);
    const role = rolesByName.get(roleName) ?? {
      aliases: new Map(),
      avatarImages: new Map(),
      name: roleName,
    };
    role.aliases.set(message.speakerName, (role.aliases.get(message.speakerName) ?? 0) + 1);
    if (message.imagePath) {
      const avatar = role.avatarImages.get(message.imagePath) ?? {
        count: 0,
        firstFloor: message.floor,
        imagePath: message.imagePath,
      };
      avatar.count += 1;
      role.avatarImages.set(message.imagePath, avatar);
    }
    rolesByName.set(roleName, role);
  }

  const roles = [...rolesByName.values()]
    .map(role => ({
      avatarImages: [...role.avatarImages.values()].sort((left, right) => right.count - left.count),
      aliases: [...role.aliases.entries()]
        .map(([name, count]) => ({ count, name }))
        .sort((left, right) => right.count - left.count),
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

function buildAuthoringSource(importPackage, options = {}) {
  const source = importPackage.source ?? {};
  const fromFloor = source.fromFloor ?? options.fromFloor;
  const toFloor = source.toFloor ?? options.toFloor;
  const workId = options.workId ?? (options.opusId ? `opus-${options.opusId}` : undefined);
  return {
    kind: "gululu",
    key: options.sourceKey ?? `${workId ?? "gululu"}:floors:${fromFloor ?? "unknown"}-${toFloor ?? "unknown"}`,
    title: source.title,
    workId,
  };
}

function buildMessageSource(batchSource, message, eventIndex) {
  return {
    kind: batchSource.kind,
    eventIndex,
    originalAssetPath: message.imagePath,
    originalMediaName: message.bgmName,
    originalSpeaker: message.speakerName,
    segmentId: String(message.floor),
    workId: batchSource.workId,
  };
}

function roleSourceKey(roleName) {
  return `role:${roleName}`;
}

function avatarSourceKey(imagePath) {
  return `image:${imagePath}`;
}

function unresolvedBgmName(message) {
  return message.bgmName || message.content.replace(/^\s*BGM\s*[:：]\s*/i, "").trim();
}

function createGululuAuthoringAdapter(authoring, importPackage, options = {}) {
  const targetRoomId = options.targetRoomId;
  if (!Number.isInteger(targetRoomId) || targetRoomId <= 0) {
    throw new Error("targetRoomId must be a positive integer");
  }

  const batchSource = buildAuthoringSource(importPackage, options);
  const batch = authoring.startBatch({
    agentId: options.agentId,
    force: options.force,
    rawInput: importPackage,
    source: batchSource,
    targetRoomId,
  });
  const roleDraftsByName = new Map((importPackage.roles ?? []).map((role) => {
    return [normalizeRoleName(role.name), role];
  }));
  const rolesByName = new Map();
  const avatarsByRoleAndImage = new Map();
  const unresolvedBgmByName = new Map();

  const defaultAvatarPathFor = (roleName) => {
    const normalizedName = normalizeRoleName(roleName);
    const roleDraft = roleDraftsByName.get(normalizedName);
    return roleDraft?.defaultAvatarPath ?? roleDraft?.avatarImages?.[0]?.imagePath;
  };

  const hasAvatarEvidence = roleName => Boolean(defaultAvatarPathFor(roleName));

  const ensureRole = (roleName) => {
    const normalizedName = normalizeRoleName(roleName);
    const existing = rolesByName.get(normalizedName);
    if (existing) {
      return existing;
    }
    const role = authoring.upsertRole({
      batchId: batch.batchId,
      normalizedName,
      sourceKey: roleSourceKey(normalizedName),
    });
    rolesByName.set(normalizedName, role);
    return role;
  };

  for (const role of importPackage.roles ?? []) {
    if (hasAvatarEvidence(role.name)) {
      ensureRole(role.name);
    }
  }

  const ensureAvatar = (role, imagePath) => {
    if (!imagePath) {
      return undefined;
    }
    const key = `${role.roleId}:${imagePath}`;
    const existing = avatarsByRoleAndImage.get(key);
    if (existing) {
      return existing;
    }
    const avatar = authoring.upsertAvatar({
      batchId: batch.batchId,
      fileName: path.basename(imagePath),
      roleId: role.roleId,
      sourceAssetKey: avatarSourceKey(imagePath),
    });
    avatarsByRoleAndImage.set(key, avatar);
    return avatar;
  };

  const ensureUnresolvedBgm = (message, source) => {
    const originalName = unresolvedBgmName(message);
    const existing = unresolvedBgmByName.get(originalName);
    if (existing) {
      return existing;
    }
    const unresolved = authoring.recordUnresolvedMedia({
      batchId: batch.batchId,
      originalName,
      purpose: "bgm",
      reason: "no BGM media manifest provided",
      source,
    });
    unresolvedBgmByName.set(originalName, unresolved);
    return unresolved;
  };

  const authoredMessages = [];
  importPackage.messages.forEach((message, index) => {
    const source = buildMessageSource(batchSource, message, index + 1);
    if (message.kind === "dialog") {
      const roleName = message.roleName || message.speakerName;
      const avatarImagePath = message.imagePath || defaultAvatarPathFor(roleName);
      if (!avatarImagePath) {
        authoredMessages.push({
          content: `${message.speakerName}：${message.content}`,
          kind: "narration",
          source,
        });
        return;
      }

      const role = ensureRole(roleName);
      const avatar = ensureAvatar(role, avatarImagePath);
      authoredMessages.push({
        avatarId: avatar?.avatarId,
        content: message.content,
        customRoleName: message.speakerName && message.speakerName !== role.normalizedName
          ? message.speakerName
          : undefined,
        kind: "dialog",
        roleId: role.roleId,
        source,
      });
      return;
    }

    if (message.kind === "dice") {
      const diceReplies = buildDiceReplyTexts(message);
      const diceResult = diceReplies.filter(reply => hasDiceRoll(reply)).join("\n");
      authoredMessages.push({
        content: buildDiceDisplayContent(message),
        dice: {
          description: message.diceDescription,
          options: message.options,
          result: diceResult || undefined,
          rollText: message.rollText,
        },
        kind: "dice",
        source,
      });
      return;
    }

    if (message.kind === "bgm") {
      const unresolved = ensureUnresolvedBgm(message, source);
      authoredMessages.push({
        kind: "bgm",
        source,
        unresolvedMediaId: unresolved.unresolvedMediaId,
      });
      return;
    }

    authoredMessages.push({
      content: message.content,
      kind: "narration",
      source,
    });
  });

  if (authoredMessages.length > 0) {
    authoring.writeMessages({
      batchId: batch.batchId,
      messages: authoredMessages,
    });
  }

  const report = options.commit === false
    ? authoring.inspectBatch(batch.batchId)
    : authoring.commitBatch(batch.batchId);
  return {
    avatarCount: avatarsByRoleAndImage.size,
    batch,
    readiness: authoring.inspectWebgalReadiness(batch.batchId),
    report,
    roleCount: rolesByName.size,
    unresolvedBgmCount: unresolvedBgmByName.size,
  };
}

export function applyGululuReplayImportToAuthoring(authoring, importPackage, options = {}) {
  return createGululuAuthoringAdapter(authoring, importPackage, options);
}

export function buildImportText(importPackage) {
  const speakerByKind = {
    bgm: "BGM",
    dice: "骰娘",
    narration: "旁白",
  };
  return importPackage.messages.map((message) => {
    const speaker = message.kind === "dialog" ? message.speakerName : speakerByKind[message.kind];
    const content = message.kind === "dice" ? buildDiceDisplayContent(message) : message.content;
    return `[${speaker}]：${content}`;
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
