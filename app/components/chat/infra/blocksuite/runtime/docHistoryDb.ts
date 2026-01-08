import { openDB } from "idb";

import { base64ToUint8Array, uint8ArrayToBase64 } from "@/components/chat/infra/blocksuite/base64";

type DocHistoryRow = {
  id?: number;
  spaceId: number;
  docId: string;
  createdAt: number;
  label?: string;
  updateB64: string;
};

const DB_NAME = "blocksuiteDocHistoryDB";
const STORE = "docHistory";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("bySpaceDoc", ["spaceId", "docId", "createdAt"]);
        store.createIndex("bySpace", "spaceId");
      }
    },
  });
}

/**
 * 保存一个文档版本快照（本地）。
 *
 * 说明：这是“版本回滚”能力；并不等价于持久化 Undo 栈。
 */
export async function addDocSnapshot(params: {
  spaceId: number;
  docId: string;
  update: Uint8Array;
  label?: string;
}) {
  const db = await getDb();
  const row: DocHistoryRow = {
    spaceId: params.spaceId,
    docId: params.docId,
    createdAt: Date.now(),
    label: params.label,
    updateB64: uint8ArrayToBase64(params.update),
  };
  await db.add(STORE, row);
}

export async function listDocSnapshots(params: {
  spaceId: number;
  docId: string;
  limit?: number;
}): Promise<Array<Pick<DocHistoryRow, "id" | "createdAt" | "label">>> {
  const db = await getDb();
  const tx = db.transaction(STORE, "readonly");
  const index = tx.store.index("bySpaceDoc");

  const rows: DocHistoryRow[] = [];
  // 遍历所有版本（数量通常不会太大；如需优化可做游标反向遍历）
  let cursor = await index.openCursor([params.spaceId, params.docId]);
  while (cursor) {
    rows.push(cursor.value);
    cursor = await cursor.continue();
  }

  rows.sort((a, b) => b.createdAt - a.createdAt);
  const limited = typeof params.limit === "number" ? rows.slice(0, params.limit) : rows;

  return limited
    .filter(r => typeof r.id === "number")
    .map(r => ({ id: r.id!, createdAt: r.createdAt, label: r.label }));
}

export async function getSnapshotUpdate(params: { snapshotId: number }): Promise<Uint8Array | null> {
  const db = await getDb();
  const row = (await db.get(STORE, params.snapshotId)) as DocHistoryRow | undefined;
  if (!row?.updateB64)
    return null;
  return base64ToUint8Array(row.updateB64);
}
