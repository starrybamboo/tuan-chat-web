import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { isDirectReadLineMessage } from "@tuanchat/domain/direct-message";

export function hasPersistableDirectInboxMessages(messages: readonly MessageDirectResponse[] | undefined): boolean {
  // 本地待确认消息由 pending 表持久化，也必须阻止清空整个私聊仓储。
  return (messages ?? []).some(message => !isDirectReadLineMessage(message));
}
