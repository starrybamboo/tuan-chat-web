import type { Message } from "@tuanchat/openapi-client/models/Message";

import { isSystemRowMessageType } from "@tuanchat/domain/poke-message";

export function shouldGroupWithPrevious(current: Message, previous: Message | undefined): boolean {
  if (!previous)
    return false;
  if (isSystemRowMessageType(current.messageType) || isSystemRowMessageType(previous.messageType))
    return false;
  if (current.userId !== previous.userId)
    return false;
  if ((current.roleId ?? 0) !== (previous.roleId ?? 0))
    return false;
  if ((current.avatarId ?? 0) !== (previous.avatarId ?? 0))
    return false;
  if ((current.avatarFileId ?? 0) !== (previous.avatarFileId ?? 0))
    return false;
  return true;
}
