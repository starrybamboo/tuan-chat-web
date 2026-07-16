import type { Message } from "../../../../../api";
import type { MessageEditorSnapshot } from "../../model/messageEditorCodec";
import type { MessageEditorSaveTransaction } from "../../runtime/messageEditorPersistenceCoordinator";

const strategyMocks = vi.hoisted(() => ({
  getCachedDocSnapshot: vi.fn(),
  getPersistedDocSnapshot: vi.fn(),
  patchRemoteRoomMessageStream: vi.fn(),
  setCachedDocSnapshot: vi.fn<(docId: string, snapshot: unknown) => void>(),
  setPersistedDocSnapshot: vi.fn<(docId: string, snapshot: unknown) => Promise<void>>(),
}));

vi.mock("@/components/chat/infra/doc/document/docSnapshotCache", () => ({
  getCachedDocSnapshot: strategyMocks.getCachedDocSnapshot,
  setCachedDocSnapshot: strategyMocks.setCachedDocSnapshot,
}));

vi.mock("@/components/chat/infra/doc/document/docSnapshotPersistence", () => ({
  getPersistedDocSnapshot: strategyMocks.getPersistedDocSnapshot,
  setPersistedDocSnapshot: strategyMocks.setPersistedDocSnapshot,
}));

vi.mock("@/components/chat/infra/doc/document/roomMessageStreamApi", () => ({
  patchRemoteRoomMessageStream: strategyMocks.patchRemoteRoomMessageStream,
}));

import { decodeMessageEditorMessages } from "../../model/messageEditorCodec";
import {
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
} from "../../model/messageEditorTransforms";
import {
  buildMessageEditorOptimisticRollbackMessages,
  executeMessageEditorPersistenceStrategy,
  mergeMessageEditorRemotePatchSaveResult,
} from "../../runtime/messageEditorPersistenceStrategies";

function createPersistedMessage(content: string): Message {
  return {
    content,
    createTime: "2026-07-14 12:00:00",
    messageId: 101,
    messageType: 1,
    position: 1,
    roomId: 7,
    status: 0,
    syncId: 201,
    updateTime: "2026-07-14 12:00:00",
    userId: 9,
  };
}

describe("messageEditorPersistenceStrategies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    strategyMocks.getCachedDocSnapshot.mockReturnValue(null);
    strategyMocks.getPersistedDocSnapshot.mockResolvedValue(null);
    strategyMocks.setPersistedDocSnapshot.mockResolvedValue(undefined);
  });

  it("keeps the submitted batch when no remote operations are required", () => {
    const submittedMessages = [createMessageEditorTextDraft({ content: "unchanged" })];

    const savedMessages = mergeMessageEditorRemotePatchSaveResult({
      changedMessages: [],
      operations: [],
      submittedMessages,
    });

    expect(savedMessages).toEqual(submittedMessages);
  });

  it("reconciles an inserted message identity for the whole submitted batch", () => {
    const draft = createMessageEditorTextDraft({ content: "created" });
    const persistedMessage = createPersistedMessage("created");

    const savedMessages = mergeMessageEditorRemotePatchSaveResult({
      changedMessages: [persistedMessage],
      operations: [{
        clientId: getMessageEditorBlockId(draft),
        message: draft,
        op: "insert",
        position: 1,
      }],
      submittedMessages: [draft],
    });

    expect(savedMessages).toHaveLength(1);
    expect(savedMessages[0]).toMatchObject({
      content: "created",
      messageId: 101,
      roomId: 7,
      syncId: 201,
    });
  });

  it("rejects a partial remote response instead of committing a partial batch", () => {
    const draft = createMessageEditorTextDraft({ content: "created" });

    expect(() => mergeMessageEditorRemotePatchSaveResult({
      changedMessages: [],
      operations: [{
        clientId: getMessageEditorBlockId(draft),
        message: draft,
        op: "insert",
        position: 1,
      }],
      submittedMessages: [draft],
    })).toThrow("房间消息变更响应数量不匹配");
  });

  it("rolls back optimistic inserts and restores affected persisted messages", () => {
    const baseline = createPersistedMessage("before");
    const optimisticInsert = {
      ...createPersistedMessage("new"),
      messageId: -1,
      syncId: -1,
      tcLocalSyncState: "optimistic",
    } as Message;
    const optimisticUpdate = {
      ...createPersistedMessage("after"),
      tcLocalSyncState: "optimistic",
    } as Message;

    const rollbackMessages = buildMessageEditorOptimisticRollbackMessages({
      baselineMessages: [baseline],
      optimisticMessages: [optimisticInsert, optimisticUpdate],
      operations: [{
        clientId: "new-block",
        message: optimisticInsert,
        op: "insert",
        position: 2,
      }, {
        message: optimisticUpdate,
        messageId: 101,
        op: "update",
        position: 1,
      }],
      roomId: 7,
    });

    expect(rollbackMessages).toHaveLength(2);
    expect(rollbackMessages[0]).toMatchObject({
      messageId: -1,
      status: 1,
    });
    expect(rollbackMessages[1]).toMatchObject({
      content: "before",
      messageId: 101,
      status: 0,
    });
  });

  it("publishes optimistic and committed batches around one successful remote patch", async () => {
    const baseline = createPersistedMessage("before");
    const submitted = {
      ...baseline,
      content: "after",
    };
    const committed = {
      ...submitted,
      updateTime: "2026-07-14 12:01:00",
    };
    const transaction: MessageEditorSaveTransaction = {
      baselineMessages: [baseline],
      generation: 1,
      plan: {
        kind: "remote",
        operations: [{
          message: submitted,
          messageId: 101,
          op: "update",
          position: 1,
        }],
        roomId: 7,
      },
      submittedMessages: [submitted],
    };
    const events: string[] = [];
    const publish = vi.fn<(messages: Message[]) => Promise<void>>(async (messages) => {
      const message = messages[0] as Message & { tcLocalSyncState?: string };
      events.push(message.tcLocalSyncState === "optimistic" ? "optimistic" : "committed");
    });
    strategyMocks.patchRemoteRoomMessageStream.mockImplementation(async () => {
      events.push("patch");
      return [committed];
    });

    const result = await executeMessageEditorPersistenceStrategy(transaction, {
      onRemoteMessagesSaved: publish,
      remotePatchSourceSurface: "doc_view",
    });

    expect(events).toEqual(["optimistic", "patch", "committed"]);
    expect(result.changedMessages).toEqual([committed]);
    expect(result.savedMessages[0]).toMatchObject({
      content: "after",
      updateTime: "2026-07-14 12:01:00",
    });
  });

  it("publishes one optimistic batch and compensates it when the remote patch fails", async () => {
    const baseline = createPersistedMessage("before");
    const submitted = {
      ...baseline,
      content: "after",
    };
    const transaction: MessageEditorSaveTransaction = {
      baselineMessages: [baseline],
      generation: 1,
      plan: {
        kind: "remote",
        operations: [{
          message: submitted,
          messageId: 101,
          op: "update",
          position: 1,
        }],
        roomId: 7,
      },
      submittedMessages: [submitted],
    };
    const publish = vi.fn<(messages: Message[]) => Promise<void>>(async () => undefined);
    strategyMocks.patchRemoteRoomMessageStream.mockRejectedValue(new Error("offline"));

    await expect(executeMessageEditorPersistenceStrategy(transaction, {
      onRemoteMessagesSaved: publish,
      remotePatchSourceSurface: "doc_view",
    })).rejects.toThrow("offline");

    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[0][0][0]).toMatchObject({
      content: "after",
      messageId: 101,
      tcLocalSyncState: "optimistic",
    });
    expect(publish.mock.calls[1][0][0]).toMatchObject({
      content: "before",
      messageId: 101,
      status: 0,
    });
  });

  it("restores the previous local cache snapshot when durable persistence fails", async () => {
    const baseline = createMessageEditorTextDraft({ content: "before" });
    const submitted = createMessageEditorTextDraft({ content: "after" });
    const transaction: MessageEditorSaveTransaction = {
      baselineMessages: [baseline],
      generation: 1,
      plan: {
        docId: "local-doc",
        kind: "local",
      },
      submittedMessages: [submitted],
    };
    strategyMocks.setPersistedDocSnapshot.mockRejectedValue(new Error("disk full"));

    await expect(executeMessageEditorPersistenceStrategy(transaction, {
      remotePatchSourceSurface: "message_editor",
    })).rejects.toThrow("disk full");

    expect(strategyMocks.setCachedDocSnapshot).toHaveBeenCalledTimes(2);
    expect(decodeMessageEditorMessages(strategyMocks.setCachedDocSnapshot.mock.calls[0]![1] as MessageEditorSnapshot)[0].content).toBe("after");
    expect(decodeMessageEditorMessages(strategyMocks.setCachedDocSnapshot.mock.calls[1]![1] as MessageEditorSnapshot)[0].content).toBe("before");
  });
});
