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

import { RemoteSnapshotDocSource } from "@/components/chat/infra/blocksuite/remoteDocSource";
import { TC_STORE_EXTENSIONS } from "@/components/chat/infra/blocksuite/spec/tcSpec";

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

class SingleDoc implements Doc {
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

    // Keep store's expectation: blocks live in a sub-doc under rootDoc.getMap('spaces').
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
    const storeExtensions = (this.workspace as SingleDocWorkspace).storeExtensions.concat(options.extensions ?? []);
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

class SingleDocWorkspace implements Workspace {
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

  constructor(params: { workspaceId: string; storeExtensions: ExtensionType[] }) {
    this.id = params.workspaceId;
    this._rootDoc = new Y.Doc({ guid: params.workspaceId });
    this.meta = new InMemoryWorkspaceMeta();
    this.storeExtensions = params.storeExtensions;

    // Sync: local IndexedDB as main, remote snapshot as shadow.
    const logger = new NoopLogger();
    this.docSync = new DocEngine(
      this._rootDoc,
      new IndexedDBDocSource("tuan-chat-blocksuite"),
      [new RemoteSnapshotDocSource()],
      logger,
    );

    this.blobSync = new BlobEngine(
      new IndexedDBBlobSource("tuan-chat-blocksuite"),
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

    const doc = new SingleDoc({ id, workspace: this, rootDoc: this._rootDoc });
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

    // Remove subdoc if present
    this._rootDoc.getMap<Y.Doc>("spaces").delete(docId);
  }

  dispose(): void {
    this.docSync.forceStop();
    this.blobSync.stop();
    this._docs.clear();
  }
}

const workspaceById = new Map<string, SingleDocWorkspace>();

export function getOrCreateSingleDocWorkspace(workspaceId: string): SingleDocWorkspace {
  const existing = workspaceById.get(workspaceId);
  if (existing)
    return existing;

  const ws = new SingleDocWorkspace({
    workspaceId,
    storeExtensions: TC_STORE_EXTENSIONS,
  });
  workspaceById.set(workspaceId, ws);
  return ws;
}

export function getOrCreateSingleDocStore(workspaceId: string): Store {
  const ws = getOrCreateSingleDocWorkspace(workspaceId);
  const doc = ws.getDoc(workspaceId) ?? ws.createDoc(workspaceId);

  doc.load(() => {
    const store = doc.getStore();
    if (store.root)
      return;

    // Initialize minimal block tree: root -> paragraph
    const rootId = store.addBlock("tc:root", {});
    store.addBlock("tc:paragraph", {}, rootId);
  });

  return doc.getStore();
}
