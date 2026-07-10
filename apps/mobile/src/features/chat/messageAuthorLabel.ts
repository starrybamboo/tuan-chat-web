import type { Message } from "@tuanchat/openapi-client/models/Message";

import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";

import type { RoomRolesById } from "./chat-avatar-utils";

export const NARRATOR_AUTHOR_LABEL = "旁白";

const OPENING_BRACKETS = new Set(["(", "（"]);
const CLOSING_BRACKETS = new Set([")", "）"]);

type MessageAuthorLabelOptions = {
  unknownRoleLabel?: string;
};

type MessageAuthorIdentity = Pick<Message, "roleId"> & Partial<Pick<Message, "content" | "customRoleName" | "messageType" | "userId">>;

export function isOutOfCharacterSpeech(content?: string | null): boolean {
  if (typeof content !== "string" || content.length === 0)
    return false;
  const trimmedEnd = content.trimEnd();
  if (trimmedEnd.length === 0)
    return false;
  return OPENING_BRACKETS.has(content[0]) && CLOSING_BRACKETS.has(trimmedEnd[trimmedEnd.length - 1]);
}

export function isOutOfCharacterMessage(message: Partial<Pick<Message, "content" | "messageType">>): boolean {
  return message.messageType === MESSAGE_TYPE.TEXT && isOutOfCharacterSpeech(message.content);
}

export function isNarratorMessage(message: MessageAuthorIdentity): boolean {
  if (isOutOfCharacterMessage(message))
    return false;
  return !message.roleId || message.roleId <= 0;
}

export function getMobileMessageAuthorLabel(
  message: MessageAuthorIdentity,
  roomRolesById?: RoomRolesById,
  options: MessageAuthorLabelOptions = {},
) {
  const customName = message.customRoleName?.trim();
  if (customName) {
    return customName;
  }

  if (isNarratorMessage(message)) {
    return NARRATOR_AUTHOR_LABEL;
  }

  const role = typeof message.roleId === "number" ? roomRolesById?.get(message.roleId) : undefined;
  const roleName = role?.roleName?.trim();
  if (roleName) {
    return roleName;
  }

  if (isOutOfCharacterMessage(message) && typeof message.userId === "number" && message.userId > 0) {
    return options.unknownRoleLabel ?? `角色 #${message.roleId ?? message.userId}`;
  }

  return options.unknownRoleLabel ?? "未知角色";
}
