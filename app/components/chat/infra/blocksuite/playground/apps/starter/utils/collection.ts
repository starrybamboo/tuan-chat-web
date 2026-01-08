import type { StoreExtensionManager } from "@blocksuite/affine/ext-loader";
import type { DocCollectionOptions } from "@blocksuite/affine/store/test";
import type { BlobSource } from "@blocksuite/affine/sync";

import { AffineSchemas } from "@blocksuite/affine/schemas";
import { nanoid, Schema, Transformer } from "@blocksuite/affine/store";
import {
  createAutoIncrementIdGenerator,

  TestWorkspace,
} from "@blocksuite/affine/store/test";
import {

  BroadcastChannelAwarenessSource,
  BroadcastChannelDocSource,
  IndexedDBBlobSource,
  MemoryBlobSource,
} from "@blocksuite/affine/sync";
import * as Y from "yjs";

import type { InitFn } from "../data/utils.js";

import { MockServerBlobSource } from "../../_common/sync/blob/mock-server.js";

const params = new URLSearchParams(location.search);
const bsRoom = params.get("bsRoom");
const legacyRoom = params.get("room");
// In tuan-chat-web, `room` is commonly used by chat/websocket pages.
// Only treat `room` as playground room when it is clearly an E2E run.
const room = bsRoom ?? (legacyRoom?.startsWith("playwright") ? legacyRoom : null);
const isE2E = room?.startsWith("playwright");
const blobSourceArgs = (params.get("blobSource") ?? "").split(",");

const channelPrefix = "tc-bs";

export function createStarterDocCollection(
  storeExtensionManager: StoreExtensionManager,
) {
  const collectionId = room ?? `starter-${Math.random().toString(16).slice(2, 10)}`;
  const schema = new Schema();
  schema.register(AffineSchemas);
  const idGenerator = isE2E ? createAutoIncrementIdGenerator() : nanoid;

  let docSources: DocCollectionOptions["docSources"];
  if (room) {
    docSources = {
      main: new BroadcastChannelDocSource(`${channelPrefix}-doc-${room}`),
    };
  }
  const id = room ?? `starter-${Math.random().toString(16).slice(2, 8)}`;

  const blobSources = {
    main: new MemoryBlobSource(),
    shadows: [] as BlobSource[],
  } satisfies DocCollectionOptions["blobSources"];
  if (blobSourceArgs.includes("mock")) {
    blobSources.shadows.push(new MockServerBlobSource(collectionId));
  }
  if (blobSourceArgs.includes("idb")) {
    blobSources.shadows.push(new IndexedDBBlobSource(collectionId));
  }

  const options: DocCollectionOptions = {
    id: collectionId,
    idGenerator,
    awarenessSources: [new BroadcastChannelAwarenessSource(`${channelPrefix}-awareness-${id}`)],
    docSources,
    blobSources,
  };
  const collection = new TestWorkspace(options);
  collection.storeExtensions = storeExtensionManager.get("store");
  collection.start();

  // debug info
  window.collection = collection;
  window.blockSchemas = AffineSchemas;
  window.job = new Transformer({
    schema,
    blobCRUD: collection.blobSync,
    docCRUD: {
      create: (id: string) => collection.createDoc(id).getStore({ id }),
      get: (id: string) => collection.getDoc(id)?.getStore({ id }) ?? null,
      delete: (id: string) => collection.removeDoc(id),
    },
  });
  window.Y = Y;

  return collection;
}

export async function initStarterDocCollection(collection: TestWorkspace) {
  // use built-in init function
  const functionMap = new Map<
    string,
    (collection: TestWorkspace, id: string) => Promise<void> | void
  >();
  Object.values(
    (await import("../data/index.js")) as Record<string, InitFn>,
  ).forEach(fn => functionMap.set(fn.id, fn));
  const init = params.get("init") || "preset";
  if (functionMap.has(init)) {
    collection.meta.initialize();
    await functionMap.get(init)?.(collection, "doc:home");
    const doc = collection.getDoc("doc:home");
    if (!doc?.loaded) {
      doc?.load();
    }
  }
}
