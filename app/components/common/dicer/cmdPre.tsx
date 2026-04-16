import type { ChatMessageRequest, ChatMessageResponse, RoleAbility, RoleAvatar, UserRole } from "../../../../api";
import type { RoomContextType } from "@/components/chat/core/roomContext";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router";
import { getNextAppendPosition } from "@/components/chat/shared/messageOrder";
import { initAliasMapOnce, RULES } from "@/components/common/dicer/aliasRegistry";
import { resolveCommandMessageVisibility, type DicerMessageVisibility } from "@/components/common/dicer/commandMessageVisibility";
import executorPublic from "@/components/common/dicer/cmdExe/cmdExePublic";
import { buildDicerReplyContent, selectWeightedCopywritingSuffix } from "@/components/common/dicer/dicerReplyPreparation";
import { syncOptimisticReplyMessageIds } from "@/components/common/dicer/optimisticReplyMessageLink";
import { buildRuntimeRoleValuesByRoleId, mergeRuntimeRoleValuesIntoAbility } from "@/components/common/dicer/runtimeAbilityBridge";
import UTILS from "@/components/common/dicer/utils/utils";
import { buildMessageExtraForRequest } from "@/types/messageDraft";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import {
  useSetRoleAbilityMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "../../../../api/hooks/abilityQueryHooks";
import { useBatchSendMessageMutation, useGetSpaceInfoQuery, useSendMessageMutation, useSetSpaceExtraMutation } from "../../../../api/hooks/chatQueryHooks";
import { useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import { tuanchat } from "../../../../api/instance";

initAliasMapOnce();

interface PendingOptimisticCommandMessage {
  optimisticMessageId: number;
  fallbackPosition: number;
  stableMessageKey: string;
}

interface QueuedDicerMessage {
  content: string;
  visibility: DicerMessageVisibility;
}

const STABLE_MESSAGE_KEY_FIELD = "__tcStableKey";
let stableDiceMessageSeed = 0;
const DICER_DEBUG_PREFIX = "[TC_DICER_FLOW]";
const DICER_AVATAR_CACHE_TTL_MS = 15 * 60_000;
const DICER_COPYWRITING_CACHE_TTL_MS = 15 * 60_000;
const ROLE_ABILITY_CACHE_TTL_MS = 10 * 60_000;

interface ExpiringCacheEntry<T> {
  value: T;
  expireAt: number;
}

const dicerAvatarCache = new Map<number, ExpiringCacheEntry<RoleAvatar[]>>();
const dicerCopywritingCache = new Map<string, ExpiringCacheEntry<Record<string, string[]>>>();
const roleAbilityCache = new Map<string, ExpiringCacheEntry<RoleAbility>>();

function createStableDiceMessageKey(roomId: number, optimisticMessageId: number): string {
  stableDiceMessageSeed += 1;
  return `dicev2:${roomId}:${Date.now()}:${Math.abs(optimisticMessageId)}:${stableDiceMessageSeed}`;
}

function buildDiceMessageExtra(result: string, visibility: DicerMessageVisibility) {
  return buildMessageExtraForRequest(MESSAGE_TYPE.DICE, {
    diceResult: {
      result,
      ...(visibility === "kp_and_sender" ? { hidden: true } : {}),
    },
  });
}

function logDicerFlow(step: string, payload: Record<string, unknown>): void {
  console.warn(DICER_DEBUG_PREFIX, step, payload);
}

function readCacheValue<T>(entry: ExpiringCacheEntry<T> | undefined): T | undefined {
  if (!entry) {
    return undefined;
  }
  if (entry.expireAt <= Date.now()) {
    return undefined;
  }
  return entry.value;
}

function writeCacheValue<T>(value: T, ttlMs: number): ExpiringCacheEntry<T> {
  return {
    value,
    expireAt: Date.now() + ttlMs,
  };
}

function cloneRoleAbility(ability: RoleAbility): RoleAbility {
  try {
    return JSON.parse(JSON.stringify(ability ?? {})) as RoleAbility;
  }
  catch {
    return {
      ...(ability ?? {}),
      act: { ...(ability?.act ?? {}) },
      basic: { ...(ability?.basic ?? {}) },
      ability: { ...(ability?.ability ?? {}) },
      skill: { ...(ability?.skill ?? {}) },
      record: { ...(ability?.record ?? {}) },
      extra: { ...(ability?.extra ?? {}) },
    } as RoleAbility;
  }
}

function buildRoleAbilityCacheKey(ruleId: number, roleId: number): string {
  return `${ruleId}:${roleId}`;
}

function getCachedRoleAbility(ruleId: number, roleId: number): RoleAbility | null {
  const cacheKey = buildRoleAbilityCacheKey(ruleId, roleId);
  const cached = readCacheValue(roleAbilityCache.get(cacheKey));
  if (!cached) {
    return null;
  }
  return cloneRoleAbility(cached);
}

function setCachedRoleAbility(ruleId: number, roleId: number, ability: RoleAbility): void {
  const cacheKey = buildRoleAbilityCacheKey(ruleId, roleId);
  roleAbilityCache.set(cacheKey, writeCacheValue(cloneRoleAbility(ability), ROLE_ABILITY_CACHE_TTL_MS));
}

async function getOrFetchRoleAbility(ruleId: number, roleId: number): Promise<RoleAbility> {
  const cached = getCachedRoleAbility(ruleId, roleId);
  if (cached) {
    return cached;
  }
  const abilityQuery = await tuanchat.abilityController.getByRuleAndRole(ruleId, roleId);
  const ability = (abilityQuery.data || {}) as RoleAbility;
  setCachedRoleAbility(ruleId, roleId, {
    ...ability,
    roleId: ability.roleId ?? roleId,
    ruleId: ability.ruleId ?? ruleId,
  });
  return cloneRoleAbility(ability);
}

async function getCachedDicerAvatars(dicerRoleId: number): Promise<RoleAvatar[]> {
  const cached = readCacheValue(dicerAvatarCache.get(dicerRoleId));
  if (cached) {
    return cached;
  }
  const avatars = (await tuanchat.avatarController.getRoleAvatars(dicerRoleId))?.data ?? [];
  dicerAvatarCache.set(dicerRoleId, writeCacheValue(avatars, DICER_AVATAR_CACHE_TTL_MS));
  return avatars;
}

function normalizeCopywritingMap(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const normalized: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      continue;
    }
    const texts = value
      .map(item => String(item ?? "").trim())
      .filter(Boolean);
    if (texts.length > 0) {
      normalized[key] = texts;
    }
  }
  return normalized;
}

async function getCachedDicerCopywritingMap(ruleId: number, dicerRoleId: number): Promise<Record<string, string[]>> {
  const cacheKey = `${ruleId}:${dicerRoleId}`;
  const cached = readCacheValue(dicerCopywritingCache.get(cacheKey));
  if (cached) {
    return cached;
  }
  const ability = (await tuanchat.abilityController.getByRuleAndRole(ruleId, dicerRoleId))?.data;
  const rawCopywriting = (ability as any)?.extra?.copywriting;
  let parsedRaw: unknown = rawCopywriting;
  if (typeof rawCopywriting === "string") {
    try {
      parsedRaw = JSON.parse(rawCopywriting);
    }
    catch {
      parsedRaw = {};
    }
  }
  const normalized = normalizeCopywritingMap(parsedRaw);
  dicerCopywritingCache.set(cacheKey, writeCacheValue(normalized, DICER_COPYWRITING_CACHE_TTL_MS));
  return normalized;
}

export function isCommand(command: string) {
  const trimmed = command.trim();
  // 仅当以单个前缀符号开头且紧随其后为字母时，才视为指令
  if (!(trimmed.startsWith(".") || trimmed.startsWith("。") || trimmed.startsWith("/"))) {
    return false;
  }
  // 多个符号开头（如 "。。ff"、"..."、"//"）不视为指令
  const secondChar = trimmed.charAt(1);
  if (secondChar === "." || secondChar === "。" || secondChar === "/" || secondChar === "%") {
    return false;
  }
  // 前缀后需以英文字母开始（命令名约定为字母），否则不视为指令
  return /^[.。/][A-Z].*/i.test(trimmed);
}

export function getCommandList(ruleId: number): Map<string, CommandInfo> {
  const cmdList = new Map<string, CommandInfo>();
  const publicCmdList = executorPublic.getCmdList();
  for (const [cmd, info] of publicCmdList) {
    cmdList.set(cmd, info);
  }
  const ruleExecutor = RULES.get(ruleId);
  if (!ruleExecutor) {
    return cmdList;
  }
  const ruleCmdList = ruleExecutor.getCmdList();
  for (const [cmd, info] of ruleCmdList) {
    cmdList.set(cmd, info);
  }
  return cmdList;
}

/**
 * 命令执行器钩子函数
 * @param roleId roleId，会根据ruleId来获取对应角色的abilityֵ
 * @param ruleId 规则ID，会根据ruleId来获取对应角色对应规则下的能力组
 * @param roomContext
 */
export default function useCommandExecutor(roleId: number, ruleId: number, roomContext: RoomContextType) {
  const { spaceId: _, roomId: urlRoomId } = useParams();
  const roomId = Number(urlRoomId);

  const role = useGetRoleQuery(roleId).data?.data;
  const space = useGetSpaceInfoQuery(roomContext.spaceId ?? -1).data?.data;
  // 通过以下的mutation来对后端发送引起数据变动的请求
  const updateAbilityMutation = useUpdateRoleAbilityByRoleIdMutation(); // 更改属性与能力字段
  const setAbilityMutation = useSetRoleAbilityMutation(); // 创建新的能力组
  const sendMessageMutation = useSendMessageMutation(roomId); // 发送消息
  const batchSendMessageMutation = useBatchSendMessageMutation(roomId); // 批量发送消息
  const setSpaceExtraMutation = useSetSpaceExtraMutation(); // 设置空间 extra 字段

  const curRoleId = roomContext.curRoleId; // 当前选中的角色id
  const curAvatarId = roomContext.curAvatarId; // 当前选中的角色的立绘id
  const dicerMessageQueue: QueuedDicerMessage[] = []; // 记录本次指令骰娘的消息队列
  // 为同一轮骰子相关消息预留微小 position 步进，保证“玩家指令 + 骰娘回复”在排序上保持紧邻。
  const DICE_BATCH_POSITION_STEP = 0.0001;
  const optimisticMessageIdRef = useRef(-1);
  const lastPrewarmKeyRef = useRef<string>("");

  useEffect(() => {
    const normalizedSpaceId = Number(roomContext.spaceId ?? 0);
    const normalizedCurRoleId = Number(roomContext.curRoleId ?? 0);
    const normalizedRuleId = Number(ruleId ?? 0);
    if (!(normalizedSpaceId > 0 && normalizedRuleId > 0)) {
      return;
    }
    const prewarmKey = `${normalizedSpaceId}:${normalizedCurRoleId}:${normalizedRuleId}`;
    if (lastPrewarmKeyRef.current === prewarmKey) {
      return;
    }
    lastPrewarmKeyRef.current = prewarmKey;

    let cancelled = false;
    void (async () => {
      try {
        const dicerRoleId = await UTILS.getDicerRoleId({
          spaceId: normalizedSpaceId,
          curRoleId: normalizedCurRoleId,
        } as RoomContextType, {
          spaceSnapshot: space ?? null,
          currentRoleSnapshot: role ?? null,
        });
        if (cancelled) {
          return;
        }
        await Promise.all([
          getCachedDicerAvatars(dicerRoleId),
          getCachedDicerCopywritingMap(normalizedRuleId, dicerRoleId),
        ]);
      }
      catch (error) {
        console.error("预热骰娘缓存失败:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    roomContext.spaceId,
    roomContext.curRoleId,
    ruleId,
    role,
    space,
  ]);

  const getNextOptimisticPosition = () => {
    return getNextAppendPosition(roomContext.chatHistory?.messages ?? []);
  };

  const createOptimisticCommandMessage = (request: ChatMessageRequest): PendingOptimisticCommandMessage | null => {
    const chatHistory = roomContext.chatHistory;
    if (!chatHistory) {
      return null;
    }
    const optimisticMessageId = optimisticMessageIdRef.current;
    optimisticMessageIdRef.current -= 1;
    const nowIso = new Date().toISOString();
    const fallbackPosition = typeof request.position === "number" && Number.isFinite(request.position)
      ? request.position
      : getNextOptimisticPosition();
    const curMemberUserId = Number(roomContext.curMember?.userId);
    const roleUserId = Number(role?.userId);
    const userId = Number.isFinite(curMemberUserId) && curMemberUserId > 0
      ? curMemberUserId
      : (Number.isFinite(roleUserId) && roleUserId > 0 ? roleUserId : 0);

    const stableMessageKey = createStableDiceMessageKey(request.roomId, optimisticMessageId);
    const optimisticMessage = {
      messageId: optimisticMessageId,
      syncId: optimisticMessageId,
      roomId: request.roomId,
      userId,
      roleId: request.roleId,
      content: request.content ?? "",
      customRoleName: request.customRoleName,
      annotations: request.annotations,
      avatarId: request.avatarId,
      webgal: request.webgal,
      replyMessageId: request.replayMessageId,
      status: 0,
      messageType: request.messageType,
      threadId: request.threadId,
      position: fallbackPosition,
      extra: request.extra as any,
      createTime: nowIso,
      updateTime: nowIso,
      [STABLE_MESSAGE_KEY_FIELD]: stableMessageKey,
    } as ChatMessageResponse["message"];

    logDicerFlow("createOptimisticCommandMessage", {
      roomId: request.roomId,
      optimisticMessageId,
      fallbackPosition,
      stableMessageKey,
      messageType: request.messageType,
      replayMessageId: request.replayMessageId ?? null,
      contentPreview: String(request.content ?? "").slice(0, 120),
    });

    void chatHistory.addOrUpdateMessage({
      message: optimisticMessage,
    });

    return {
      optimisticMessageId,
      fallbackPosition,
      stableMessageKey,
    };
  };

  const discardOptimisticCommandMessage = async (pending: PendingOptimisticCommandMessage | null) => {
    if (!pending) {
      return;
    }
    const chatHistory = roomContext.chatHistory;
    if (!chatHistory) {
      return;
    }
    await chatHistory.removeMessageById(pending.optimisticMessageId);
  };

  const commitOptimisticCommandMessage = async (
    pending: PendingOptimisticCommandMessage | null,
    createdMessage: ChatMessageResponse["message"] | undefined,
    preferredPosition?: number | null,
  ) => {
    if (!pending || !createdMessage || !roomContext.chatHistory) {
      return;
    }
    const hasPreferredPosition = typeof preferredPosition === "number" && Number.isFinite(preferredPosition);
    const existingPersistedMessagePosition = (() => {
      const persistedMessage = roomContext.chatHistory?.messages.find(
        item => item?.message?.messageId === createdMessage.messageId,
      )?.message;
      const persistedPosition = persistedMessage?.position;
      return typeof persistedPosition === "number" && Number.isFinite(persistedPosition)
        ? persistedPosition
        : undefined;
    })();
    const normalizedMessage = {
      ...createdMessage,
      position: hasPreferredPosition
        ? preferredPosition
        : (typeof createdMessage.position === "number" && Number.isFinite(createdMessage.position)
            ? createdMessage.position
            : (existingPersistedMessagePosition ?? pending.fallbackPosition)),
      [STABLE_MESSAGE_KEY_FIELD]: pending.stableMessageKey,
    } as ChatMessageResponse["message"];
    logDicerFlow("commitOptimisticCommandMessage", {
      fromOptimisticMessageId: pending.optimisticMessageId,
      toMessageId: normalizedMessage.messageId,
      preferredPosition: preferredPosition ?? null,
      finalPosition: normalizedMessage.position ?? null,
      stableMessageKey: pending.stableMessageKey,
      replayMessageId: normalizedMessage.replyMessageId ?? null,
    });
    await roomContext.chatHistory.replaceMessageById(
      pending.optimisticMessageId,
      { message: normalizedMessage },
    );
  };

  const sendCommandMessageWithOptimistic = async (
    request: ChatMessageRequest,
    pending: PendingOptimisticCommandMessage | null,
  ): Promise<{ commandMessageId?: number; commandPosition: number | null }> => {
    const commandMsgRes = await sendMessageMutation.mutateAsync(request);
    const commandMessage = commandMsgRes.data;
    if (!commandMsgRes.success || !commandMessage) {
      throw new Error("发送骰子指令消息失败");
    }

    const requestPositionRaw = request.position;
    const requestPosition = typeof requestPositionRaw === "number" && Number.isFinite(requestPositionRaw)
      ? requestPositionRaw
      : null;
    const commandPositionRaw = commandMessage.position;
    const commandPosition = (
      typeof commandPositionRaw === "number" && Number.isFinite(commandPositionRaw)
        ? commandPositionRaw
        : (requestPosition ?? null)
    ) ?? (pending?.fallbackPosition ?? null);
    logDicerFlow("sendCommandMessageWithOptimistic.result", {
      commandMessageId: commandMessage.messageId,
      requestPosition,
      responsePosition: commandPositionRaw ?? null,
      resolvedPosition: commandPosition,
      pendingOptimisticMessageId: pending?.optimisticMessageId ?? null,
    });

    await commitOptimisticCommandMessage(
      pending,
      {
        ...commandMessage,
        position: commandPosition ?? pending?.fallbackPosition ?? commandMessage.position,
      },
      commandPosition,
    );

    return {
      commandMessageId: commandMessage.messageId,
      commandPosition,
    };
  };

  const sendDiceMessageBatch = async (
    commandMessageMeta: { commandMessageId?: number; commandPosition: number | null },
    dicerRequests: ChatMessageRequest[],
    existingPendingBatchMessages?: Array<PendingOptimisticCommandMessage | null>,
  ): Promise<void> => {
    const { commandMessageId, commandPosition } = commandMessageMeta;
    const nextBatchRequests = dicerRequests.map((request, index) => {
      const pendingPosition = existingPendingBatchMessages?.[index]?.fallbackPosition;
      const currentReplyMessageId = request.replayMessageId;
      const shouldReplaceReplyMessageId = typeof commandMessageId === "number"
        && Number.isFinite(commandMessageId)
        && (currentReplyMessageId == null || currentReplyMessageId <= 0);
      return {
        ...request,
        ...(shouldReplaceReplyMessageId ? { replayMessageId: commandMessageId } : {}),
        ...((typeof pendingPosition === "number" && Number.isFinite(pendingPosition))
          ? { position: pendingPosition }
          : (commandPosition !== null
              ? { position: commandPosition + ((index + 1) * DICE_BATCH_POSITION_STEP) }
              : {})),
      };
    });
    logDicerFlow("sendDiceMessageBatch.prepare", {
      commandMessageId: commandMessageId ?? null,
      commandPosition: commandPosition ?? null,
      requestCount: nextBatchRequests.length,
      requestMeta: nextBatchRequests.map((item, index) => ({
        index,
        replayMessageId: item.replayMessageId ?? null,
        position: item.position ?? null,
        contentPreview: String(item.content ?? "").slice(0, 80),
      })),
    });

    if (nextBatchRequests.length > 0) {
      const pendingBatchMessages = existingPendingBatchMessages ?? nextBatchRequests.map(request => createOptimisticCommandMessage(request));
      try {
        const batchResult = await batchSendMessageMutation.mutateAsync(nextBatchRequests);
        if (!batchResult?.success) {
          throw new Error("批量发送骰娘消息失败");
        }

        const createdMessages = Array.isArray(batchResult.data) ? batchResult.data : [];
        logDicerFlow("sendDiceMessageBatch.result", {
          createdCount: createdMessages.length,
          pendingCount: pendingBatchMessages.length,
          createdMessageIds: createdMessages.map(item => item?.messageId ?? null),
          createdReplyIds: createdMessages.map(item => item?.replyMessageId ?? null),
          createdPositions: createdMessages.map(item => item?.position ?? null),
        });
        const commitTasks: Promise<void>[] = [];
        const rollbackTasks: Promise<void>[] = [];
        for (let index = 0; index < pendingBatchMessages.length; index++) {
          const pendingMessage = pendingBatchMessages[index];
          const createdMessage = createdMessages[index];
          if (!pendingMessage) {
            continue;
          }
          if (createdMessage) {
            commitTasks.push(commitOptimisticCommandMessage(
              pendingMessage,
              createdMessage,
            ));
          }
          else {
            rollbackTasks.push(discardOptimisticCommandMessage(pendingMessage));
          }
        }
        if (commitTasks.length > 0) {
          await Promise.all(commitTasks);
        }
        if (rollbackTasks.length > 0) {
          await Promise.all(rollbackTasks);
        }
      }
      catch (error) {
        await Promise.all(pendingBatchMessages.map(pending => discardOptimisticCommandMessage(pending)));
        throw error;
      }
    }
  };

  /**
   * 返回这个函数
   * @param executorProp
   */
  async function execute(executorProp: ExecutorProp): Promise<void> {
    const command = executorProp.command;
    logDicerFlow("execute.start", {
      roomId,
      command,
      threadId: executorProp.threadId ?? null,
      replyMessageId: executorProp.replyMessageId ?? null,
    });
    const originDiceContent = (executorProp.originMessage ?? executorProp.command ?? "").trim();
    const commandAnchorPosition = getNextOptimisticPosition();
    let pendingOptimisticCommandMessage: PendingOptimisticCommandMessage | null = null;
    const pendingOptimisticDicerMessages: Array<PendingOptimisticCommandMessage | null> = [];
    let pendingOptimisticDicerMessagesHandled = false;
    let commandMessageCommitted = false;

    try {
      let copywritingKey: string | null = null;
      // 提前解析骰娘角色，和指令执行并行，减少后续等待。
      const dicerRoleIdPromise = UTILS.getDicerRoleId(roomContext, {
        spaceSnapshot: space ?? null,
        currentRoleSnapshot: role ?? null,
      });
      const [cmdPart, ...args] = parseCommand(command);
      const operator: UserRole = {
        userId: role?.userId ?? -1,
        roleId: role?.roleId ?? -1,
        roleName: role?.roleName ?? "",
        description: role?.description ?? "",
        avatarId: role?.avatarId ?? -1,
        state: 0,
        type: 0,
        createTime: "",
      };
      const mentioned: UserRole[] = [...(executorProp.mentionedRoles || [])];
      if ((operator.roleId ?? -1) > 0) {
        mentioned.push(operator);
      }
      // 获取角色的能力列表
      const getRoleAbility = async (roleId: number): Promise<RoleAbility> => {
        try {
          return await getOrFetchRoleAbility(ruleId, roleId);
        }
        catch (e) {
          console.error(`获取角色能力失败：${e instanceof Error ? e.message : String(e)},roleId:${roleId},ruleId:${ruleId}`);
          return {};
        }
      };
      // 获取所有可能用到的角色能力（并行请求，减少指令等待）
      const mentionedRoles = new Map<number, RoleAbility>();
      const mentionedRoleEntries = await Promise.all(
        mentioned
          .filter(mentionedRole => mentionedRole.roleId > 0)
          .map(async mentionedRole => [mentionedRole.roleId, await getRoleAbility(mentionedRole.roleId)] as const),
      );
      for (const [mentionedRoleId, ability] of mentionedRoleEntries) {
        mentionedRoles.set(mentionedRoleId, ability);
      }
      const runtimeRoleValuesByRoleId = buildRuntimeRoleValuesByRoleId(
        roomContext.chatHistory?.messages,
        Object.fromEntries(mentionedRoleEntries),
      );

      // 初始化 Space dicerData 缓存
      let spaceExtra: Record<string, any> = {};
      try {
        spaceExtra = JSON.parse(space?.extra || "{}");
      }
      catch (e) {
        console.error("解析 space.extra 失败，使用空对象", e);
        spaceExtra = {};
      }

      const dicerDataStr = spaceExtra.dicerData || "{}";
      let spaceDicerData: Record<string, string> = {};
      try {
        spaceDicerData = typeof dicerDataStr === "string" ? JSON.parse(dicerDataStr) : dicerDataStr;
      }
      catch (e) {
        console.error("解析 dicerData 失败，使用空对象", e);
        spaceDicerData = {};
      }
      let spaceDicerDataModified = false;
      // 定义cpi接口
      const replyMessage: CPI["replyMessage"] = (message, options) => {
        dicerMessageQueue.push({
          content: message,
          visibility: options?.visibility === "kp_and_sender" ? "kp_and_sender" : "public",
        });
      };

      const sendToast = (message: string) => {
        toast(message);
      };

      // 设置文案键，用于从骰娘 extra.copywriting 中随机抽取文案
      const setCopywritingKey = (key: string | null) => {
        copywritingKey = key?.trim() || null;
      };

      const getRoleAbilityList = (roleId: number): RoleAbility => {
        const ability = mergeRuntimeRoleValuesIntoAbility(
          mentionedRoles.get(roleId),
          runtimeRoleValuesByRoleId[roleId],
        );
        ability.roleId = ability.roleId ?? roleId;
        ability.ruleId = ability.ruleId ?? ruleId;
        return ability;
      };

      const setRoleAbilityList = (roleId: number, ability: RoleAbility) => {
        ability.roleId = ability.roleId ?? roleId;
        ability.ruleId = ability.ruleId ?? ruleId;
        mentionedRoles.set(roleId, ability);
      };

      const getSpaceInfo = () => {
        return space;
      };

      const getSpaceData = (key: string): string | undefined => {
        return spaceDicerData[key];
      };

      const setSpaceData = (key: string, value: string | null) => {
        if (value === null) {
          delete spaceDicerData[key];
        }
        else {
          spaceDicerData[key] = value;
        }
        spaceDicerDataModified = true;
      };

      const CmdPreInterface = {
        replyMessage,
        sendToast,
        getRoleAbilityList,
        setRoleAbilityList,
        setCopywritingKey,
        getSpaceInfo,
        getSpaceData,
        setSpaceData,
      };

      // 执行命令，如果规则执行器存在则先尝试规则执行器，失败则回退到公共执行器
      const executeWithFallback = async () => {
        const ruleExecutor = RULES.get(ruleId);
        // 如果规则执行器存在且包含该命令：只走规则执行器，避免真实错误被“回退后无此命令”掩盖
        if (ruleExecutor?.getCmd(cmdPart)) {
          try {
            await ruleExecutor.execute(cmdPart, args, mentioned, CmdPreInterface);
          }
          catch (err) {
            sendToast(`执行错误：${err instanceof Error ? err.message : String(err)}`);
          }
          return;
        }

        // 规则执行器不存在该命令时，回退到通用指令集
        try {
          await executorPublic.execute(cmdPart, args, mentioned, CmdPreInterface);
        }
        catch (err) {
          sendToast(`执行错误：${err instanceof Error ? err.message : String(err)}`);
        }
      };

      await executeWithFallback();
      logDicerFlow("execute.afterCommand", {
        command,
        dicerMessageCount: dicerMessageQueue.length,
        dicerMessagePreview: dicerMessageQueue.map(item => item.content.slice(0, 80)),
      });
      // 遍历mentionedRoles，更新或创建角色能力
      for (const [id, ability] of mentionedRoles) {
        if (id <= 0) {
          continue;
        }
        // 构造请求payload时，确保所有字段为非null对象，避免后端校验失败
        const payload = {
          roleId: id,
          ruleId,
          act: ability?.act ?? {},
          basic: ability?.basic ?? {},
          ability: ability?.ability ?? {},
          skill: ability?.skill ?? {},
          record: ability?.record ?? {},
          extra: ability?.extra ?? {},
        };

        // 如果后端返回了 abilityId，说明已存在记录，调用更新接口；否则调用创建接口
        if (ability && (ability.abilityId ?? 0) > 0) {
          updateAbilityMutation.mutate(payload);
        }
        else {
          setAbilityMutation.mutate(payload);
        }
        setCachedRoleAbility(ruleId, id, {
          ...ability,
          ...payload,
          roleId: id,
          ruleId,
        } as RoleAbility);
      }
      // 更新 Space dicerData（如果被修改）
      if (spaceDicerDataModified && space && space.spaceId) {
        setSpaceExtraMutation.mutate({
          spaceId: space.spaceId,
          key: "dicerData",
          value: JSON.stringify(spaceDicerData),
        });
      }
      // 发送消息队列
      if (dicerMessageQueue.length > 0) {
        const commandMessageVisibility = resolveCommandMessageVisibility(
          dicerMessageQueue.map(item => item.visibility),
        );
        const commandDiceRequest: ChatMessageRequest = {
          roomId,
          messageType: MESSAGE_TYPE.DICE,
          content: originDiceContent,
          roleId: curRoleId,
          avatarId: curAvatarId,
          threadId: executorProp.threadId,
          replayMessageId: executorProp.replyMessageId,
          position: commandAnchorPosition,
          extra: buildDiceMessageExtra(originDiceContent, commandMessageVisibility),
        };
        pendingOptimisticCommandMessage = originDiceContent
          ? createOptimisticCommandMessage(commandDiceRequest)
          : null;
        const fallbackCommandPosition = pendingOptimisticCommandMessage?.fallbackPosition ?? commandAnchorPosition;
        const optimisticReplyMessageId = pendingOptimisticCommandMessage?.optimisticMessageId;
        const commandMessageMetaPromise = sendCommandMessageWithOptimistic(commandDiceRequest, pendingOptimisticCommandMessage);
        // 先准备最终骰娘文案，再创建乐观消息，避免“先发结果、后补风味文案”的二次跳变。
        const dicerRoleId = await dicerRoleIdPromise;
        const avatarsPromise = getCachedDicerAvatars(dicerRoleId)
          .catch((error) => {
            console.error("获取骰娘头像失败:", error);
            return [] as RoleAvatar[];
          });
        const copywritingMapPromise = copywritingKey
          ? getCachedDicerCopywritingMap(ruleId, dicerRoleId)
              .catch((error) => {
                console.error("获取骰娘文案失败:", error);
                return {} as Record<string, string[]>;
              })
          : Promise.resolve({} as Record<string, string[]>);
        const [avatars, copywritingMap] = await Promise.all([avatarsPromise, copywritingMapPromise]);
        const copywritingSuffix = selectWeightedCopywritingSuffix(copywritingKey, copywritingMap);

        // 从所有消息中提取标签（格式：#标签#）
        const allMessages = [
          dicerMessageQueue.map(item => item.content).join(" "),
          copywritingSuffix,
        ]
          .filter(Boolean)
          .join(" ");
        const tagMatches = allMessages.match(/#([^#]+)#/g);
        let lastTag: string | null = null;
        if (tagMatches && tagMatches.length > 0) {
          // 取最后一个标签，去除 # 符号
          const lastMatch = tagMatches[tagMatches.length - 1];
          lastTag = lastMatch.replace(/#/g, "").trim();
        }

        // 根据标签选择头像
        let matchedAvatar: RoleAvatar | null = null;
        if (lastTag) {
          const matches = avatars.filter(a => (a.avatarTitle?.label || "") === lastTag);
          if (matches.length > 1) {
            // 随机选择一个重复标签的头像
            const idx = Math.floor(Math.random() * matches.length);
            matchedAvatar = matches[idx] || null;
          }
          else {
            matchedAvatar = matches[0] || null;
          }
        }
        // 当没有标签或未匹配时，优先使用 label 为"默认"的头像，其次使用第一个头像
        const fallbackDefaultLabelAvatar = avatars.find(a => (a.avatarTitle?.label || "") === "默认") || null;
        const chosenAvatarId = (matchedAvatar?.avatarId)
          ?? (fallbackDefaultLabelAvatar?.avatarId)
          ?? (avatars[0]?.avatarId ?? 0);

        const dicerMessageBaseRequest: ChatMessageRequest = {
          roomId,
          messageType: MESSAGE_TYPE.DICE,
          roleId: dicerRoleId,
          avatarId: chosenAvatarId,
          threadId: executorProp.threadId,
          replayMessageId: optimisticReplyMessageId,
          content: "",
          extra: {},
        };
        const dicerBatchRequests: ChatMessageRequest[] = [];
        for (let index = 0; index < dicerMessageQueue.length; index++) {
          const queuedMessage = dicerMessageQueue[index];
          const nextContent = buildDicerReplyContent(queuedMessage?.content ?? "", copywritingSuffix);
          pendingOptimisticDicerMessages.push(createOptimisticCommandMessage({
            ...dicerMessageBaseRequest,
            content: nextContent,
            extra: buildDiceMessageExtra(nextContent, queuedMessage?.visibility ?? "public"),
            position: fallbackCommandPosition + ((index + 1) * DICE_BATCH_POSITION_STEP),
          }));
        }
        const commandMessageMeta = await commandMessageMetaPromise;
        commandMessageCommitted = true;
        const resolvedOptimisticReplyMessageId = typeof optimisticReplyMessageId === "number"
          ? optimisticReplyMessageId
          : null;
        const resolvedCommandMessageId = typeof commandMessageMeta.commandMessageId === "number"
          ? commandMessageMeta.commandMessageId
          : null;
        if (resolvedOptimisticReplyMessageId !== null && resolvedCommandMessageId !== null) {
          // 指令乐观消息提交后，立即把骰娘乐观回复改指向真实消息，避免 reply preview 在临时/真实 ID 之间抖动。
          await syncOptimisticReplyMessageIds({
            chatHistory: roomContext.chatHistory,
            pendingMessages: pendingOptimisticDicerMessages,
            fromReplyMessageId: resolvedOptimisticReplyMessageId,
            toReplyMessageId: resolvedCommandMessageId,
          });
        }
        for (let index = 0; index < dicerMessageQueue.length; index++) {
          const queuedMessage = dicerMessageQueue[index];
          const nextContent = buildDicerReplyContent(queuedMessage?.content ?? "", copywritingSuffix);
          dicerBatchRequests.push({
            ...dicerMessageBaseRequest,
            content: nextContent,
            extra: buildDiceMessageExtra(nextContent, queuedMessage?.visibility ?? "public"),
          });
        }
        pendingOptimisticDicerMessagesHandled = true;
        await sendDiceMessageBatch(commandMessageMeta, dicerBatchRequests, pendingOptimisticDicerMessages);
      }
      else {
        await discardOptimisticCommandMessage(pendingOptimisticCommandMessage);
      }
    }
    catch (error) {
      if (!pendingOptimisticDicerMessagesHandled && pendingOptimisticDicerMessages.length > 0) {
        await Promise.all(pendingOptimisticDicerMessages.map(pending => discardOptimisticCommandMessage(pending)));
      }
      if (!commandMessageCommitted) {
        await discardOptimisticCommandMessage(pendingOptimisticCommandMessage);
      }
      console.error("执行骰子指令失败", error);
      toast.error(`执行错误：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   *解析骰子表达式
   * @const
   */
  function parseCommand(input: string): [string, ...string[]] {
    const trimmed = input.trim().slice(1);
    // 匹配所有的英文字符，取第一个为命令
    const cmdMatch = trimmed.match(/^([A-Z]+)/i);
    const cmdPart = cmdMatch?.[0] ?? "";
    const args = trimmed.slice(cmdPart.length).trim().split(/\s+/).filter(arg => arg !== "");
    return [cmdPart.toLowerCase(), ...args];
  }

  return execute;
}
