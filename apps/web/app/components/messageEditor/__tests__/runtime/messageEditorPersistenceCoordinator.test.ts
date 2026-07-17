import {
  createMessageEditorTextDraft,
  getMessageEditorBlockId,
  updateMessageEditorTextContent,
} from "../../model/messageEditorTransforms";
import { MessageEditorPersistenceCoordinator } from "../../runtime/messageEditorPersistenceCoordinator";

const LOCAL_CONTEXT = {
  docId: "local-doc",
  isRoomDocument: false,
  readOnly: false,
  ready: true,
  shouldUseLocalSnapshot: true,
} as const;

const REMOTE_CONTEXT = {
  docId: "7",
  isRoomDocument: true,
  readOnly: false,
  ready: true,
  roomId: 7,
  shouldUseLocalSnapshot: false,
} as const;

describe("MessageEditorPersistenceCoordinator", () => {
  it("uses dirty block metadata for a content-only remote patch", () => {
    const baselineMessage = Object.assign(createMessageEditorTextDraft({ content: "before" }), {
      messageId: 11,
      position: 1,
      roomId: 7,
    });
    const currentMessage = updateMessageEditorTextContent(baselineMessage, "after");
    const blockId = getMessageEditorBlockId(baselineMessage);
    const coordinator = new MessageEditorPersistenceCoordinator([baselineMessage]);

    coordinator.markDocumentChanged([currentMessage], true, {
      changedBlockIds: [blockId],
      structureChanged: false,
    });
    const startResult = coordinator.beginSave([currentMessage], REMOTE_CONTEXT);

    expect(startResult.kind).toBe("started");
    if (startResult.kind !== "started") {
      return;
    }
    expect(startResult.transaction.plan).toMatchObject({
      kind: "remote",
      operations: [{ messageId: 11, op: "update" }],
    });
  });

  it("keeps a later edit to the submitted block in the next journal", () => {
    const baselineMessage = Object.assign(createMessageEditorTextDraft({ content: "before" }), {
      messageId: 11,
      position: 1,
      roomId: 7,
    });
    const submittedMessage = updateMessageEditorTextContent(baselineMessage, "submitted");
    const laterMessage = updateMessageEditorTextContent(submittedMessage, "later");
    const blockId = getMessageEditorBlockId(baselineMessage);
    const coordinator = new MessageEditorPersistenceCoordinator([baselineMessage]);

    coordinator.markDocumentChanged([submittedMessage], true, {
      changedBlockIds: [blockId],
      structureChanged: false,
    });
    const startResult = coordinator.beginSave([submittedMessage], REMOTE_CONTEXT);
    expect(startResult.kind).toBe("started");
    if (startResult.kind !== "started") {
      return;
    }

    coordinator.markDocumentChanged([laterMessage], true, {
      changedBlockIds: [blockId],
      structureChanged: false,
    });
    expect(coordinator.beginSave([laterMessage], REMOTE_CONTEXT)).toEqual({ kind: "deferred" });
    const completed = coordinator.completeSave(startResult.transaction, {
      savedMessages: [submittedMessage],
    }, [laterMessage]);

    expect(completed?.dirtySinceSave).toBe(true);
    expect(completed?.nextMessages[0].content).toBe("later");
    expect(coordinator.finishSave(startResult.transaction)).toBe(true);
    const retryResult = coordinator.beginSave([laterMessage], REMOTE_CONTEXT);
    expect(retryResult.kind).toBe("started");
    if (retryResult.kind === "started") {
      expect(retryResult.transaction.plan).toMatchObject({
        operations: [{ messageId: 11, op: "update" }],
      });
    }
  });

  it("clears the journal when a block returns to its baseline before save", () => {
    const baselineMessage = Object.assign(createMessageEditorTextDraft({ content: "before" }), {
      messageId: 11,
      position: 1,
      roomId: 7,
    });
    const changedMessage = updateMessageEditorTextContent(baselineMessage, "changed");
    const revertedMessage = updateMessageEditorTextContent(changedMessage, "before");
    const blockId = getMessageEditorBlockId(baselineMessage);
    const coordinator = new MessageEditorPersistenceCoordinator([baselineMessage]);

    coordinator.markDocumentChanged([changedMessage], true, {
      changedBlockIds: [blockId],
      structureChanged: false,
    });
    coordinator.markDocumentChanged([revertedMessage], true, {
      changedBlockIds: [blockId],
      structureChanged: false,
    });

    expect(coordinator.beginSave([revertedMessage], REMOTE_CONTEXT)).toEqual({
      kind: "skipped",
      reason: "unchanged",
    });
    expect(coordinator.hasDirtyChanges()).toBe(false);
  });

  it("does not clear a dirty optimistic block merely because it has no patch operation", () => {
    const baselineMessage = Object.assign(createMessageEditorTextDraft({ content: "before" }), {
      messageId: 11,
      position: 1,
      roomId: 7,
    });
    const optimisticMessage = Object.assign(updateMessageEditorTextContent(baselineMessage, "pending"), {
      messageId: -1,
      syncId: -1,
      tcLocalSyncState: "optimistic",
    });
    const blockId = getMessageEditorBlockId(baselineMessage);
    const coordinator = new MessageEditorPersistenceCoordinator([baselineMessage]);

    coordinator.markDocumentChanged([optimisticMessage], true, {
      changedBlockIds: [blockId],
      structureChanged: false,
    });
    const startResult = coordinator.beginSave([optimisticMessage], REMOTE_CONTEXT);

    expect(startResult.kind).toBe("started");
    if (startResult.kind === "started") {
      expect(startResult.transaction.plan).toMatchObject({
        kind: "remote",
        operations: [],
      });
    }
    expect(coordinator.hasDirtyChanges()).toBe(true);
  });

  it("starts a save only after the document differs from its persisted baseline", () => {
    const baseline = [createMessageEditorTextDraft({ content: "baseline" })];
    const coordinator = new MessageEditorPersistenceCoordinator(baseline);

    expect(coordinator.beginSave(baseline, LOCAL_CONTEXT)).toEqual({
      kind: "skipped",
      reason: "unchanged",
    });

    const current = [createMessageEditorTextDraft({ content: "changed" })];
    coordinator.markDocumentChanged(current, true);
    const startResult = coordinator.beginSave(current, LOCAL_CONTEXT);

    expect(startResult.kind).toBe("started");
    if (startResult.kind !== "started") {
      throw new Error("expected a started persistence transaction");
    }
    expect(startResult.transaction.plan).toEqual({
      docId: "local-doc",
      kind: "local",
    });
    expect(startResult.transaction.submittedMessages[0].content).toBe("changed");
  });

  it("clears a cheap dirty mark when the deferred snapshot equals the baseline", () => {
    const baseline = [createMessageEditorTextDraft({ content: "baseline" })];
    const coordinator = new MessageEditorPersistenceCoordinator(baseline);

    coordinator.markDocumentChanged(baseline, true);

    expect(coordinator.shouldScheduleSave(LOCAL_CONTEXT)).toBe(true);
    expect(coordinator.beginSave(baseline, LOCAL_CONTEXT)).toEqual({
      kind: "skipped",
      reason: "unchanged",
    });
    expect(coordinator.hasDirtyChanges()).toBe(false);
  });

  it("keeps later edits dirty and requests one deferred save after the active transaction", () => {
    const baseline = [createMessageEditorTextDraft({ content: "baseline" })];
    const submitted = [createMessageEditorTextDraft({ content: "submitted" })];
    const laterCurrent = [createMessageEditorTextDraft({ content: "edited later" })];
    const coordinator = new MessageEditorPersistenceCoordinator(baseline);
    coordinator.markDocumentChanged(submitted, true);
    const startResult = coordinator.beginSave(submitted, LOCAL_CONTEXT);
    expect(startResult.kind).toBe("started");
    if (startResult.kind !== "started") {
      return;
    }

    coordinator.markDocumentChanged(laterCurrent, true);
    expect(coordinator.beginSave(laterCurrent, LOCAL_CONTEXT)).toEqual({ kind: "deferred" });

    const completed = coordinator.completeSave(startResult.transaction, {
      savedMessages: startResult.transaction.submittedMessages,
    }, laterCurrent);

    expect(completed?.nextMessages[0].content).toBe("edited later");
    expect(completed?.dirtySinceSave).toBe(true);
    expect(coordinator.finishSave(startResult.transaction)).toBe(true);
    expect(coordinator.hasDirtyChanges()).toBe(true);
  });

  it("does not advance baseline when a save finishes without a confirmed result", () => {
    const baseline = [createMessageEditorTextDraft({ content: "baseline" })];
    const current = [createMessageEditorTextDraft({ content: "changed" })];
    const coordinator = new MessageEditorPersistenceCoordinator(baseline);
    coordinator.markDocumentChanged(current, true);
    const startResult = coordinator.beginSave(current, LOCAL_CONTEXT);
    expect(startResult.kind).toBe("started");
    if (startResult.kind !== "started") {
      return;
    }

    expect(coordinator.finishSave(startResult.transaction)).toBe(false);
    expect(coordinator.hasDirtyChanges()).toBe(true);

    const retryResult = coordinator.beginSave(current, LOCAL_CONTEXT);
    expect(retryResult.kind).toBe("started");
  });
});
