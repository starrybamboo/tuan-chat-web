import type { WebgalDiceRenderMode, WebgalDiceRenderPayload } from "@/types/webgalDice";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalDicePayload, isLikelyAnkoDiceContent, isLikelyTrpgDiceContent } from "@/types/webgalDice";
import { getDiceTurnRenderData } from "@tuanchat/domain/message-render-data";

import type { ChatMessageResponse } from "../../api";

export const DEFAULT_DICE_SOUND_FILE = "nettimato-rolling-dice-1.wav";
export const DEFAULT_DICE_SOUND_FOLDER = "se";
export const DICE_MERGE_WAIT_MS = 260;
export const TRPG_DICE_COMMAND = "trpgDice";

const DICE_COMMAND_PATTERN = /^\.|(?:^|\s)\d*\s*d\s*(?:100|%)(?:\s|$)/i;

export type RealtimeDiceSoundLine = {
  url: string;
  volume?: number;
};

function getDiceTurnContentFromMessage(msg: ChatMessageResponse["message"]): string | undefined {
  if (!msg.extra?.diceTurn) {
    return undefined;
  }
  const diceTurnData = getDiceTurnRenderData(msg.extra, msg.content, false);
  const visibleReplyText = diceTurnData.replies
    .filter(reply => !reply.hidden)
    .map(reply => reply.content.trim())
    .filter(Boolean)
    .join("\n");
  return visibleReplyText || diceTurnData.command || diceTurnData.summary;
}

export function getDiceContentFromMessage(
  msg: ChatMessageResponse["message"],
  payload?: WebgalDiceRenderPayload | null,
): string {
  const extraResult = msg.extra && typeof msg.extra === "object"
    ? (msg.extra as { result?: unknown }).result
    : undefined;
  const messageExtra = msg.extra as ({ authoredDice?: { description?: unknown; result?: unknown } } & typeof msg.extra) | undefined;
  const authoredDice = messageExtra?.authoredDice;
  const authoredDescription = authoredDice?.description
    ? String(authoredDice.description).trim()
    : "";
  const authoredResult = authoredDice?.result
    ? String(authoredDice.result).trim()
    : "";
  const authoredContent = [authoredDescription, authoredResult].filter(Boolean).join("\n");
  return payload?.content
    ?? getDiceTurnContentFromMessage(msg)
    ?? (authoredContent || undefined)
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

export function resolveRealtimeDiceRenderMode(params: {
  combatRoundActive: boolean;
  content: string;
  hasScriptLines: boolean;
  payload?: WebgalDiceRenderPayload | null;
}): WebgalDiceRenderMode {
  const { combatRoundActive, content, hasScriptLines, payload } = params;
  const payloadMode = payload?.mode;
  const autoMode: WebgalDiceRenderMode = combatRoundActive
    ? "trpg"
    : (isLikelyAnkoDiceContent(content)
        ? "anko"
        : (isLikelyTrpgDiceContent(content) ? "trpg" : "narration"));

  const shouldForceTrpgMode = autoMode === "trpg" && payloadMode !== "anko" && payloadMode !== "script";
  if (shouldForceTrpgMode) {
    return "trpg";
  }
  if (payloadMode === "script" && !hasScriptLines) {
    return autoMode;
  }
  return payloadMode ?? (hasScriptLines ? "script" : autoMode);
}

export function buildTrpgDiceLine(content: string): string {
  return `${TRPG_DICE_COMMAND}:${content.replace(/\r?\n/g, "|")} -next;`;
}

export function buildPlayEffectLine(sound: RealtimeDiceSoundLine): string {
  const volumePart = typeof sound.volume === "number" ? ` -volume=${sound.volume}` : "";
  return `playEffect:${sound.url}${volumePart} -next;`;
}

export function buildTrpgDicePerformLines(content: string, sound?: RealtimeDiceSoundLine | null): string[] {
  const lines = [buildTrpgDiceLine(content)];
  if (sound) {
    lines.push(buildPlayEffectLine(sound));
  }
  return lines;
}

export function resolveRealtimeDiceMiniAvatarDefault(params: {
  mode: WebgalDiceRenderMode | null;
  roleId: number;
  payload?: WebgalDiceRenderPayload | null;
}): boolean | undefined {
  const explicit = params.payload?.showMiniAvatar;
  if (explicit !== undefined) {
    return explicit;
  }
  return params.mode === "dialog" && params.roleId > 0 ? true : undefined;
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
    ...replyMessage.extra,
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
