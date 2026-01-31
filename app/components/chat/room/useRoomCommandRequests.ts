import { useCallback } from "react";
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
  handleExecuteCommandRequest: (payload: CommandRequestPayload) => void;
};

export default function useRoomCommandRequests({
  isSpaceOwner,
  notMember,
  noRole,
  isSubmitting,
  commandExecutor,
}: UseRoomCommandRequestsParams): UseRoomCommandRequestsResult {
  const containsCommandRequestAllToken = useCallback((text: string) => {
    const raw = String(text ?? "");
    return /@all\b/i.test(raw)
      || raw.includes("@全员")
      || raw.includes("@所有人")
      || raw.includes("@检定请求");
  }, []);

  const stripCommandRequestAllToken = useCallback((text: string) => {
    return String(text ?? "")
      .replace(/@all\b/gi, " ")
      .replace(/@全员/g, " ")
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

  const handleExecuteCommandRequest = useCallback((payload: CommandRequestPayload) => {
    const { command, threadId, requestMessageId } = payload;
    const rawCommand = String(command ?? "").trim();
    if (!rawCommand) {
      toast.error("请输入指令");
      return;
    }

    if (notMember) {
      toast.error("您是观战，不能发送消息");
      return;
    }
    if (noRole && !isSpaceOwner) {
      toast.error("旁白仅KP可用，请先选择/拉入你的角色");
      return;
    }
    if (isSubmitting) {
      toast.error("正在提交中，请稍后");
      return;
    }

    commandExecutor({
      command: rawCommand,
      originMessage: rawCommand,
      threadId,
      replyMessageId: requestMessageId,
    });
  }, [commandExecutor, isSpaceOwner, isSubmitting, noRole, notMember]);

  return {
    containsCommandRequestAllToken,
    stripCommandRequestAllToken,
    extractFirstCommandText,
    handleExecuteCommandRequest,
  };
}
