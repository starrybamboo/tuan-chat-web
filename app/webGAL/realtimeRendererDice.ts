import type { WebgalDiceRenderPayload } from "@/types/webgalDice";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalDicePayload, isLikelyTrpgDiceContent } from "@/types/webgalDice";

import type { ChatMessageResponse } from "../../api";

export const DEFAULT_DICE_SOUND_FILE = "nettimato-rolling-dice-1.wav";
export const DEFAULT_DICE_SOUND_FOLDER = "se";
export const DICE_MERGE_WAIT_MS = 260;
export const TRPG_DICE_PIXI_EFFECT = "effect.trpgDiceBurst";

const DICE_COMMAND_PATTERN = /^\.|(?:^|\s)\d*\s*d\s*(?:100|%)(?:\s|$)/i;

export function getDiceContentFromMessage(
  msg: ChatMessageResponse["message"],
  payload?: WebgalDiceRenderPayload | null,
): string {
  const extraResult = msg.extra && typeof msg.extra === "object"
    ? (msg.extra as { result?: unknown }).result
    : undefined;
  return payload?.content
    ?? msg.extra?.diceResult?.result
    ?? (extraResult == null ? undefined : String(extraResult))
    ?? msg.content
    ?? "";
}

export function isPotentialTrpgDiceMessage(msg: ChatMessageResponse["message"]): boolean {
  if ((msg.messageType as number) !== MESSAGE_TYPE.DICE) {
    return false;
  }
  const payload = extractWebgalDicePayload(msg.webgal);
  if (payload?.mode === "trpg") {
    return true;
  }
  const content = getDiceContentFromMessage(msg, payload);
  const normalized = String(content ?? "").trim();
  if (!normalized) {
    return false;
  }
  return isLikelyTrpgDiceContent(normalized) || DICE_COMMAND_PATTERN.test(normalized);
}

export function canMergeTrpgDicePair(command: ChatMessageResponse, reply: ChatMessageResponse): boolean {
  const commandMessage = command.message;
  const replyMessage = reply.message;
  if ((commandMessage.messageType as number) !== MESSAGE_TYPE.DICE || (replyMessage.messageType as number) !== MESSAGE_TYPE.DICE) {
    return false;
  }
  if (!commandMessage.messageId || replyMessage.replyMessageId !== commandMessage.messageId) {
    return false;
  }
  return isPotentialTrpgDiceMessage(commandMessage) || isPotentialTrpgDiceMessage(replyMessage);
}

export function buildMergedTrpgDiceMessage(command: ChatMessageResponse, reply: ChatMessageResponse): ChatMessageResponse {
  const commandMessage = command.message;
  const replyMessage = reply.message;
  const commandPayload = extractWebgalDicePayload(commandMessage.webgal);
  const replyPayload = extractWebgalDicePayload(replyMessage.webgal);
  const commandContent = getDiceContentFromMessage(commandMessage, commandPayload).trim();
  const replyContent = getDiceContentFromMessage(replyMessage, replyPayload).trim();
  const mergedLines: string[] = [];
  if (commandContent) {
    mergedLines.push(`[玩家掷骰](style=color:#9AB9FF) ${commandContent}`);
  }
  if (replyContent) {
    mergedLines.push(`[骰子结果](style=color:#FFC88C) ${replyContent}`);
  }
  const mergedContent = mergedLines.join("\n").trim() || replyContent || commandContent;
  const replyWebgal = (replyMessage.webgal && typeof replyMessage.webgal === "object")
    ? (replyMessage.webgal as Record<string, unknown>)
    : {};
  const rawDiceRender = (replyWebgal.diceRender && typeof replyWebgal.diceRender === "object")
    ? (replyWebgal.diceRender as Record<string, unknown>)
    : {};
  const mergedExtra = {
    ...(replyMessage.extra ?? {}),
    diceResult: {
      result: mergedContent,
    },
  };

  return {
    ...reply,
    message: {
      ...replyMessage,
      content: mergedContent,
      webgal: {
        ...replyWebgal,
        diceRender: {
          ...rawDiceRender,
          mode: "trpg",
          content: mergedContent,
          twoStep: false,
        },
      },
      extra: mergedExtra,
    },
  };
}
