import type { MessageEditorMessage, MessageEditorRoomSyncProgress } from "../messageEditorTypes";

import { getMessageEditorBlockId } from "../model/messageEditorTransforms";

export type RoomDocumentEditSessionIdentity = Readonly<{ roomId: number; userId: number }>;

export type RoomDocumentEditSessionSnapshot = Readonly<{
  baseMessages: MessageEditorMessage[];
  identity: RoomDocumentEditSessionIdentity;
  localCachePending?: boolean;
  messages: MessageEditorMessage[];
  problemBlockIds?: readonly string[];
  progress?: MessageEditorRoomSyncProgress;
  revision: number;
  state: "clean" | "syncing" | "error" | "ambiguous";
  tombstones?: MessageEditorMessage[];
}>;

export type RoomDocumentCloudSave = Readonly<{
  changedBlockIds: readonly string[];
  identity: RoomDocumentEditSessionIdentity;
  messages: MessageEditorMessage[];
  revision: number;
}>;

export type RoomMessagePatchGateway = {
  save(save: RoomDocumentCloudSave, baseMessages: MessageEditorMessage[]): Promise<MessageEditorMessage[]>;
};

export type RoomDocumentEditClock = { now(): number };
export type RoomDocumentEditScheduler = {
  clear(timer: unknown): void;
  schedule(callback: () => void, delayMs: number): unknown;
};

/** 同一 SQLite 房间消息 repository 暴露的文档 overlay 端口。 */
export type RoomDocumentOverlayRepository = {
  load(identity: RoomDocumentEditSessionIdentity): Promise<RoomDocumentEditSessionSnapshot | null>;
  remove(identity: RoomDocumentEditSessionIdentity): Promise<void>;
  save(snapshot: RoomDocumentEditSessionSnapshot): Promise<void>;
};

export type RoomDocumentSaveFailureKind = "ambiguous" | "error" | "retry";

const CONFIRMED_RUNTIME_FIELDS = [
  "messageId", "syncId", "roomId", "userId", "status", "replyMessageId",
  "position", "createTime", "updateTime",
] as const satisfies readonly (keyof MessageEditorMessage)[];

function injectConfirmedRuntimeIntoWorkingMessages(working: MessageEditorMessage[], confirmed: MessageEditorMessage[]) {
  const byBlockId = new Map(confirmed.map(message => [getMessageEditorBlockId(message), message]));
  const byRenderKey = new Map(confirmed.flatMap(message => (
    message.tcLocalRenderKey ? [[message.tcLocalRenderKey, message] as const] : []
  )));
  return working.map((message) => {
    const matched = byBlockId.get(getMessageEditorBlockId(message))
      ?? (message.tcLocalRenderKey ? byRenderKey.get(message.tcLocalRenderKey) : undefined);
    if (!matched || typeof matched.messageId !== "number" || matched.messageId <= 0) return message;
    const next = { ...message };
    for (const key of CONFIRMED_RUNTIME_FIELDS) {
      if (key in matched) Object.assign(next, { [key]: matched[key] });
    }
    delete next.tcLocalSyncState;
    delete next.tcMessageEditorDraft;
    return next;
  });
}

export type RoomDocumentEditObserver = {
  emit(event: { durationMs?: number; name: string; roomId: number; userId: number; revision: number }): void;
};
export const noopRoomDocumentEditObserver: RoomDocumentEditObserver = { emit: () => undefined };

export class RoomDocumentEditSession {
  readonly identity: RoomDocumentEditSessionIdentity;
  private baseMessages: MessageEditorMessage[];
  private cloudDueAt: number | null = null;
  private dirtyAt: number | null = null;
  private errorState: "error" | "ambiguous" | null = null;
  private localCachePending = false;
  private localDueAt: number | null = null;
  private localDurationMs = 0;
  private readonly observer: RoomDocumentEditObserver;
  private problemBlockIds = new Set<string>();
  private progress: MessageEditorRoomSyncProgress = { phase: "idle" };
  private revision = 0;
  private workingMessages: MessageEditorMessage[];

  constructor(params: { identity: RoomDocumentEditSessionIdentity; messages: MessageEditorMessage[]; observer?: RoomDocumentEditObserver }) {
    this.identity = Object.freeze({ ...params.identity });
    this.baseMessages = params.messages;
    this.workingMessages = params.messages;
    this.observer = params.observer ?? noopRoomDocumentEditObserver;
  }

  getSnapshot(): RoomDocumentEditSessionSnapshot {
    const workingMessageIds = new Set(this.workingMessages.flatMap(message => (
      typeof message.messageId === "number" && message.messageId > 0 ? [message.messageId] : []
    )));
    const tombstones = this.baseMessages
      .filter(message => typeof message.messageId === "number" && message.messageId > 0 && !workingMessageIds.has(message.messageId))
      .map(message => ({ ...message, status: 1 }));
    return {
      baseMessages: this.baseMessages,
      identity: this.identity,
      localCachePending: this.localCachePending,
      messages: this.workingMessages,
      problemBlockIds: [...this.problemBlockIds],
      progress: this.progress,
      revision: this.revision,
      state: this.getState(),
      tombstones,
    };
  }
  getBaseMessages() { return this.baseMessages; }
  isDirty() { return this.dirtyAt !== null; }
  needsLocalBackfill() { return this.localCachePending; }

  edit(messages: MessageEditorMessage[], now: number) {
    if (this.dirtyAt === null) this.localDurationMs = 0;
    const backgroundPhase = this.progress.phase === "localSaving"
      ? "localSaving" as const
      : ["cloudSaving", "reconciling", "localFinalizing"].includes(this.progress.phase)
        ? "cloudSaving" as const
        : undefined;
    this.workingMessages = messages;
    this.revision += 1;
    this.dirtyAt ??= now;
    this.localDueAt = Math.min(now + 500, this.dirtyAt + 2000);
    this.cloudDueAt = Math.min(now + 2000, this.dirtyAt + 10000);
    this.errorState = null;
    this.problemBlockIds.clear();
    this.progress = { backgroundPhase, phase: "editing", startedAt: backgroundPhase ? this.progress.startedAt : undefined };
    this.observer.emit({ name: "room_document_edited", ...this.identity, revision: this.revision });
  }

  acceptBase(messages: MessageEditorMessage[]) {
    this.baseMessages = messages;
    if (!this.isDirty() && !this.localCachePending) this.workingMessages = messages;
  }

  restore(snapshot: RoomDocumentEditSessionSnapshot, now: number) {
    if (snapshot.identity.roomId !== this.identity.roomId || snapshot.identity.userId !== this.identity.userId) return false;
    this.baseMessages = snapshot.baseMessages ?? this.baseMessages;
    this.workingMessages = snapshot.messages;
    this.revision = Math.max(this.revision, snapshot.revision);
    this.localCachePending = snapshot.localCachePending === true;
    this.dirtyAt = this.localCachePending ? null : now;
    this.localDueAt = this.localCachePending ? now : null;
    this.cloudDueAt = this.localCachePending ? null : now;
    this.progress = this.localCachePending
      ? { cloudDurationMs: snapshot.progress?.cloudDurationMs, phase: "syncedLocalPending" }
      : { dueAt: now, phase: "localSaved" };
    return true;
  }

  beginLocalSave(now: number) {
    const snapshot = this.getSnapshot();
    this.progress = { phase: "localSaving", startedAt: now };
    return snapshot;
  }
  finishLocalSave(persistedRevision: number, durationMs: number) {
    this.localDurationMs += Math.max(0, durationMs);
    if (persistedRevision !== this.revision) { this.progress = { phase: "editing" }; return; }
    this.localDueAt = null;
    this.progress = { dueAt: this.cloudDueAt ?? undefined, localDurationMs: this.localDurationMs, phase: "localSaved" };
  }
  failLocalSave(persistedRevision: number, durationMs: number) {
    this.localDurationMs += Math.max(0, durationMs);
    if (persistedRevision === this.revision) { this.localDueAt = null; this.progress = { phase: "editing" }; }
  }

  beginCloudSave(now: number): RoomDocumentCloudSave | null {
    if (!this.isDirty() || this.errorState === "ambiguous") return null;
    this.progress = { phase: "cloudSaving", startedAt: now };
    const baseByBlockId = new Map(this.baseMessages.map(message => [getMessageEditorBlockId(message), message]));
    const changedBlockIds = this.workingMessages.flatMap((message) => {
      const blockId = getMessageEditorBlockId(message);
      const base = baseByBlockId.get(blockId);
      return !base || JSON.stringify(base) !== JSON.stringify(message) ? [blockId] : [];
    });
    return { changedBlockIds, identity: this.identity, messages: this.workingMessages, revision: this.revision };
  }
  beginReconcile(now: number) { this.progress = { phase: "reconciling", startedAt: now }; }
  beginLocalFinalize(now: number, cloudDurationMs: number) {
    this.progress = { cloudDurationMs, phase: "localFinalizing", startedAt: now };
  }
  acknowledge(ackedRevision: number, confirmed: MessageEditorMessage[], cloudDurationMs: number) {
    this.baseMessages = confirmed;
    if (ackedRevision !== this.revision) {
      this.workingMessages = injectConfirmedRuntimeIntoWorkingMessages(this.workingMessages, confirmed);
      this.progress = { phase: "editing" };
      return false;
    }
    this.workingMessages = confirmed;
    this.dirtyAt = null;
    this.localDueAt = null;
    this.cloudDueAt = null;
    this.errorState = null;
    this.problemBlockIds.clear();
    this.localCachePending = false;
    this.progress = { cloudDurationMs, localDurationMs: this.localDurationMs, phase: "synced" };
    return true;
  }
  markLocalCachePending(cloudDurationMs: number) {
    this.localCachePending = true;
    this.dirtyAt = null;
    this.localDueAt = null;
    this.cloudDueAt = null;
    this.progress = { cloudDurationMs, localDurationMs: this.localDurationMs, phase: "syncedLocalPending" };
  }
  finishLocalBackfill(durationMs: number) {
    this.localDurationMs += Math.max(0, durationMs);
    this.localCachePending = false;
    this.localDueAt = null;
    this.progress = {
      cloudDurationMs: this.progress.cloudDurationMs,
      localDurationMs: this.localDurationMs,
      phase: "synced",
    };
  }
  deferLocalBackfill(now: number) { this.localDueAt = now + 1000; }
  fail(kind: "error" | "ambiguous", blockIds: readonly string[] = []) {
    this.errorState = kind;
    this.problemBlockIds = new Set(blockIds);
    this.cloudDueAt = null;
    this.progress = { phase: kind };
  }
  retry(now: number) { if (this.isDirty() && this.errorState !== "ambiguous") this.cloudDueAt = now; }
  scheduleRetry(now: number, delayMs: number, blockIds: readonly string[]) {
    this.errorState = null;
    this.problemBlockIds = new Set(blockIds);
    this.cloudDueAt = now + Math.max(0, delayMs);
    this.progress = { dueAt: this.cloudDueAt, phase: "retrying" };
  }
  clear(messages: MessageEditorMessage[], now: number) { this.edit(messages, now); }
  getDue(now: number) {
    return { cloud: this.cloudDueAt !== null && now >= this.cloudDueAt, local: this.localDueAt !== null && now >= this.localDueAt };
  }
  getNextDueAt() {
    return [this.localDueAt, this.cloudDueAt].filter((value): value is number => value !== null)
      .reduce<number | null>((nearest, value) => nearest === null || value < nearest ? value : nearest, null);
  }
  getState(): RoomDocumentEditSessionSnapshot["state"] {
    if (this.errorState) return this.errorState;
    return this.isDirty() ? "syncing" : "clean";
  }
}

export class RoomDocumentEditSessionRunner {
  private active = false;
  private cloudInFlight = false;
  private localInFlight = false;
  private retryCount = 0;
  private timer: unknown = null;

  constructor(private readonly dependencies: {
    clock: RoomDocumentEditClock;
    classifyFailure: (save: RoomDocumentCloudSave, error: unknown) => RoomDocumentSaveFailureKind;
    commitConfirmedMessages: (messages: MessageEditorMessage[]) => Promise<void>;
    gateway: RoomMessagePatchGateway;
    onSnapshot: (snapshot: RoomDocumentEditSessionSnapshot) => void;
    overlayRepository: RoomDocumentOverlayRepository;
    reconcileAmbiguousInsert?: (save: RoomDocumentCloudSave) => Promise<MessageEditorMessage[] | null>;
    scheduler: RoomDocumentEditScheduler;
    session: RoomDocumentEditSession;
  }) {}

  start() { this.active = true; this.wake(); }
  stop() {
    this.active = false;
    if (this.timer !== null) this.dependencies.scheduler.clear(this.timer);
    this.timer = null;
    if (this.dependencies.session.isDirty()) {
      void this.dependencies.overlayRepository.save(this.dependencies.session.getSnapshot())
        .catch(error => console.error("[room-document] SQLite overlay flush failed", error));
    }
  }
  wake() {
    if (!this.active) return;
    if (this.timer !== null) this.dependencies.scheduler.clear(this.timer);
    this.timer = null;
    const now = this.dependencies.clock.now();
    if (!this.localInFlight && this.dependencies.session.getDue(now).local) {
      void (this.dependencies.session.needsLocalBackfill() ? this.runLocalBackfill() : this.runLocalSave());
      return;
    }
    if (!this.cloudInFlight && this.dependencies.session.getDue(now).cloud) { void this.runCloudSave(); return; }
    this.emitAndSchedule();
  }

  private async runLocalSave() {
    const { clock, overlayRepository, session } = this.dependencies;
    this.localInFlight = true;
    const startedAt = clock.now();
    const snapshot = session.beginLocalSave(startedAt);
    this.dependencies.onSnapshot(session.getSnapshot());
    try {
      await overlayRepository.save(snapshot);
      session.finishLocalSave(snapshot.revision, clock.now() - startedAt);
    }
    catch (error) {
      session.failLocalSave(snapshot.revision, clock.now() - startedAt);
      console.error("[room-document] SQLite overlay save failed; continuing cloud sync", error);
    }
    finally { this.localInFlight = false; if (this.active) this.wake(); }
  }

  private async runLocalBackfill() {
    const { clock, overlayRepository, session } = this.dependencies;
    this.localInFlight = true;
    const startedAt = clock.now();
    try {
      const snapshot = session.getSnapshot();
      await this.dependencies.commitConfirmedMessages([...snapshot.messages, ...(snapshot.tombstones ?? [])]);
      session.finishLocalBackfill(clock.now() - startedAt);
      await overlayRepository.remove(session.identity);
    }
    catch (error) {
      session.deferLocalBackfill(clock.now());
      console.error("[room-document] SQLite confirmed cache backfill failed", error);
    }
    finally { this.localInFlight = false; if (this.active) this.emitAndSchedule(); }
  }

  private async runCloudSave() {
    const { clock, gateway, session } = this.dependencies;
    const save = session.beginCloudSave(clock.now());
    if (!save) { this.emitAndSchedule(); return; }
    this.cloudInFlight = true;
    this.dependencies.onSnapshot(session.getSnapshot());
    const requestStartedAt = clock.now();
    try {
      const confirmed = await gateway.save(save, session.getBaseMessages());
      this.retryCount = 0;
      await this.finalizeConfirmed(save, confirmed, clock.now() - requestStartedAt);
    }
    catch (error) {
      const cloudDurationMs = clock.now() - requestStartedAt;
      const kind = this.dependencies.classifyFailure(save, error);
      if (kind === "ambiguous") {
        session.beginReconcile(clock.now());
        this.dependencies.onSnapshot(session.getSnapshot());
        let confirmed: MessageEditorMessage[] | null = null;
        try { confirmed = await this.dependencies.reconcileAmbiguousInsert?.(save) ?? null; }
        catch (reconcileError) { console.error("[room-document] reconcile failed", reconcileError); }
        if (confirmed) await this.finalizeConfirmed(save, confirmed, cloudDurationMs);
        else session.fail("ambiguous");
      }
      else if (kind === "error") session.fail("error", save.changedBlockIds);
      else {
        this.retryCount += 1;
        session.scheduleRetry(clock.now(), Math.min(1000 * 2 ** (this.retryCount - 1), 30000), []);
      }
    }
    finally { this.cloudInFlight = false; if (this.active) this.emitAndSchedule(); }
  }

  private async finalizeConfirmed(save: RoomDocumentCloudSave, confirmed: MessageEditorMessage[], cloudDurationMs: number) {
    const { clock, overlayRepository, session } = this.dependencies;
    session.beginLocalFinalize(clock.now(), cloudDurationMs);
    this.dependencies.onSnapshot(session.getSnapshot());
    const localStartedAt = clock.now();
    try {
      await this.dependencies.commitConfirmedMessages([
        ...confirmed,
        ...(session.getSnapshot().tombstones ?? []),
      ]);
      if (save.revision === session.getSnapshot().revision) {
        await overlayRepository.remove(session.identity);
        session.finishLocalSave(save.revision, clock.now() - localStartedAt);
        session.acknowledge(save.revision, confirmed, cloudDurationMs);
      }
      else {
        session.acknowledge(save.revision, confirmed, cloudDurationMs);
        await overlayRepository.save(session.getSnapshot());
        session.finishLocalSave(save.revision, clock.now() - localStartedAt);
      }
    }
    catch (error) {
      session.failLocalSave(save.revision, clock.now() - localStartedAt);
      session.markLocalCachePending(cloudDurationMs);
      try { await overlayRepository.save(session.getSnapshot()); }
      catch (persistError) { console.error("[room-document] confirmed cache backfill marker failed", persistError); }
      console.error("[room-document] server confirmed but SQLite backfill failed", error);
    }
  }

  private emitAndSchedule() {
    if (!this.active) return;
    this.dependencies.onSnapshot(this.dependencies.session.getSnapshot());
    if (this.localInFlight || this.cloudInFlight) return;
    const dueAt = this.dependencies.session.getNextDueAt();
    if (dueAt === null) return;
    this.timer = this.dependencies.scheduler.schedule(() => this.wake(), Math.max(0, dueAt - this.dependencies.clock.now()));
  }
}
