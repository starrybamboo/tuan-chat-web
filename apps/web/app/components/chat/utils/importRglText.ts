import type { ImportChatRequestMessage } from "@/components/chat/utils/importChatMessageRequestBuilder";
import type { StateEventAtom, StateEventVarOpKind } from "@/types/stateEvent";

import { IMPORT_SPECIAL_ROLE_ID, normalizeSpeakerName } from "@/components/chat/utils/importChatText";
import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { buildCommandStateEventExtra, buildRoleStateEventScope, STATE_EVENT_VAR_OP, toApiMessageExtraWithStateEvent } from "@/types/stateEvent";

import { MessageType } from "../../../../api/wsModels";
import {
  DEFAULT_MULTI_DIALOG_POSITIONS,
  FIGURE_POSITION_ANNOTATION_IDS,
  buildHitpointContent,
  extractTrailingAudioBoxes,
  formatRglNumber,
  isHpKey,
  parseFiniteNumberText,
  parseHitpointValue,
  parsePositiveIntegerText,
  type RglRoleRef,
  readAnnotationPrefix,
  resolveAnimationPayloadAnnotations,
  resolveClearTargetAnnotations,
  splitRglTuplePayload,
  splitRoleRefs,
  validateAnnotations,
} from "./importRglCompatibility";

type RglDialogEvent = {
  kind: "dialog";
  lineNumber: number;
  raw: string;
  role: RglRoleRef;
  companionRoles?: RglRoleRef[];
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

type RglHitpointEvent = {
  kind: "hitpoint";
  lineNumber: number;
  raw: string;
  roleName: string;
  op: StateEventVarOpKind;
  value: number;
  maxValue?: number;
  content: string;
};

export type RglImportEvent = RglDialogEvent | RglNarrationEvent | RglMaterialEvent | RglControlEvent | RglDiceEvent | RglHitpointEvent;

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

export type RglRoleNameResolveResult = Pick<RglRoleResolveResult, "roleId" | "speakerName">;

export type RglMaterialResolveResult = Pick<ImportChatRequestMessage, "content" | "messageType" | "extra" | "webgal" | "annotations">;

export type RglImportCompileContext = {
  resolveRoleAvatar: (ref: RglRoleRef) => RglRoleResolveResult;
  resolveRole?: (ref: { roleName: string }) => RglRoleNameResolveResult;
  resolveMaterial: (ref: { annotationId: string; materialName: string }) => RglMaterialResolveResult;
};

export type RglCompiledImportMessage = ImportChatRequestMessage & {
  lineNumber: number;
};

type RglTextEvent = RglDialogEvent | RglNarrationEvent;

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

function parseColonPayload(rest: string): string | null {
  const trimmed = rest.trimStart();
  if (trimmed[0] !== ":" && trimmed[0] !== "：") {
    return null;
  }
  return trimmed.slice(1).trimStart();
}

function expandInlineAudioBoxEvents(events: RglImportEvent[]) {
  const expanded: RglImportEvent[] = [];
  for (const event of events) {
    if (!isTextEvent(event)) {
      expanded.push(event);
      continue;
    }

    const extracted = extractTrailingAudioBoxes(event.content);
    event.content = extracted.content;
    expanded.push(event);
    for (const audioRef of extracted.audioRefs) {
      expanded.push({
        kind: "material",
        lineNumber: event.lineNumber,
        raw: event.raw,
        annotationId: ANNOTATION_IDS.SE,
        annotations: [ANNOTATION_IDS.SE],
        materialName: audioRef.materialName,
      });
    }
  }
  return expanded;
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
  if (!splitRoleRefs(roleToken) && !isNarratorRoleName(roleToken)) {
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

function buildNativeDiceEvent(raw: string, lineNumber: number, payload: string): RglDiceEvent | { error: string } {
  const parts = splitRglTuplePayload(payload);
  if (parts.length !== 4) {
    return { error: "原生 <dice> 需要写成 <dice>:(描述,面数,检定值,出目)" };
  }
  const [description = "", sidesText = "", checkText = "", rollText = ""] = parts;
  const sides = parsePositiveIntegerText(sidesText);
  const roll = parseFiniteNumberText(rollText);
  if (!sides || roll == null) {
    return { error: "原生 <dice> 的面数和出目必须是数字" };
  }

  const check = parseFiniteNumberText(checkText);
  const command = [
    description,
    `【1d${sides}：】`,
    check != null ? `检定值：${formatRglNumber(check)}` : undefined,
  ].filter(Boolean).join("\n");
  const resultParts = [`【1d${sides}:${formatRglNumber(roll)}】`];
  if (check != null) {
    resultParts.push(`目标 ${formatRglNumber(check)}`);
    resultParts.push(roll <= check ? "成功" : "失败");
  }
  const replyContent = resultParts.join("；");
  return {
    kind: "dice",
    lineNumber,
    raw,
    dicerSpeakerName: "骰娘",
    command,
    replyContent,
    replyContents: [replyContent],
  };
}

function buildHitpointEvent(raw: string, lineNumber: number, payload: string): RglHitpointEvent | { error: string } {
  const parts = splitRglTuplePayload(payload);
  if (parts.length < 2) {
    return { error: "原生 <hitpoint> 至少需要角色和 HP 值" };
  }

  const roleName = parts[0] ?? "";
  let parsedValue: ReturnType<typeof parseHitpointValue> = null;
  if (parts.length >= 3 && isHpKey(parts[1] ?? "")) {
    parsedValue = parseHitpointValue(parts[2] ?? "");
    const maxValue = parts[3] ? parseFiniteNumberText(parts[3]) : null;
    if (parsedValue && maxValue != null) {
      parsedValue = { ...parsedValue, maxValue };
    }
  }
  else if (parts.length >= 3 && parseFiniteNumberText(parts[1] ?? "") != null && parseFiniteNumberText(parts[2] ?? "") != null) {
    const hp = parseFiniteNumberText(parts[1] ?? "")!;
    const maxValue = parseFiniteNumberText(parts[2] ?? "")!;
    parsedValue = { op: STATE_EVENT_VAR_OP.SET, value: hp, maxValue };
  }
  else {
    parsedValue = parseHitpointValue(parts[1] ?? "");
  }

  if (!roleName.trim()) {
    return { error: "原生 <hitpoint> 的角色不能为空" };
  }
  if (!parsedValue) {
    return { error: "原生 <hitpoint> 的 HP 值无法解析" };
  }

  return {
    kind: "hitpoint",
    lineNumber,
    raw,
    roleName: roleName.trim(),
    op: parsedValue.op,
    value: parsedValue.value,
    ...(parsedValue.maxValue != null ? { maxValue: parsedValue.maxValue } : {}),
    content: buildHitpointContent(roleName.trim(), parsedValue),
  };
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
  const roles = splitRoleRefs(roleToken);
  const role = roles?.[0] ?? null;
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
    ...(roles && roles.length > 1 ? { companionRoles: roles.slice(1) } : {}),
    annotations: parsedAnnotations.annotations,
    content,
  };
}

function parseAngleLine(raw: string, lineNumber: number): RglMaterialEvent | RglControlEvent | RglDiceEvent | RglHitpointEvent | RglNarrationEvent | { error: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("<")) {
    return null;
  }

  const parsedAnnotations = readAnnotationPrefix(trimmed);
  if (!parsedAnnotations || parsedAnnotations.annotations.length === 0) {
    return { error: "annotation 格式错误" };
  }

  const payload = parseColonPayload(parsedAnnotations.rest);
  if (payload == null) {
    return { error: "缺少冒号分隔素材名" };
  }

  if (parsedAnnotations.annotations.includes("dice")) {
    if (isBlank(payload)) {
      return { error: "<dice>: 必须按骰子块解析" };
    }
    return buildNativeDiceEvent(raw, lineNumber, payload);
  }

  if (parsedAnnotations.annotations.includes("hitpoint")) {
    return buildHitpointEvent(raw, lineNumber, payload);
  }

  if (parsedAnnotations.annotations.includes("bubble")) {
    if (isBlank(payload)) {
      return { error: "<bubble> 需要正文" };
    }
    return {
      kind: "narration",
      lineNumber,
      raw,
      annotations: [],
      content: payload.trim(),
    };
  }

  if (parsedAnnotations.annotations.includes("animation")) {
    const resolved = resolveAnimationPayloadAnnotations(payload);
    if ("error" in resolved) {
      return resolved;
    }
    return {
      kind: "control",
      lineNumber,
      raw,
      annotations: resolved.annotations,
    };
  }

  const unknownAnnotation = validateAnnotations(parsedAnnotations.annotations);
  if (unknownAnnotation) {
    return { error: `未知 annotation：${unknownAnnotation}` };
  }

  const firstAnnotation = parsedAnnotations.annotations[0] ?? "";
  if (!isBlank(payload)) {
    if (firstAnnotation === ANNOTATION_IDS.FIGURE_CLEAR) {
      const clearAnnotations = resolveClearTargetAnnotations(payload);
      return clearAnnotations
        ? { kind: "control", lineNumber, raw, annotations: clearAnnotations }
        : { error: `未知 clear 对象：${payload.trim()}` };
    }
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

  return { events: expandInlineAudioBoxEvents(events), invalidLines };
}

export function summarizeRglImportEvents(events: RglImportEvent[]): RglImportEventSummary {
  const summary: RglImportEventSummary = {
    dialog: 0,
    narration: 0,
    material: 0,
    control: 0,
    dice: 0,
    hitpoint: 0,
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

function withoutFigurePositionAnnotations(annotations: string[]) {
  return annotations.filter(annotation => !FIGURE_POSITION_ANNOTATION_IDS.has(annotation));
}

function findFigurePositionAnnotation(annotations: string[]) {
  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index];
    if (annotation && FIGURE_POSITION_ANNOTATION_IDS.has(annotation)) {
      return annotation;
    }
  }
  return undefined;
}

function ensureAnnotations(annotations: string[], ...required: string[]) {
  return mergeAnnotations(annotations, required.filter(Boolean));
}

function buildDialogWebgal(role: RglRoleRef) {
  return role.opacity != null
    ? { transform: { alpha: role.opacity } }
    : undefined;
}

function buildDialogMessages(event: RglDialogEvent, context: RglImportCompileContext): ImportChatRequestMessage[] {
  const hasExplicitPosition = Boolean(findFigurePositionAnnotation(event.annotations));
  const shouldAssignDefaultPositions = Boolean(event.companionRoles?.length);
  const mainAnnotations = shouldAssignDefaultPositions && !hasExplicitPosition
    ? ensureAnnotations(event.annotations, DEFAULT_MULTI_DIALOG_POSITIONS[0] ?? ANNOTATION_IDS.FIGURE_POS_LEFT_CENTER)
    : event.annotations;
  const messages: ImportChatRequestMessage[] = [];

  event.companionRoles?.forEach((role, companionIndex) => {
    const resolved = context.resolveRoleAvatar(role);
    const position = DEFAULT_MULTI_DIALOG_POSITIONS[companionIndex + 1]
      ?? DEFAULT_MULTI_DIALOG_POSITIONS[DEFAULT_MULTI_DIALOG_POSITIONS.length - 1]
      ?? ANNOTATION_IDS.FIGURE_POS_RIGHT;
    messages.push({
      roleId: resolved.roleId,
      avatarId: resolved.avatarId,
      speakerName: role.speakerName ?? resolved.speakerName ?? role.roleName,
      content: "",
      annotations: ensureAnnotations(withoutFigurePositionAnnotations(event.annotations), position, ANNOTATION_IDS.DIALOG_NEXT),
      webgal: buildDialogWebgal(role),
    });
  });

  const resolved = context.resolveRoleAvatar(event.role);
  messages.push({
    roleId: resolved.roleId,
    avatarId: resolved.avatarId,
    speakerName: event.role.speakerName ?? resolved.speakerName ?? event.role.roleName,
    content: event.content,
    annotations: mainAnnotations,
    webgal: buildDialogWebgal(event.role),
  });
  return messages;
}

function resolveRoleByName(context: RglImportCompileContext, roleName: string): RglRoleNameResolveResult {
  if (!context.resolveRole) {
    throw new Error("当前 RGL 编译上下文不支持角色名解析");
  }
  return context.resolveRole({ roleName });
}

function buildHitpointStateEvents(event: RglHitpointEvent, roleId: number): StateEventAtom[] {
  const events: StateEventAtom[] = [{
    type: "varOp",
    scope: buildRoleStateEventScope(roleId),
    key: "hp",
    op: event.op,
    value: event.value,
  }];
  if (event.maxValue != null) {
    events.push({
      type: "varOp",
      scope: buildRoleStateEventScope(roleId),
      key: "hpm",
      op: STATE_EVENT_VAR_OP.SET,
      value: event.maxValue,
    });
  }
  return events;
}

function compileRglImportEvent(
  event: RglImportEvent,
  context: RglImportCompileContext,
): ImportChatRequestMessage[] {
  switch (event.kind) {
    case "dialog":
      return buildDialogMessages(event, context);
    case "narration":
      return [{
        roleId: IMPORT_SPECIAL_ROLE_ID.NARRATOR,
        content: event.content,
        messageType: MessageType.TEXT,
        extra: {},
        annotations: event.annotations,
      }];
    case "material": {
      const resolved = context.resolveMaterial({
        annotationId: event.annotationId,
        materialName: event.materialName,
      });
      return [{
        roleId: IMPORT_SPECIAL_ROLE_ID.NARRATOR,
        content: resolved.content ?? "",
        messageType: resolved.messageType,
        extra: resolved.extra,
        annotations: mergeAnnotations(event.annotations, resolved.annotations),
        webgal: resolved.webgal,
      }];
    }
    case "control":
      return [{
        roleId: IMPORT_SPECIAL_ROLE_ID.NARRATOR,
        content: "",
        messageType: MessageType.TEXT,
        extra: {},
        annotations: event.annotations,
      }];
    case "dice":
      return [{
        roleId: IMPORT_SPECIAL_ROLE_ID.NARRATOR,
        content: event.command,
        diceTurn: {
          replyContent: event.replyContent,
          replyContents: event.replyContents,
          dicerSpeakerName: event.dicerSpeakerName,
        },
      }];
    case "hitpoint": {
      const resolved = resolveRoleByName(context, event.roleName);
      return [{
        roleId: resolved.roleId,
        speakerName: resolved.speakerName ?? event.roleName,
        content: event.content,
        messageType: MessageType.STATE_EVENT,
        extra: toApiMessageExtraWithStateEvent(
          buildCommandStateEventExtra("hitpoint", buildHitpointStateEvents(event, resolved.roleId)),
        ),
      }];
    }
  }
}

export function compileRglImportEvents(
  events: RglImportEvent[],
  context: RglImportCompileContext,
): ImportChatRequestMessage[] {
  return events.flatMap(event => compileRglImportEvent(event, context));
}

export function compileRglImportEventsWithLineNumbers(
  events: RglImportEvent[],
  context: RglImportCompileContext,
): RglCompiledImportMessage[] {
  return events.flatMap(event =>
    compileRglImportEvent(event, context)
      .map(message => ({ ...message, lineNumber: event.lineNumber })),
  );
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
