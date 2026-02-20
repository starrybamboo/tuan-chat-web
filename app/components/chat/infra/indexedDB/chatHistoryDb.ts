import type { ChatMessageResponse } from "../../../../../api";

const DB_NAME = "chatHistoryDB";
const STORE_NAME = "messages";
const ROOM_ID_INDEX = "roomId_idx";

/**
 * 打开或创建IndexedDB，并设置好对象存储和索引
 */
function openChatDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 5);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (db.objectStoreNames.contains(STORE_NAME)) {
        // 如果存在旧的 store，则删除重建以更新 keyPath 和索引
        db.deleteObjectStore(STORE_NAME);
      }

      // 创建新的对象存储，使用嵌套的 message.messageId 作为主键
      const store = db.createObjectStore(STORE_NAME, { keyPath: "message.messageId" });

      // 在 'message.roomId' 字段上创建索引
      store.createIndex(ROOM_ID_INDEX, "message.roomId", { unique: false });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 批量插入或更新消息。
 * 如果消息的 messageId 已存在，则更新该消息；否则，插入新消息。
 * @param messages 要添加或更新的消息数组
 */
export async function addOrUpdateMessagesBatch(messages: ChatMessageResponse[]): Promise<void> {
  if (!messages || messages.length === 0) {
    return;
  }
  const db = await openChatDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  // 遍历数组，对每条消息执行 put 操作
  messages.forEach((message) => {
    store.put(message);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = (_) => {
      db.close();
      console.error("Batch update transaction error:", transaction.error);
      reject(transaction.error);
    };
  });
}

/**
 * 按 messageId 批量删除消息
 * @param messageIds 要删除的 messageId 列表
 */
export async function deleteMessagesByIds(messageIds: number[]): Promise<void> {
  const ids = Array.from(new Set((messageIds ?? []).filter(id => Number.isFinite(id))));
  if (ids.length === 0) {
    return;
  }

  const db = await openChatDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  ids.forEach((messageId) => {
    store.delete(messageId);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * 获取指定房间的所有聊天记录，并按 position 升序排序
 * @param roomId 房间ID
 * @returns 返回一个Promise，解析为该房间的消息数组
 */
export async function getMessagesByRoomId(roomId: number): Promise<ChatMessageResponse[]> {
  const db = await openChatDB();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index(ROOM_ID_INDEX);
  const request = index.getAll(roomId);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * 清空指定房间的所有聊天记录
 * @param roomId 房间ID
 */
export async function clearMessagesByRoomId(roomId: number): Promise<void> {
  const db = await openChatDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index(ROOM_ID_INDEX);
  const request = index.openKeyCursor(IDBKeyRange.only(roomId));

  request.onsuccess = () => {
    const cursor = request.result;
    if (cursor) {
      store.delete(cursor.primaryKey);
      cursor.continue();
    }
  };

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}
