import type { ChatMessageRequest } from "@tuanchat/openapi-client/models/ChatMessageRequest";

import { MESSAGE_TYPE } from "./messageType";

export type PokeTarget = {
  targetRoleId: number;
  targetRoleName: string;
};

export type BuildPokeMessageRequestParams = {
  roomId: number;
  roleId?: number;
  avatarId?: number;
  content: string;
  targetRoleId: number;
};

function normalizeMentionName(value: string, fallback: string): string {
  const normalized = value.trim().replace(/^@+/u, "");
  return normalized || fallback;
}

/**
 * 生成首次进入戳一戳模式时使用的可编辑正文。
 */
export function buildDefaultPokeContent(
  initiatorName: string,
  targetName: string,
): string {
  return `@${normalizeMentionName(initiatorName, "发起者")} 戳了戳 @${normalizeMentionName(targetName, "接受者")}`;
}

/**
 * 生成按登录用户和目标角色隔离的设备本地模板键。
 */
export function getPokeTemplateStorageKey(
  userId: number,
  targetRoleId: number,
): string {
  return `tc:chat:poke-template:${userId}:${targetRoleId}`;
}

/**
 * 构造一条不依赖正文 mention 的戳一戳发送请求。
 */
export function buildPokeMessageRequest(
  params: BuildPokeMessageRequestParams,
): ChatMessageRequest {
  return {
    roomId: params.roomId,
    messageType: MESSAGE_TYPE.POKE,
    roleId: params.roleId,
    avatarId: params.avatarId,
    content: params.content,
    extra: {
      poke: {
        targetRoleId: params.targetRoleId,
      },
    },
  };
}

export function isPokeMessageType(messageType: unknown): boolean {
  return messageType === MESSAGE_TYPE.POKE;
}

export function isSystemRowMessageType(messageType: unknown): boolean {
  return messageType === MESSAGE_TYPE.STATE_EVENT || isPokeMessageType(messageType);
}
