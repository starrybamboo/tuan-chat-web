import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { RoomUiStoreApi } from "@/components/chat/stores/roomUiStore";
import type { WebgalChoosePayload } from "@/types/webgalChoose";
import type { SpaceWebgalVarsRecord, WebgalVarMessagePayload } from "@/types/webgalVar";

import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";

import type { ChatMessageRequest, ChatMessageResponse } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";

type UseRoomMessageActionsParams = {
  roomId: number;
  spaceId: number;
  spaceExtra?: string | null;
  currentUserId: number;
  isSpaceOwner: boolean;
  curRoleId: number;
  isSubmitting: boolean;
  notMember: boolean;
  mainHistoryMessages: ChatMessageResponse[] | undefined;
  sendMessage: (message: ChatMessageRequest) => Promise<{ success: boolean; data?: ChatMessageResponse["message"] }>;
  addOrUpdateMessage?: (message: ChatMessageResponse) => Promise<void> | void;
  removeMessageById?: (messageId: number) => Promise<void>;
  replaceMessageById?: (fromMessageId: number, message: ChatMessageResponse) => Promise<void>;
  ensureRuntimeAvatarIdForRole: (roleId: number) => Promise<number>;
  setSpaceExtra: (payload: { spaceId: number; key: string; value: string }) => Promise<unknown>;
  roomUiStoreApi: RoomUiStoreApi;
};

type UseRoomMessageActionsResult = {
  sendMessageWithInsert: (message: ChatMessageRequest) => Promise<ChatMessageResponse["message"] | null>;
  handleSetWebgalVar: (key: string, expr: string) => Promise<void>;
  handleSendWebgalChoose: (payload: WebgalChoosePayload) => Promise<void>;
};

export default function useRoomMessageActions({
  roomId,
  spaceId,
  spaceExtra,
  currentUserId,
  isSpaceOwner,
  curRoleId,
  isSubmitting,
  notMember,
  mainHistoryMessages,
  sendMessage,
  addOrUpdateMessage,
  removeMessageById,
  replaceMessageById,
  ensureRuntimeAvatarIdForRole,
  setSpaceExtra,
  roomUiStoreApi,
}: UseRoomMessageActionsParams): UseRoomMessageActionsResult {
  const webgalVarSendingRef = useRef(false);
  const webgalChooseSendingRef = useRef(false);
  const optimisticMessageIdRef = useRef(-1);

  const getNextMainFlowPosition = useCallback(() => {
    if (!mainHistoryMessages?.length) {
      return Date.now();
    }
    let maxPosition = Number.NEGATIVE_INFINITY;
    for (const item of mainHistoryMessages) {
      const pos = item?.message?.position;
      if (typeof pos === "number" && Number.isFinite(pos) && pos > maxPosition) {
        maxPosition = pos;
      }
    }
    return Number.isFinite(maxPosition) ? maxPosition + 1 : Date.now();
  }, [mainHistoryMessages]);

  const createOptimisticMessage = useCallback((request: ChatMessageRequest): ChatMessageResponse => {
    const optimisticMessageId = optimisticMessageIdRef.current;
    optimisticMessageIdRef.current -= 1;
    const nowIso = new Date().toISOString();
    const resolvedPosition = typeof request.position === "number"
      ? request.position
      : getNextMainFlowPosition();

    return {
      message: {
        messageId: optimisticMessageId,
        syncId: optimisticMessageId,
        roomId: request.roomId,
        userId: currentUserId > 0 ? currentUserId : 0,
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
        position: resolvedPosition,
        extra: request.extra as any,
        createTime: nowIso,
        updateTime: nowIso,
      },
    };
  }, [currentUserId, getNextMainFlowPosition]);

  const revertOptimisticMessage = useCallback(async (optimisticMessage: ChatMessageResponse) => {
    const optimisticId = optimisticMessage.message.messageId;
    if (removeMessageById) {
      await removeMessageById(optimisticId);
      return;
    }
    if (addOrUpdateMessage) {
      await addOrUpdateMessage({
        ...optimisticMessage,
        message: {
          ...optimisticMessage.message,
          status: 1,
        },
      });
    }
  }, [addOrUpdateMessage, removeMessageById]);

  const commitOptimisticMessage = useCallback(async (
    optimisticMessage: ChatMessageResponse,
    createdMessage: ChatMessageResponse["message"],
  ): Promise<ChatMessageResponse["message"]> => {
    const normalizedCreated = {
      ...createdMessage,
      position: typeof createdMessage.position === "number"
        ? createdMessage.position
        : optimisticMessage.message.position,
    };
    const createdResponse: ChatMessageResponse = {
      message: normalizedCreated,
    };

    if (replaceMessageById) {
      await replaceMessageById(optimisticMessage.message.messageId, createdResponse);
      return normalizedCreated;
    }

    if (removeMessageById) {
      await removeMessageById(optimisticMessage.message.messageId);
    }
    if (addOrUpdateMessage) {
      await addOrUpdateMessage(createdResponse);
    }
    return normalizedCreated;
  }, [addOrUpdateMessage, removeMessageById, replaceMessageById]);

  const sendWithOptimistic = useCallback(async (request: ChatMessageRequest, errorLogLabel: string) => {
    const optimisticMessage = createOptimisticMessage(request);
    if (addOrUpdateMessage) {
      void addOrUpdateMessage(optimisticMessage);
    }

    try {
      const result = await sendMessage(request);
      if (!result.success || !result.data) {
        await revertOptimisticMessage(optimisticMessage);
        toast.error("发送消息失败");
        return null;
      }

      const created = await commitOptimisticMessage(optimisticMessage, result.data);
      roomUiStoreApi.getState().pushMessageUndo({ type: "send", after: created });
      return created;
    }
    catch (error) {
      console.error(errorLogLabel, error);
      await revertOptimisticMessage(optimisticMessage);
      toast.error("发送消息失败");
      return null;
    }
  }, [
    addOrUpdateMessage,
    commitOptimisticMessage,
    createOptimisticMessage,
    revertOptimisticMessage,
    roomUiStoreApi,
    sendMessage,
  ]);

  const sendMessageWithInsert = useCallback(async (message: ChatMessageRequest) => {
    const insertAfterMessageId = roomUiStoreApi.getState().insertAfterMessageId;

    if (insertAfterMessageId && mainHistoryMessages?.length) {
      const targetIndex = mainHistoryMessages.findIndex(m => m.message.messageId === insertAfterMessageId);
      if (targetIndex === -1) {
        return await sendWithOptimistic(message, "插入消息失败（fallback 路径）");
      }

      const targetMessage = mainHistoryMessages[targetIndex];
      const nextMessage = mainHistoryMessages[targetIndex + 1];
      const targetPosition = targetMessage.message.position;
      const nextPosition = nextMessage?.message.position ?? targetPosition + 1;
      // 插入消息：先计算新 position，随发送请求一次性写入
      const newPosition = (targetPosition + nextPosition) / 2;

      return await sendWithOptimistic({
        ...message,
        position: newPosition,
      }, "插入消息失败");
    }

    return await sendWithOptimistic(message, "发送消息失败");
  }, [mainHistoryMessages, roomUiStoreApi, sendWithOptimistic]);

  const handleSetWebgalVar = useCallback(async (key: string, expr: string) => {
    const rawKey = String(key ?? "").trim();
    const rawExpr = String(expr ?? "").trim();

    const isNarrator = curRoleId <= 0;

    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isNarrator && !isSpaceOwner) {
      toast.error("旁白仅KP可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting || webgalVarSendingRef.current) {
      toast.error("正在提交中，请稍后");
      return;
    }

    if (!rawKey || !rawExpr) {
      toast.error("变量名或表达式不能为空");
      return;
    }
    if (!/^[A-Z_]\w*$/i.test(rawKey)) {
      toast.error("变量名格式不正确");
      return;
    }

    const payload: WebgalVarMessagePayload = {
      scope: "space",
      op: "set",
      key: rawKey,
      expr: rawExpr,
      global: true,
    };

    webgalVarSendingRef.current = true;
    try {
      const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);
      const varMsg: ChatMessageRequest = {
        roomId,
        roleId: curRoleId,
        avatarId: resolvedAvatarId,
        content: "",
        messageType: MessageType.WEBGAL_VAR,
        extra: {
          webgalVar: payload,
        },
      };

      const draftCustomRoleName = useRoomPreferenceStore.getState().draftCustomRoleNameMap[curRoleId];
      if (draftCustomRoleName?.trim()) {
        varMsg.customRoleName = draftCustomRoleName.trim();
      }

      await sendMessageWithInsert(varMsg);

      try {
        const rawExtra = spaceExtra || "{}";
        let parsedExtra: Record<string, any> = {};
        try {
          parsedExtra = JSON.parse(rawExtra) as Record<string, any>;
        }
        catch {
          parsedExtra = {};
        }

        let currentVars: SpaceWebgalVarsRecord = {};
        const stored = parsedExtra.webgalVars;
        if (typeof stored === "string") {
          try {
            currentVars = JSON.parse(stored) as SpaceWebgalVarsRecord;
          }
          catch {
            currentVars = {};
          }
        }
        else if (stored && typeof stored === "object") {
          currentVars = stored as SpaceWebgalVarsRecord;
        }

        const now = Date.now();
        const nextVars: SpaceWebgalVarsRecord = {
          ...currentVars,
          [payload.key]: {
            expr: payload.expr,
            updatedAt: now,
          },
        };

        await setSpaceExtra({
          spaceId,
          key: "webgalVars",
          value: JSON.stringify(nextVars),
        });
      }
      catch (error) {
        console.error("更新空间变量失败", error);
        toast.error("更新空间变量失败，请重试");
      }
    }
    finally {
      webgalVarSendingRef.current = false;
    }
  }, [curRoleId, ensureRuntimeAvatarIdForRole, isSpaceOwner, isSubmitting, notMember, roomId, sendMessageWithInsert, setSpaceExtra, spaceExtra, spaceId]);

  const handleSendWebgalChoose = useCallback(async (payload: WebgalChoosePayload) => {
    const options = payload?.options ?? [];
    const normalizedOptions = options.map(option => ({
      text: String(option.text ?? "").trim(),
      code: option.code ? String(option.code).trim() : "",
    }));

    const isNarrator = curRoleId <= 0;

    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (isNarrator && !isSpaceOwner) {
      toast.error("旁白仅KP可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting || webgalChooseSendingRef.current) {
      toast.error("正在提交中，请稍候");
      return;
    }
    if (normalizedOptions.length === 0) {
      toast.error("请至少添加一个选项");
      return;
    }
    if (normalizedOptions.some(option => !option.text)) {
      toast.error("选项文本不能为空");
      return;
    }

    const finalPayload: WebgalChoosePayload = {
      options: normalizedOptions.map(option => ({
        text: option.text,
        ...(option.code ? { code: option.code } : {}),
      })),
    };

    webgalChooseSendingRef.current = true;
    try {
      const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);
      const chooseMsg: ChatMessageRequest = {
        roomId,
        roleId: curRoleId,
        avatarId: resolvedAvatarId,
        content: "",
        messageType: MessageType.WEBGAL_CHOOSE,
        extra: {
          webgalChoose: finalPayload,
        },
      };

      const draftCustomRoleName = useRoomPreferenceStore.getState().draftCustomRoleNameMap[curRoleId];
      if (draftCustomRoleName?.trim()) {
        chooseMsg.customRoleName = draftCustomRoleName.trim();
      }

      await sendMessageWithInsert(chooseMsg);
    }
    finally {
      webgalChooseSendingRef.current = false;
    }
  }, [curRoleId, ensureRuntimeAvatarIdForRole, isSpaceOwner, isSubmitting, notMember, roomId, sendMessageWithInsert]);

  return {
    sendMessageWithInsert,
    handleSetWebgalVar,
    handleSendWebgalChoose,
  };
}
