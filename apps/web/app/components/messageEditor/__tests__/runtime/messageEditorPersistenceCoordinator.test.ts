import { createMessageEditorTextDraft } from "../../model/messageEditorTransforms";
import { MessageEditorPersistenceCoordinator } from "../../runtime/messageEditorPersistenceCoordinator";

const LOCAL_CONTEXT = {
  docId: "local-doc",
  isRoomDocument: false,
  readOnly: false,
  ready: true,
  shouldUseLocalSnapshot: true,
} as const;

describe("MessageEditorPersistenceCoordinator", () => {
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
