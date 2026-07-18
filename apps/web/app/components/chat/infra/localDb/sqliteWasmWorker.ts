import type { SqlValue } from "@sqlite.org/sqlite-wasm";

import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

type SqliteWorkerRequest =
  | { id: number; type: "all"; sql: string; params?: SqlValue[] }
  | { id: number; type: "close" }
  | { id: number; type: "exec"; sql: string }
  | { id: number; type: "run"; sql: string; params?: SqlValue[] };

type SqliteWorkerWriteRequest = Extract<SqliteWorkerRequest, { type: "exec" | "run" }>;

type SqliteWorkerResponse =
  | { id: number; ok: true; result?: unknown }
  | { id: number; ok: false; error: string };

type Sqlite3Database = {
  close: () => void;
  exec: (options: {
    bind?: SqlValue[];
    returnValue?: "resultRows";
    rowMode?: "object";
    sql: string;
  }) => Array<Record<string, SqlValue>>;
};

type OpfsSAHPoolUtil = {
  pauseVfs: () => void;
};

type Sqlite3Static = {
  capi: {
    sqlite3_vfs_find: (vfsName: string | null) => unknown;
  };
  installOpfsSAHPoolVfs: (options: {
    directory?: string;
    initialCapacity?: number;
    name?: string;
  }) => Promise<OpfsSAHPoolUtil>;
  oo1: {
    DB: new (filename?: string, flags?: string, vfs?: string) => Sqlite3Database;
  };
};

const SQLITE_FILE_NAME = "/tuanchat-web-local.sqlite";
const SQLITE_SAHPOOL_DIRECTORY = "/tuanchat-web-local-sahpool";
const SQLITE_SAHPOOL_VFS_NAME = "tuanchat-opfs-sahpool";
const SQLITE_SAHPOOL_INITIAL_CAPACITY = 12;

let dbPromise: Promise<Sqlite3Database> | null = null;
let sahPoolUtil: OpfsSAHPoolUtil | null = null;

function normalizeParams(params: SqlValue[] | undefined): SqlValue[] {
  return params ?? [];
}

async function getDatabase(): Promise<Sqlite3Database> {
  dbPromise ??= (async () => {
    const sqlite3 = await sqlite3InitModule() as Sqlite3Static;
    sahPoolUtil = await sqlite3.installOpfsSAHPoolVfs({
      directory: SQLITE_SAHPOOL_DIRECTORY,
      initialCapacity: SQLITE_SAHPOOL_INITIAL_CAPACITY,
      name: SQLITE_SAHPOOL_VFS_NAME,
    });

    if (!sqlite3.capi.sqlite3_vfs_find(SQLITE_SAHPOOL_VFS_NAME)) {
      throw new Error("当前浏览器上下文不支持 SQLite OPFS SAH pool。");
    }

    return new sqlite3.oo1.DB(SQLITE_FILE_NAME, "c", SQLITE_SAHPOOL_VFS_NAME);
  })();
  return dbPromise;
}

async function closeDatabase(): Promise<void> {
  const pendingDatabase = dbPromise;
  dbPromise = null;
  let database: Sqlite3Database | null = null;

  if (pendingDatabase) {
    try {
      database = await pendingDatabase;
    }
    catch {
      // 初始化失败时仍需继续释放 VFS 已取得的文件句柄。
    }
  }

  try {
    database?.close();
  }
  finally {
    sahPoolUtil?.pauseVfs();
    sahPoolUtil = null;
  }
}

function runOperation(db: Sqlite3Database, operation: SqliteWorkerWriteRequest): void {
  if (operation.type === "exec") {
    db.exec({ sql: operation.sql });
    return;
  }

  db.exec({
    bind: normalizeParams(operation.params),
    sql: operation.sql,
  });
}

async function handleRequest(request: SqliteWorkerRequest): Promise<SqliteWorkerResponse> {
  try {
    if (request.type === "close") {
      await closeDatabase();
      return { id: request.id, ok: true };
    }

    const db = await getDatabase();
    if (request.type === "all") {
      const rows = db.exec({
        bind: normalizeParams(request.params),
        returnValue: "resultRows",
        rowMode: "object",
        sql: request.sql,
      });
      return { id: request.id, ok: true, result: rows };
    }

    runOperation(db, request);
    return { id: request.id, ok: true };
  }
  catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      id: request.id,
      ok: false,
    };
  }
}

self.addEventListener("message", (event: MessageEvent<SqliteWorkerRequest>) => {
  void handleRequest(event.data).then((response) => {
    self.postMessage(response satisfies SqliteWorkerResponse);
  });
});
