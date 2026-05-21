import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { isDirectReadLineMessage } from "@tuanchat/domain/direct-message";

export function hasPersistableDirectInboxMessages(messages: readonly MessageDirectResponse[] | undefined): boolean {
  return (messages ?? []).some(message => !isDirectReadLineMessage(message));
}
