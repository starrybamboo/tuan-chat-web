import {
  containsCommandRequestAllToken as containsToken,
  extractFirstCommandText as extractCommand,
  stripCommandRequestAllToken as stripToken,
} from "@tuanchat/domain/command-request";
import { useCallback, useEffect, useRef, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

type CommandExecutor = (payload: {
  command: string;
  originMessage: string;
  replyMessageId: number;
}) => boolean | Promise<boolean | void> | void;

type CommandRequestPayload = {
  command: string;
  requestMessageId: number;
};

type UseRoomCommandRequestsParams = {
  roomId: number;
  userId: number;
  isSpaceOwner: boolean;
  notMember: boolean;
  noRole: boolean;
  isSubmitting: boolean;
  commandExecutor: CommandExecutor;
};

type UseRoomCommandRequestsResult = {
  containsCommandRequestAllToken: (text: string) => boolean;
  stripCommandRequestAllToken: (text: string) => string;
  extractFirstCommandText: (text: string) => string | null;
  isCommandRequestConsumed: (requestMessageId: number) => boolean;
  handleExecuteCommandRequest: (payload: CommandRequestPayload) => void;
};

const COMMAND_REQUEST_ONCE_STORAGE_KEY = "tc:command-request-once:v1";
const COMMAND_REQUEST_ONCE_STORAGE_LIMIT = 500;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function buildRequestConsumeKey(roomId: number, requestMessageId: number) {
  return `${roomId}:${requestMessageId}`;
}

function buildStorageBucketKey(userId: number) {
  const normalizedUserId = Number.isFinite(userId) && userId > 0 ? userId : 0;
  return String(normalizedUserId);
}

function readConsumedRequestKeys(userId: number) {
  if (!canUseLocalStorage()) {
    return new Set<string>();
  }
  try {
    const raw = window.localStorage.getItem(COMMAND_REQUEST_ONCE_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const bucket = parsed?.[buildStorageBucketKey(userId)];
    if (!Array.isArray(bucket)) {
      return new Set<string>();
    }
    return new Set(bucket.filter((item): item is string => typeof item === "string"));
  }
  catch {
    return new Set<string>();
  }
}

function writeConsumedRequestKeys(userId: number, consumedRequestKeys: Set<string>) {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    const raw = window.localStorage.getItem(COMMAND_REQUEST_ONCE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    parsed[buildStorageBucketKey(userId)] = Array.from(consumedRequestKeys).slice(-COMMAND_REQUEST_ONCE_STORAGE_LIMIT);
    window.localStorage.setItem(COMMAND_REQUEST_ONCE_STORAGE_KEY, JSON.stringify(parsed));
  }
  catch {
    // 忽略本地持久化失败，至少保证当前页签内仍然按一次性处理。
  }
}

export default function useRoomCommandRequests({
  roomId,
  userId,
  isSpaceOwner,
  notMember,
  noRole,
  isSubmitting,
  commandExecutor,
}: UseRoomCommandRequestsParams): UseRoomCommandRequestsResult {
  const [consumedRequestKeys, setConsumedRequestKeys] = useState(() => readConsumedRequestKeys(userId));
  const consumedRequestKeysRef = useRef(consumedRequestKeys);
  const pendingRequestKeysRef = useRef(new Set<string>());

  useEffect(() => {
    consumedRequestKeysRef.current = consumedRequestKeys;
  }, [consumedRequestKeys]);

  useEffect(() => {
    const reloadedRequestKeys = readConsumedRequestKeys(userId);
    consumedRequestKeysRef.current = reloadedRequestKeys;
    queueMicrotask(() => setConsumedRequestKeys(reloadedRequestKeys));
  }, [userId]);

  const containsCommandRequestAllToken = useCallback((text: string) => {
    return containsToken(text);
  }, []);

  const stripCommandRequestAllToken = useCallback((text: string) => {
    return stripToken(text);
  }, []);

  const extractFirstCommandText = useCallback((text: string): string | null => {
    return extractCommand(text);
  }, []);

  const isCommandRequestConsumed = useCallback((requestMessageId: number) => {
    const requestKey = buildRequestConsumeKey(roomId, requestMessageId);
    return consumedRequestKeysRef.current.has(requestKey);
  }, [roomId]);

  const handleExecuteCommandRequest = useCallback((payload: CommandRequestPayload) => {
    const { command, requestMessageId } = payload;
    const rawCommand = String(command ?? "").trim();
    if (!rawCommand) {
      appToast.error("请输入指令");
      return;
    }

    if (noRole && !isSpaceOwner && !notMember) {
      appToast.error("旁白仅主持可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      appToast.error("正在提交中，请稍后");
      return;
    }
    const requestKey = buildRequestConsumeKey(roomId, requestMessageId);
    const currentConsumedRequestKeys = consumedRequestKeysRef.current;
    if (currentConsumedRequestKeys.has(requestKey)) {
      appToast.error("该检定请求已执行");
      return;
    }
    if (pendingRequestKeysRef.current.has(requestKey)) {
      appToast.error("检定请求正在执行，请稍后");
      return;
    }

    pendingRequestKeysRef.current.add(requestKey);
    void (async () => {
      try {
        const executed = await commandExecutor({
          command: rawCommand,
          originMessage: rawCommand,
          replyMessageId: requestMessageId,
        });
        if (executed === false) {
          appToast.error("检定请求未执行成功，请重试");
          return;
        }

        const nextConsumedRequestKeys = new Set(consumedRequestKeysRef.current);
        nextConsumedRequestKeys.add(requestKey);
        consumedRequestKeysRef.current = nextConsumedRequestKeys;
        writeConsumedRequestKeys(userId, nextConsumedRequestKeys);
        setConsumedRequestKeys(nextConsumedRequestKeys);
      }
      catch (error) {
        console.error("执行检定请求失败", error);
        appToast.error("检定请求执行失败，请重试");
      }
      finally {
        pendingRequestKeysRef.current.delete(requestKey);
      }
    })();
  }, [commandExecutor, isSpaceOwner, isSubmitting, noRole, notMember, roomId, userId]);

  return {
    containsCommandRequestAllToken,
    stripCommandRequestAllToken,
    extractFirstCommandText,
    isCommandRequestConsumed,
    handleExecuteCommandRequest,
  };
}
