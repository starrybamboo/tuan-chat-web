import type { Message } from "@tuanchat/openapi-client/models/Message";

import type { RoomRolesById } from "./chat-avatar-utils";

export const NARRATOR_AUTHOR_LABEL = "旁白";

type MessageAuthorLabelOptions = {
  unknownRoleLabel?: string;
};

export function isNarratorMessage(message: Pick<Message, "roleId">): boolean {
  return !message.roleId || message.roleId <= 0;
}

export function getMobileMessageAuthorLabel(
  message: Pick<Message, "customRoleName" | "roleId">,
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

  return options.unknownRoleLabel ?? "未知角色";
}
