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
import { AwarenessStore, nanoid, StoreContainer } from "@blocksuite/store";
import { BlobEngine, DocEngine, IndexedDBBlobSource, IndexedDBDocSource } from "@blocksuite/sync";
import { Subject } from "rxjs";
import { Awareness } from "y-protocols/awareness.js";
import * as Y from "yjs";
import { applyUpdate, encodeStateAsUpdate } from "yjs";

import { Text } from "@blocksuite/store";

import { AFFINE_STORE_EXTENSIONS } from "@/components/chat/infra/blocksuite/spec/affineSpec";

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

    this._docMetas[idx] = { ...this._docMetas[idx], ...props };
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
  private readonly _storeContainer: StoreContainer;

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

    this.spaceDoc.load();
    initFn?.();
    this._ready = true;
  }

  remove(): void {
    this.workspace.removeDoc(this.id);
  }

  clear(): void {
    this.yBlocks.clear();
  }

  dispose(): void {
    // Keep data; no-op
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
    this.meta = new InMemoryWorkspaceMeta();
    this.storeExtensions = params.storeExtensions ?? AFFINE_STORE_EXTENSIONS;

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
    this.slots.docListUpdated.next();
    return doc;
  }

  getDoc(docId: string): Doc | null {
    return this._docs.get(docId) ?? null;
  }

  removeDoc(docId: string): void {
    const doc = this._docs.get(docId);
    if (!doc)
      return;

    this._docs.delete(docId);
    this.meta.removeDocMeta(docId);
    this.slots.docListUpdated.next();

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
   * 注意：这不是持久化 undo 栈；只是把当前内容替换为某个历史版本。
   */
  restoreDocFromUpdate(params: { docId: string; update: Uint8Array }) {
    const doc = (this.getDoc(params.docId) as SpaceDoc | null) ?? (this.createDoc(params.docId) as SpaceDoc);
    doc.load();
    doc.clear();
    if (params.update.length)
      applyUpdate(doc.spaceDoc, params.update);
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
    this.docSync.forceStop();
    this.blobSync.stop();
    this._docs.clear();
  }
}

const workspaceById = new Map<string, SpaceWorkspace>();

export function getOrCreateSpaceWorkspaceRuntime(workspaceId: string): SpaceWorkspace {
  const existing = workspaceById.get(workspaceId);
  if (existing)
    return existing;

  const ws = new SpaceWorkspace({ workspaceId });
  workspaceById.set(workspaceId, ws);
  return ws;
}

export function getOrCreateSpaceDocStore(params: {
  workspaceId: string;
  docId: string;
}): Store {
  const ws = getOrCreateSpaceWorkspaceRuntime(params.workspaceId);
  const doc = ws.getDoc(params.docId) ?? ws.createDoc(params.docId);

  doc.load(() => {
    const store = doc.getStore();
    // 1) 首次初始化：创建最小 Affine-like block tree
    if (!store.root) {
      const pageId = store.addBlock("affine:page", { title: new Text("") });
      store.addBlock("affine:surface", {}, pageId);
      const noteId = store.addBlock("affine:note", {}, pageId);
      store.addBlock("affine:paragraph", { text: new Text("") }, noteId);
      return;
    }

    // 2) 旧数据迁移：历史版本可能没写入 title/text，导致标题/placeholder/输入行为异常。
    //    这里在加载时做一次“补齐缺省字段”，确保 paragraph 具备 Text(yText) 可编辑数据源。
    store.transact(() => {
      const pageModels = store.getModelsByFlavour("affine:page") as Array<any>;
      for (const m of pageModels) {
        if (!m?.props?.title) {
          store.updateBlock(m, { title: new Text("") });
        }
      }

      const paragraphModels = store.getModelsByFlavour("affine:paragraph") as Array<any>;
      for (const m of paragraphModels) {
        if (!m?.props?.text) {
          store.updateBlock(m, { text: new Text("") });
        }
      }
    });
  });

  return doc.getStore();
}
