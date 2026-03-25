import { getFigurePositionFromAnnotations, hasMiniAvatarAnnotation } from "@/types/messageAnnotations";
import { isFigurePosition, MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { extractWebgalDicePayload, isLikelyAnkoDiceContent, isLikelyTrpgDiceContent } from "@/types/webgalDice";

import type { ChatMessageResponse, UserRole } from "../../api";

export const DEFAULT_REALTIME_ASSET_CONCURRENCY = 6;

export type AvatarAssetTarget = {
  roleId: number;
  avatarId: number;
};

export type MessageAssetWarmupPlan = {
  avatarIds: number[];
  spriteTargets: AvatarAssetTarget[];
  miniAvatarTargets: AvatarAssetTarget[];
};

type MessageAssetWarmupOptions = {
  autoFigureEnabled: boolean;
  miniAvatarEnabled: boolean;
};

type DiceRenderMode = "script" | "anko" | "trpg" | "narration" | "dialog";

function getRoleLookupValue(roleLookup: ReadonlyMap<number, UserRole>, roleId: number): UserRole | undefined {
  return roleLookup.get(roleId);
}

function getEffectiveAvatarId(message: ChatMessageResponse["message"], role?: UserRole): number {
  const messageAvatarId = Number(message.avatarId ?? 0);
  if (messageAvatarId > 0) {
    return messageAvatarId;
  }
  const roleAvatarId = Number(role?.avatarId ?? 0);
  return roleAvatarId > 0 ? roleAvatarId : 0;
}

function getDiceContent(message: ChatMessageResponse["message"]): string {
  const payload = extractWebgalDicePayload(message.webgal);
  return payload?.content ?? message.extra?.diceResult?.result ?? (message.extra as any)?.result ?? message.content ?? "";
}

function getDiceRenderMode(message: ChatMessageResponse["message"]): DiceRenderMode {
  const payload = extractWebgalDicePayload(message.webgal);
  const diceContent = getDiceContent(message);
  const hasScriptLines = Boolean(payload?.lines?.length);
  const autoMode: DiceRenderMode = isLikelyAnkoDiceContent(diceContent)
    ? "anko"
    : (isLikelyTrpgDiceContent(diceContent) ? "trpg" : "narration");
  const payloadMode = payload?.mode;
  const shouldForceTrpgMode = autoMode === "trpg" && payloadMode !== "anko" && payloadMode !== "script";
  if (shouldForceTrpgMode) {
    return "trpg";
  }
  if (payloadMode === "script" && !hasScriptLines) {
    return autoMode;
  }
  return (payloadMode ?? (hasScriptLines ? "script" : autoMode)) as DiceRenderMode;
}

function shouldWarmSprite(
  message: ChatMessageResponse["message"],
  options: MessageAssetWarmupOptions,
): boolean {
  const roleId = Number(message.roleId ?? 0);
  if (roleId <= 0) {
    return false;
  }
  if ((message.messageType as number) === MESSAGE_TYPE.INTRO_TEXT) {
    return false;
  }
  if ((message.messageType as number) === MESSAGE_TYPE.DICE) {
    const payload = extractWebgalDicePayload(message.webgal);
    if (payload?.showFigure === true) {
      return true;
    }
    if (payload?.showFigure === false) {
      return false;
    }
    return getDiceRenderMode(message) === "dialog" && options.autoFigureEnabled;
  }
  if ((message.messageType as number) !== MESSAGE_TYPE.TEXT) {
    return false;
  }
  const figurePosition = getFigurePositionFromAnnotations(message.annotations);
  if (isFigurePosition(figurePosition)) {
    return true;
  }
  return options.autoFigureEnabled;
}

function shouldWarmMiniAvatar(
  message: ChatMessageResponse["message"],
  options: MessageAssetWarmupOptions,
): boolean {
  const roleId = Number(message.roleId ?? 0);
  if (roleId <= 0 || (message.messageType as number) === MESSAGE_TYPE.INTRO_TEXT) {
    return false;
  }

  if (hasMiniAvatarAnnotation(message.annotations)) {
    return true;
  }

  if ((message.messageType as number) === MESSAGE_TYPE.DICE) {
    const payload = extractWebgalDicePayload(message.webgal);
    if (payload?.showMiniAvatar === true) {
      return true;
    }
    if (payload?.showMiniAvatar === false) {
      return false;
    }
    return options.miniAvatarEnabled && getDiceRenderMode(message) === "dialog";
  }

  if ((message.messageType as number) !== MESSAGE_TYPE.TEXT) {
    return false;
  }

  return options.miniAvatarEnabled;
}

export function collectMissingAvatarIdsFromRoles(
  roles: UserRole[],
  hasCachedAvatar: (avatarId: number) => boolean,
): number[] {
  const missing = new Set<number>();
  for (const role of roles) {
    const avatarId = Number(role.avatarId ?? 0);
    if (avatarId > 0 && !hasCachedAvatar(avatarId)) {
      missing.add(avatarId);
    }
  }
  return Array.from(missing);
}

export function collectMessageAssetWarmupPlan(
  messages: ChatMessageResponse[],
  roleLookup: ReadonlyMap<number, UserRole>,
  options: MessageAssetWarmupOptions,
): MessageAssetWarmupPlan {
  const avatarIds = new Set<number>();
  const spriteTargets = new Map<string, AvatarAssetTarget>();
  const miniAvatarTargets = new Map<string, AvatarAssetTarget>();

  for (const entry of messages) {
    const message = entry.message;
    const roleId = Number(message.roleId ?? 0);
    if (roleId <= 0 || message.status === 1) {
      continue;
    }
    const role = getRoleLookupValue(roleLookup, roleId);
    const avatarId = getEffectiveAvatarId(message, role);
    if (avatarId <= 0) {
      continue;
    }

    avatarIds.add(avatarId);
    const target = { roleId, avatarId };
    const cacheKey = `${roleId}_${avatarId}`;

    if (shouldWarmSprite(message, options)) {
      spriteTargets.set(cacheKey, target);
    }
    if (shouldWarmMiniAvatar(message, options)) {
      miniAvatarTargets.set(cacheKey, target);
    }
  }

  return {
    avatarIds: Array.from(avatarIds),
    spriteTargets: Array.from(spriteTargets.values()),
    miniAvatarTargets: Array.from(miniAvatarTargets.values()),
  };
}

export function collectMissingAvatarIdsFromMessages(
  messages: ChatMessageResponse[],
  roleLookup: ReadonlyMap<number, UserRole>,
  hasCachedAvatar: (avatarId: number) => boolean,
): number[] {
  const plan = collectMessageAssetWarmupPlan(messages, roleLookup, {
    autoFigureEnabled: true,
    miniAvatarEnabled: true,
  });
  return plan.avatarIds.filter(avatarId => !hasCachedAvatar(avatarId));
}

export async function runWithConcurrencyLimit<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const normalizedLimit = Math.max(1, Math.floor(limit));
  let cursor = 0;

  async function consume(): Promise<void> {
    while (true) {
      const index = cursor;
      if (index >= items.length) {
        return;
      }
      cursor += 1;
      await worker(items[index], index);
    }
  }

  const workerCount = Math.min(normalizedLimit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => consume()));
}
