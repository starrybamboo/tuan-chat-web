import { patchRemoteRoomMessageStream } from "@/components/chat/infra/doc/document/roomMessageStreamApi";

import type { MessageEditorMessage } from "../messageEditorTypes";
import type { RoomDocumentCloudSave, RoomMessagePatchGateway } from "./roomDocumentEditSession";

import {
  buildRoomMessagePatchOperations,
  getMessageEditorPatchMutationMeta,
  mergeChangedRoomMessagesIntoEditorMessages,
} from "../model/messageEditorPersistencePolicy";

/** API adapter: 房间会话核心通过此端口提交，不依赖 TanStack Query 或 API client。 */
export function createRoomDocumentPatchGateway(): RoomMessagePatchGateway {
  return {
    async save(save: RoomDocumentCloudSave, baseMessages: MessageEditorMessage[]) {
      const operations = buildRoomMessagePatchOperations(baseMessages, save.messages);
      if (operations.length === 0) {
        return save.messages;
      }
      const changedMessages = await patchRemoteRoomMessageStream({
        mutationMeta: getMessageEditorPatchMutationMeta("doc_view"),
        operations,
        roomId: save.identity.roomId,
      });
      return mergeChangedRoomMessagesIntoEditorMessages({
        changedMessages,
        currentMessages: save.messages,
        operations,
      });
    },
  };
}
