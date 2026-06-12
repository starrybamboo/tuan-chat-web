import type { QueryClient } from "@tanstack/react-query";

import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { DicerMessageVisibility } from "@/components/common/dicer/commandMessageVisibility";
import type { StateEventAtom } from "@/types/stateEvent";

import { getNextAppendPosition } from "@/components/chat/shared/messageOrder";
import { persistRoleAbilitySnapshot } from "@/components/chat/state/roleVarWriteThrough";
import { initAliasMapOnce, RULES } from "@/components/common/dicer/aliasRegistry";
import executorPublic from "@/components/common/dicer/cmdExe/cmdExePublic";
import { buildDicerReplyContent, selectWeightedCopywritingSuffix } from "@/components/common/dicer/dicerReplyPreparation";
import { buildDiceTurnMessageExtra } from "@/components/common/dicer/diceTurnMessageExtra";
import {
  buildRoleAbilityStateEventsFromDiff,
  buildRuntimeStateValues,
  cloneRoleAbility,
  mergeRuntimeRoleValuesIntoAbility,
} from "@/components/common/dicer/runtimeAbilityBridge";
import { buildRoleScopedStateDiceReply } from "@/components/common/dicer/stateDiceFeedback";
import UTILS from "@/components/common/dicer/utils/utils";
import { buildCommandStateEventExtra, formatStateEventAtomDetail, toApiMessageExtraWithStateEvent } from "@/types/stateEvent";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { ChatMessageRequest, ChatMessageResponse, RoleAbility, RoleAvatar, UserRole } from "../../../../api";

import { invalidateRoleAbilityCaches, roleAbilityByRuleQueryKey } from "../../../../api/hooks/abilityMutationInvalidation";
import {
  fetchRoleAbilityByRuleWithCache,
  setRoleAbilityWithSuccessGuard,
  updateRoleAbilityByRuleWithSuccessGuard,
} from "../../../../api/hooks/abilityQueryHooks";
import { useGetSpaceInfoQuery, useSendMessageMutation, useSetSpaceExtraMutation } from "../../../../api/hooks/chatQueryHooks";
import { fetchRoleAvatarsWithCache, useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

initAliasMapOnce();

type PendingOptimisticCommandMessage = {
  optimisticMessageId: number;
  fallbackPosition: number;
  stableMessageKey: string;
}

type QueuedDicerMessage = {
  content: string;
  visibility: DicerMessageVisibility;
}

const STABLE_MESSAGE_KEY_FIELD = "__tcStableKey";
let stableDiceMessageSeed = 0;
const DICER_DEBUG_PREFIX = "[TC_DICER_FLOW]";

function createStableDiceMessageKey(roomId: number, optimisticMessageId: number): string {
  stableDiceMessageSeed += 1;
  return `dicev2:${roomId}:${Date.now()}:${Math.abs(optimisticMessageId)}:${stableDiceMessageSeed}`;
}

function buildStateEventMessageContent(events: StateEventAtom[]): string {
  const details = events.map(event => formatStateEventAtomDetail(event));
  return details.length > 0 ? `状态更新：${details.join("；")}` : "状态更新";
}

function logDicerFlow(step: string, payload: Record<string, unknown>): void {
  console.warn(DICER_DEBUG_PREFIX, step, payload);
}

async function getOrFetchRoleAbility(queryClient: QueryClient, ruleId: number, roleId: number): Promise<RoleAbility> {
  const cached = queryClient.getQueryData<RoleAbility | null>(roleAbilityByRuleQueryKey(roleId, ruleId));
  const ability = (cached ?? await fetchRoleAbilityByRuleWithCache(queryClient, roleId, ruleId) ?? {}) as RoleAbility;
  return cloneRoleAbility({
    ...ability,
    roleId: ability.roleId ?? roleId,
    ruleId: ability.ruleId ?? ruleId,
  });
}

async function getDicerAvatars(queryClient: QueryClient, dicerRoleId: number): Promise<RoleAvatar[]> {
  const avatars = (await fetchRoleAvatarsWithCache(queryClient, dicerRoleId))?.data ?? [];
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

async function getDicerCopywritingMap(queryClient: QueryClient, ruleId: number, dicerRoleId: number): Promise<Record<string, string[]>> {
  const ability = await fetchRoleAbilityByRuleWithCache(queryClient, dicerRoleId, ruleId);
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
  return normalizeCopywritingMap(parsedRaw);
}

export { isCommand } from "@tuanchat/domain/command-request";

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
  const { spaceId: _, roomId: urlRoomId } = useParams({ strict: false });
  const roomId = Number(urlRoomId);
  const queryClient = useQueryClient();

  const role = useGetRoleQuery(roleId).data?.data;
  const space = useGetSpaceInfoQuery(roomContext.spaceId ?? -1).data?.data;
  // 通过以下的mutation来对后端发送引起数据变动的请求
  const sendMessageMutation = useSendMessageMutation(roomId); // 发送消息
  const setSpaceExtraMutation = useSetSpaceExtraMutation(); // 设置空间 extra 字段

  const curRoleId = roomContext.curRoleId; // 当前选中的角色id
  const curAvatarId = roomContext.curAvatarId; // 当前选中的角色的立绘id
  const dicerMessageQueue: QueuedDicerMessage[] = []; // 记录本次指令骰娘的消息队列
  // 为同一轮骰子后的状态事件预留微小 position 步进，保证它紧跟在本轮掷骰之后。
  const DICE_FOLLOWUP_POSITION_STEP = 0.0001;
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
          queryClient,
        });
        if (cancelled) {
          return;
        }
        await Promise.all([
          getDicerAvatars(queryClient, dicerRoleId),
          getDicerCopywritingMap(queryClient, normalizedRuleId, dicerRoleId),
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
    queryClient,
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

  const sendStateEventMessageWithOptimistic = async (request: ChatMessageRequest): Promise<void> => {
    const pending = createOptimisticCommandMessage(request);
    try {
      const stateEventMsgRes = await sendMessageMutation.mutateAsync(request);
      const stateEventMessage = stateEventMsgRes.data;
      if (!stateEventMsgRes.success || !stateEventMessage) {
        throw new Error("发送状态事件消息失败");
      }
      const preferredPosition = typeof request.position === "number" && Number.isFinite(request.position)
        ? request.position
        : null;
      await commitOptimisticCommandMessage(pending, stateEventMessage, preferredPosition);
    }
    catch (error) {
      await discardOptimisticCommandMessage(pending);
      throw error;
    }
  };

  /**
   * 返回这个函数
   * @param executorProp
   */
  async function execute(executorProp: ExecutorProp): Promise<boolean> {
    const command = executorProp.command;
    logDicerFlow("execute.start", {
      roomId,
      command,
      replyMessageId: executorProp.replyMessageId ?? null,
    });
    const originDiceContent = (executorProp.originMessage ?? executorProp.command ?? "").trim();
    const commandAnchorPosition = getNextOptimisticPosition();
    let pendingOptimisticCommandMessage: PendingOptimisticCommandMessage | null = null;
    let commandMessageCommitted = false;

    try {
      let copywritingKey: string | null = null;
      // 提前解析骰娘角色，和指令执行并行，减少后续等待。
      const dicerRoleIdPromise = UTILS.getDicerRoleId(roomContext, {
        spaceSnapshot: space ?? null,
        currentRoleSnapshot: role ?? null,
        queryClient,
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
          return await getOrFetchRoleAbility(queryClient, ruleId, roleId);
        }
        catch (e) {
          console.error(`获取角色能力失败：${e instanceof Error ? e.message : String(e)},roleId:${roleId},ruleId:${ruleId}`);
          return {};
        }
      };
      // 获取所有可能用到的角色能力（并行请求，减少指令等待）
      const baseRoleAbilities = new Map<number, RoleAbility>();
      const mentionedRoleEntries = await Promise.all(
        mentioned
          .filter(mentionedRole => mentionedRole.roleId > 0)
          .map(async mentionedRole => [mentionedRole.roleId, await getRoleAbility(mentionedRole.roleId)] as const),
      );
      for (const [mentionedRoleId, ability] of mentionedRoleEntries) {
        baseRoleAbilities.set(mentionedRoleId, ability);
      }
      const runtimeStateValues = buildRuntimeStateValues(
        roomContext.chatHistory?.messages,
        Object.fromEntries(mentionedRoleEntries),
      );
      const runtimeRoomValues = runtimeStateValues.room;
      const roleAbilitySnapshotsBeforeCommand = new Map<number, RoleAbility>();
      const commandRoleAbilities = new Map<number, RoleAbility>();
      const mutatedRoleIds = new Set<number>();

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

      const buildCurrentRoleAbility = (roleId: number): RoleAbility => {
        // 房间级状态变量作为共享兜底注入，避免覆盖角色卡自身字段。
        const ability = mergeRuntimeRoleValuesIntoAbility(
          baseRoleAbilities.get(roleId),
          runtimeRoomValues,
          { overrideExisting: false },
        );
        ability.roleId = ability.roleId ?? roleId;
        ability.ruleId = ability.ruleId ?? ruleId;
        return ability;
      };

      const getRoleAbilityList = (roleId: number): RoleAbility => {
        const ability = commandRoleAbilities.has(roleId)
          ? cloneRoleAbility(commandRoleAbilities.get(roleId))
          : buildCurrentRoleAbility(roleId);
        if (!roleAbilitySnapshotsBeforeCommand.has(roleId)) {
          roleAbilitySnapshotsBeforeCommand.set(roleId, cloneRoleAbility(ability));
        }
        ability.roleId = ability.roleId ?? roleId;
        ability.ruleId = ability.ruleId ?? ruleId;
        return ability;
      };

      const setRoleAbilityList = (roleId: number, ability: RoleAbility) => {
        if (!roleAbilitySnapshotsBeforeCommand.has(roleId)) {
          roleAbilitySnapshotsBeforeCommand.set(roleId, buildCurrentRoleAbility(roleId));
        }
        const nextAbility = cloneRoleAbility(ability);
        nextAbility.roleId = nextAbility.roleId ?? roleId;
        nextAbility.ruleId = nextAbility.ruleId ?? ruleId;
        commandRoleAbilities.set(roleId, nextAbility);
        mutatedRoleIds.add(roleId);
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
        queryClient,
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
      const stateEventAtoms: StateEventAtom[] = [];
      for (const id of mutatedRoleIds) {
        const afterAbility = commandRoleAbilities.get(id);
        if (!afterAbility) {
          continue;
        }
        stateEventAtoms.push(...buildRoleAbilityStateEventsFromDiff(
          id,
          roleAbilitySnapshotsBeforeCommand.get(id) ?? buildCurrentRoleAbility(id),
          afterAbility,
        ));
      }
      for (const id of mutatedRoleIds) {
        const afterAbility = commandRoleAbilities.get(id);
        if (!afterAbility) {
          continue;
        }
        const changed = await persistRoleAbilitySnapshot({
          roleId: id,
          ruleId,
          beforeAbility: roleAbilitySnapshotsBeforeCommand.get(id) ?? buildCurrentRoleAbility(id),
          afterAbility,
          loadRoleAbility: roleId => getOrFetchRoleAbility(queryClient, ruleId, roleId),
          createRoleAbility: setRoleAbilityWithSuccessGuard,
          updateRoleAbility: updateRoleAbilityByRuleWithSuccessGuard,
        });
        if (changed) {
          await invalidateRoleAbilityCaches(queryClient, { roleId: id, ruleId });
        }
      }
      // 更新 Space dicerData（如果被修改）
      if (spaceDicerDataModified && space && space.spaceId) {
        const result = await setSpaceExtraMutation.mutateAsync({
          spaceId: space.spaceId,
          key: "dicerData",
          value: JSON.stringify(spaceDicerData),
        });
        if (!result?.success) {
          throw new Error(result?.errMsg || "保存房间骰子设置失败");
        }
      }

      if (dicerMessageQueue.length === 0) {
        const stateDiceReply = buildRoleScopedStateDiceReply(stateEventAtoms);
        if (stateDiceReply) {
          dicerMessageQueue.push({
            content: stateDiceReply,
            visibility: "public",
          });
        }
      }

      let stateEventMessageCommitted = false;
      const sendGeneratedStateEvent = async (options?: {
        position?: number;
      }): Promise<void> => {
        if (stateEventAtoms.length === 0) {
          return;
        }
        const stateEventRequest: ChatMessageRequest = {
          roomId,
          messageType: MESSAGE_TYPE.STATE_EVENT,
          content: buildStateEventMessageContent(stateEventAtoms),
          roleId: curRoleId,
          avatarId: curAvatarId,
          position: options?.position,
          extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra(cmdPart, stateEventAtoms)),
        };
        await sendStateEventMessageWithOptimistic(stateEventRequest);
        stateEventMessageCommitted = true;
      };

      // 发送消息队列
      if (dicerMessageQueue.length > 0) {
        // 先准备最终骰娘文案，再创建乐观消息，避免“先发结果、后补风味文案”的二次跳变。
        const dicerRoleId = await dicerRoleIdPromise;
        const avatarsPromise = getDicerAvatars(queryClient, dicerRoleId)
          .catch((error) => {
            console.error("获取骰娘头像失败:", error);
            return [] as RoleAvatar[];
          });
        const copywritingMapPromise = copywritingKey
          ? getDicerCopywritingMap(queryClient, ruleId, dicerRoleId)
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

        const dicerReplies = dicerMessageQueue.map(queuedMessage => ({
          content: buildDicerReplyContent(queuedMessage.content, copywritingSuffix),
          visibility: queuedMessage.visibility,
          roleId: dicerRoleId,
          avatarId: chosenAvatarId,
        }));
        const commandDiceRequest: ChatMessageRequest = {
          roomId,
          messageType: MESSAGE_TYPE.DICE,
          content: originDiceContent,
          roleId: curRoleId,
          avatarId: curAvatarId,
          replayMessageId: executorProp.replyMessageId,
          position: commandAnchorPosition,
          extra: buildDiceTurnMessageExtra(originDiceContent, dicerReplies),
        };
        pendingOptimisticCommandMessage = createOptimisticCommandMessage(commandDiceRequest);
        const fallbackCommandPosition = pendingOptimisticCommandMessage?.fallbackPosition ?? commandAnchorPosition;
        const commandMessageMeta = await sendCommandMessageWithOptimistic(commandDiceRequest, pendingOptimisticCommandMessage);
        commandMessageCommitted = true;
        const stateEventAnchorPosition = commandMessageMeta.commandPosition ?? fallbackCommandPosition;
        await sendGeneratedStateEvent({
          position: stateEventAnchorPosition + DICE_FOLLOWUP_POSITION_STEP,
        });
      }
      else {
        await discardOptimisticCommandMessage(pendingOptimisticCommandMessage);
        await sendGeneratedStateEvent({
          position: commandAnchorPosition,
        });
      }
      return commandMessageCommitted || stateEventMessageCommitted;
    }
    catch (error) {
      if (!commandMessageCommitted) {
        await discardOptimisticCommandMessage(pendingOptimisticCommandMessage);
      }
      console.error("执行骰子指令失败", error);
      toast.error(`执行错误：${error instanceof Error ? error.message : String(error)}`);
      return false;
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
