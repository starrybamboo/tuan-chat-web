import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { buildConsumeKey, readConsumedKeys, writeConsumedKeys } from "./commandRequestStorage";

type CommandRequestPayload = {
  command: string;
  messageId: number;
};

type UseMobileCommandRequestsParams = {
  roomId: number;
  userId: number;
  isSpaceOwner: boolean;
  noRole: boolean;
  onExecuteCommand: (command: string, replyMessageId: number) => Promise<void>;
};

export function useMobileCommandRequests({
  roomId,
  userId,
  isSpaceOwner,
  noRole,
  onExecuteCommand,
}: UseMobileCommandRequestsParams) {
  const persistedConsumedKeys = useMemo(() => readConsumedKeys(userId), [userId]);
  const [consumedState, setConsumedState] = useState<{ keys: Set<string>; userId: number }>(() => ({
    keys: persistedConsumedKeys,
    userId,
  }));
  const consumedKeys = consumedState.userId === userId ? consumedState.keys : persistedConsumedKeys;

  const isConsumed = useCallback((messageId: number) => {
    return consumedKeys.has(buildConsumeKey(roomId, messageId));
  }, [consumedKeys, roomId]);

  const handleExecute = useCallback(async (payload: CommandRequestPayload) => {
    const { command, messageId } = payload;
    const rawCommand = String(command ?? "").trim();
    if (!rawCommand) {
      Alert.alert("错误", "请输入指令");
      return;
    }

    if (noRole && !isSpaceOwner) {
      Alert.alert("错误", "旁白仅主持可用，请先选择/拉入你的角色");
      return;
    }

    const key = buildConsumeKey(roomId, messageId);
    if (consumedKeys.has(key)) {
      Alert.alert("错误", "该检定请求已执行");
      return;
    }

    try {
      await onExecuteCommand(rawCommand, messageId);
    }
    catch (error) {
      Alert.alert("执行失败", error instanceof Error ? error.message : "执行指令失败");
      return;
    }

    const next = new Set(consumedKeys);
    next.add(key);
    setConsumedState({ keys: next, userId });
    writeConsumedKeys(userId, next);
  }, [consumedKeys, roomId, userId, isSpaceOwner, noRole, onExecuteCommand]);

  return { isConsumed, handleExecute };
}
