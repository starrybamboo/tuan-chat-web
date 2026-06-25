import { resolveRenderedSoundMessagePurpose } from "@/components/chat/infra/audioMessage/audioMessagePurpose";
import { resolveMessageMediaUrl } from "@/components/chat/message/messageMediaSource";
import { resolveRoleAvatarMedia } from "@/components/Role/sprite/roleAvatarMedia";
import {
  ANNOTATION_IDS,
  buildBackgroundChangeBgArgsFromAnnotations,
  buildClearBackgroundLineFromAnnotations,
  getFigureAnimationFromAnnotations,
  getFigurePositionFromAnnotations,
  getSceneControlLinesFromAnnotations,
  hasAnnotation,
  hasClearBackgroundAnnotation,
  hasClearBgmAnnotation,
  hasClearFigureAnnotation,
  hasClearImageAnnotation,
  isImageMessageBackground,
  isImageMessageShown,
} from "@/types/messageAnnotations";
import { isFigurePosition, MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { mediaFileUrl } from "@/utils/media/mediaUrl";

import type { ChatMessageResponse, RoleAvatar, Room, UserRole } from "../../api";
import type { RealtimeGameConfig } from "./realtimeRendererConfig";
import type { WorkflowGraph } from "./realtimeRendererWorkflow";
import type { SpaceWebgalInputSnapshot } from "./spaceWebgalSnapshot";
import type { WebgalFigureRenderAsset } from "./webgalFigureComposition";

import { buildWebgalChooseScriptLines, extractWebgalChoosePayload } from "../types/webgalChoose";
import { BUILTIN_WEBGAL_ANIMATION_FILES } from "./publishAnimationPresets";
import { getPublishTemplatePreset } from "./publishTemplatePresets";
import {
  buildClearFigureLines,
  buildFigureArgs,
  buildFigureExitTransitionLines,
  buildFigureTransitionLine,
  buildImageFigureTransformString,
  buildRoleFigureTransformString,
  DEFAULT_KEEP_OFFSET_PART,
  DEFAULT_RESTORE_TRANSFORM_PART,
  IMAGE_MESSAGE_FIGURE_ID,
  resolveFigureSlot,
} from "./realtimeRendererFigureLayout";
import { parseGameConfig, sanitizeGameConfigValue, serializeGameConfig, upsertGameConfigEntry } from "./realtimeRendererGameConfig";
import { TextEnhanceSyntax } from "./realtimeRendererTextEnhance";
import { parseWorkflowRoomMap } from "./realtimeRendererWorkflow";
import {
  buildStartSceneContent as buildWorkflowStartSceneContent,
  buildWorkflowTransitionLineWithEnd,
  getWorkflowEndSceneName,
} from "./realtimeRendererWorkflowScenes";
import {
  buildOrdinaryFigureRenderAsset,
  buildPreparedFigureCompositionAsset,
  buildWebgalFigureRenderAsset,
  resolveFigureCompositionCandidate,
} from "./webgalFigureComposition";

export type WebgalPublishFile = {
  path: string;
  content: string;
  contentType?: string;
  contentEncoding?: "utf8" | "base64";
};

export type WebgalPublishPackage = {
  gameDir: string;
  entrypoint: string;
  files: WebgalPublishFile[];
};

export type CompiledSceneFigureState = {
  fileName: string;
  transform: string;
};

export type CompiledRoomSceneResult = {
  content: string;
  lastFigureSlotId?: string;
  messageLineRanges: Map<number, { startLine: number; endLine: number }>;
  renderedFigures: Map<string, CompiledSceneFigureState>;
};

type WebgalCompiledRoleAvatar = RoleAvatar & {
  webgalSpritePath?: string;
  webgalAvatarLayerPath?: string;
  webgalCompositionBasePath?: string;
};

const GAME_DIR = "game";
const DEFAULT_SHARED_ENGINE_URL = "https://tuanchat-galgame.pages.dev/engine/loader.js";
const DEFAULT_MANIFEST_DISPLAY = "fullscreen";
const DEFAULT_MANIFEST_ORIENTATION = "landscape";
const MINIMAL_RUNTIME_SUPPORT_FILES = [
  {
    path: `${GAME_DIR}/userStyleSheet.css`,
    content: "",
  },
] as const;

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function quoteJs(value: string): string {
  return JSON.stringify(String(value ?? ""));
}

function getMessageOrder(message: ChatMessageResponse): number {
  const payload = message.message;
  if (Number.isFinite(payload.position)) {
    return payload.position;
  }
  if (Number.isFinite(payload.syncId)) {
    return payload.syncId;
  }
  return payload.messageId ?? 0;
}

function sortMessages(messages: ChatMessageResponse[] | undefined): ChatMessageResponse[] {
  return [...(messages ?? [])].sort((left, right) => getMessageOrder(left) - getMessageOrder(right));
}

function resolvePublishFileContentType(path: string): string {
  const normalized = path.trim().toLowerCase();
  if (normalized.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (normalized.endsWith("manifest.json")) {
    return "application/manifest+json; charset=utf-8";
  }
  if (normalized.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (normalized.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (normalized.endsWith(".scss")) {
    return "text/plain; charset=utf-8";
  }
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  return "text/plain; charset=utf-8";
}

export function buildWebgalSceneName(roomId: number | string | undefined, roomName: string | undefined): string {
  const normalizedRoomId = Number(roomId);
  const safeRoomId = Number.isFinite(normalizedRoomId) && normalizedRoomId > 0
    ? Math.floor(normalizedRoomId)
    : 0;
  void roomName;
  return safeRoomId > 0 ? `room_${safeRoomId}` : "room";
}

export function resolveProjectableMediaUrl(
  fileId?: number,
  mediaType: "image" | "audio" | "video" = "image",
  quality: "low" | "medium" | "high" | "original" = "medium",
): string {
  return mediaFileUrl(fileId, mediaType, quality) || "";
}

function buildBaseRuntimeSupportFiles(): WebgalPublishFile[] {
  const minimalFiles = MINIMAL_RUNTIME_SUPPORT_FILES.map(file => ({
    path: file.path,
    content: file.content,
    contentType: resolvePublishFileContentType(file.path),
  }));
  const animationFiles = BUILTIN_WEBGAL_ANIMATION_FILES.map(file => ({
    path: `${GAME_DIR}/${file.path}`,
    content: file.content,
    contentType: resolvePublishFileContentType(`${GAME_DIR}/${file.path}`),
  }));
  return [...minimalFiles, ...animationFiles];
}

function buildTemplateRuntimeSupportFiles(baseTemplate: RealtimeGameConfig["baseTemplate"] | undefined): WebgalPublishFile[] {
  const preset = getPublishTemplatePreset(baseTemplate);
  return [
    {
      path: `${GAME_DIR}/template/template.json`,
      content: ensureTrailingNewline(normalizeLineEndings(preset.templateJson)),
      contentType: resolvePublishFileContentType(`${GAME_DIR}/template/template.json`),
    },
    {
      path: `${GAME_DIR}/template/UI/Title/title.scss`,
      content: normalizeLineEndings(preset.titleScss),
      contentType: resolvePublishFileContentType(`${GAME_DIR}/template/UI/Title/title.scss`),
    },
    {
      path: `${GAME_DIR}/template/Stage/TextBox/textbox.scss`,
      content: normalizeLineEndings(preset.textboxScss),
      contentType: resolvePublishFileContentType(`${GAME_DIR}/template/Stage/TextBox/textbox.scss`),
    },
    {
      path: `${GAME_DIR}/template/Stage/Choose/choose.scss`,
      content: normalizeLineEndings(preset.chooseScss),
      contentType: resolvePublishFileContentType(`${GAME_DIR}/template/Stage/Choose/choose.scss`),
    },
  ];
}

export function resolvePublishedGameName(
  spaceId: number | undefined,
  spaceName: string | undefined,
  gameConfig?: Partial<RealtimeGameConfig>,
): string {
  if (gameConfig?.gameNameFromRoomNameEnabled && Number.isFinite(spaceId) && Number(spaceId) > 0) {
    const normalizedSpaceName = sanitizeGameConfigValue(spaceName?.trim() || "");
    const namePrefix = normalizedSpaceName || "space";
    return `${namePrefix}_${Math.floor(Number(spaceId))}`;
  }
  return spaceName?.trim() || "团剧共创 Galgame";
}

export function buildConfigContent(snapshot: SpaceWebgalInputSnapshot): string {
  const entries = parseGameConfig(snapshot.rawGameConfig ?? "");
  const gameConfig = snapshot.hydratedGameConfig;
  const coverAvatarUrl = resolveProjectableMediaUrl(snapshot.coverAvatarSource?.fileId, "image", "medium");
  const titleImageUrl = resolveProjectableMediaUrl(gameConfig.titleImageFileId, "image", "medium")
    || ((gameConfig.coverFromRoomAvatarEnabled ?? true) ? coverAvatarUrl : "");
  const startupLogoUrl = resolveProjectableMediaUrl(gameConfig.startupLogoFileId, "image", "medium")
    || (gameConfig.startupLogoFromRoomAvatarEnabled ? coverAvatarUrl : "");
  const typingSoundSeUrl = resolveProjectableMediaUrl(
    gameConfig.typingSoundSeFileId,
    (gameConfig.typingSoundSeMediaType as "audio" | "image" | "video" | undefined) || "audio",
    "low",
  );

  upsertGameConfigEntry(entries, "Game_name", resolvePublishedGameName(snapshot.spaceId, snapshot.spaceName, gameConfig));
  upsertGameConfigEntry(entries, "Description", gameConfig.description?.trim() || "");
  upsertGameConfigEntry(entries, "Package_name", gameConfig.packageName?.trim() || "");
  upsertGameConfigEntry(entries, "Show_panic", gameConfig.showPanicEnabled ? "true" : "false");
  upsertGameConfigEntry(entries, "Allow_Full_Settings", gameConfig.allowOpenFullSettings === false ? "false" : "true");
  upsertGameConfigEntry(entries, "Enable_Speaker_Focus", gameConfig.speakerFocusEnabled === false ? "false" : "true");
  upsertGameConfigEntry(entries, "Default_Language", gameConfig.defaultLanguage || "");
  upsertGameConfigEntry(entries, "Enable_Appreciation", gameConfig.enableAppreciation === false ? "false" : "true");
  upsertGameConfigEntry(entries, "TypingSoundEnabled", gameConfig.typingSoundEnabled ? "true" : "false");
  upsertGameConfigEntry(entries, "TypingSoundInterval", String(gameConfig.typingSoundInterval ?? 1.5));
  upsertGameConfigEntry(entries, "TypingSoundPunctuationPause", String(gameConfig.typingSoundPunctuationPause ?? 100));
  upsertGameConfigEntry(entries, "Title_img", titleImageUrl);
  upsertGameConfigEntry(entries, "Game_Logo", startupLogoUrl);
  if (typingSoundSeUrl) {
    upsertGameConfigEntry(entries, "TypingSoundSe", typingSoundSeUrl);
  }
  return ensureTrailingNewline(serializeGameConfig(entries));
}

export function buildManifestContent(name: string, description?: string): string {
  return `${JSON.stringify({
    name,
    short_name: name,
    start_url: ".",
    display: DEFAULT_MANIFEST_DISPLAY,
    description: description?.trim() || "",
    dir: "auto",
    orientation: DEFAULT_MANIFEST_ORIENTATION,
    icons: [
      { src: "./icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "./icons/icon-512.png", type: "image/png", sizes: "512x512" },
      { src: "./icons/icon-192-maskable.png", type: "image/png", sizes: "192x192", purpose: "maskable" },
      { src: "./icons/icon-512-maskable.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  }, null, 2)}\n`;
}

export function buildIndexHtml(spaceName?: string, sharedEngineUrl?: string, includeManifest = false): string {
  const title = escapeHtml(spaceName?.trim() || "TuanChat Galgame");
  const engineUrl = escapeHtml(sharedEngineUrl?.trim() || DEFAULT_SHARED_ENGINE_URL);
  const iconTags = includeManifest
    ? [
        "  <link rel=\"icon\" type=\"image/png\" href=\"./icons/icon-192.png\" />",
        "  <link rel=\"apple-touch-icon\" href=\"./icons/apple-touch-icon.png\" />",
        "  <link rel=\"manifest\" href=\"./manifest.json\" />",
      ]
    : [];
  return [
    "<!doctype html>",
    "<html lang=\"zh-CN\">",
    "<head>",
    "  <meta charset=\"utf-8\" />",
    "  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />",
    "  <!-- tuanchat-pages-html-entry -->",
    `  <title>${title}</title>`,
    ...iconTags,
    "  <style>",
    "    html,body { width:100%; height:100%; margin:0; background:#000; color:#fff; overflow:hidden; }",
    "  </style>",
    "  <script>",
    "    window.__TUANCHAT_WEBGAL__ = {",
    "      autoStart: true,",
    `      startScene: ${quoteJs("game/scene/start.txt")},`,
    "      gameDir: \"./game/\"",
    "    };",
    "  </script>",
    `  <script type="module" src="${engineUrl}"></script>`,
    "</head>",
    "<body></body>",
    "</html>",
  ].join("\n");
}

function resolveSpriteUrl(avatar: WebgalCompiledRoleAvatar | undefined): string {
  return avatar?.webgalSpritePath?.trim() || resolveRoleAvatarMedia(avatar).sprite.url;
}

function resolveAvatarLayerUrl(avatar: WebgalCompiledRoleAvatar | undefined): string {
  return avatar?.webgalAvatarLayerPath?.trim() || resolveRoleAvatarMedia(avatar).avatar.url;
}

function resolveFigureRenderAsset(
  avatar: WebgalCompiledRoleAvatar | undefined,
  avatarMap: Map<number, WebgalCompiledRoleAvatar>,
): WebgalFigureRenderAsset | undefined {
  if (!avatar) {
    return undefined;
  }

  const avatarList = Array.from(avatarMap.values());
  const candidate = resolveFigureCompositionCandidate(avatar, avatarList);
  if (candidate) {
    const basePath = resolveSpriteUrl(candidate.baseAvatar);
    const avatarLayerPath = resolveAvatarLayerUrl(avatar);
    if (basePath && avatarLayerPath) {
      return buildWebgalFigureRenderAsset(candidate, basePath, avatarLayerPath);
    }
  }

  if (avatar.webgalCompositionBasePath && avatar.webgalAvatarLayerPath) {
    const preparedAsset = buildPreparedFigureCompositionAsset({
      avatar,
      baseAvatar: avatar,
      basePath: avatar.webgalCompositionBasePath,
      avatarLayerPath: avatar.webgalAvatarLayerPath,
    }, avatarList);
    if (preparedAsset) {
      return preparedAsset;
    }
  }

  return buildOrdinaryFigureRenderAsset(resolveSpriteUrl(avatar));
}

function appendLine(context: { lines: string[] }, line: string | null | undefined): void {
  const normalized = String(line ?? "").trim();
  if (!normalized) {
    return;
  }
  context.lines.push(normalized);
}

function decodeFileNameSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  }
  catch {
    return segment;
  }
}

function getFileStemFromPath(path: string): string {
  const pathWithoutQuery = String(path ?? "").split(/[?#]/)[0] ?? "";
  const normalizedPath = pathWithoutQuery.replace(/\\/g, "/");
  const lastSegment = normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1) || normalizedPath;
  const decodedSegment = decodeFileNameSegment(lastSegment);
  const dotIndex = decodedSegment.lastIndexOf(".");
  return dotIndex > 0 ? decodedSegment.slice(0, dotIndex) : decodedSegment;
}

function sanitizeWebgalArgumentValue(value: string): string {
  return String(value ?? "")
    .replace(/[\r\n;]/g, " ")
    .replace(/\s+/g, "_")
    .trim();
}

export function buildUnlockBgmLine(
  bgmPath: string,
  soundMessage?: { fileName?: unknown } | null,
): string | null {
  const normalizedPath = String(bgmPath ?? "").trim();
  if (!normalizedPath) {
    return null;
  }

  const fileName = typeof soundMessage?.fileName === "string" && soundMessage.fileName.trim()
    ? soundMessage.fileName.trim()
    : normalizedPath;
  const displayName = sanitizeWebgalArgumentValue(getFileStemFromPath(fileName));
  const namePart = displayName ? ` -name=${displayName}` : "";
  return `unlockBgm:${normalizedPath}${namePart};`;
}

function resolveClearFigureTransitionTargets(
  context: PublishSceneContext,
  annotations: string[] | undefined,
): string[] {
  const figurePosition = getFigurePositionFromAnnotations(annotations);
  if (isFigurePosition(figurePosition)) {
    return [resolveFigureSlot(figurePosition).id];
  }
  const renderedSlotIds = Array.from(context.renderedFigures.keys());
  if (renderedSlotIds.length > 0) {
    return renderedSlotIds;
  }
  return context.lastFigureSlotId ? [context.lastFigureSlotId] : [];
}

function appendClearCommands(context: PublishSceneContext, annotations: string[] | undefined): void {
  if (hasClearBackgroundAnnotation(annotations)) {
    appendLine(context, buildClearBackgroundLineFromAnnotations(annotations));
  }
  if (hasClearBgmAnnotation(annotations)) {
    appendLine(context, "bgm:none -next;");
  }
  if (hasClearImageAnnotation(annotations)) {
    appendLine(context, `changeFigure:none -id=${IMAGE_MESSAGE_FIGURE_ID} -next;`);
  }
  if (hasClearFigureAnnotation(annotations)) {
    const transitionTargets = resolveClearFigureTransitionTargets(context, annotations);
    const figureAnimation = getFigureAnimationFromAnnotations(annotations);
    for (const line of buildFigureExitTransitionLines(transitionTargets, figureAnimation)) {
      appendLine(context, line);
    }
    for (const line of buildClearFigureLines()) {
      appendLine(context, line);
    }
    context.lastFigureSlotId = undefined;
    context.renderedFigures.clear();
  }
}

type PublishSceneContext = {
  roomId: number;
  lines: string[];
  lastFigureSlotId?: string;
  renderedFigures: Map<string, CompiledSceneFigureState>;
};

function renderImageMessage(context: PublishSceneContext, message: ChatMessageResponse): boolean {
  const payload = message.message;
  if ((payload.messageType as number) !== MESSAGE_TYPE.IMG) {
    return false;
  }

  const imageMessage = payload.extra?.imageMessage;
  if (!imageMessage) {
    return true;
  }

  const imageUrl = resolveMessageMediaUrl(imageMessage, "medium", "image");
  if (!imageUrl) {
    return true;
  }

  const isBackground = isImageMessageBackground(payload.annotations, imageMessage);
  if (isBackground) {
    appendLine(context, `changeBg:${imageUrl}${buildBackgroundChangeBgArgsFromAnnotations(payload.annotations)} -next;`);
  }

  if (hasAnnotation(payload.annotations, ANNOTATION_IDS.CG)) {
    const cgName = imageMessage.fileName?.split(".")[0]?.trim() || "CG";
    appendLine(context, `unlockCg:${imageUrl} -name=${cgName};`);
  }

  if (!isBackground && isImageMessageShown(payload.annotations)) {
    const imageSlot = resolveFigureSlot("center");
    const transform = buildImageFigureTransformString(imageMessage, imageSlot.offsetX);
    const figureArgs = buildFigureArgs(IMAGE_MESSAGE_FIGURE_ID, transform);
    appendLine(context, `changeFigure:${imageUrl} ${figureArgs};`);
  }

  return true;
}

function renderVideoMessage(context: PublishSceneContext, message: ChatMessageResponse): boolean {
  const payload = message.message;
  if ((payload.messageType as number) !== MESSAGE_TYPE.VIDEO) {
    return false;
  }

  const videoUrl = resolveMessageMediaUrl(payload.extra?.videoMessage, "low", "video");
  if (!videoUrl) {
    return true;
  }
  const skipOff = hasAnnotation(payload.annotations, ANNOTATION_IDS.VIDEO_SKIP_OFF);
  appendLine(context, `playVideo:${videoUrl}${skipOff ? " -skipOff" : ""};`);
  return true;
}

function renderSoundMessage(
  context: PublishSceneContext,
  message: ChatMessageResponse,
  roleMap: Map<number, UserRole>,
  avatarMap: Map<number, WebgalCompiledRoleAvatar>,
): boolean {
  const soundMessage = message.message.extra?.soundMessage;
  if (!soundMessage) {
    return false;
  }

  const soundUrl = resolveMessageMediaUrl(soundMessage, "low", "audio");
  // 用途判定与前端其它位置一致：annotation 优先，其次 payload purpose，缺省为 voice。
  const purpose = resolveRenderedSoundMessagePurpose({
    annotations: message.message.annotations,
    payloadPurpose: soundMessage.purpose,
  });

  if (purpose === "voice") {
    // 语音消息渲染为带配音的台词：把配音通过 say -vocal=<url> 附加到对话行上。
    // 没有配音 URL 时仍渲染台词，只是不挂 -vocal。
    renderVoiceMessage(context, message, roleMap, avatarMap, soundUrl);
    return true;
  }

  if (!soundUrl) {
    return true;
  }

  const volumePart = typeof soundMessage.volume === "number" ? ` -volume=${soundMessage.volume}` : "";
  if (purpose === "bgm") {
    appendLine(context, buildUnlockBgmLine(soundUrl, soundMessage));
    appendLine(context, `bgm:${soundUrl}${volumePart} -next;`);
    return true;
  }
  if (purpose === "se") {
    appendLine(context, `playEffect:${soundUrl}${volumePart} -next;`);
    return true;
  }
  return true;
}

function renderVoiceMessage(
  context: PublishSceneContext,
  message: ChatMessageResponse,
  roleMap: Map<number, UserRole>,
  avatarMap: Map<number, WebgalCompiledRoleAvatar>,
  vocalUrl: string | null,
): void {
  const payload = message.message;
  const processedContent = TextEnhanceSyntax.processContent(payload.content ?? "");
  if (!processedContent.trim()) {
    return;
  }

  const vocalPart = vocalUrl ? ` -vocal=${vocalUrl}` : "";
  const roleId = payload.roleId ?? 0;
  const nextPart = hasAnnotation(payload.annotations, ANNOTATION_IDS.DIALOG_NEXT) ? " -next" : "";
  if (roleId <= 0) {
    appendLine(context, `:${processedContent}${vocalPart}${nextPart};`);
    return;
  }

  const role = roleMap.get(roleId);
  const roleName = payload.customRoleName || role?.roleName || `角色${roleId}`;
  const figureIdPart = renderFigureCommands(context, message, avatarMap);
  const notendPart = hasAnnotation(payload.annotations, ANNOTATION_IDS.DIALOG_NOTEND) ? " -notend" : "";
  const concatPart = hasAnnotation(payload.annotations, ANNOTATION_IDS.DIALOG_CONCAT) ? " -concat" : "";
  appendLine(context, `${roleName}: ${processedContent}${vocalPart}${figureIdPart}${notendPart}${concatPart}${nextPart};`);
}

function renderChooseMessage(context: PublishSceneContext, message: ChatMessageResponse): boolean {
  const payload = message.message;
  if ((payload.messageType as number) !== MESSAGE_TYPE.WEBGAL_CHOOSE) {
    return false;
  }

  const choosePayload = extractWebgalChoosePayload(payload.extra);
  if (!choosePayload) {
    return true;
  }
  buildWebgalChooseScriptLines(choosePayload, payload.messageId ?? Date.now())
    .forEach(line => appendLine(context, line));
  return true;
}

function renderFigureCommands(
  context: PublishSceneContext,
  message: ChatMessageResponse,
  avatarMap: Map<number, WebgalCompiledRoleAvatar>,
): string {
  const payload = message.message;
  const roleId = payload.roleId ?? 0;
  if (roleId <= 0 || (payload.messageType as number) === MESSAGE_TYPE.INTRO_TEXT) {
    return "";
  }

  const figurePosition = getFigurePositionFromAnnotations(payload.annotations);
  if (!isFigurePosition(figurePosition)) {
    return "";
  }

  const messageAvatarId = Number(payload.avatarId ?? 0);
  const avatar = messageAvatarId > 0 ? avatarMap.get(messageAvatarId) : undefined;
  const figureAsset = resolveFigureRenderAsset(avatar, avatarMap);
  if (!figureAsset) {
    return "";
  }

  const figureSlot = resolveFigureSlot(figurePosition);
  const transform = buildRoleFigureTransformString(avatar, figureSlot.offsetX, 0);
  const previous = context.renderedFigures.get(figureSlot.id);
  const figureAnimation = getFigureAnimationFromAnnotations(payload.annotations);
  if (!previous || previous.fileName !== figureAsset.stateKey || previous.transform !== transform) {
    const figureArgs = buildFigureArgs(figureSlot.id, transform);
    if (figureAsset.composeLine) {
      appendLine(context, figureAsset.composeLine);
    }
    const compositePart = figureAsset.composite ? " -composite" : "";
    appendLine(context, `changeFigure:${figureAsset.target}${compositePart} ${figureArgs} -next;`);
    appendLine(context, buildFigureTransitionLine(figureSlot.id, figureAnimation));
    context.renderedFigures.set(figureSlot.id, { fileName: figureAsset.stateKey, transform });
  }
  context.lastFigureSlotId = figureSlot.id;

  if (figureAnimation?.animation) {
    appendLine(
      context,
      `setAnimation:${figureAnimation.animation} -target=${figureSlot.id}${DEFAULT_KEEP_OFFSET_PART}${DEFAULT_RESTORE_TRANSFORM_PART} -next;`,
    );
  }

  return ` -figureId=${figureSlot.id}`;
}

function renderTextMessage(
  context: PublishSceneContext,
  message: ChatMessageResponse,
  roleMap: Map<number, UserRole>,
  avatarMap: Map<number, WebgalCompiledRoleAvatar>,
): boolean {
  const payload = message.message;
  const isText = (payload.messageType as number) === MESSAGE_TYPE.TEXT;
  const isIntro = (payload.messageType as number) === MESSAGE_TYPE.INTRO_TEXT;
  if (!isText && !isIntro) {
    return false;
  }

  const processedContent = TextEnhanceSyntax.processContent(payload.content ?? "");
  if (!processedContent.trim()) {
    return true;
  }

  if (isIntro) {
    const holdPart = hasAnnotation(payload.annotations, ANNOTATION_IDS.DIALOG_NOTEND) ? "" : " -hold";
    appendLine(context, `intro:${processedContent.replace(/ +/g, "|")}${holdPart};`);
    return true;
  }

  const roleId = payload.roleId ?? 0;
  const isNarrator = roleId <= 0;
  const nextPart = hasAnnotation(payload.annotations, ANNOTATION_IDS.DIALOG_NEXT) ? " -next" : "";
  if (isNarrator) {
    appendLine(context, `:${processedContent}${nextPart};`);
    return true;
  }

  const role = roleMap.get(roleId);
  const roleName = payload.customRoleName || role?.roleName || `角色${roleId}`;
  const figureIdPart = renderFigureCommands(context, message, avatarMap);
  const notendPart = hasAnnotation(payload.annotations, ANNOTATION_IDS.DIALOG_NOTEND) ? " -notend" : "";
  const concatPart = hasAnnotation(payload.annotations, ANNOTATION_IDS.DIALOG_CONCAT) ? " -concat" : "";
  appendLine(context, `${roleName}: ${processedContent}${figureIdPart}${notendPart}${concatPart}${nextPart};`);
  return true;
}

function renderDiceMessage(
  context: PublishSceneContext,
  message: ChatMessageResponse,
  roleMap: Map<number, UserRole>,
  avatarMap: Map<number, WebgalCompiledRoleAvatar>,
): boolean {
  const payload = message.message;
  if ((payload.messageType as number) !== MESSAGE_TYPE.DICE) {
    return false;
  }

  const extra = payload.extra as {
    authoredDice?: { description?: unknown; options?: unknown; result?: unknown; rollText?: unknown };
    diceResult?: { result?: unknown };
  } | undefined;
  const authoredOptions = Array.isArray(extra?.authoredDice?.options)
    ? extra.authoredDice.options.map(item => String(item)).filter(Boolean)
    : [];
  const descriptionText = extra?.authoredDice?.description
    ? String(extra.authoredDice.description).trim()
    : "";
  const diceText = String(
    extra?.authoredDice?.result
    ?? extra?.diceResult?.result
    ?? payload.content
    ?? "",
  ).trim();
  const authoredText = [descriptionText, diceText, ...authoredOptions].filter(Boolean).join("\n");
  const processedContent = TextEnhanceSyntax.processContent(authoredText).replace(/\r?\n/g, "|");
  if (!processedContent.trim()) {
    return true;
  }

  const roleId = payload.roleId ?? 0;
  if (roleId <= 0) {
    appendLine(context, `:${processedContent};`);
    return true;
  }

  const role = roleMap.get(roleId);
  const roleName = payload.customRoleName || role?.roleName || `角色${roleId}`;
  const figureIdPart = renderFigureCommands(context, message, avatarMap);
  appendLine(context, `${roleName}: ${processedContent}${figureIdPart};`);
  return true;
}

function renderPublishMessage(
  context: PublishSceneContext,
  message: ChatMessageResponse,
  roleMap: Map<number, UserRole>,
  avatarMap: Map<number, WebgalCompiledRoleAvatar>,
): void {
  const payload = message.message;
  if (payload.status === 1) {
    return;
  }

  getSceneControlLinesFromAnnotations(payload.annotations).forEach(line => appendLine(context, line));
  appendClearCommands(context, payload.annotations);
  if (renderImageMessage(context, message)) {
    return;
  }
  if (renderVideoMessage(context, message)) {
    return;
  }
  if (renderSoundMessage(context, message, roleMap, avatarMap)) {
    return;
  }
  if (renderChooseMessage(context, message)) {
    return;
  }
  if (renderDiceMessage(context, message, roleMap, avatarMap)) {
    return;
  }
  renderTextMessage(context, message, roleMap, avatarMap);
}

export function buildRoomSceneCompilation(
  room: Room,
  messages: ChatMessageResponse[] | undefined,
  workflowGraph: WorkflowGraph,
  roomMap: Map<number, Room>,
  getSceneName: (roomId: number) => string,
  roleMap: Map<number, UserRole>,
  avatarMap: Map<number, RoleAvatar>,
): CompiledRoomSceneResult {
  const roomId = Number(room.roomId);
  const context: PublishSceneContext = {
    roomId,
    lines: ["changeBg:none -next;"],
    renderedFigures: new Map(),
  };
  const messageLineRanges = new Map<number, { startLine: number; endLine: number }>();

  sortMessages(messages).forEach((message) => {
    const messageId = Number(message.message.messageId ?? 0);
    const startLine = context.lines.length + 1;
    renderPublishMessage(context, message, roleMap, avatarMap);
    const endLine = context.lines.length;
    if (messageId > 0 && endLine >= startLine) {
      messageLineRanges.set(messageId, { startLine, endLine });
    }
  });

  const transitionLine = buildWorkflowTransitionLineWithEnd({
    roomId,
    workflowGraph,
    roomMap,
    getSceneName,
  });
  if (transitionLine) {
    appendLine(context, transitionLine);
  }

  return {
    content: ensureTrailingNewline(context.lines.join("\n")),
    lastFigureSlotId: context.lastFigureSlotId,
    messageLineRanges,
    renderedFigures: new Map(
      Array.from(context.renderedFigures.entries()).map(([slotId, state]) => [slotId, { ...state }]),
    ),
  };
}

export function buildRoomSceneContent(
  room: Room,
  messages: ChatMessageResponse[] | undefined,
  workflowGraph: WorkflowGraph,
  roomMap: Map<number, Room>,
  getSceneName: (roomId: number) => string,
  roleMap: Map<number, UserRole>,
  avatarMap: Map<number, RoleAvatar>,
): string {
  return buildRoomSceneCompilation(
    room,
    messages,
    workflowGraph,
    roomMap,
    getSceneName,
    roleMap,
    avatarMap,
  ).content;
}

export function buildPublishWorkflowGraph(roomMap?: Record<string, Array<string>>) {
  return parseWorkflowRoomMap(roomMap);
}

export function buildStaticWebgalPackage(input: {
  snapshot: SpaceWebgalInputSnapshot;
  iconFiles?: WebgalPublishFile[];
}): WebgalPublishPackage {
  const rooms = input.snapshot.renderableRooms;
  const roomMap = new Map(rooms.map(room => [Number(room.roomId), room]));
  const sceneNameMap = new Map<number, string>();
  rooms.forEach((room) => {
    const roomId = Number(room.roomId);
    sceneNameMap.set(roomId, buildWebgalSceneName(roomId, room.name));
  });

  const getSceneName = (roomId: number) => sceneNameMap.get(roomId) ?? `room_${roomId}`;
  const workflowGraph = buildPublishWorkflowGraph(input.snapshot.workflowRoomMap);
  const roleMap = new Map((input.snapshot.roles ?? []).map(role => [role.roleId, role]));
  const avatarMap = new Map((input.snapshot.avatars ?? [])
    .filter(avatar => Number.isFinite(avatar.avatarId))
    .map(avatar => [Number(avatar.avatarId), avatar]));
  const publishedGameName = resolvePublishedGameName(
    input.snapshot.spaceId,
    input.snapshot.spaceName,
    input.snapshot.hydratedGameConfig,
  );
  const includeManifest = (input.iconFiles?.length ?? 0) > 0;

  const files: WebgalPublishFile[] = [
    {
      path: "index.html",
      content: buildIndexHtml(publishedGameName, input.snapshot.sharedEngineUrl, includeManifest),
      contentType: resolvePublishFileContentType("index.html"),
    },
    ...(includeManifest
      ? [{
          path: "manifest.json",
          content: buildManifestContent(publishedGameName, input.snapshot.hydratedGameConfig.description),
          contentType: resolvePublishFileContentType("manifest.json"),
        }]
      : []),
    {
      path: `${GAME_DIR}/config.txt`,
      content: buildConfigContent(input.snapshot),
      contentType: resolvePublishFileContentType(`${GAME_DIR}/config.txt`),
    },
    {
      path: `${GAME_DIR}/scene/start.txt`,
      content: ensureTrailingNewline(normalizeLineEndings(buildWorkflowStartSceneContent({
        rooms,
        workflowGraph,
        roomMap,
        getSceneName,
      }))),
      contentType: resolvePublishFileContentType(`${GAME_DIR}/scene/start.txt`),
    },
    ...buildBaseRuntimeSupportFiles(),
    ...buildTemplateRuntimeSupportFiles(input.snapshot.hydratedGameConfig.baseTemplate),
    ...(input.iconFiles ?? []),
  ];

  rooms.forEach((room) => {
    const roomId = Number(room.roomId);
    const roomScene = buildRoomSceneCompilation(
      room,
      input.snapshot.messagesByRoomId[roomId],
      workflowGraph,
      roomMap,
      getSceneName,
      roleMap,
      avatarMap,
    );
    files.push({
      path: `${GAME_DIR}/scene/${getSceneName(roomId)}.txt`,
      content: roomScene.content,
      contentType: resolvePublishFileContentType(`${GAME_DIR}/scene/${getSceneName(roomId)}.txt`),
    });
  });

  workflowGraph.endNodeIds.forEach((endNodeId) => {
    files.push({
      path: `${GAME_DIR}/scene/${getWorkflowEndSceneName(endNodeId)}.txt`,
      content: "end;\n",
      contentType: resolvePublishFileContentType(`${GAME_DIR}/scene/${getWorkflowEndSceneName(endNodeId)}.txt`),
    });
  });

  return {
    gameDir: GAME_DIR,
    entrypoint: "index.html",
    files,
  };
}

export { buildWorkflowStartSceneContent as buildStartSceneContent, buildWorkflowTransitionLineWithEnd, getWorkflowEndSceneName };
