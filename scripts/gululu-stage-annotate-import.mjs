#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ANNOTATION = {
  BGM: "sys:bgm",
  DIALOG_NEXT: "dialog.next",
  FIGURE_CLEAR: "figure.clear",
  FIGURE_ENTER: "figure.anim.enter",
  POS_CENTER: "figure.pos.center",
  POS_LEFT_CENTER: "figure.pos.left-center",
  POS_RIGHT_CENTER: "figure.pos.right-center",
  SCENE_EFFECT_RAIN: "scene.effect.rain",
  SCENE_EFFECT_SAKURA: "scene.effect.sakura",
  SCENE_EFFECT_SNOW: "scene.effect.snow",
  SCENE_EFFECT_STOP: "scene.effect.stop",
};

const PROTAGONIST_NAMES = new Set(["烈", "烈海王"]);
const ROLE_ALIAS = new Map([
  ["阿空", "灵乌路空"],
  ["阿燐", "火焰猫燐"],
  ["阿求", "稗田阿求"],
  ["爱丽丝", "爱丽丝·玛格特洛依德"],
  ["白莲", "圣白莲"],
  ["布都", "物部布都"],
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
  ["小铃", "本居小铃"],
  ["咲夜", "十六夜咲夜"],
  ["妖梦", "魂魄妖梦"],
  ["幽香", "风见幽香"],
  ["幽幽子", "西行寺幽幽子"],
  ["勇伯", "范马勇次郎"],
  ["勇仪", "星熊勇仪"],
  ["早苗", "东风谷早苗"],
  ["茨华仙", "茨木华扇"],
  ["恋恋", "古明地恋"],
  ["梅莉", "玛艾露贝莉·赫恩"],
  ["梦烈", "烈海王"],
  ["芙兰", "芙兰朵露"],
  ["蕾米莉亚", "蕾米莉亚·斯卡雷特"],
  ["紫", "八云紫"],
  ["紫苑", "依神紫苑"],
  ["女苑", "依神女苑"],
  ["萃香", "伊吹萃香"],
  ["千春哥", "柴千春"],
]);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

function requireArg(args, key) {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required --${key}`);
  }
  return value;
}

function uniqueAnnotations(items) {
  return Array.from(new Set(items.filter(item => typeof item === "string" && item.trim()).map(item => item.trim())));
}

function contentOf(message) {
  return String(message.content ?? "").trim();
}

function stripSpeakerPrefix(content, speakerName) {
  const text = String(content ?? "").trim();
  const speaker = String(speakerName ?? "").trim();
  if (!speaker) {
    return text;
  }
  return text.replace(new RegExp(`^${escapeRegExp(speaker)}\\s*[:：]\\s*`), "").trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roleOf(message, roleNames) {
  const roleName = String(message.roleName || "").trim();
  const speakerName = String(message.speakerName || "").trim();
  if (roleName) {
    return canonicalRoleName(roleName, roleNames);
  }
  return speakerName ? canonicalRoleName(speakerName, roleNames) : "";
}

function canonicalRoleName(roleName, roleNames) {
  const normalized = String(roleName ?? "").trim();
  if (!normalized) {
    return "";
  }
  const alias = ROLE_ALIAS.get(normalized);
  if (alias) {
    return alias;
  }
  if (roleNames?.has(normalized)) {
    return normalized;
  }
  return normalized;
}

function speakerPrefixNames(message) {
  const rawNames = [
    String(message?.speakerName ?? "").trim(),
    String(message?.roleName ?? "").trim(),
    canonicalRoleName(message?.speakerName, new Set()),
    canonicalRoleName(message?.roleName, new Set()),
  ].filter(Boolean);
  const names = new Set(rawNames);
  for (const rawName of rawNames) {
    for (const part of rawName.split(/[／/]/).map(item => item.trim()).filter(Boolean)) {
      names.add(part);
      names.add(canonicalRoleName(part, new Set()));
    }
  }
  for (const [alias, roleName] of ROLE_ALIAS.entries()) {
    if (names.has(roleName)) {
      names.add(alias);
    }
  }
  return [...names].sort((left, right) => right.length - left.length);
}

function stripMessageSpeakerPrefix(content, message) {
  let text = String(content ?? "").trim();
  for (const speakerName of speakerPrefixNames(message)) {
    text = stripSpeakerPrefix(text, speakerName);
    text = text.replace(new RegExp(`([；;\\n])\\s*${escapeRegExp(speakerName)}\\s*[:：]\\s*`, "g"), "$1");
  }
  return text;
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
      }
      else {
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
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some(value => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some(value => value !== "")) {
    rows.push(row);
  }
  const [headers, ...body] = rows;
  return body.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function normalizeImagePath(value) {
  return String(value ?? "").trim().replace(/\\/g, "/").replace(/^\.\.\/images\//, "");
}

function splitPipeCell(value) {
  return String(value ?? "").split("|").map(normalizeImagePath).filter(Boolean);
}

async function loadImageRoleIndex(sourceRoot) {
  if (!sourceRoot) {
    return new Map();
  }
  const indexPath = path.join(sourceRoot, "image-role-review-clean-vision-final", "index.csv");
  try {
    const text = await readFile(indexPath, "utf8");
    const roleByImage = new Map();
    for (const row of parseCsv(text)) {
      const roleName = row.character?.trim();
      if (!roleName) {
        continue;
      }
      const sourceRelPaths = [
        normalizeImagePath(row.sourceRelPath),
        ...splitPipeCell(row.aggregatedSourceRelPaths),
      ].filter(Boolean);
      for (const sourceRelPath of sourceRelPaths) {
        if (!roleByImage.has(sourceRelPath)) {
          roleByImage.set(sourceRelPath, roleName);
        }
      }
    }
    return roleByImage;
  }
  catch {
    return new Map();
  }
}

function positionForRole(roleName) {
  if (PROTAGONIST_NAMES.has(roleName)) {
    return {
      annotation: ANNOTATION.POS_LEFT_CENTER,
      key: "left-center",
    };
  }
  return {
    annotation: roleName ? ANNOTATION.POS_RIGHT_CENTER : ANNOTATION.POS_CENTER,
    key: roleName ? "right-center" : "center",
  };
}

function sceneAnnotationsForText(text) {
  const annotations = [];
  const normalized = text.replace(/\s+/g, "");
  if (/永远亭|神灵庙|道场|第二天|夜晚|早晨|开始导入|战斗/.test(normalized)) {
    annotations.push(ANNOTATION.FIGURE_CLEAR);
  }
  if (/雪/.test(normalized)) {
    annotations.push(ANNOTATION.SCENE_EFFECT_SNOW);
  }
  else if (/雨/.test(normalized)) {
    annotations.push(ANNOTATION.SCENE_EFFECT_RAIN);
  }
  else if (/樱|花瓣/.test(normalized)) {
    annotations.push(ANNOTATION.SCENE_EFFECT_SAKURA);
  }
  else if (/室内|道场|永远亭|神灵庙/.test(normalized)) {
    annotations.push(ANNOTATION.SCENE_EFFECT_STOP);
  }
  return uniqueAnnotations(annotations);
}

function normalizeDiceFields(message) {
  const dice = message.dice && typeof message.dice === "object" ? message.dice : null;
  if (!dice) {
    return message;
  }
  return {
    ...message,
    diceDescription: message.diceDescription ?? dice.description,
    diceReplies: message.diceReplies ?? (dice.result ? [dice.result] : undefined),
    rollText: message.rollText ?? dice.rollText,
  };
}

function normalizeMatchText(value) {
  return String(value ?? "")
    .replace(/[.。…]+$/g, "")
    .replace(/[^\p{Script=Han}\p{L}\p{N}]+/gu, "")
    .trim();
}

function comparableContent(message) {
  return normalizeMatchText(stripMessageSpeakerPrefix(message?.content ?? "", message));
}

function textMatchScore(message, eventSourceMessage) {
  const classifiedText = comparableContent(message);
  const sourceText = comparableContent(eventSourceMessage);
  if (!classifiedText || !sourceText) {
    return 0;
  }
  if (classifiedText === sourceText) {
    return 100;
  }
  if (sourceText.includes(classifiedText) && classifiedText.length >= 6) {
    return 90;
  }
  if (classifiedText.includes(sourceText) && sourceText.length >= 6) {
    return 78;
  }
  if (sourceText.includes(classifiedText.slice(0, 12)) && classifiedText.length >= 12) {
    return 65;
  }
  return 0;
}

function speakerCompatible(message, eventSourceMessage, roleNames) {
  if (message?.kind !== "dialog") {
    return true;
  }
  const classifiedRole = canonicalRoleName(roleOf(message, roleNames), roleNames);
  const sourceRole = canonicalRoleName(roleOf(eventSourceMessage, roleNames), roleNames);
  if (!classifiedRole || !sourceRole) {
    return true;
  }
  return classifiedRole === sourceRole;
}

function shouldUseEventSourceContent(message, eventSourceMessage) {
  const classifiedText = comparableContent(message);
  const sourceText = comparableContent(eventSourceMessage);
  if (!classifiedText || !sourceText) {
    return false;
  }
  return sourceText.includes(classifiedText) && sourceText.length > classifiedText.length;
}

function ensureRolePlan(roles, roleName, aliasName) {
  const normalizedRoleName = String(roleName ?? "").trim();
  if (!normalizedRoleName) {
    return;
  }
  let role = roles.find(item => item.name === normalizedRoleName);
  if (!role) {
    role = { aliases: [], avatarImages: [], name: normalizedRoleName };
    roles.push(role);
  }
  if (aliasName && aliasName !== normalizedRoleName) {
    role.aliases ??= [];
    if (!role.aliases.some(item => item.name === aliasName)) {
      role.aliases.push({ count: 0, name: aliasName });
    }
  }
}

function seedRolesFromMessages(roles, messages) {
  for (const message of messages) {
    if (message.kind !== "dialog") {
      continue;
    }
    const speakerName = String(message.speakerName ?? "").trim();
    const roleName = canonicalRoleName(message.roleName || speakerName, new Set());
    ensureRolePlan(roles, roleName, speakerName);
  }
}

function buildEventIndex(eventSource) {
  const index = new Map();
  for (const [sourceIndex, message] of (eventSource?.messages ?? []).entries()) {
    const key = `${message.floor ?? ""}\u0000${message.kind ?? ""}`;
    const entries = index.get(key) ?? [];
    entries.push({ message, sourceIndex, used: false });
    index.set(key, entries);
  }
  return index;
}

function takeEventSourceMessage(index, message, roleNames, stats) {
  const key = `${message.floor ?? ""}\u0000${message.kind ?? ""}`;
  const candidates = index.get(key) ?? [];
  let best = null;
  for (const candidate of candidates) {
    if (candidate.used) {
      continue;
    }
    if (!speakerCompatible(message, candidate.message, roleNames)) {
      continue;
    }
    const score = textMatchScore(message, candidate.message);
    if (score <= 0) {
      continue;
    }
    if (!best || score > best.score) {
      best = { entry: candidate, score };
    }
  }
  if (!best || best.score < 65) {
    stats.unmatched += 1;
    return undefined;
  }
  best.entry.used = true;
  stats.matched += 1;
  if (best.score < 85) {
    stats.lowConfidence += 1;
  }
  return best.entry.message;
}

function enrichFromEventSource(message, eventSourceMessage, roleNames) {
  if (!eventSourceMessage) {
    return message;
  }
  if (message.kind === "dice") {
    return {
      ...message,
      content: eventSourceMessage.content ?? message.content,
      diceDescription: eventSourceMessage.diceDescription ?? message.diceDescription,
      diceReplies: eventSourceMessage.diceReplies ?? message.diceReplies,
      options: eventSourceMessage.options ?? message.options,
      rollText: eventSourceMessage.rollText ?? message.rollText,
    };
  }
  if (message.kind === "dialog") {
    const classifiedRoleName = String(message.roleName ?? "").trim();
    const roleName = roleNames.has(classifiedRoleName) ? classifiedRoleName : classifiedRoleName;
    const speakerName = message.speakerName;
    return {
      ...message,
      content: shouldUseEventSourceContent(message, eventSourceMessage)
        ? stripMessageSpeakerPrefix(eventSourceMessage.content, message)
        : stripMessageSpeakerPrefix(message.content, message),
      imagePath: eventSourceMessage.imagePath ?? message.imagePath,
      roleName,
      speakerName,
    };
  }
  return {
    ...message,
    imagePath: eventSourceMessage.imagePath ?? message.imagePath,
  };
}

function ensureRoleAvatarEvidence(roles, roleName, imagePath) {
  if (!roleName || !imagePath) {
    return;
  }
  let role = roles.find(item => item.name === roleName);
  if (!role) {
    role = { name: roleName, avatarImages: [] };
    roles.push(role);
  }
  role.avatarImages ??= [];
  if (!role.avatarImages.some(item => item.imagePath === imagePath)) {
    role.avatarImages.push({ count: 1, imagePath });
  }
}

function createAvatarSwitchMessage(params) {
  const { floor, imagePath, index, roleName, sourceTime } = params;
  const position = positionForRole(roleName);
  return {
    annotations: uniqueAnnotations([position.annotation, ANNOTATION.DIALOG_NEXT]),
    content: "",
    floor,
    imagePath,
    kind: "dialog",
    roleName,
    speakerName: roleName,
    sourceTime,
    stage: {
      animations: [],
      imagePath,
      policy: "avatar-switch-only",
      roleName,
      source: "gululu-stage-annotate-import",
      type: "figure",
      position: position.key,
    },
    stageSequence: index + 1,
    sourceFloor: floor,
  };
}

function applyImagePlacement(messages, roles, imageRoleIndex) {
  const output = [];
  const roleNames = new Set(roles.map(role => role.name));
  for (const message of messages) {
    const imagePath = normalizeImagePath(message.imagePath);
    const imageRole = canonicalRoleName(imagePath ? imageRoleIndex.get(imagePath) : undefined, roleNames);
    if (!imagePath || !imageRole) {
      output.push(message);
      continue;
    }

    if (!roleNames.has(imageRole)) {
      output.push({ ...message, imagePath: undefined });
      continue;
    }

    const currentRole = roleOf(message, roleNames);
    const previous = output[output.length - 1];
    const previousRole = previous ? roleOf(previous, roleNames) : "";
    if (message.kind === "dialog" && currentRole === imageRole) {
      ensureRoleAvatarEvidence(roles, imageRole, imagePath);
      output.push(message);
      continue;
    }

    if (previous?.kind === "dialog" && previousRole === imageRole && !previous.imagePath) {
      previous.imagePath = imagePath;
      previous.stage = {
        ...previous.stage,
        imagePath,
      };
      ensureRoleAvatarEvidence(roles, imageRole, imagePath);
      output.push({ ...message, imagePath: undefined });
      continue;
    }

    ensureRoleAvatarEvidence(roles, imageRole, imagePath);
    output.push(createAvatarSwitchMessage({
      floor: message.floor,
      imagePath,
      index: output.length,
      roleName: imageRole,
      sourceTime: message.sourceTime,
    }));
    output.push({ ...message, imagePath: undefined });
  }
  return output.map((message, index) => ({
    ...message,
    stageSequence: index + 1,
  }));
}

function annotateMessages(messages, roles, options = {}) {
  const activeRoles = new Set();
  seedRolesFromMessages(roles, messages);
  const roleNames = new Set((roles ?? []).map(role => String(role?.name ?? "").trim()).filter(Boolean));
  const eventIndex = buildEventIndex(options.eventSource);
  const mergeStats = {
    lowConfidence: 0,
    matched: 0,
    unmatched: 0,
  };
  let lastFloor = null;

  const annotated = messages.map((rawMessage, index) => {
    const sourceMessage = takeEventSourceMessage(eventIndex, rawMessage, roleNames, mergeStats);
    const message = normalizeDiceFields(enrichFromEventSource(rawMessage, sourceMessage, roleNames));
    const kind = message.kind;
    const annotations = [...(message.annotations ?? [])];
    const stage = message.stage && typeof message.stage === "object" ? { ...message.stage } : {};

    if (kind === "dialog") {
      const roleName = roleOf(message, roleNames);
      const canBindRole = roleName && roleNames.has(roleName);
      if (!canBindRole) {
        Object.assign(stage, {
          type: "dialog",
          policy: "no-stage-change-unbound-role",
          roleName,
          source: "gululu-stage-annotate-import",
        });
        return {
          ...message,
          ...(Object.keys(stage).length > 0 ? { stage } : {}),
          stageSequence: index + 1,
          sourceFloor: message.floor ?? lastFloor ?? undefined,
        };
      }
      const position = positionForRole(roleName);
      annotations.push(position.annotation);
      const animations = [];
      if (roleName && !activeRoles.has(roleName)) {
        animations.push(ANNOTATION.FIGURE_ENTER);
        annotations.push(ANNOTATION.FIGURE_ENTER);
        activeRoles.add(roleName);
      }
      Object.assign(stage, {
        type: "figure",
        roleName,
        position: position.key,
        animations,
        source: "gululu-stage-annotate-import",
      });
      message.content = stripMessageSpeakerPrefix(message.content, message);
    }
    else if (kind === "bgm") {
      annotations.push(ANNOTATION.BGM);
      Object.assign(stage, {
        type: "bgm",
        bgmName: message.bgmName ?? contentOf(message),
        source: "gululu-stage-annotate-import",
      });
    }
    else if (kind === "dice") {
      Object.assign(stage, {
        type: "dice",
        policy: "no-stage-change",
        source: "gululu-stage-annotate-import",
      });
    }
    else if (kind === "narration") {
      const sceneAnnotations = sceneAnnotationsForText(contentOf(message));
      annotations.push(...sceneAnnotations);
      if (sceneAnnotations.includes(ANNOTATION.FIGURE_CLEAR)) {
        activeRoles.clear();
      }
      if (sceneAnnotations.length > 0) {
        Object.assign(stage, {
          type: "scene",
          annotations: sceneAnnotations,
          source: "gululu-stage-annotate-import",
        });
      }
    }
    else if (kind === "role_card") {
      Object.assign(stage, {
        type: "reference",
        policy: "no-stage-change",
        source: "gululu-stage-annotate-import",
      });
    }

    const normalizedAnnotations = uniqueAnnotations(annotations);
    lastFloor = message.floor ?? lastFloor;
    return {
      ...message,
      ...(normalizedAnnotations.length > 0 ? { annotations: normalizedAnnotations } : {}),
      ...(Object.keys(stage).length > 0 ? { stage } : {}),
      stageSequence: index + 1,
      sourceFloor: message.floor ?? lastFloor ?? undefined,
    };
  });
  const placedMessages = applyImagePlacement(annotated, roles, options.imageRoleIndex ?? new Map());
  return {
    mergeStats,
    messages: placedMessages,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(requireArg(args, "input"));
  const outputPath = path.resolve(requireArg(args, "output"));
  const raw = await readFile(inputPath, "utf8");
  const importPackage = JSON.parse(raw);
  const eventSourcePath = typeof args["event-source"] === "string" ? path.resolve(args["event-source"]) : undefined;
  const eventSource = eventSourcePath
    ? JSON.parse(await readFile(eventSourcePath, "utf8"))
    : undefined;
  const messages = Array.isArray(importPackage.messages) ? importPackage.messages : [];
  const sourceRoot = importPackage.source?.root ? path.resolve(importPackage.source.root) : undefined;
  const imageRoleIndex = await loadImageRoleIndex(sourceRoot);
  const roles = Array.isArray(importPackage.roles) ? importPackage.roles : [];
  const annotatedResult = annotateMessages(messages, roles, { eventSource, imageRoleIndex });
  const annotatedMessages = annotatedResult.messages;
  const annotationStats = annotatedMessages.reduce((stats, message) => {
    for (const annotation of message.annotations ?? []) {
      stats[annotation] = (stats[annotation] ?? 0) + 1;
    }
    return stats;
  }, {});
  const output = {
    ...importPackage,
    source: {
      ...importPackage.source,
      generatedAt: new Date().toISOString(),
      generator: "gululu-stage-annotate-import-v1",
      stageAnnotatedFrom: inputPath,
    },
    messages: annotatedMessages,
    roles,
    stats: {
      ...importPackage.stats,
      messages: annotatedMessages.length,
      annotatedMessages: annotatedMessages.filter(message => (message.annotations ?? []).length > 0).length,
      stageMessages: annotatedMessages.filter(message => message.stage).length,
    },
    stageAnnotationStats: annotationStats,
    stageMergeStats: annotatedResult.mergeStats,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output: outputPath,
    messages: output.stats.messages,
    annotatedMessages: output.stats.annotatedMessages,
    stageMessages: output.stats.stageMessages,
    stageMergeStats: output.stageMergeStats,
    annotations: annotationStats,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
