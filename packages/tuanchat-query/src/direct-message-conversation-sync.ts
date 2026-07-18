import type { MessageDirectConversationSyncRequest } from "@tuanchat/openapi-client/models/MessageDirectConversationSyncRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type DirectConversationSyncClient = Pick<TuanChat, "messageDirectController">;

export function syncDirectConversation(
  client: DirectConversationSyncClient,
  input: MessageDirectConversationSyncRequest,
) {
  return client.messageDirectController.syncConversation(input);
}
