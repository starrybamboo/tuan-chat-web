import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { RoomMessageStreamPatchOperation } from "@tuanchat/openapi-client/models/RoomMessageStreamPatchOperation";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { ensureRoomInSidebarTree, type GululuLiveImportPlan } from "./gululu-authoring-live-import";

type ApiResult<T> = {
  data?: T;
  errMsg?: string;
  success?: boolean;
};

type SourceMessagePlan = {
  avatarKey?: string;
  kind: "dialog" | "narration" | "dice" | "bgm";
  request: ChatMessageRequest;
  roleKey?: string;
  source: {
    eventIndex: number;
    floor?: number;
    imagePath?: string;
    sourceTime?: string;
    speakerName?: string;
  };
};

type SourceLiveResult = {
  plan?: {
    messages?: SourceMessagePlan[];
    source?: Record<string, unknown>;
    stats?: Record<string, number>;
  };
  result?: {
    avatars?: Array<{ avatarId?: number; key?: string; mediaFileId?: number; roleId?: number }>;
    roles?: Array<{ key?: string; roleId?: number }>;
  };
};

type SourceLiveResultPlan = NonNullable<SourceLiveResult["plan"]>;
type MessageTypeDirective = "text" | "intro" | "dice" | number;

export type GululuGalDirectionEntry = {
  annotations?: string[];
  avatarKey?: string | null;
  customRoleName?: string | null;
  eventIndex: number;
  messageType?: MessageTypeDirective;
  note?: string;
  roleKey?: string | null;
  webgal?: Record<string, unknown>;
};

export type GululuGalDirectingPlan = {
  entries: GululuGalDirectionEntry[];
  schemaVersion: 1;
  source?: Record<string, unknown>;
};

export type GululuGalCompiledMessage = {
  eventIndex: number;
  request: ChatMessageRequest;
  source: SourceMessagePlan["source"];
};

export type GululuGalDirectedImportPlan = {
  messages: GululuGalCompiledMessage[];
  reused: {
    avatars: Array<{ avatarId: number; key: string; roleId?: number }>;
    roles: Array<{ key: string; roleId: number }>;
  };
  source: SourceLiveResultPlan["source"];
  stats: {
    diceMessages: number;
    messages: number;
    messagesWithAnnotations: number;
    messagesWithWebgal: number;
    reusedAvatars: number;
    reusedRoles: number;
  };
  target: {
    roomId?: number;
    roomName?: string;
    spaceId: number;
  };
  warnings: string[];
};

export type GululuGalDirectedApplyResult = {
  createdRoom?: {
    name?: string;
    roomId: number;
    spaceId?: number;
  };
  messages: Array<{ messageId?: number; sourceEventIndex: number; syncId?: number }>;
  roomRoles: {
    addedRoleIds: number[];
    reusedRoleIds: number[];
  };
  sidebarTree?: {
    action: "added" | "already-present" | "skipped";
    reason?: string;
    roomId: number;
    spaceId?: number;
    version?: number;
  };
};

export type GululuGalDirectedImportArgs = {
  apply?: boolean;
  authToken?: string;
  baseUrl?: string;
  directingPlan?: string;
  liveResult?: string;
  out?: string;
  patchChunkSize?: number;
  roomName?: string;
  targetRoomId?: number;
  targetSpaceId?: number;
};

type GululuGalDirectedClient = {
  chatController: {
    patchRoomMessages: (requestBody: {
      operations: RoomMessageStreamPatchOperation[];
      roomId: number;
    }) => Promise<ApiResult<Message[]>>;
  };
  roomController?: {
    getUserRooms: (spaceId: number) => Promise<ApiResult<{ rooms?: Array<{ name?: string; roomId?: number }>; spaceId?: number }>>;
  };
  roomRoleController: {
    addRole: (requestBody: { roleIdList: number[]; roomId: number; type?: number }) => Promise<ApiResult<unknown>>;
    roomNpcRole: (roomId: number) => Promise<ApiResult<UserRole[]>>;
  };
  spaceController?: {
    createRoom: (requestBody: { roomName?: string; spaceId: number; userIdList?: number[] }) => Promise<ApiResult<Room>>;
  };
  spaceSidebarTreeController?: {
    getSidebarTree: (spaceId: number) => Promise<ApiResult<{ spaceId?: number; treeJson?: string; version?: number }>>;
    setSidebarTree: (requestBody: {
      expectedVersion: number;
      spaceId: number;
      treeJson: string;
    }) => Promise<ApiResult<{ spaceId?: number; treeJson?: string; version?: number }>>;
  };
};

const NPC_ROLE_TYPE = 2;
const DEFAULT_PATCH_CHUNK_SIZE = 100;

function readValue(args: string[], index: number, flag: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function toPositiveInteger(value: string, flag: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

export function parseGululuGalDirectedImportArgs(argv: string[]): GululuGalDirectedImportArgs {
  const args: GululuGalDirectedImportArgs = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--apply") {
      args.apply = true;
    }
    else if (arg === "--live-result") {
      args.liveResult = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--directing-plan") {
      args.directingPlan = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--out") {
      args.out = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--target-room-id") {
      args.targetRoomId = toPositiveInteger(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--target-space-id") {
      args.targetSpaceId = toPositiveInteger(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--room-name") {
      args.roomName = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--patch-chunk-size") {
      args.patchChunkSize = toPositiveInteger(readValue(argv, index, arg), arg);
      index++;
    }
    else if (arg === "--base-url") {
      args.baseUrl = readValue(argv, index, arg);
      index++;
    }
    else if (arg === "--auth-token") {
      args.authToken = readValue(argv, index, arg);
      index++;
    }
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function normalizeMessageType(value: MessageTypeDirective | undefined, fallback: number) {
  if (value === "text") {
    return MESSAGE_TYPE.TEXT;
  }
  if (value === "intro") {
    return MESSAGE_TYPE.INTRO_TEXT;
  }
  if (value === "dice") {
    return MESSAGE_TYPE.DICE;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  return fallback;
}

function buildMap<T extends { key?: string }>(items: T[] | undefined, field: keyof T, label: string) {
  const result = new Map<string, number>();
  for (const item of items ?? []) {
    const key = item.key?.trim();
    const id = item[field];
    if (!key || typeof id !== "number" || !Number.isFinite(id) || id <= 0) {
      continue;
    }
    if (result.has(key)) {
      throw new Error(`重复的 ${label} 映射：${key}`);
    }
    result.set(key, id);
  }
  return result;
}

function assertApiSuccess<T>(result: ApiResult<T>, fallback: string) {
  if (!result?.success) {
    throw new Error(result?.errMsg || fallback);
  }
  return result.data;
}

function assertApiData<T>(result: ApiResult<T>, fallback: string) {
  const data = assertApiSuccess(result, fallback);
  if (data == null) {
    throw new Error(fallback);
  }
  return data;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeAnnotations(value: string[] | undefined) {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const annotations = Array.from(new Set(value.filter(item => typeof item === "string" && item.trim().length > 0)));
  return annotations.length > 0 ? annotations : undefined;
}

function buildSourceMetadata(source: SourceMessagePlan["source"]) {
  return {
    kind: "gululu",
    ...(source.floor != null ? { segmentId: String(source.floor) } : {}),
    eventIndex: source.eventIndex,
    ...(source.speakerName ? { originalSpeaker: source.speakerName } : {}),
    ...(source.imagePath ? { originalAssetPath: source.imagePath } : {}),
    ...(source.sourceTime ? { sourceTime: source.sourceTime } : {}),
  };
}

function mergeWebgal(
  source: SourceMessagePlan["source"],
  webgal: Record<string, unknown> | undefined,
) {
  return {
    ...(webgal ?? {}),
    source: buildSourceMetadata(source),
  };
}

function getRecordField(value: Record<string, unknown> | undefined, field: string) {
  const next = value?.[field];
  return next && typeof next === "object" && !Array.isArray(next) ? next as Record<string, unknown> : undefined;
}

function getStringField(value: Record<string, unknown> | undefined, field: string) {
  const next = value?.[field];
  return typeof next === "string" && next.trim() ? next.trim() : undefined;
}

function getDirectedDiceText(webgal: Record<string, unknown> | undefined) {
  const diceRender = getRecordField(webgal, "diceRender");
  return {
    commandContent: getStringField(diceRender, "commandContent"),
    replyContent: getStringField(diceRender, "replyContent") ?? getStringField(diceRender, "content"),
  };
}

function getExistingDiceText(request: ChatMessageRequest) {
  const existing = request.extra ?? {};
  const diceTurn = getRecordField(existing as Record<string, unknown>, "diceTurn");
  const replies = diceTurn?.replies;
  const firstReply = Array.isArray(replies)
    ? replies.find(item => item && typeof item === "object" && !Array.isArray(item)) as Record<string, unknown> | undefined
    : undefined;
  return {
    commandContent: getStringField(diceTurn, "command"),
    replyContent: getStringField(firstReply, "content")
      ?? getStringField(getRecordField(existing as Record<string, unknown>, "diceResult"), "result")
      ?? request.content?.trim(),
  };
}

function preserveExistingDiceSplit(
  request: ChatMessageRequest,
  diceText: { commandContent?: string; replyContent?: string },
) {
  if (!diceText.commandContent || !diceText.replyContent || diceText.commandContent !== diceText.replyContent) {
    return diceText;
  }
  const existing = getExistingDiceText(request);
  if (!existing.commandContent || !existing.replyContent || existing.commandContent === existing.replyContent) {
    return diceText;
  }
  // 导演计划若把同一历史结果同时写入 command/reply，则保留源导入阶段已拆好的过程/结果。
  return existing;
}

function mergeDiceRenderText(
  webgal: Record<string, unknown> | undefined,
  diceText: { commandContent?: string; replyContent?: string },
) {
  const diceRender = getRecordField(webgal, "diceRender");
  if (!diceRender || (!diceText.commandContent && !diceText.replyContent)) {
    return webgal;
  }
  return {
    ...(webgal ?? {}),
    diceRender: {
      ...diceRender,
      ...(diceText.commandContent ? { commandContent: diceText.commandContent } : {}),
      ...(diceText.replyContent ? { content: diceText.replyContent, replyContent: diceText.replyContent } : {}),
    },
  };
}

function buildDiceExtra(
  request: ChatMessageRequest,
  diceText: { commandContent?: string; replyContent?: string } = {},
) {
  const existing = request.extra ?? {};
  if (existing.diceTurn && !diceText.commandContent && !diceText.replyContent) {
    return existing;
  }
  const result = diceText.replyContent || existing.diceResult?.result?.trim() || request.content?.trim() || "";
  if (!result) {
    throw new Error("骰子消息缺少可保留的历史内容");
  }
  const existingCommand = getStringField(getRecordField(existing as Record<string, unknown>, "diceTurn"), "command");
  const command = diceText.commandContent || existingCommand;
  return {
    ...existing,
    diceResult: { result },
    diceTurn: {
      ...(command ? { command } : {}),
      replies: [{
        content: result,
        customRoleName: request.customRoleName || "骰娘",
        ...(typeof request.roleId === "number" && request.roleId > 0 ? { roleId: request.roleId } : {}),
        ...(typeof request.avatarId === "number" && request.avatarId > 0 ? { avatarId: request.avatarId } : {}),
      }],
    },
  };
}

function materializeRequest(params: {
  avatarIds: Map<string, number>;
  direction: GululuGalDirectionEntry;
  roleIds: Map<string, number>;
  sourceMessage: SourceMessagePlan;
  targetRoomId: number;
  warnings: string[];
}): ChatMessageRequest {
  const request = cloneJson(params.sourceMessage.request);
  request.roomId = params.targetRoomId;

  const roleKey = params.direction.roleKey === null ? undefined : params.direction.roleKey ?? params.sourceMessage.roleKey;
  const avatarKey = params.direction.avatarKey === null ? undefined : params.direction.avatarKey ?? params.sourceMessage.avatarKey;
  if (roleKey) {
    const roleId = params.roleIds.get(roleKey);
    if (!roleId) {
      throw new Error(`缺少复用角色映射：${roleKey}`);
    }
    request.roleId = roleId;
  }
  else if (request.roleId == null || request.roleId > 0) {
    request.roleId = -1;
  }

  if (avatarKey) {
    const avatarId = params.avatarIds.get(avatarKey);
    if (!avatarId) {
      throw new Error(`缺少复用头像映射：${avatarKey}`);
    }
    request.avatarId = avatarId;
  }
  else if (request.avatarId == null || request.avatarId > 0) {
    request.avatarId = -1;
  }

  request.messageType = normalizeMessageType(params.direction.messageType, request.messageType);
  if (params.direction.customRoleName === null) {
    delete request.customRoleName;
  }
  else if (typeof params.direction.customRoleName === "string") {
    request.customRoleName = params.direction.customRoleName;
  }

  const annotations = normalizeAnnotations(params.direction.annotations);
  if (annotations) {
    request.annotations = annotations;
  }
  else {
    delete request.annotations;
  }
  if (request.messageType === MESSAGE_TYPE.DICE) {
    const diceText = preserveExistingDiceSplit(request, getDirectedDiceText(params.direction.webgal));
    request.webgal = mergeWebgal(params.sourceMessage.source, mergeDiceRenderText(params.direction.webgal, diceText));
    if (diceText.commandContent) {
      request.content = diceText.commandContent;
    }
    request.customRoleName = request.customRoleName || "骰娘";
    request.extra = buildDiceExtra(request, diceText);
  }
  else {
    request.webgal = mergeWebgal(params.sourceMessage.source, params.direction.webgal);
    request.extra = request.extra ?? {};
  }
  if (!request.content) {
    params.warnings.push(`第 ${params.sourceMessage.source.eventIndex} 条消息内容为空`);
  }
  return request;
}

function toInsertOperation(request: ChatMessageRequest): RoomMessageStreamPatchOperation {
  return {
    op: "insert",
    message: {
      messageType: request.messageType,
      content: request.content ?? "",
      ...(Array.isArray(request.annotations) ? { annotations: request.annotations } : {}),
      extra: request.extra,
      ...(request.webgal !== undefined ? { webgal: request.webgal } : {}),
      ...(typeof request.roleId === "number" ? { roleId: request.roleId } : {}),
      ...(typeof request.avatarId === "number" ? { avatarId: request.avatarId } : {}),
      ...(typeof request.customRoleName === "string" ? { customRoleName: request.customRoleName } : {}),
      ...(typeof request.replayMessageId === "number" ? { replayMessageId: request.replayMessageId } : {}),
      ...(typeof request.position === "number" ? { position: request.position } : {}),
    },
  };
}

export function buildGululuGalDirectedImportPlan(
  liveResult: SourceLiveResult,
  directingPlan: GululuGalDirectingPlan,
  options: { roomName?: string; targetRoomId?: number; targetSpaceId: number },
): GululuGalDirectedImportPlan {
  if (!Number.isInteger(options.targetSpaceId) || options.targetSpaceId <= 0) {
    throw new Error("targetSpaceId must be a positive integer");
  }
  if (options.targetRoomId != null && (!Number.isInteger(options.targetRoomId) || options.targetRoomId <= 0)) {
    throw new Error("targetRoomId must be a positive integer");
  }
  if (directingPlan.schemaVersion !== 1) {
    throw new Error("directing plan schemaVersion must be 1");
  }

  const sourceMessages = liveResult.plan?.messages ?? [];
  if (sourceMessages.length === 0) {
    throw new Error("live result plan.messages must not be empty");
  }
  const directionsByIndex = new Map<number, GululuGalDirectionEntry>();
  for (const entry of directingPlan.entries ?? []) {
    if (!Number.isInteger(entry.eventIndex) || entry.eventIndex <= 0) {
      throw new Error("direction entry eventIndex must be a positive integer");
    }
    if (directionsByIndex.has(entry.eventIndex)) {
      throw new Error(`重复的导演计划事件：${entry.eventIndex}`);
    }
    directionsByIndex.set(entry.eventIndex, entry);
  }
  if (directionsByIndex.size !== sourceMessages.length) {
    throw new Error(`导演计划条数不匹配：${directionsByIndex.size}/${sourceMessages.length}`);
  }

  const roleIds = buildMap(liveResult.result?.roles, "roleId", "角色");
  const avatarIds = buildMap(liveResult.result?.avatars, "avatarId", "头像");
  const warnings: string[] = [];
  const messages = sourceMessages.map((sourceMessage): GululuGalCompiledMessage => {
    const direction = directionsByIndex.get(sourceMessage.source.eventIndex);
    if (!direction) {
      throw new Error(`缺少导演计划事件：${sourceMessage.source.eventIndex}`);
    }
    return {
      eventIndex: sourceMessage.source.eventIndex,
      request: materializeRequest({
        avatarIds,
        direction,
        roleIds,
        sourceMessage,
        targetRoomId: options.targetRoomId ?? 1,
        warnings,
      }),
      source: sourceMessage.source,
    };
  });

  return {
    messages,
    reused: {
      avatars: [...avatarIds.entries()].map(([key, avatarId]) => {
        const source = liveResult.result?.avatars?.find(item => item.key === key);
        return { avatarId, key, ...(source?.roleId ? { roleId: source.roleId } : {}) };
      }),
      roles: [...roleIds.entries()].map(([key, roleId]) => ({ key, roleId })),
    },
    source: liveResult.plan?.source,
    stats: {
      diceMessages: messages.filter(message => message.request.messageType === MESSAGE_TYPE.DICE).length,
      messages: messages.length,
      messagesWithAnnotations: messages.filter(message => (message.request.annotations ?? []).length > 0).length,
      messagesWithWebgal: messages.filter(message => message.request.webgal && Object.keys(message.request.webgal).length > 0).length,
      reusedAvatars: avatarIds.size,
      reusedRoles: roleIds.size,
    },
    target: {
      roomId: options.targetRoomId,
      roomName: options.roomName,
      spaceId: options.targetSpaceId,
    },
    warnings,
  };
}

async function createTargetRoom(
  plan: GululuGalDirectedImportPlan,
  client: GululuGalDirectedClient,
) {
  if (plan.target.roomId) {
    return undefined;
  }
  if (!client.spaceController) {
    throw new Error("当前 client 缺少 spaceController，无法创建房间");
  }
  const room = assertApiData(
    await client.spaceController.createRoom({
      roomName: plan.target.roomName ?? "GAL 演出版",
      spaceId: plan.target.spaceId,
    }),
    "创建房间失败",
  );
  if (!room.roomId) {
    throw new Error("创建房间响应缺少 roomId");
  }
  plan.target.roomId = room.roomId;
  return {
    name: room.name,
    roomId: room.roomId,
    spaceId: room.spaceId,
  };
}

async function ensureRolesInRoom(
  roomId: number,
  roleIds: number[],
  client: GululuGalDirectedClient,
) {
  const existing = assertApiSuccess(await client.roomRoleController.roomNpcRole(roomId), "读取房间 NPC 角色失败") ?? [];
  const existingIds = new Set(existing.map(role => role.roleId).filter((id): id is number => typeof id === "number" && id > 0));
  const uniqueRoleIds = Array.from(new Set(roleIds));
  const missing = uniqueRoleIds.filter(roleId => !existingIds.has(roleId));
  if (missing.length > 0) {
    assertApiSuccess(
      await client.roomRoleController.addRole({
        roleIdList: missing,
        roomId,
        type: NPC_ROLE_TYPE,
      }),
      "拉入复用 NPC 角色失败",
    );
  }
  return {
    addedRoleIds: missing,
    reusedRoleIds: uniqueRoleIds.filter(roleId => existingIds.has(roleId)),
  };
}

async function patchMessagesInChunks(
  roomId: number,
  messages: GululuGalCompiledMessage[],
  client: GululuGalDirectedClient,
  chunkSize: number,
) {
  const createdMessages: Array<{ messageId?: number; sourceEventIndex: number; syncId?: number }> = [];
  for (let start = 0; start < messages.length; start += chunkSize) {
    const chunk = messages.slice(start, start + chunkSize);
    const result = assertApiSuccess(
      await client.chatController.patchRoomMessages({
        operations: chunk.map(message => toInsertOperation(message.request)),
        roomId,
      }),
      `批量写入消息失败：${start + 1}-${start + chunk.length}`,
    ) ?? [];
    chunk.forEach((compiled, index) => {
      const created = result[index];
      createdMessages.push({
        messageId: created?.messageId,
        sourceEventIndex: compiled.eventIndex,
        syncId: created?.syncId,
      });
    });
  }
  return createdMessages;
}

export async function applyGululuGalDirectedImportPlan(
  plan: GululuGalDirectedImportPlan,
  client: GululuGalDirectedClient,
  options: { patchChunkSize?: number } = {},
): Promise<GululuGalDirectedApplyResult> {
  const createdRoom = await createTargetRoom(plan, client);
  const roomId = plan.target.roomId;
  if (!roomId) {
    throw new Error("target room id is required");
  }
  for (const message of plan.messages) {
    message.request.roomId = roomId;
  }

  const roomRoles = await ensureRolesInRoom(roomId, plan.reused.roles.map(role => role.roleId), client);
  const messages = await patchMessagesInChunks(
    roomId,
    plan.messages,
    client,
    options.patchChunkSize ?? DEFAULT_PATCH_CHUNK_SIZE,
  );
  const sidebarTree = await ensureRoomInSidebarTree({
    target: {
      roomId,
      spaceId: plan.target.spaceId,
    },
  } as GululuLiveImportPlan, client as unknown as Parameters<typeof ensureRoomInSidebarTree>[1]);
  return {
    ...(createdRoom ? { createdRoom } : {}),
    messages,
    roomRoles,
    sidebarTree,
  };
}

function buildDefaultOutPath(liveResultPath: string, apply: boolean | undefined) {
  const suffix = apply ? ".gal-directed-live-import-result.json" : ".gal-directed-live-import-plan.json";
  return liveResultPath.replace(/\.live-import-result\.json$/, suffix);
}

async function readJsonFile<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function createClient(args: GululuGalDirectedImportArgs): GululuGalDirectedClient {
  return new TuanChat({
    BASE: args.baseUrl ?? "http://127.0.0.1:8081",
    TOKEN: args.authToken || process.env.TUANCHAT_AUTH_TOKEN,
  }) as unknown as GululuGalDirectedClient;
}

export async function runGululuGalDirectedImport(argv: string[]) {
  const args = parseGululuGalDirectedImportArgs(argv);
  if (!args.liveResult) {
    throw new Error("--live-result is required");
  }
  if (!args.directingPlan) {
    throw new Error("--directing-plan is required");
  }
  if (!args.targetSpaceId) {
    throw new Error("--target-space-id is required");
  }
  if (!args.targetRoomId && !args.roomName) {
    throw new Error("--room-name is required when --target-room-id is omitted");
  }

  const liveResultPath = path.resolve(args.liveResult);
  const directingPlanPath = path.resolve(args.directingPlan);
  const liveResult = await readJsonFile<SourceLiveResult>(liveResultPath);
  const directingPlan = await readJsonFile<GululuGalDirectingPlan>(directingPlanPath);
  const plan = buildGululuGalDirectedImportPlan(liveResult, directingPlan, {
    roomName: args.roomName,
    targetRoomId: args.targetRoomId,
    targetSpaceId: args.targetSpaceId,
  });
  const outputPath = path.resolve(args.out ?? buildDefaultOutPath(liveResultPath, args.apply));

  if (!args.apply) {
    await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    return { outputPath, plan };
  }

  const client = createClient(args);
  const result = await applyGululuGalDirectedImportPlan(plan, client, { patchChunkSize: args.patchChunkSize });
  await writeFile(outputPath, `${JSON.stringify({ plan, result }, null, 2)}\n`, "utf8");
  return { outputPath, plan, result };
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  runGululuGalDirectedImport(process.argv.slice(2))
    .then(({ outputPath, plan, result }) => {
      console.log(JSON.stringify({
        applied: Boolean(result),
        outputPath,
        stats: plan.stats,
        target: plan.target,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
