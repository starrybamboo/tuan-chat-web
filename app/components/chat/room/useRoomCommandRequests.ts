import { useCallback, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import { isCommand } from "@/components/common/dicer/cmdPre";

type CommandExecutor = (payload: {
  command: string;
  originMessage: string;
  threadId?: number;
  replyMessageId: number;
}) => void;

type CommandRequestPayload = {
  command: string;
  threadId?: number;
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
  const [, setConsumedVersion] = useState(0);
  const consumedRequestKeysRef = useRef<Set<string>>(readConsumedRequestKeys(userId));
  const storageBucketKeyRef = useRef<string>(buildStorageBucketKey(userId));
  const nextStorageBucketKey = buildStorageBucketKey(userId);
  if (storageBucketKeyRef.current !== nextStorageBucketKey) {
    storageBucketKeyRef.current = nextStorageBucketKey;
    consumedRequestKeysRef.current = readConsumedRequestKeys(userId);
  }

  const containsCommandRequestAllToken = useCallback((text: string) => {
    const raw = String(text ?? "");
    return /@all\b/i.test(raw)
      || raw.includes("@ȫԱ")
      || raw.includes("@所有人")
      || raw.includes("@检定请求");
  }, []);

  const stripCommandRequestAllToken = useCallback((text: string) => {
    return String(text ?? "")
      .replace(/@all\b/gi, " ")
      .replace(/@ȫԱ/g, " ")
      .replace(/@所有人/g, " ")
      .replace(/@检定请求/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const extractFirstCommandText = useCallback((text: string): string | null => {
    const trimmed = String(text ?? "").trim();
    if (!trimmed) {
      return null;
    }
    if (isCommand(trimmed)) {
      return trimmed;
    }
    const match = trimmed.match(/[.。/][A-Z][^\n]*/i);
    if (!match) {
      return null;
    }
    const candidate = match[0].trim();
    return isCommand(candidate) ? candidate : null;
  }, []);

  const isCommandRequestConsumed = useCallback((requestMessageId: number) => {
    const requestKey = buildRequestConsumeKey(roomId, requestMessageId);
    return consumedRequestKeysRef.current.has(requestKey);
  }, [roomId]);

  const handleExecuteCommandRequest = useCallback((payload: CommandRequestPayload) => {
    const { command, threadId, requestMessageId } = payload;
    const rawCommand = String(command ?? "").trim();
    if (!rawCommand) {
      toast.error("请输入指令");
      return;
    }

    if (noRole && !isSpaceOwner && !notMember) {
      toast.error("旁白仅主持可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
      return;
    }
    const requestKey = buildRequestConsumeKey(roomId, requestMessageId);
    if (consumedRequestKeysRef.current.has(requestKey)) {
      toast.error("该检定请求已执行");
      return;
    }

    const nextConsumedRequestKeys = new Set(consumedRequestKeysRef.current);
    nextConsumedRequestKeys.add(requestKey);
    consumedRequestKeysRef.current = nextConsumedRequestKeys;
    writeConsumedRequestKeys(userId, nextConsumedRequestKeys);
    setConsumedVersion(version => version + 1);

    void commandExecutor({
      command: rawCommand,
      originMessage: rawCommand,
      threadId,
      replyMessageId: requestMessageId,
    });
  }, [commandExecutor, isSpaceOwner, isSubmitting, noRole, notMember, roomId, userId]);

  return {
    containsCommandRequestAllToken,
    stripCommandRequestAllToken,
    extractFirstCommandText,
    isCommandRequestConsumed,
    handleExecuteCommandRequest,
  };
}
