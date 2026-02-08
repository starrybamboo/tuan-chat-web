import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { WebgalChoosePayload } from "@/types/webgalChoose";
import type { SpaceWebgalVarsRecord, WebgalVarMessagePayload } from "@/types/webgalVar";

import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";

import type { ChatMessageRequest, ChatMessageResponse } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";

type UseRoomMessageActionsParams = {
  roomId: number;
  spaceId: number;
  spaceExtra?: string | null;
  isSpaceOwner: boolean;
  curRoleId: number;
  isSubmitting: boolean;
  notMember: boolean;
  mainHistoryMessages: ChatMessageResponse[] | undefined;
  send: (message: ChatMessageRequest) => void;
  sendMessage: (message: ChatMessageRequest) => Promise<{ success: boolean; data?: ChatMessageResponse["message"] }>;
  updateMessage: (message: ChatMessageResponse["message"]) => Promise<unknown>;
  addOrUpdateMessage?: (message: ChatMessageResponse) => void;
  ensureRuntimeAvatarIdForRole: (roleId: number) => Promise<number>;
  setSpaceExtra: (payload: { spaceId: number; key: string; value: string }) => Promise<unknown>;
};

type UseRoomMessageActionsResult = {
  sendMessageWithInsert: (message: ChatMessageRequest) => Promise<void>;
  handleSetWebgalVar: (key: string, expr: string) => Promise<void>;
  handleSendWebgalChoose: (payload: WebgalChoosePayload) => Promise<void>;
};

export default function useRoomMessageActions({
  roomId,
  spaceId,
  spaceExtra,
  isSpaceOwner,
  curRoleId,
  isSubmitting,
  notMember,
  mainHistoryMessages,
  send,
  sendMessage,
  updateMessage,
  addOrUpdateMessage,
  ensureRuntimeAvatarIdForRole,
  setSpaceExtra,
}: UseRoomMessageActionsParams): UseRoomMessageActionsResult {
  const webgalVarSendingRef = useRef(false);
  const webgalChooseSendingRef = useRef(false);

  const sendMessageWithInsert = useCallback(async (message: ChatMessageRequest) => {
    const insertAfterMessageId = useRoomUiStore.getState().insertAfterMessageId;

    if (insertAfterMessageId && mainHistoryMessages?.length) {
      const targetIndex = mainHistoryMessages.findIndex(m => m.message.messageId === insertAfterMessageId);
      if (targetIndex === -1) {
        send(message);
        return;
      }

      try {
        const result = await sendMessage(message);
        if (!result.success || !result.data) {
          toast.error("发送消息失败");
          return;
        }

        const newMessage = result.data;
        const targetMessage = mainHistoryMessages[targetIndex];
        const nextMessage = mainHistoryMessages[targetIndex + 1];
        const targetPosition = targetMessage.message.position;
        const nextPosition = nextMessage?.message.position ?? targetPosition + 1;
        const newPosition = (targetPosition + nextPosition) / 2;

        await updateMessage({
          ...newMessage,
          position: newPosition,
        });

        if (addOrUpdateMessage) {
          addOrUpdateMessage({
            message: {
              ...newMessage,
              position: newPosition,
            },
          });
        }
      }
      catch (error) {
        console.error("插入消息失败", error);
        toast.error("发送消息失败");
      }
    }
    else {
      send(message);
    }
  }, [addOrUpdateMessage, mainHistoryMessages, send, sendMessage, updateMessage]);

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
      target: String(option.target ?? "").trim(),
      showCondition: option.showCondition ? String(option.showCondition).trim() : "",
      enableCondition: option.enableCondition ? String(option.enableCondition).trim() : "",
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
    if (normalizedOptions.some(option => !option.text || !option.target)) {
      toast.error("选项文本和跳转目标不能为空");
      return;
    }

    const finalPayload: WebgalChoosePayload = {
      options: normalizedOptions.map(option => ({
        text: option.text,
        target: option.target,
        ...(option.showCondition ? { showCondition: option.showCondition } : {}),
        ...(option.enableCondition ? { enableCondition: option.enableCondition } : {}),
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
