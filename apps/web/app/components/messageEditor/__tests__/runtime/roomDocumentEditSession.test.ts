import { describe, expect, it, vi } from "vitest";

import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import type { MessageEditorMessage } from "../../messageEditorTypes";

import { createMessageEditorBlockDraft, setMessageEditorUploadedMedia, updateMessageEditorMediaSize } from "../../model/messageEditorTransforms";
import {
  RoomDocumentEditSession,
  RoomDocumentEditSessionRunner,
  type RoomDocumentEditSessionSnapshot,
} from "../../runtime/roomDocumentEditSession";

function message(content: string, messageId = 1): MessageEditorMessage {
  return { content, messageId, messageType: 1, position: 1, roomId: 10, syncId: messageId, userId: 1 };
}

function createRunner(params: {
  commit?: (messages: MessageEditorMessage[]) => Promise<void>;
  gateway?: (messages: MessageEditorMessage[]) => Promise<MessageEditorMessage[]>;
  now: () => number;
  overlaySave?: (snapshot: RoomDocumentEditSessionSnapshot) => Promise<void>;
  reconcile?: () => Promise<MessageEditorMessage[] | null>;
  session: RoomDocumentEditSession;
}) {
  const remove = vi.fn(async () => undefined);
  const save = vi.fn(params.overlaySave ?? (async () => undefined));
  const gateway = vi.fn(async (request: { messages: MessageEditorMessage[] }) => (
    params.gateway?.(request.messages) ?? request.messages
  ));
  const runner = new RoomDocumentEditSessionRunner({
    clock: { now: params.now },
    classifyFailure: (request) => request.messages.some(item => (item.messageId ?? 0) <= 0) ? "ambiguous" : "retry",
    commitConfirmedMessages: params.commit ?? (async () => undefined),
    gateway: { save: gateway },
    onSnapshot: () => undefined,
    overlayRepository: { load: async () => null, remove, save },
    reconcileAmbiguousInsert: params.reconcile,
    scheduler: { clear: () => undefined, schedule: () => 1 },
    session: params.session,
  });
  return { gateway, remove, runner, save };
}

describe("RoomDocumentEditSession", () => {
  it("uses 500ms local debounce, 2s cloud debounce, and shows editing before execution", () => {
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [message("base")] });
    session.edit([message("draft")], 1000);
    expect(session.getSnapshot().progress).toEqual({ backgroundPhase: undefined, phase: "editing" });
    expect(session.getDue(1499)).toEqual({ cloud: false, local: false });
    expect(session.getDue(1500)).toEqual({ cloud: false, local: true });
    expect(session.getDue(3000)).toEqual({ cloud: true, local: true });
  });

  it("accumulates SQLite execution time and does not let an old local revision clear a new one", () => {
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [message("base")] });
    session.edit([message("N")], 0);
    const persisted = session.beginLocalSave(500);
    session.edit([message("N+1")], 501);
    session.finishLocalSave(persisted.revision, 120);
    expect(session.getSnapshot().progress?.phase).toBe("editing");
    expect(session.getDue(1001).local).toBe(true);
  });

  it("persists removed confirmed messages as overlay tombstones and keeps reordered positions", () => {
    const first = message("first", 1);
    const second = { ...message("second", 2), position: 2 };
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [first, second] });
    session.edit([{ ...second, position: 1 }], 0);
    const snapshot = session.getSnapshot();
    expect(snapshot.messages).toEqual([expect.objectContaining({ messageId: 2, position: 1 })]);
    expect(snapshot.tombstones).toEqual([expect.objectContaining({ messageId: 1, status: 1 })]);
  });

  it("injects an old cloud revision identity without marking a newer revision synced", () => {
    const draft = message("draft", -1);
    draft.tcLocalRenderKey = "message-editor:block-a";
    draft.tcMessageEditorDraft = true;
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [] });
    session.edit([draft], 0);
    session.edit([{ ...draft, content: "newer" }], 10);
    const confirmed = { ...draft, messageId: 88, syncId: 99, tcMessageEditorDraft: false };
    expect(session.acknowledge(1, [confirmed], 250)).toBe(false);
    expect(session.getSnapshot().messages[0]).toMatchObject({ content: "newer", messageId: 88, syncId: 99 });
    expect(session.getSnapshot().progress?.phase).toBe("editing");
  });

  it("continues cloud sync when the first SQLite write fails", async () => {
    let now = 2000;
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [message("base")] });
    session.edit([message("draft")], 0);
    const { gateway, runner } = createRunner({
      now: () => now,
      overlaySave: async () => { throw new Error("sqlite unavailable"); },
      session,
    });
    runner.start();
    await vi.waitFor(() => expect(session.getSnapshot().progress?.phase).toBe("synced"));
    expect(gateway).toHaveBeenCalledTimes(1);
    now += 1;
    runner.stop();
  });

  it("commits deletion tombstones with the confirmed projection", async () => {
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [message("remove me", 7)] });
    session.edit([], 0);
    const commit = vi.fn(async () => undefined);
    const { runner } = createRunner({ commit, now: () => 2000, session });
    runner.start();
    await vi.waitFor(() => expect(session.getSnapshot().progress?.phase).toBe("synced"));
    expect(commit).toHaveBeenCalledWith([
      expect.objectContaining({ messageId: 7, status: 1 }),
    ]);
    runner.stop();
  });

  it("persists local media layout when the server confirmation omits editor dimensions", async () => {
    const resized = Object.assign(updateMessageEditorMediaSize(setMessageEditorUploadedMedia(
      createMessageEditorBlockDraft("video"),
      { fileId: 47, fileName: "clip.webm", height: 1080, mediaType: "video", size: 4096, width: 1920 },
    ), { height: 405, width: 720 }), {
      messageId: 47,
      position: 1,
      roomId: 10,
      syncId: 47,
      userId: 1,
    });
    const confirmed = {
      ...resized,
      extra: { videoMessage: { fileId: 47, fileName: "clip.webm", height: 1080, mediaType: "video", size: 4096, width: 1920 } },
      messageType: MESSAGE_TYPE.VIDEO,
      syncId: 48,
    };
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [resized] });
    session.edit([resized], 0);
    const commit = vi.fn<(messages: MessageEditorMessage[]) => Promise<void>>(async () => undefined);
    const { runner } = createRunner({
      commit,
      gateway: async () => [confirmed],
      now: () => 2000,
      session,
    });

    runner.start();
    await vi.waitFor(() => expect(session.getSnapshot().progress?.phase).toBe("synced"));

    const persisted = commit.mock.calls[0]?.[0]?.[0];
    expect(persisted?.syncId).toBe(48);
    expect((persisted?.extra?.videoMessage as { editorHeight?: number; editorWidth?: number } | undefined))
      .toMatchObject({ editorHeight: 405, editorWidth: 720 });
    expect((session.getSnapshot().messages[0]?.extra?.videoMessage as { editorWidth?: number } | undefined)?.editorWidth).toBe(720);
    runner.stop();
  });

  it("marks confirmed content for local backfill when the post-ack SQLite write fails", async () => {
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [message("base")] });
    session.edit([message("draft")], 0);
    const { runner, save } = createRunner({
      commit: async () => { throw new Error("sqlite unavailable"); },
      now: () => 2000,
      session,
    });
    runner.start();
    await vi.waitFor(() => expect(session.getSnapshot().progress?.phase).toBe("syncedLocalPending"));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ localCachePending: true }));
    runner.stop();
  });

  it("uses 1s then 2s exponential cloud retry delays", async () => {
    let now = 2000;
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [message("base")] });
    session.edit([message("draft")], 0);
    const { runner } = createRunner({ gateway: async () => { throw new Error("offline"); }, now: () => now, session });
    runner.start();
    await vi.waitFor(() => expect(session.getSnapshot().progress).toMatchObject({ dueAt: 3000, phase: "retrying" }));
    now = 3000;
    runner.wake();
    await vi.waitFor(() => expect(session.getSnapshot().progress).toMatchObject({ dueAt: 5000, phase: "retrying" }));
    runner.stop();
  });

  it("reconciles an uncertain insert once and never automatically replays it when not unique", async () => {
    const inserted = message("insert", -1);
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [] });
    session.edit([inserted], 0);
    const reconcile = vi.fn(async () => null);
    const { gateway, runner } = createRunner({
      gateway: async () => { throw new Error("unknown result"); },
      now: () => 2000,
      reconcile,
      session,
    });
    runner.start();
    await vi.waitFor(() => expect(session.getSnapshot().state).toBe("ambiguous"));
    expect(gateway).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().messages[0]?.content).toBe("insert");
    runner.stop();
  });

  it("restores a confirmed cache marker as local-only backfill without a cloud request", async () => {
    const session = new RoomDocumentEditSession({ identity: { roomId: 10, userId: 1 }, messages: [] });
    session.restore({
      baseMessages: [message("confirmed")],
      identity: session.identity,
      localCachePending: true,
      messages: [message("confirmed")],
      revision: 2,
      state: "clean",
    }, 1000);
    const commit = vi.fn(async () => undefined);
    const { gateway, remove, runner } = createRunner({ commit, now: () => 1000, session });
    runner.start();
    await vi.waitFor(() => expect(session.getSnapshot().progress?.phase).toBe("synced"));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(gateway).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(session.identity);
    runner.stop();
  });
});
