import type { ImportChatRequestMessage } from "@/components/chat/utils/importChatMessageRequestBuilder";

import { IMPORT_SPECIAL_ROLE_ID, normalizeSpeakerName } from "@/components/chat/utils/importChatText";
import { ANNOTATION_IDS } from "@/types/messageAnnotations";

import { MessageType } from "../../../../api/wsModels";

type RglRoleRef = {
  roleName: string;
  avatarName: string;
  speakerName?: string;
};

type RglDialogEvent = {
  kind: "dialog";
  lineNumber: number;
  raw: string;
  role: RglRoleRef;
  annotations: string[];
  content: string;
};

type RglNarrationEvent = {
  kind: "narration";
  lineNumber: number;
  raw: string;
  annotations: string[];
  content: string;
};

type RglMaterialEvent = {
  kind: "material";
  lineNumber: number;
  raw: string;
  annotationId: string;
  annotations: string[];
  materialName: string;
};

type RglControlEvent = {
  kind: "control";
  lineNumber: number;
  raw: string;
  annotations: string[];
};

type RglDiceEvent = {
  kind: "dice";
  lineNumber: number;
  raw: string;
  dicerSpeakerName: string;
  command: string;
  replyContent: string;
  replyContents: string[];
};

export type RglImportEvent = RglDialogEvent | RglNarrationEvent | RglMaterialEvent | RglControlEvent | RglDiceEvent;

export type RglImportParseResult = {
  events: RglImportEvent[];
  invalidLines: Array<{ lineNumber: number; raw: string; reason: string }>;
};

export type RglImportEventSummary = Record<RglImportEvent["kind"], number>;

export type RglRoleResolveResult = {
  roleId: number;
  avatarId: number;
  speakerName?: string;
};

export type RglMaterialResolveResult = Pick<ImportChatRequestMessage, "content" | "messageType" | "extra" | "webgal" | "annotations">;

export type RglImportCompileContext = {
  resolveRoleAvatar: (ref: RglRoleRef) => RglRoleResolveResult;
  resolveMaterial: (ref: { annotationId: string; materialName: string }) => RglMaterialResolveResult;
};

type RglTextEvent = RglDialogEvent | RglNarrationEvent;

const KNOWN_ANNOTATION_IDS = new Set<string>(Object.values(ANNOTATION_IDS));
const MATERIAL_ANNOTATION_IDS = new Set<string>([
  ANNOTATION_IDS.BACKGROUND,
  ANNOTATION_IDS.BGM,
  ANNOTATION_IDS.SE,
  ANNOTATION_IDS.CG,
  ANNOTATION_IDS.IMAGE_SHOW,
]);
const EMPTY_PAYLOAD_CONTROL_ANNOTATION_IDS = new Set<string>([
  ANNOTATION_IDS.BGM_CLEAR,
  ANNOTATION_IDS.BACKGROUND_CLEAR,
  ANNOTATION_IDS.IMAGE_CLEAR,
  ANNOTATION_IDS.FIGURE_CLEAR,
  ANNOTATION_IDS.SCENE_EFFECT_RAIN,
  ANNOTATION_IDS.SCENE_EFFECT_SNOW,
  ANNOTATION_IDS.SCENE_EFFECT_SAKURA,
  ANNOTATION_IDS.SCENE_EFFECT_STOP,
]);

const RGL_ANNOTATION_ALIASES = new Map<string, string>([
  ["background", ANNOTATION_IDS.BACKGROUND],
  ["bg", ANNOTATION_IDS.BACKGROUND],
  ["bgm", ANNOTATION_IDS.BGM],
  ["music", ANNOTATION_IDS.BGM],
  ["se", ANNOTATION_IDS.SE],
  ["sound", ANNOTATION_IDS.SE],
  ["cg", ANNOTATION_IDS.CG],
  ["image", ANNOTATION_IDS.IMAGE_SHOW],
  ["image.show", ANNOTATION_IDS.IMAGE_SHOW],
  ["enter", ANNOTATION_IDS.FIGURE_ANIM_ENTER],
  ["exit", ANNOTATION_IDS.FIGURE_ANIM_EXIT],
  ["shake", ANNOTATION_IDS.FIGURE_ANIM_BA_SHAKE],
  ["bigshake", ANNOTATION_IDS.FIGURE_ANIM_BA_BIGSHAKE],
  ["jump", ANNOTATION_IDS.FIGURE_ANIM_BA_JUMP],
  ["jump2", ANNOTATION_IDS.FIGURE_ANIM_BA_JUMP_TWICE],
  ["down", ANNOTATION_IDS.FIGURE_ANIM_BA_DOWN],
  ["left-falldown", ANNOTATION_IDS.FIGURE_ANIM_BA_LEFT_FALLDOWN],
  ["right-falldown", ANNOTATION_IDS.FIGURE_ANIM_BA_RIGHT_FALLDOWN],
  ["left", ANNOTATION_IDS.FIGURE_POS_LEFT],
  ["left-center", ANNOTATION_IDS.FIGURE_POS_LEFT_CENTER],
  ["center", ANNOTATION_IDS.FIGURE_POS_CENTER],
  ["right-center", ANNOTATION_IDS.FIGURE_POS_RIGHT_CENTER],
  ["right", ANNOTATION_IDS.FIGURE_POS_RIGHT],
  ["clear", ANNOTATION_IDS.FIGURE_CLEAR],
  ["clearfigure", ANNOTATION_IDS.FIGURE_CLEAR],
  ["clearbg", ANNOTATION_IDS.BACKGROUND_CLEAR],
  ["clearbackground", ANNOTATION_IDS.BACKGROUND_CLEAR],
  ["clearbgm", ANNOTATION_IDS.BGM_CLEAR],
  ["clearimage", ANNOTATION_IDS.IMAGE_CLEAR],
  ["rain", ANNOTATION_IDS.SCENE_EFFECT_RAIN],
  ["snow", ANNOTATION_IDS.SCENE_EFFECT_SNOW],
  ["sakura", ANNOTATION_IDS.SCENE_EFFECT_SAKURA],
  ["stop", ANNOTATION_IDS.SCENE_EFFECT_STOP],
]);

function normalizeLineBreaks(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isBlank(value: string | undefined) {
  return !String(value ?? "").trim();
}

function isRglCommentLine(value: string) {
  const trimmed = value.trimStart();
  return trimmed.startsWith("#") || trimmed.startsWith("//");
}

function isRglSeparatorLine(value: string) {
  return /^-{3,}$/.test(value.trim());
}

function splitRoleRef(value: string): RglRoleRef | null {
  const normalized = value.trim();
  const aliasSeparatorIndex = normalized.indexOf("=");
  if (aliasSeparatorIndex === 0) {
    return null;
  }
  const speakerName = aliasSeparatorIndex > 0
    ? normalized.slice(0, aliasSeparatorIndex).trim()
    : undefined;
  const roleRefText = aliasSeparatorIndex > 0
    ? normalized.slice(aliasSeparatorIndex + 1).trim()
    : normalized;
  if (aliasSeparatorIndex > 0 && !speakerName) {
    return null;
  }

  const roleRef = splitBoundRoleRef(roleRefText);
  return roleRef ? { ...roleRef, ...(speakerName ? { speakerName } : {}) } : null;
}

function splitBoundRoleRef(value: string): Pick<RglRoleRef, "roleName" | "avatarName"> | null {
  const normalized = value.trim();
  const separatorIndex = normalized.lastIndexOf(".");
  if (separatorIndex <= 0 || separatorIndex >= normalized.length - 1) {
    return null;
  }
  const roleName = normalized.slice(0, separatorIndex).trim();
  const avatarName = normalized.slice(separatorIndex + 1).trim();
  return roleName && avatarName ? { roleName, avatarName } : null;
}

function normalizeRglAnnotationToken(annotationId: string) {
  const normalized = annotationId.trim();
  const alias = RGL_ANNOTATION_ALIASES.get(normalized.toLowerCase());
  return alias ?? normalized;
}

function readAnnotationPrefix(text: string): { annotations: string[]; rest: string } | null {
  let rest = text.trimStart();
  const annotations: string[] = [];
  while (rest.startsWith("<")) {
    const closeIndex = rest.indexOf(">");
    if (closeIndex <= 1) {
      return null;
    }
    const annotationId = rest.slice(1, closeIndex).trim();
    if (!annotationId) {
      return null;
    }
    annotations.push(normalizeRglAnnotationToken(annotationId));
    rest = rest.slice(closeIndex + 1).trimStart();
  }
  return { annotations, rest };
}

function validateAnnotations(annotations: string[]) {
  return annotations.find(annotationId => !KNOWN_ANNOTATION_IDS.has(annotationId)) ?? null;
}

function parseColonPayload(rest: string): string | null {
  const trimmed = rest.trimStart();
  if (trimmed[0] !== ":" && trimmed[0] !== "：") {
    return null;
  }
  return trimmed.slice(1).trimStart();
}

function hasExplicitSpeakerPrefix(content: string, roleName: string) {
  const normalizedRoleName = roleName.trim();
  const normalizedContent = content.trimStart();
  return Boolean(normalizedRoleName)
    && (normalizedContent.startsWith(`${normalizedRoleName}:`) || normalizedContent.startsWith(`${normalizedRoleName}：`));
}

function hasAnyExplicitSpeakerPrefix(content: string, roleNames: Array<string | undefined>) {
  return roleNames.some(roleName => roleName != null && hasExplicitSpeakerPrefix(content, roleName));
}

function isNarratorRoleName(value: string) {
  const normalized = normalizeSpeakerName(value);
  return normalized === "旁白" || normalized.toLowerCase() === "narrator";
}

function isTextEvent(event: RglImportEvent | undefined): event is RglTextEvent {
  return event?.kind === "dialog" || event?.kind === "narration";
}

function getTextEventSpeakerNames(event: RglTextEvent) {
  if (event.kind === "dialog") {
    return [event.role.speakerName, event.role.roleName];
  }
  return ["旁白", "Narrator"];
}

function appendTextContent(current: string, nextLine: string) {
  const normalizedNext = nextLine.trim();
  if (!normalizedNext) {
    return current;
  }
  return current ? `${current}\n${normalizedNext}` : normalizedNext;
}

function startsBracketStatement(line: string) {
  const closeIndex = line.indexOf("]");
  if (closeIndex <= 1) {
    return false;
  }
  const roleToken = line.slice(1, closeIndex).trim();
  if (!splitRoleRef(roleToken) && !isNarratorRoleName(roleToken)) {
    return false;
  }
  const parsedAnnotations = readAnnotationPrefix(line.slice(closeIndex + 1));
  return Boolean(parsedAnnotations && parseColonPayload(parsedAnnotations.rest) != null);
}

function startsRglStatement(line: string) {
  const trimmed = line.trimStart();
  if (isRglCommentLine(trimmed) || isRglSeparatorLine(trimmed)) {
    return false;
  }
  if (trimmed.startsWith("[")) {
    return startsBracketStatement(trimmed);
  }
  if (!trimmed.startsWith("<")) {
    return false;
  }
  const parsed = readAnnotationPrefix(trimmed);
  return Boolean(parsed && parseColonPayload(parsed.rest) != null);
}

function isDiceBlockHeader(line: string) {
  return /^<dice>\s*[:：]\s*$/.test(line.trim());
}

function parseDiceLabelLine(line: string, label: string) {
  const matched = line.match(new RegExp(`^${label}\\s*[:：]\\s*(.*)$`, "i"));
  return matched ? (matched[1] ?? "").trim() : null;
}

function parseDiceReplyContents(lines: string[]) {
  const replies: string[][] = [];
  for (const line of lines) {
    if (line.startsWith("=>")) {
      const firstLine = line.replace(/^=>\s*/, "").trim();
      replies.push(firstLine ? [firstLine] : []);
      continue;
    }
    if (replies.length === 0) {
      continue;
    }
    const currentReply = replies[replies.length - 1];
    if (currentReply) {
      currentReply.push(line);
    }
  }
  return replies
    .map(replyLines => replyLines.filter(Boolean).join("\n").trim())
    .filter(Boolean);
}

function parseDialogLine(raw: string, lineNumber: number): RglDialogEvent | RglNarrationEvent | { error: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[")) {
    return null;
  }

  const closeIndex = trimmed.indexOf("]");
  if (closeIndex <= 1) {
    return { error: "角色标记缺少闭合方括号" };
  }

  const roleToken = trimmed.slice(1, closeIndex).trim();
  const role = splitRoleRef(roleToken);
  const isNarrator = !role && isNarratorRoleName(roleToken);
  if (!role && !isNarrator) {
    return { error: "角色标记必须使用 角色.差分；旁白可写 [旁白]" };
  }

  const parsedAnnotations = readAnnotationPrefix(trimmed.slice(closeIndex + 1));
  if (!parsedAnnotations) {
    return { error: "annotation 格式错误" };
  }
  const unknownAnnotation = validateAnnotations(parsedAnnotations.annotations);
  if (unknownAnnotation) {
    return { error: `未知 annotation：${unknownAnnotation}` };
  }

  const content = parseColonPayload(parsedAnnotations.rest);
  if (content == null) {
    return { error: "缺少冒号分隔正文" };
  }
  if (hasAnyExplicitSpeakerPrefix(content, [role?.speakerName, role?.roleName, roleToken])) {
    return { error: "正文不应包含说话人前缀" };
  }

  if (isNarrator) {
    return {
      kind: "narration",
      lineNumber,
      raw,
      annotations: parsedAnnotations.annotations,
      content,
    };
  }

  return {
    kind: "dialog",
    lineNumber,
    raw,
    role: role!,
    annotations: parsedAnnotations.annotations,
    content,
  };
}

function parseAngleLine(raw: string, lineNumber: number): RglMaterialEvent | RglControlEvent | { error: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("<")) {
    return null;
  }

  const parsedAnnotations = readAnnotationPrefix(trimmed);
  if (!parsedAnnotations || parsedAnnotations.annotations.length === 0) {
    return { error: "annotation 格式错误" };
  }

  if (parsedAnnotations.annotations.includes("dice")) {
    return { error: "<dice>: 必须按骰子块解析" };
  }

  const unknownAnnotation = validateAnnotations(parsedAnnotations.annotations);
  if (unknownAnnotation) {
    return { error: `未知 annotation：${unknownAnnotation}` };
  }

  const payload = parseColonPayload(parsedAnnotations.rest);
  if (payload == null) {
    return { error: "缺少冒号分隔素材名" };
  }

  const firstAnnotation = parsedAnnotations.annotations[0] ?? "";
  if (!isBlank(payload)) {
    if (!MATERIAL_ANNOTATION_IDS.has(firstAnnotation)) {
      return { error: `annotation 不支持素材引用：${firstAnnotation}` };
    }
    return {
      kind: "material",
      lineNumber,
      raw,
      annotationId: firstAnnotation,
      annotations: parsedAnnotations.annotations,
      materialName: payload.trim(),
    };
  }

  const unsupportedControlAnnotation = parsedAnnotations.annotations
    .find(annotationId => !EMPTY_PAYLOAD_CONTROL_ANNOTATION_IDS.has(annotationId));
  if (unsupportedControlAnnotation) {
    return { error: `annotation 需要正文或素材名：${unsupportedControlAnnotation}` };
  }

  return {
    kind: "control",
    lineNumber,
    raw,
    annotations: parsedAnnotations.annotations,
  };
}

function parseDiceBlock(lines: string[], startIndex: number): { event: RglDiceEvent | null; error?: string; nextIndex: number } {
  const raw = lines[startIndex] ?? "";
  if (!isDiceBlockHeader(raw)) {
    return { event: null, nextIndex: startIndex };
  }

  const body: string[] = [];
  let index = startIndex + 1;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (startsRglStatement(line)) {
      break;
    }
    body.push(line);
    index += 1;
  }

  const meaningfulLines = body
    .map(line => line.trim())
    .filter(line => line && !isRglCommentLine(line) && !isRglSeparatorLine(line));
  const dicerLines = meaningfulLines
    .map((line, lineIndex) => ({ lineIndex, value: parseDiceLabelLine(line, "dicer") }))
    .filter((item): item is { lineIndex: number; value: string } => item.value != null);
  if (dicerLines.length > 1) {
    return { event: null, error: "骰子块只能包含一个 dicer: 行", nextIndex: index };
  }
  if (dicerLines[0] && !dicerLines[0].value) {
    return { event: null, error: "骰子块的 dicer 不能为空", nextIndex: index };
  }

  const diceLines = meaningfulLines.filter((_, lineIndex) => lineIndex !== dicerLines[0]?.lineIndex);
  const dicerSpeakerName = dicerLines[0]?.value ?? "骰娘";
  const cmdIndex = diceLines.findIndex(line => /^cmd\s*[:：]/i.test(line));
  const replyIndex = diceLines.findIndex(line => line.startsWith("=>"));
  if (cmdIndex < 0 || replyIndex < 0 || replyIndex <= cmdIndex) {
    return { event: null, error: "骰子块必须包含 cmd: 和 => 结果行", nextIndex: index };
  }

  const commandLines = diceLines.slice(cmdIndex, replyIndex);
  const firstCommand = commandLines[0] ? parseDiceLabelLine(commandLines[0], "cmd") ?? "" : "";
  const command = [firstCommand, ...commandLines.slice(1)].filter(Boolean).join("\n");
  const replyContents = parseDiceReplyContents(diceLines.slice(replyIndex));
  const replyContent = replyContents.join("\n");

  if (!command || !replyContent) {
    return { event: null, error: "骰子块的指令或结果不能为空", nextIndex: index };
  }

  return {
    event: {
      kind: "dice",
      lineNumber: startIndex + 1,
      raw,
      dicerSpeakerName,
      command,
      replyContent,
      replyContents,
    },
    nextIndex: index,
  };
}

export function parseRglImportText(text: string): RglImportParseResult {
  const lines = normalizeLineBreaks(String(text ?? "")).split("\n");
  const events: RglImportEvent[] = [];
  const invalidLines: RglImportParseResult["invalidLines"] = [];

  let index = 0;
  while (index < lines.length) {
    const raw = lines[index] ?? "";
    const lineNumber = index + 1;
    if (isBlank(raw) || isRglCommentLine(raw) || isRglSeparatorLine(raw)) {
      index += 1;
      continue;
    }

    const diceBlock = parseDiceBlock(lines, index);
    if (diceBlock.event || diceBlock.error) {
      if (diceBlock.event) {
        events.push(diceBlock.event);
      }
      else {
        invalidLines.push({ lineNumber, raw, reason: diceBlock.error ?? "骰子块解析失败" });
      }
      index = Math.max(diceBlock.nextIndex, index + 1);
      continue;
    }

    const dialog = parseDialogLine(raw, lineNumber);
    if (dialog) {
      if ("error" in dialog) {
        invalidLines.push({ lineNumber, raw, reason: dialog.error });
      }
      else {
        events.push(dialog);
      }
      index += 1;
      continue;
    }

    const angle = parseAngleLine(raw, lineNumber);
    if (angle) {
      if ("error" in angle) {
        invalidLines.push({ lineNumber, raw, reason: angle.error });
      }
      else {
        events.push(angle);
      }
      index += 1;
      continue;
    }

    const previousEvent = events[events.length - 1];
    if (isTextEvent(previousEvent)) {
      if (hasAnyExplicitSpeakerPrefix(raw, getTextEventSpeakerNames(previousEvent))) {
        invalidLines.push({ lineNumber, raw, reason: "正文不应包含说话人前缀" });
        index += 1;
        continue;
      }
      previousEvent.content = appendTextContent(previousEvent.content, raw);
      previousEvent.raw = `${previousEvent.raw}\n${raw}`;
      index += 1;
      continue;
    }

    invalidLines.push({ lineNumber, raw, reason: "无法识别的 RGL 行" });
    index += 1;
  }

  return { events, invalidLines };
}

export function summarizeRglImportEvents(events: RglImportEvent[]): RglImportEventSummary {
  const summary: RglImportEventSummary = {
    dialog: 0,
    narration: 0,
    material: 0,
    control: 0,
    dice: 0,
  };
  for (const event of events) {
    summary[event.kind] += 1;
  }
  return summary;
}

function mergeAnnotations(...annotationLists: Array<string[] | undefined>) {
  const result: string[] = [];
  for (const annotations of annotationLists) {
    for (const annotation of annotations ?? []) {
      if (!result.includes(annotation)) {
        result.push(annotation);
      }
    }
  }
  return result;
}

export function compileRglImportEvents(
  events: RglImportEvent[],
  context: RglImportCompileContext,
): ImportChatRequestMessage[] {
  return events.map((event) => {
    switch (event.kind) {
      case "dialog": {
        const resolved = context.resolveRoleAvatar(event.role);
        return {
          roleId: resolved.roleId,
          avatarId: resolved.avatarId,
          speakerName: event.role.speakerName ?? resolved.speakerName ?? event.role.roleName,
          content: event.content,
          annotations: event.annotations,
        };
      }
      case "narration":
        return {
          roleId: IMPORT_SPECIAL_ROLE_ID.NARRATOR,
          content: event.content,
          messageType: MessageType.TEXT,
          extra: {},
          annotations: event.annotations,
        };
      case "material": {
        const resolved = context.resolveMaterial({
          annotationId: event.annotationId,
          materialName: event.materialName,
        });
        return {
          roleId: IMPORT_SPECIAL_ROLE_ID.NARRATOR,
          content: resolved.content ?? "",
          messageType: resolved.messageType,
          extra: resolved.extra,
          annotations: mergeAnnotations(event.annotations, resolved.annotations),
          webgal: resolved.webgal,
        };
      }
      case "control":
        return {
          roleId: IMPORT_SPECIAL_ROLE_ID.NARRATOR,
          content: "",
          messageType: MessageType.TEXT,
          extra: {},
          annotations: event.annotations,
        };
      case "dice":
        return {
          roleId: IMPORT_SPECIAL_ROLE_ID.NARRATOR,
          content: event.command,
          diceTurn: {
            replyContent: event.replyContent,
            replyContents: event.replyContents,
            dicerSpeakerName: event.dicerSpeakerName,
          },
        };
    }
  });
}

export function parseAndCompileRglImportText(
  text: string,
  context: RglImportCompileContext,
): { messages: ImportChatRequestMessage[]; invalidLines: RglImportParseResult["invalidLines"] } {
  const parsed = parseRglImportText(text);
  return {
    invalidLines: parsed.invalidLines,
    messages: compileRglImportEvents(parsed.events, context),
  };
}
