import { describe, expect, it } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { Message } from "../../../../../api";
import type { MessageEditorMessage } from "../../messageEditorTypes";

import {
  didMessageEditorSnapshotChangeAfterSave,
  getMessageEditorSnapshotFingerprint,
  mergeChangedRoomMessageRuntimeIntoEditorMessages,
  reconcileMessageEditorRuntimeBlockIds,
  resolveMessageEditorCompletedSaveState,
  resolveMessageEditorLoadFallback,
  resolveMessageEditorPersistenceCommitPlan,
  resolveMessageEditorPersistenceContext,
  resolveMessageEditorLocalSnapshotDocId,
  resolveMessageEditorPersistenceDelayMs,
  resolveMessageEditorPersistenceTarget,
  shouldPersistMessageEditorSnapshot,
  shouldSkipEmptyRoomMessageStreamSync,
  shouldSkipMessageEditorRoomStreamPersistence,
  toPatchOptimisticMessageInput,
} from "../../model/messageEditorPersistencePolicy";
import {
  createMessageEditorBlockDraft,
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
} from "../../model/messageEditorTransforms";

function withRuntimeMessage(
  message: MessageEditorMessage,
  runtime: {
    createTime?: string;
    messageId?: number;
    position?: number;
    roomId?: number;
    status?: number;
    syncId?: number;
    updateTime?: string;
    userId?: number;
  },
): MessageEditorMessage {
  return Object.assign(message, runtime);
}

describe("messageEditorPersistencePolicy", () => {
  it("persists only ready writable dirty snapshots with changed fingerprints", () => {
    const base = {
      dirtySinceLoad: true,
      docId: "doc-1",
      lastSavedFingerprint: "old",
      readOnly: false,
      ready: true,
      snapshotFingerprint: "new",
    };

    expect(shouldPersistMessageEditorSnapshot(base)).toBe(true);
    expect(shouldPersistMessageEditorSnapshot({ ...base, ready: false })).toBe(false);
    expect(shouldPersistMessageEditorSnapshot({ ...base, readOnly: true })).toBe(false);
    expect(shouldPersistMessageEditorSnapshot({ ...base, docId: undefined })).toBe(false);
    expect(shouldPersistMessageEditorSnapshot({ ...base, dirtySinceLoad: false })).toBe(false);
    expect(shouldPersistMessageEditorSnapshot({ ...base, lastSavedFingerprint: "new" })).toBe(false);
  });

  it("uses local snapshots only when the document type allows them", () => {
    expect(resolveMessageEditorLocalSnapshotDocId({
      docId: "doc-1",
      shouldUseLocalSnapshot: true,
    })).toBe("doc-1");

    expect(resolveMessageEditorLocalSnapshotDocId({
      docId: "doc-1",
      shouldUseLocalSnapshot: false,
    })).toBeUndefined();
  });

  it("resolves persistence targets from document mode and available ids", () => {
    expect(resolveMessageEditorPersistenceTarget({
      isRoomDocument: true,
      localSnapshotDocId: "local-doc",
      roomId: 123,
    })).toEqual({
      kind: "remote",
      roomId: 123,
    });

    expect(resolveMessageEditorPersistenceTarget({
      isRoomDocument: false,
      localSnapshotDocId: "local-doc",
      roomId: 123,
    })).toEqual({
      docId: "local-doc",
      kind: "local",
    });

    expect(resolveMessageEditorPersistenceTarget({
      isRoomDocument: false,
    })).toEqual({ kind: "none" });

    expect(resolveMessageEditorPersistenceTarget({
      isRoomDocument: true,
      roomId: Number.NaN,
    })).toEqual({ kind: "none" });
  });

  it("resolves persistence context from document identity and mode", () => {
    expect(resolveMessageEditorPersistenceContext({
      docId: "doc-1",
      isRoomDocument: true,
      roomId: 7,
      shouldUseLocalSnapshot: true,
    })).toEqual({
      localSnapshotDocId: "doc-1",
      persistenceTarget: {
        kind: "remote",
        roomId: 7,
      },
    });

    expect(resolveMessageEditorPersistenceContext({
      docId: "doc-1",
      isRoomDocument: false,
      roomId: 7,
      shouldUseLocalSnapshot: true,
    })).toEqual({
      localSnapshotDocId: "doc-1",
      persistenceTarget: {
        kind: "local",
        docId: "doc-1",
      },
    });

    expect(resolveMessageEditorPersistenceContext({
      docId: "doc-1",
      isRoomDocument: false,
      shouldUseLocalSnapshot: false,
    })).toEqual({
      localSnapshotDocId: undefined,
      persistenceTarget: { kind: "none" },
    });
  });

  it("resolves persistence commit plans without performing IO", () => {
    const baseline = [withRuntimeMessage(createMessageEditorTextDraft({ content: "旧正文" }), {
      messageId: 11,
      position: 1,
    })];
    const next = [withRuntimeMessage(createMessageEditorTextDraft({ content: "新正文" }), {
      messageId: 11,
      position: 1,
    })];

    expect(resolveMessageEditorPersistenceCommitPlan({
      baselineMessages: baseline,
      docId: "7",
      isRoomDocument: true,
      messages: next,
      roomId: 7,
      shouldUseLocalSnapshot: false,
    })).toMatchObject({
      kind: "remote",
      operations: [{ messageId: 11, op: "update" }],
      roomId: 7,
    });

    expect(resolveMessageEditorPersistenceCommitPlan({
      baselineMessages: [],
      docId: "local-doc",
      isRoomDocument: false,
      messages: next,
      shouldUseLocalSnapshot: true,
    })).toEqual({
      docId: "local-doc",
      kind: "local",
    });

    expect(resolveMessageEditorPersistenceCommitPlan({
      baselineMessages: [],
      isRoomDocument: false,
      messages: next,
      shouldUseLocalSnapshot: false,
    })).toEqual({ kind: "none" });
  });

  it("resolves save delays for local snapshots and remote room sync", () => {
    expect(resolveMessageEditorPersistenceDelayMs({ isRoomDocument: false })).toBe(500);
    expect(resolveMessageEditorPersistenceDelayMs({ isRoomDocument: true })).toBe(10000);
  });

  it("resolves load fallback from seeded document messages or the current draft", () => {
    const seeded = [createMessageEditorTextDraft({ content: "seeded" })];
    const current = [createMessageEditorTextDraft({ content: "current" })];

    expect(resolveMessageEditorLoadFallback({
      currentMessages: current,
      docId: "doc-1",
      seededInitialMessages: seeded,
    })).toBe(seeded);

    const emptySeedFallback = resolveMessageEditorLoadFallback({
      currentMessages: current,
      docId: "doc-1",
      seededInitialMessages: [],
    });
    expect(emptySeedFallback).toHaveLength(1);
    expect(emptySeedFallback[0].content).toBe("");

    expect(resolveMessageEditorLoadFallback({
      currentMessages: current,
      seededInitialMessages: seeded,
    })).toBe(current);

    const emptyDraftFallback = resolveMessageEditorLoadFallback({
      currentMessages: [],
      seededInitialMessages: seeded,
    });
    expect(emptyDraftFallback).toHaveLength(1);
    expect(emptyDraftFallback[0].content).toBe("");
  });

  it("skips room message stream persistence only for empty room documents with a valid room", () => {
    expect(shouldSkipMessageEditorRoomStreamPersistence({
      isRoomDocument: true,
      messages: [],
      roomId: 123,
    })).toBe(true);
    expect(shouldSkipMessageEditorRoomStreamPersistence({
      isRoomDocument: true,
      messages: [
        createMessageEditorTextDraft({ content: "  \n " }),
        createMessageEditorTextDraft({ content: "", messageType: MESSAGE_TYPE.INTRO_TEXT }),
      ],
      roomId: 123,
    })).toBe(true);

    expect(shouldSkipMessageEditorRoomStreamPersistence({
      isRoomDocument: false,
      messages: [],
      roomId: 123,
    })).toBe(false);
    expect(shouldSkipMessageEditorRoomStreamPersistence({
      isRoomDocument: true,
      messages: [],
      roomId: Number.NaN,
    })).toBe(false);
    expect(shouldSkipMessageEditorRoomStreamPersistence({
      isRoomDocument: true,
      messages: [createMessageEditorTextDraft({ content: "正文" })],
      roomId: 123,
    })).toBe(false);
    expect(shouldSkipMessageEditorRoomStreamPersistence({
      isRoomDocument: true,
      messages: [createMessageEditorBlockDraft("image")],
      roomId: 123,
    })).toBe(false);
  });

  it("still exposes the empty-content rule independently from room state", () => {
    expect(shouldSkipEmptyRoomMessageStreamSync([
      createMessageEditorTextDraft({ content: "  \n " }),
      createMessageEditorTextDraft({ content: "", messageType: MESSAGE_TYPE.INTRO_TEXT }),
    ])).toBe(true);
    expect(shouldSkipEmptyRoomMessageStreamSync([
      createMessageEditorTextDraft({ content: "正文" }),
    ])).toBe(false);
    expect(shouldSkipEmptyRoomMessageStreamSync([
      createMessageEditorBlockDraft("image"),
    ])).toBe(false);
  });

  it("creates stable fingerprints independent of object key insertion order", () => {
    const first = Object.assign(createMessageEditorTextDraft({ content: "same" }), { roleId: 1 });
    const second = {
      ...createMessageEditorTextDraft({ content: "same" }),
      roleId: 1,
      __tcBlockId: getMessageEditorBlockId(first),
    };

    expect(getMessageEditorSnapshotFingerprint([first])).toBe(getMessageEditorSnapshotFingerprint([second]));
  });

  it("advances baseline only to the snapshot that was actually submitted", () => {
    const submitted = [createMessageEditorTextDraft({ content: "submitted" })];
    const saved = [withRuntimeMessage({ ...submitted[0] }, {
      messageId: 101,
      position: 1,
      roomId: 7,
    })];
    const current = [{ ...submitted[0], content: "edited while saving" }];

    expect(didMessageEditorSnapshotChangeAfterSave({
      currentMessages: current,
      submittedMessages: submitted,
    })).toBe(true);

    const completed = resolveMessageEditorCompletedSaveState({
      currentMessages: current,
      savedMessages: saved,
      submittedMessages: submitted,
    });

    expect(completed.currentChangedAfterSubmit).toBe(true);
    expect(completed.dirtySinceSave).toBe(true);
    expect(completed.nextMessages[0].content).toBe("edited while saving");
    expect(completed.savedMessages[0]).toMatchObject({
      content: "submitted",
      messageId: 101,
    });
  });

  it("accepts the saved snapshot when current did not change after submission", () => {
    const submitted = [createMessageEditorTextDraft({ content: "submitted" })];
    const saved = [withRuntimeMessage({ ...submitted[0] }, {
      messageId: 101,
      position: 1,
      roomId: 7,
    })];

    const completed = resolveMessageEditorCompletedSaveState({
      currentMessages: submitted,
      savedMessages: saved,
      submittedMessages: submitted,
    });

    expect(completed.currentChangedAfterSubmit).toBe(false);
    expect(completed.dirtySinceSave).toBe(false);
    expect(completed.nextMessages[0]).toMatchObject({
      content: "submitted",
      messageId: 101,
    });
  });

  it("preserves runtime block ids across a same-room persisted snapshot echo", () => {
    const current = withRuntimeMessage(createMessageEditorTextDraft({ content: "same" }), {
      messageId: 101,
      position: 1,
      roomId: 7,
    });
    const incoming = withRuntimeMessage(createMessageEditorTextDraft({ content: "same" }), {
      messageId: 101,
      position: 1,
      roomId: 7,
    });
    const remoteInsert = withRuntimeMessage(createMessageEditorTextDraft({ content: "remote" }), {
      messageId: 102,
      position: 2,
      roomId: 7,
    });
    const currentBlockId = getMessageEditorBlockId(current);
    const incomingBlockId = getMessageEditorBlockId(incoming);

    const reconciled = reconcileMessageEditorRuntimeBlockIds({
      currentMessages: [current],
      incomingMessages: [incoming, remoteInsert],
    });

    expect(incomingBlockId).not.toBe(currentBlockId);
    expect(getMessageEditorBlockId(reconciled[0])).toBe(currentBlockId);
    expect(getMessageEditorBlockId(reconciled[1])).not.toBe(currentBlockId);
  });

  it("merges only server runtime fields into a draft changed during remote save", () => {
    const submitted = createMessageEditorTextDraft({ content: "submitted" });
    const current = {
      ...submitted,
      content: "edited while saving",
    };
    const changedMessage = {
      ...submitted,
      content: "server content",
      messageId: 101,
      position: 1,
      roomId: 7,
      status: 1,
      syncId: 201,
      userId: 9,
    } as Message;

    const merged = mergeChangedRoomMessageRuntimeIntoEditorMessages({
      changedMessages: [changedMessage],
      currentMessages: [current],
      operations: [{
        clientId: getMessageEditorBlockId(current),
        message: submitted,
        op: "insert",
        position: 1,
      }],
    });

    expect(merged[0]).toMatchObject({
      content: "edited while saving",
      messageId: 101,
      position: 1,
      roomId: 7,
      status: 1,
      syncId: 201,
      userId: 9,
    });
  });

  it("clears persisted identity when a deleted block was restored during save", () => {
    const current = withRuntimeMessage(createMessageEditorTextDraft({ content: "restored locally" }), {
      messageId: 101,
      position: 1,
      roomId: 7,
      syncId: 201,
    });

    const merged = mergeChangedRoomMessageRuntimeIntoEditorMessages({
      changedMessages: [{
        content: "deleted",
        messageId: 101,
        messageType: MESSAGE_TYPE.TEXT,
        position: 1,
        roomId: 7,
        status: 1,
        syncId: 201,
        userId: 9,
      }],
      currentMessages: [current],
      operations: [{
        messageId: 101,
        op: "delete",
      }],
    });

    expect(merged[0].content).toBe("restored locally");
    expect(merged[0].messageId).toBeUndefined();
    expect(merged[0].position).toBeUndefined();
    expect(merged[0].roomId).toBeUndefined();
    expect(merged[0].syncId).toBeUndefined();
  });

  it("maps editor runtime fields into optimistic patch input", () => {
    const message = withRuntimeMessage(Object.assign(createMessageEditorTextDraft({
      content: "hello",
      messageType: MESSAGE_TYPE.TEXT,
    }), {
      avatarId: 6,
      roleId: 5,
    }), {
      createTime: "2026-01-01T00:00:00.000Z",
      messageId: 123,
      position: 7,
      roomId: 9,
      status: 1,
      syncId: 456,
      updateTime: "2026-01-01T00:01:00.000Z",
      userId: 8,
    });

    expect(toPatchOptimisticMessageInput(message)).toMatchObject({
      avatarId: 6,
      clientId: getMessageEditorBlockId(message),
      content: "hello",
      createTime: "2026-01-01T00:00:00.000Z",
      messageId: 123,
      messageType: MESSAGE_TYPE.TEXT,
      position: 7,
      roleId: 5,
      roomId: 9,
      status: 1,
      syncId: 456,
      updateTime: "2026-01-01T00:01:00.000Z",
      userId: 8,
    });
  });
});
