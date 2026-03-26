import type {
  Doc,
  DocMeta,
  DocsPropertiesMeta,
  ExtensionType,
  GetStoreOptions,
  RemoveStoreOptions,
  Store,
  Workspace,
  WorkspaceMeta,
  YBlock,
} from "@blocksuite/store";

import { NoopLogger } from "@blocksuite/global/utils";
import { AwarenessStore, nanoid, StoreContainer, Text } from "@blocksuite/store";
import { BlobEngine, DocEngine, IndexedDBBlobSource, IndexedDBDocSource } from "@blocksuite/sync";
import { Subject, Subscription } from "rxjs";
import { Awareness } from "y-protocols/awareness.js";
import * as Y from "yjs";
import { applyUpdate, encodeStateAsUpdate, encodeStateVector, mergeUpdates } from "yjs";

import type { BlocksuiteDocKey } from "@/components/chat/infra/blocksuite/space/runtime/blocksuiteWsClient";

import { clearUpdates } from "@/components/chat/infra/blocksuite/description/descriptionDocDb";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { BLOCKSUITE_STORE_EXTENSIONS } from "@/components/chat/infra/blocksuite/manager/store";
import { NonRetryableBlocksuiteDocError } from "@/components/chat/infra/blocksuite/shared/blocksuiteDocError";
import { blocksuiteWsClient } from "@/components/chat/infra/blocksuite/space/runtime/blocksuiteWsClient";
import { RemoteSnapshotDocSource } from "@/components/chat/infra/blocksuite/space/runtime/remoteDocSource";

/**
 * SpaceWorkspace 是本项目最核心的 Blocksuite 数据运行时：
 * - 一个 space 对应一个 root Y.Doc
 * - rootDoc 下面按 docId 维护多个 subdoc
 * - 每个 subdoc 再映射成一个 Blocksuite Store
 *
 * 这一层负责本地 IndexedDB、远端快照、WS 更新、最小 block tree 初始化。
 */
const remoteSnapshotDocSource = new RemoteSnapshotDocSource();
const REMOTE_RESTORE_ORIGIN = "tc:remote-restore";
const REMOTE_WS_ORIGIN = "tc:remote-ws";
const INITIAL_REMOTE_PULL_RETRY_DELAY_MS = [0, 400, 1200, 2800] as const;
const BACKGROUND_REMOTE_PULL_RETRY_MS = 15_000;

class InMemoryWorkspaceMeta implements WorkspaceMeta {
  private _docMetas: DocMeta[] = [];
  private _properties: DocsPropertiesMeta = { tags: { options: [] } };

  readonly docMetaAdded = new Subject<string>();
  readonly docMetaRemoved = new Subject<string>();
  readonly docMetaUpdated = new Subject<void>();

  get docMetas(): DocMeta[] {
    return this._docMetas;
  }

  get properties(): DocsPropertiesMeta {
    return this._properties;
  }

  setProperties(meta: DocsPropertiesMeta): void {
    this._properties = meta;
    this.docMetaUpdated.next();
  }

  get docs(): unknown[] | undefined {
    return this._docMetas as unknown[];
  }

  initialize(): void {
    // no-op
  }

  addDocMeta(props: DocMeta, index?: number): void {
    if (this._docMetas.some(d => d.id === props.id)) {
      return;
    }

    if (typeof index === "number") {
      this._docMetas.splice(index, 0, props);
    }
    else {
      this._docMetas.push(props);
    }

    this.docMetaAdded.next(props.id);
    this.docMetaUpdated.next();
  }

  getDocMeta(id: string): DocMeta | undefined {
    return this._docMetas.find(d => d.id === id);
  }

  setDocMeta(id: string, props: Partial<DocMeta>): void {
    const idx = this._docMetas.findIndex(d => d.id === id);
    if (idx === -1)
      return;

    const current = this._docMetas[idx];
    const next = { ...current, ...props };
    const hasChanged = Object.keys(props).some((key) => {
      const field = key as keyof DocMeta;
      return current[field] !== next[field];
    });
    if (!hasChanged)
      return;

    this._docMetas[idx] = next;
    this.docMetaUpdated.next();
  }

  removeDocMeta(id: string): void {
    const idx = this._docMetas.findIndex(d => d.id === id);
    if (idx === -1)
      return;

    this._docMetas.splice(idx, 1);
    this.docMetaRemoved.next(id);
    this.docMetaUpdated.next();
  }
}

class SpaceDoc implements Doc {
  // 一个 subdoc 对应一个 Blocksuite Doc 运行时实例。
  private readonly _storeContainer: StoreContainer;
  private _remoteUpdateHandler: ((update: Uint8Array, origin: unknown) => void) | null = null;
  private _pendingRemoteUpdates: Uint8Array[] = [];
  private _pendingPreHydrationUpdates: Uint8Array[] = [];
  private _remotePushTimer: ReturnType<typeof setTimeout> | null = null;
  private _hydrationRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private _wsDisposers: Array<() => void> = [];
  private _wsKey: BlocksuiteDocKey | null = null;
  private _disposed = false;
  private _remoteHydrationCompleted = false;
  private _hydrationInFlight = false;
  private _lastSyncedMetaTitle = "";

  private _loaded = true;
  private _ready = false;

  readonly id: string;
  readonly rootDoc: Y.Doc;
  readonly spaceDoc: Y.Doc;
  readonly awarenessStore: AwarenessStore;
  readonly yBlocks: Y.Map<YBlock>;

  constructor(params: { id: string; workspace: Workspace; rootDoc: Y.Doc }) {
    this.id = params.id;
    this.rootDoc = params.rootDoc;
    this._workspace = params.workspace;

    this.awarenessStore = new AwarenessStore(new Awareness(this.rootDoc));

    const spaces = this.rootDoc.getMap<Y.Doc>("spaces");
    let subDoc = spaces.get(this.id);
    if (!subDoc) {
      subDoc = new Y.Doc({ guid: this.id });
      spaces.set(this.id, subDoc);
      this._loaded = true;
    }
    else {
      this._loaded = false;
      this.rootDoc.on("subdocs", this._onSubdocEvent);
    }

    this.spaceDoc = subDoc;
    this.yBlocks = this.spaceDoc.getMap("blocks") as unknown as Y.Map<YBlock>;
    this._storeContainer = new StoreContainer(this);
  }

  private readonly _onSubdocEvent = ({ loaded }: { loaded: Set<Y.Doc> }) => {
    const result = Array.from(loaded).find(doc => doc.guid === this.spaceDoc.guid);
    if (!result)
      return;

    this.rootDoc.off("subdocs", this._onSubdocEvent);
    this._loaded = true;
  };

  private readonly _workspace: Workspace;

  get workspace(): Workspace {
    return this._workspace;
  }

  get meta(): DocMeta | undefined {
    return this.workspace.meta.getDocMeta(this.id);
  }

  get loaded(): boolean {
    return this._loaded;
  }

  get ready(): boolean {
    return this._ready;
  }

  load(initFn?: () => void): void {
    if (this._ready)
      return;

    this._disposed = false;
    this._remoteHydrationCompleted = !parseDescriptionDocId(this.id);
    this.spaceDoc.load();
    initFn?.();
    this._ready = true;
    this._syncMetaTitleFromDoc();

    // 仅在文档真正被打开后，才开始监听 update 并推送远端，
    // 避免整个 space 下所有 subdoc 都被同步链路提前拉起。
    this._remoteUpdateHandler = (update: Uint8Array, origin: unknown) => {
      this._syncMetaTitleFromDoc();

      // Ignore initial loads / programmatic remote restores to avoid redundant PUT right after GET.
      if (origin === "load" || origin === REMOTE_RESTORE_ORIGIN || origin === REMOTE_WS_ORIGIN)
        return;

      // 防止“空本地先推上去覆盖云端”：
      // 在首次远端恢复完成前，只缓存更新，不立即上行。
      if (!this._remoteHydrationCompleted) {
        this._pendingPreHydrationUpdates.push(update);
        return;
      }

      this._enqueueRemoteUpdate(update);
    };
    this.spaceDoc.on("update", this._remoteUpdateHandler);

    // Real-time sync channel (yjs updates via WS), keyed by docId -> (entityType/entityId/docType).
    this._attachBlocksuiteWs();
  }

  private _syncMetaTitleFromDoc() {
    try {
      const workspace = this.workspace as SpaceWorkspace;
      const nextTitle = tryReadTcHeaderTitleFromYDoc(this.spaceDoc)
        ?? (this._ready ? tryDeriveDocTitle(this.getStore({ readonly: true })) : null);
      const normalizedTitle = String(nextTitle ?? "").trim();

      if (!normalizedTitle)
        return;
      if (normalizedTitle === this._lastSyncedMetaTitle)
        return;

      const meta = workspace.meta.getDocMeta(this.id);
      if (!meta) {
        workspace.meta.addDocMeta({
          id: this.id,
          title: normalizedTitle,
          tags: [],
          createDate: Date.now(),
        });
      }
      else if (meta.title !== normalizedTitle) {
        workspace.meta.setDocMeta(this.id, { title: normalizedTitle });
      }

      this._lastSyncedMetaTitle = normalizedTitle;
    }
    catch {
      // ignore
    }
  }

  private _enqueueRemoteUpdate(update: Uint8Array) {
    this._pendingRemoteUpdates.push(update);
    if (this._remotePushTimer)
      return;

    // Batch frequent editor updates to reduce IndexedDB write pressure.
    this._remotePushTimer = setTimeout(() => {
      this._remotePushTimer = null;
      const pending = this._pendingRemoteUpdates;
      this._pendingRemoteUpdates = [];
      if (!pending.length)
        return;
      void remoteSnapshotDocSource.push(this.id, mergeUpdates(pending));
    }, 200);
  }

  remove(): void {
    this.workspace.removeDoc(this.id);
  }

  clear(): void {
    this.yBlocks.clear();
  }

  dispose(options?: { flushPending?: boolean }): void {
    const flushPending = options?.flushPending !== false;
    this._disposed = true;
    this._ready = false;
    if (this._hydrationRetryTimer) {
      clearTimeout(this._hydrationRetryTimer);
      this._hydrationRetryTimer = null;
    }
    if (this._remotePushTimer) {
      clearTimeout(this._remotePushTimer);
      this._remotePushTimer = null;
    }

    const pending = this._pendingRemoteUpdates;
    this._pendingRemoteUpdates = [];
    this._pendingPreHydrationUpdates = [];
    if (flushPending && pending.length) {
      void remoteSnapshotDocSource.push(this.id, mergeUpdates(pending));
    }

    this._detachBlocksuiteWs();

    if (this._remoteUpdateHandler) {
      this.spaceDoc.off("update", this._remoteUpdateHandler);
      this._remoteUpdateHandler = null;
    }
  }

  private _attachBlocksuiteWs() {
    const parsed = parseDescriptionDocId(this.id);
    if (!parsed) {
      return;
    }

    this._wsKey = parsed;

    blocksuiteWsClient.joinDoc(parsed);

    // Catch-up by stateVector diff: pull snapshot+updates, then apply minimal diff.
    // 若网络短时失败，先做快速重试；仍失败则转后台周期重试。
    void this._runInitialRemoteHydration();

    this._wsDisposers.push(
      blocksuiteWsClient.onUpdate(parsed, ({ update }) => {
        try {
          applyUpdate(this.spaceDoc, update, REMOTE_WS_ORIGIN);
        }
        catch {
          // ignore
        }
      }),
    );
  }

  private _detachBlocksuiteWs() {
    if (this._wsKey) {
      blocksuiteWsClient.leaveDoc(this._wsKey);
    }
    for (const dispose of this._wsDisposers) {
      try {
        dispose();
      }
      catch {
        // ignore
      }
    }
    this._wsDisposers = [];
    this._wsKey = null;
  }

  private _completeRemoteHydration(options?: { discardPendingLocal?: boolean }) {
    if (this._remoteHydrationCompleted)
      return;
    this._remoteHydrationCompleted = true;

    if (options?.discardPendingLocal) {
      this._pendingPreHydrationUpdates = [];
      return;
    }

    if (!this._pendingPreHydrationUpdates.length)
      return;

    const merged = this._pendingPreHydrationUpdates.length === 1
      ? this._pendingPreHydrationUpdates[0]
      : mergeUpdates(this._pendingPreHydrationUpdates);
    this._pendingPreHydrationUpdates = [];
    this._enqueueRemoteUpdate(merged);
  }

  private _scheduleRemoteHydrationRetry() {
    if (this._disposed || this._remoteHydrationCompleted || this._hydrationRetryTimer) {
      return;
    }

    this._hydrationRetryTimer = setTimeout(() => {
      this._hydrationRetryTimer = null;
      void this._runInitialRemoteHydration();
    }, BACKGROUND_REMOTE_PULL_RETRY_MS);
  }

  private async _runInitialRemoteHydration() {
    if (this._disposed || this._remoteHydrationCompleted || this._hydrationInFlight) {
      return;
    }
    this._hydrationInFlight = true;

    try {
      for (let i = 0; i < INITIAL_REMOTE_PULL_RETRY_DELAY_MS.length; i++) {
        if (this._disposed) {
          return;
        }

        const delay = INITIAL_REMOTE_PULL_RETRY_DELAY_MS[i];
        if (delay > 0) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, delay);
          });
          if (this._disposed) {
            return;
          }
        }

        try {
          const stateVector = encodeStateVector(this.spaceDoc);
          const pulled = await remoteSnapshotDocSource.pull(this.id, stateVector);
          if (this._disposed) {
            return;
          }
          if (pulled?.data?.length) {
            applyUpdate(this.spaceDoc, pulled.data, REMOTE_WS_ORIGIN);
          }
          else {
            // 远端明确“无数据”时，才初始化本地最小骨架。
            // 这样可以避免网络抖动期间先创建空文档并上推覆盖云端。
            try {
              const store = this.getStore();
              ensureAffineMinimumBlockData(store);
            }
            catch {
              // ignore
            }
          }
          this._completeRemoteHydration();
          return;
        }
        catch (error) {
          if (error instanceof NonRetryableBlocksuiteDocError) {
            try {
              await clearUpdates(this.id);
            }
            catch {
              // ignore
            }
            this._detachBlocksuiteWs();
            this._completeRemoteHydration({ discardPendingLocal: true });
            return;
          }
          // ignore and retry with backoff
        }
      }
    }
    finally {
      this._hydrationInFlight = false;
    }

    if (!this._remoteHydrationCompleted && !this._disposed) {
      this._scheduleRemoteHydrationRetry();
    }
  }

  getStore(options: GetStoreOptions = {}): Store {
    const storeExtensions = (this.workspace as SpaceWorkspace).storeExtensions.concat(options.extensions ?? []);
    const storeId = options.id ?? this.spaceDoc.guid;

    return this._storeContainer.getStore({
      id: storeId,
      readonly: options.readonly,
      query: options.query,
      provider: options.provider,
      extensions: storeExtensions,
    });
  }

  removeStore(options: RemoveStoreOptions): void {
    this._storeContainer.removeStore(options);
  }
}

export class SpaceWorkspace implements Workspace {
  readonly id: string;
  readonly meta: WorkspaceMeta;
  readonly idGenerator = nanoid;
  readonly blobSync: BlobEngine;
  readonly onLoadDoc?: (doc: Y.Doc) => void;
  readonly onLoadAwareness?: (awareness: Awareness) => void;

  private readonly _rootDoc: Y.Doc;
  private readonly _spaces: Y.Map<Y.Doc>;
  private readonly _onSpacesChanged = () => {
    this._syncMetaFromSpaces();
    this._hydrateMissingTitles();
  };

  private readonly _titleHydrationAbort = new AbortController();
  private _titleHydrationScheduled = false;
  private _docListUpdatedBlocked = 0;
  private _docListUpdatedEmitted = false;
  private _docListUpdatedResetScheduled = false;
  private readonly _subscriptions = new Subscription();

  readonly slots = {
    docListUpdated: new Subject<void>(),
  };

  readonly storeExtensions: ExtensionType[];
  readonly docSync: DocEngine;

  private readonly _docs = new Map<string, Doc>();

  get doc(): Y.Doc {
    return this._rootDoc;
  }

  get docs(): Map<string, Doc> {
    return this._docs;
  }

  constructor(params: { workspaceId: string; storeExtensions?: ExtensionType[] }) {
    this.id = params.workspaceId;
    this._rootDoc = new Y.Doc({ guid: params.workspaceId });
    this._spaces = this._rootDoc.getMap<Y.Doc>("spaces");
    this.meta = new InMemoryWorkspaceMeta();
    this.storeExtensions = params.storeExtensions ?? BLOCKSUITE_STORE_EXTENSIONS;

    const logger = new NoopLogger();

    // Demo 阶段：仅本地 IndexedDB 存储
    const dbPrefix = `tuan-chat-blocksuite:${params.workspaceId}`;
    this.docSync = new DocEngine(
      this._rootDoc,
      new IndexedDBDocSource(dbPrefix),
      [],
      logger,
    );

    this.blobSync = new BlobEngine(
      new IndexedDBBlobSource(dbPrefix),
      [],
      logger,
    );

    this.docSync.start();
    this.blobSync.start();

    // Blocksuite 的 DocDisplayMetaProvider 依赖 `workspace.slots.docListUpdated` 来刷新标题缓存。
    // 我们的自定义 meta 在 setDocMeta 时只触发 docMetaUpdated，因此需要将其映射到 docListUpdated。
    this._subscriptions.add(
      this.meta.docMetaUpdated.subscribe(() => {
        if (this._docListUpdatedBlocked > 0)
          return;
        this._emitDocListUpdated();
      }),
    );

    // Ensure linked-doc can list all docs within this workspace.
    // linked-doc menu reads from `workspace.meta.docMetas`.
    this._syncMetaFromSpaces();
    this._hydrateMissingTitles();
    this._spaces.observe(this._onSpacesChanged);
  }

  private _emitDocListUpdated() {
    if (this._docListUpdatedEmitted)
      return;

    this._docListUpdatedEmitted = true;
    this.slots.docListUpdated.next();

    if (this._docListUpdatedResetScheduled)
      return;
    this._docListUpdatedResetScheduled = true;

    queueMicrotask(() => {
      this._docListUpdatedResetScheduled = false;
      this._docListUpdatedEmitted = false;
    });
  }

  private _syncMetaFromSpaces() {
    // Keep meta in sync with all known subdocs.
    // We don't have server-side meta persistence in demo stage.
    for (const docId of this._spaces.keys()) {
      if (this.meta.getDocMeta(docId))
        continue;
      this.meta.addDocMeta({
        id: docId,
        title: "",
        tags: [],
        createDate: Date.now(),
      });
    }
  }

  private _hydrateMissingTitles() {
    // 标题优先信任已有 meta；不要在列表阶段批量 `doc.load()` 去探测远端文档，
    // 否则仅打开群聊页也会为整组 doc 触发远端 hydration / updates 拉取。
    // 这里只尝试从“已经被显式打开过”的内存 doc 中补标题。
    if (this._titleHydrationScheduled)
      return;
    this._titleHydrationScheduled = true;

    queueMicrotask(async () => {
      this._titleHydrationScheduled = false;
      if (this._titleHydrationAbort.signal.aborted)
        return;

      const metas = this.meta.docMetas;
      const pendingIds = metas
        .filter(m => !m.title)
        .map(m => m.id);

      let anyMetaChanged = false;
      this._docListUpdatedBlocked++;
      // 只读取已加载 doc，避免在这里创建/加载任何文档。
      try {
        for (const docId of pendingIds) {
          if (this._titleHydrationAbort.signal.aborted)
            return;

          try {
            const doc = this.getDoc(docId) as SpaceDoc | null;
            if (!doc?.ready) {
              continue;
            }
            const meta = this.meta.getDocMeta(docId);
            if (!meta)
              continue;

            const tcTitle = tryReadTcHeaderTitleFromYDoc(doc.spaceDoc);
            if (tcTitle) {
              if (meta.title !== tcTitle) {
                this.meta.setDocMeta(docId, { title: tcTitle });
                anyMetaChanged = true;
              }
              continue;
            }

            const storeTitle = tryDeriveDocTitle(doc.getStore({ readonly: true }));
            if (storeTitle && meta.title !== storeTitle) {
              this.meta.setDocMeta(docId, { title: storeTitle });
              anyMetaChanged = true;
            }
          }
          catch {
            // ignore; keep empty title
          }
        }
      }
      finally {
        this._docListUpdatedBlocked--;
        if (anyMetaChanged) {
          this._emitDocListUpdated();
        }
      }
    });
  }

  createDoc(docId?: string): Doc {
    const id = docId ?? this.idGenerator();
    if (this._docs.has(id)) {
      return this._docs.get(id)!;
    }

    this.meta.addDocMeta({
      id,
      title: "",
      tags: [],
      createDate: Date.now(),
    });

    const doc = new SpaceDoc({ id, workspace: this, rootDoc: this._rootDoc });
    this._docs.set(id, doc);
    this._emitDocListUpdated();
    return doc;
  }

  getDoc(docId: string): Doc | null {
    return this._docs.get(docId) ?? null;
  }

  removeDoc(docId: string): void {
    const doc = this._docs.get(docId);
    if (!doc)
      return;

    try {
      // 删除业务文档时不要把本地 pending 改动再次上推到远端。
      (doc as { dispose?: (options?: { flushPending?: boolean }) => void }).dispose?.({ flushPending: false });
    }
    catch {
      // ignore
    }

    this._docs.delete(docId);
    this.meta.removeDocMeta(docId);
    this._emitDocListUpdated();

    this._rootDoc.getMap<Y.Doc>("spaces").delete(docId);
  }

  /**
   * 获取某个 docId 对应的完整 update（用于本地版本快照）。
   */
  encodeDocAsUpdate(docId: string): Uint8Array {
    const doc = (this.getDoc(docId) as SpaceDoc | null) ?? (this.createDoc(docId) as SpaceDoc);
    doc.load();
    return encodeStateAsUpdate(doc.spaceDoc);
  }

  /**
   * 将 doc 恢复到指定 full update（用于本地版本回滚）。
   *
   * 注意：这将合并更新到现有文档，而不是清除后覆盖（与旧版 behavior 保持一致，避免视图空白）。
   */
  restoreDocFromUpdate(params: { docId: string; update: Uint8Array }) {
    const doc = (this.getDoc(params.docId) as SpaceDoc | null) ?? (this.createDoc(params.docId) as SpaceDoc);

    // Ensure meta exists so the doc is discoverable by linked-doc menu.
    if (!this.meta.getDocMeta(params.docId)) {
      this.meta.addDocMeta({
        id: params.docId,
        title: "",
        tags: [],
        createDate: Date.now(),
      });
    }

    if (params.update.length) {
      applyUpdate(doc.spaceDoc, params.update, REMOTE_RESTORE_ORIGIN);
    }

    // Ensure doc is marked as loaded (and subdoc connected if needed) after applying updates.
    doc.load();
  }

  /**
   * 强制用指定 full update 替换本地 doc 内容（丢弃当前本地未同步改动）。
   *
   * 与 restoreDocFromUpdate 的“合并”语义不同，这里会重建同 docId 的 subdoc，
   * 以实现“云端覆盖本地”。
   */
  replaceDocFromUpdate(params: { docId: string; update: Uint8Array }) {
    const existing = this.getDoc(params.docId) as SpaceDoc | null;
    if (existing) {
      try {
        // Replace 语义：明确丢弃本地 pending，避免旧本地改动反向推到远端。
        existing.dispose({ flushPending: false });
      }
      catch {
        // ignore
      }
    }

    this._docs.delete(params.docId);
    this._rootDoc.getMap<Y.Doc>("spaces").delete(params.docId);

    if (!this.meta.getDocMeta(params.docId)) {
      this.meta.addDocMeta({
        id: params.docId,
        title: "",
        tags: [],
        createDate: Date.now(),
      });
    }

    const fresh = new SpaceDoc({ id: params.docId, workspace: this, rootDoc: this._rootDoc });
    this._docs.set(params.docId, fresh);

    if (params.update.length) {
      applyUpdate(fresh.spaceDoc, params.update, REMOTE_RESTORE_ORIGIN);
    }
    fresh.load();
    this._emitDocListUpdated();
  }

  /**
   * 基于 rootDoc 的 spaces map 列出 workspace 内已经出现过的 docId。
   *
   * 注意：这不是“业务可见文档列表”，仅用于调试/迁移。
   */
  listKnownDocIds(): string[] {
    return Array.from(this._rootDoc.getMap<Y.Doc>("spaces").keys());
  }

  dispose(): void {
    for (const doc of this._docs.values()) {
      try {
        (doc as { dispose?: (options?: { flushPending?: boolean }) => void }).dispose?.({ flushPending: false });
      }
      catch {
        // ignore
      }
    }
    this.docSync.forceStop();
    this.blobSync.stop();
    this._spaces.unobserve(this._onSpacesChanged);
    this._titleHydrationAbort.abort();
    this._subscriptions.unsubscribe();
    this._docs.clear();
  }
}

const WORKSPACE_IDLE_DISPOSE_MS = 30_000;

type WorkspaceRuntimeRecord = {
  workspace: SpaceWorkspace;
  retainCount: number;
  lastTouchedAt: number;
  disposeTimer: ReturnType<typeof setTimeout> | null;
};

const workspaceById = new Map<string, WorkspaceRuntimeRecord>();

function clearWorkspaceDisposeTimer(record: WorkspaceRuntimeRecord) {
  if (!record.disposeTimer) {
    return;
  }
  clearTimeout(record.disposeTimer);
  record.disposeTimer = null;
}

function disposeWorkspaceRuntime(workspaceId: string) {
  const record = workspaceById.get(workspaceId);
  if (!record) {
    return;
  }

  clearWorkspaceDisposeTimer(record);
  workspaceById.delete(workspaceId);
  try {
    record.workspace.dispose();
  }
  catch {
    // ignore
  }
}

function scheduleWorkspaceRuntimeDispose(workspaceId: string) {
  const record = workspaceById.get(workspaceId);
  if (!record) {
    return;
  }
  if (record.retainCount > 0) {
    clearWorkspaceDisposeTimer(record);
    return;
  }

  clearWorkspaceDisposeTimer(record);
  record.disposeTimer = setTimeout(() => {
    const latest = workspaceById.get(workspaceId);
    if (!latest) {
      return;
    }
    if (latest.retainCount > 0) {
      clearWorkspaceDisposeTimer(latest);
      return;
    }
    if (Date.now() - latest.lastTouchedAt < WORKSPACE_IDLE_DISPOSE_MS) {
      scheduleWorkspaceRuntimeDispose(workspaceId);
      return;
    }
    disposeWorkspaceRuntime(workspaceId);
  }, WORKSPACE_IDLE_DISPOSE_MS);
}

function touchWorkspaceRuntimeRecord(record: WorkspaceRuntimeRecord) {
  record.lastTouchedAt = Date.now();
  if (record.retainCount > 0) {
    clearWorkspaceDisposeTimer(record);
    return;
  }
  scheduleWorkspaceRuntimeDispose(record.workspace.id);
}

function ensureAffineMinimumBlockData(store: Store) {
  // 1) Init if empty
  if (!store.root) {
    const pageId = store.addBlock("affine:page", { title: new Text("") });
    store.addBlock("affine:surface", {}, pageId);
    // In edgeless mode, notes are positioned by `xywh`. If it's missing, the note
    // can be effectively invisible on the canvas even though it exists.
    const noteId = store.addBlock("affine:note", { xywh: "[0, 100, 800, 640]" }, pageId);
    store.addBlock("affine:paragraph", { text: new Text("") }, noteId);
    return;
  }

  // 2) Backfill missing essential props for legacy docs
  store.transact(() => {
    const pageModels = store.getModelsByFlavour("affine:page") as Array<any>;
    for (const m of pageModels) {
      if (!m?.props?.title) {
        store.updateBlock(m, { title: new Text("") });
      }
    }

    const noteModels = store.getModelsByFlavour("affine:note") as Array<any>;
    for (const m of noteModels) {
      if (!m?.props?.xywh) {
        store.updateBlock(m, { xywh: "[0, 100, 800, 640]" });
      }
    }

    const paragraphModels = store.getModelsByFlavour("affine:paragraph") as Array<any>;
    for (const m of paragraphModels) {
      if (!m?.props?.text) {
        store.updateBlock(m, { text: new Text("") });
      }
    }

    // 3) Edgeless safety: ensure `affine:surface` exists (edgeless root hard-requires it).
    // A corrupted doc may lose the surface block (e.g. bad move/delete), which will crash on open.
    const page = pageModels?.[0] ?? (store as any).root;
    if (!page)
      return;

    const sanitizeChildren = (model: any) => {
      try {
        const yChildren = model?.yBlock?.get?.("sys:children");
        const ids = typeof yChildren?.toArray === "function" ? (yChildren.toArray() as string[]) : [];
        if (!ids.length)
          return;
        const children = ids
          .map(id => (store as any).getBlock?.(id)?.model)
          .filter(Boolean);
        if (children.length !== ids.length) {
          store.updateBlock(model, { children });
        }
      }
      catch {
        // ignore
      }
    };

    let surfaceModels = store.getModelsByFlavour("affine:surface") as Array<any>;
    if (!surfaceModels?.length) {
      store.addBlock("affine:surface", {}, page.id);
      surfaceModels = store.getModelsByFlavour("affine:surface") as Array<any>;
    }

    const surface = surfaceModels?.[0];
    if (surface) {
      // If surface became orphaned, move it back under the page.
      if (surface.parent?.id !== page.id) {
        try {
          (store as any).moveBlocks?.([surface], page);
        }
        catch {
          // ignore
        }
      }

      // Repair dangling children arrays (can cause `renderChildren` to hit undefined).
      sanitizeChildren(page);
      sanitizeChildren(surface);

      // Frame/edgeless-text blocks must be children of surface.
      // If the old surface was deleted, these blocks become parentless and later operations will crash.
      const surfaceParentRequiredFlavours = ["affine:frame", "affine:edgeless-text"] as const;
      for (const flavour of surfaceParentRequiredFlavours) {
        const models = store.getModelsByFlavour(flavour) as Array<any>;
        for (const m of models) {
          if (m?.parent?.id === surface.id)
            continue;
          try {
            (store as any).moveBlocks?.([m], surface);
          }
          catch {
            // ignore
          }
        }
      }

      // After moves, sanitize once more.
      sanitizeChildren(surface);
    }
  });
}

function tryDeriveDocTitle(store: Store): string | null {
  const tcTitle = tryReadTcHeaderTitle(store);
  if (tcTitle)
    return tcTitle;

  return tryReadNativeDocTitle(store);
}

function tryReadNativeDocTitle(store: Store): string | null {
  try {
    const pages = store.getModelsByFlavour("affine:page") as Array<any>;
    const page = pages?.[0];
    const title = page?.props?.title;
    const str = typeof title?.toString === "function" ? title.toString() : "";
    const trimmed = String(str ?? "").trim();
    return trimmed || null;
  }
  catch {
    return null;
  }
}

function tryReadTcHeaderTitleFromYDoc(ydoc: Y.Doc | undefined): string | null {
  try {
    const share = (ydoc as any)?.share as Map<string, unknown> | undefined;
    if (!ydoc || !share || typeof (share as any).get !== "function")
      return null;

    const tcHeader = (share as any).get("tc_header") as unknown;
    const title = (tcHeader as any)?.get?.("title") as unknown;
    const trimmed = typeof title === "string" ? title.trim() : "";
    return trimmed || null;
  }
  catch {
    return null;
  }
}

function tryReadTcHeaderTitle(store: Store): string | null {
  try {
    const ydoc = (store as any)?.spaceDoc as Y.Doc | undefined;
    return tryReadTcHeaderTitleFromYDoc(ydoc);
  }
  catch {
    return null;
  }
}

export function getOrCreateSpaceWorkspaceRuntime(workspaceId: string): SpaceWorkspace {
  const existing = workspaceById.get(workspaceId);
  if (existing) {
    touchWorkspaceRuntimeRecord(existing);
    return existing.workspace;
  }

  const ws = new SpaceWorkspace({ workspaceId });
  const record: WorkspaceRuntimeRecord = {
    workspace: ws,
    retainCount: 0,
    lastTouchedAt: Date.now(),
    disposeTimer: null,
  };
  workspaceById.set(workspaceId, record);
  scheduleWorkspaceRuntimeDispose(workspaceId);
  return ws;
}

export function getSpaceWorkspaceRuntimeIfExists(workspaceId: string): SpaceWorkspace | null {
  const record = workspaceById.get(workspaceId);
  if (!record) {
    return null;
  }
  touchWorkspaceRuntimeRecord(record);
  return record.workspace;
}

export function retainSpaceWorkspaceRuntime(workspaceId: string): SpaceWorkspace {
  const workspace = getOrCreateSpaceWorkspaceRuntime(workspaceId);
  const record = workspaceById.get(workspaceId);
  if (!record) {
    return workspace;
  }

  record.retainCount += 1;
  record.lastTouchedAt = Date.now();
  clearWorkspaceDisposeTimer(record);
  return workspace;
}

export function releaseSpaceWorkspaceRuntime(workspaceId: string): void {
  const record = workspaceById.get(workspaceId);
  if (!record) {
    return;
  }

  record.retainCount = Math.max(0, record.retainCount - 1);
  record.lastTouchedAt = Date.now();
  scheduleWorkspaceRuntimeDispose(workspaceId);
}

export function getOrCreateSpaceDocStore(params: {
  workspaceId: string;
  docId: string;
  readonly?: boolean;
}): Store {
  const ws = getOrCreateSpaceWorkspaceRuntime(params.workspaceId);
  const doc = ws.getDoc(params.docId) ?? ws.createDoc(params.docId);
  const isRemoteBackedDoc = Boolean(parseDescriptionDocId(params.docId));

  if (isRemoteBackedDoc) {
    // 远端文档：先 load + 走远端恢复；若远端无数据，会在 hydration 完成时初始化最小骨架。
    doc.load();
  }
  else {
    doc.load(() => {
      const store = doc.getStore();
      ensureAffineMinimumBlockData(store);
    });
  }

  // doc.load(initFn) only runs initFn once. If the doc is already loaded in this
  // session, we still want to backfill missing props for edgeless rendering.
  const writableStore = doc.getStore();
  // 对远端文档，若当前尚无 root，说明仍在等待首轮远端恢复，不先写本地骨架。
  if (!isRemoteBackedDoc || writableStore.root) {
    ensureAffineMinimumBlockData(writableStore);
  }

  // Best-effort: sync title into meta so linked-doc can fuzzy-match by title.
  const tcTitle = tryReadTcHeaderTitle(writableStore);
  const title = tcTitle ?? tryReadNativeDocTitle(writableStore);
  if (title) {
    const meta = ws.meta.getDocMeta(params.docId);
    if (!meta) {
      ws.meta.addDocMeta({ id: params.docId, title, tags: [], createDate: Date.now() });
    }
    else if (tcTitle || !meta.title) {
      if (meta.title !== title) {
        ws.meta.setDocMeta(params.docId, { title });
      }
    }
  }
  if (params.readonly) {
    return doc.getStore({ readonly: true });
  }
  return writableStore;
}
