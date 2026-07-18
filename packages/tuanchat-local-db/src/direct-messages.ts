import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { upsertDirectInboxMessagesData } from "@tuanchat/query/direct-message";

import type { LocalDbSqliteDriver } from "./index";

export const DIRECT_MESSAGES_TABLE_NAME = "direct_messages";
export const DIRECT_MESSAGE_PENDING_TABLE_NAME = "direct_message_pending";

export const DIRECT_MESSAGE_SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS ${DIRECT_MESSAGES_TABLE_NAME} (
    current_user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    sync_id INTEGER,
    status INTEGER,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (current_user_id, message_id)
  )`,
  `CREATE INDEX IF NOT EXISTS direct_messages_user_contact_sync_idx
    ON ${DIRECT_MESSAGES_TABLE_NAME} (current_user_id, contact_id, sync_id, message_id)`,
  `CREATE INDEX IF NOT EXISTS direct_messages_user_sync_idx
    ON ${DIRECT_MESSAGES_TABLE_NAME} (current_user_id, sync_id)`,
  `CREATE TABLE IF NOT EXISTS ${DIRECT_MESSAGE_PENDING_TABLE_NAME} (
    current_user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    pending_message_id INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (current_user_id, pending_message_id)
  )`,
  `CREATE INDEX IF NOT EXISTS direct_message_pending_user_contact_idx
    ON ${DIRECT_MESSAGE_PENDING_TABLE_NAME} (current_user_id, contact_id, pending_message_id)`,
] as const;

export type DirectMessageRecord = {
  contact_id: number;
  current_user_id: number;
  message_id: number;
  payload_json: string;
  status: number | null;
  sync_id: number | null;
  updated_at: string;
};

export type DirectMessageReadWindowOptions = {
  limit?: number | null;
};

export type DirectMessageRepository = {
  addPendingMessage: (currentUserId: number, message: MessageDirectResponse) => Promise<void>;
  clearUserMessages: (currentUserId: number) => Promise<void>;
  getMessagesByContact: (currentUserId: number, contactId: number, options?: DirectMessageReadWindowOptions) => Promise<MessageDirectResponse[]>;
  getMaxSyncIdByContact: (currentUserId: number, contactId: number) => Promise<number>;
  getMessagesByUser: (currentUserId: number, options?: DirectMessageReadWindowOptions) => Promise<MessageDirectResponse[]>;
  promotePendingMessage: (currentUserId: number, pendingMessageId: number, confirmedMessage: MessageDirectResponse) => Promise<void>;
  rollbackPendingMessage: (currentUserId: number, pendingMessageId: number) => Promise<void>;
  upsertMessages: (currentUserId: number, messages: MessageDirectResponse[]) => Promise<void>;
};

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeReadLimit(limit: number | null | undefined): number | null {
  return typeof limit === "number" && Number.isInteger(limit) && limit > 0 ? limit : null;
}

function getDirectContactId(message: MessageDirectResponse, currentUserId: number): number | null {
  const senderId = toFiniteNumber(message.senderId);
  const receiverId = toFiniteNumber(message.receiverId);
  if (senderId == null || receiverId == null) {
    return null;
  }
  const contactId = senderId === currentUserId
    ? receiverId
    : receiverId === currentUserId
      ? senderId
      : null;
  return contactId != null && contactId > 0 && contactId !== currentUserId ? contactId : null;
}

export function normalizeDirectMessagesForStorage(
  currentUserId: number,
  messages: MessageDirectResponse[],
): MessageDirectResponse[] {
  if (!isPositiveId(currentUserId)) {
    return [];
  }

  return upsertDirectInboxMessagesData(undefined, messages).filter((message) => {
    return Number.isInteger(message.messageId)
      && message.messageId! > 0
      && getDirectContactId(message, currentUserId) !== null;
  });
}

export function toDirectMessageRecord(
  currentUserId: number,
  message: MessageDirectResponse,
): DirectMessageRecord | null {
  if (!isPositiveId(currentUserId) || !Number.isInteger(message.messageId)) {
    return null;
  }
  const contactId = getDirectContactId(message, currentUserId);
  if (contactId == null) {
    return null;
  }

  return {
    contact_id: contactId,
    current_user_id: currentUserId,
    message_id: message.messageId!,
    payload_json: JSON.stringify(message),
    status: toFiniteNumber(message.status),
    sync_id: toFiniteNumber(message.syncId),
    updated_at: new Date().toISOString(),
  };
}

export function fromDirectMessageRecord(
  record: Pick<DirectMessageRecord, "payload_json">,
): MessageDirectResponse | null {
  try {
    const parsed = JSON.parse(record.payload_json) as MessageDirectResponse;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  }
  catch {
    return null;
  }
}

export function fromDirectMessageRecords(
  records: Array<Pick<DirectMessageRecord, "payload_json">>,
): MessageDirectResponse[] {
  return upsertDirectInboxMessagesData(
    undefined,
    records
      .map(record => fromDirectMessageRecord(record))
      .filter((message): message is MessageDirectResponse => message !== null),
  );
}

export function createDirectMessageRepository(driver: LocalDbSqliteDriver): DirectMessageRepository {
  let schemaReadyPromise: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    schemaReadyPromise ??= (async () => {
      for (const statement of DIRECT_MESSAGE_SCHEMA_SQL) {
        await driver.exec(statement);
      }
    })();
    await schemaReadyPromise;
  }

  async function inTransaction<T>(task: (transactionDriver: LocalDbSqliteDriver) => Promise<T>): Promise<T> {
    if (driver.transaction) {
      return driver.transaction(task);
    }
    return task(driver);
  }

  async function upsertPreparedMessages(
    currentUserId: number,
    messages: MessageDirectResponse[],
    transactionDriver?: LocalDbSqliteDriver,
  ) {
    if (!isPositiveId(currentUserId) || messages.length === 0) {
      return;
    }

    await ensureSchema();
    const write = async (writeDriver: LocalDbSqliteDriver) => {
      for (const message of messages) {
        const record = toDirectMessageRecord(currentUserId, message);
        if (!record) {
          continue;
        }

        await writeDriver.run(
          `INSERT OR REPLACE INTO ${DIRECT_MESSAGES_TABLE_NAME}
            (current_user_id, contact_id, message_id, sync_id, status, payload_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            record.current_user_id,
            record.contact_id,
            record.message_id,
            record.sync_id,
            record.status,
            record.payload_json,
            record.updated_at,
          ],
        );
      }
    };
    if (transactionDriver) {
      await write(transactionDriver);
      return;
    }
    await inTransaction(write);
  }

  return {
    async addPendingMessage(currentUserId, message) {
      const record = toDirectMessageRecord(currentUserId, message);
      if (!record || record.message_id >= 0) {
        return;
      }
      await ensureSchema();
      await driver.run(
        `INSERT OR REPLACE INTO ${DIRECT_MESSAGE_PENDING_TABLE_NAME}
          (current_user_id, contact_id, pending_message_id, payload_json, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
        [record.current_user_id, record.contact_id, record.message_id, record.payload_json, record.updated_at],
      );
    },
    async clearUserMessages(currentUserId) {
      if (!isPositiveId(currentUserId)) {
        return;
      }

      await ensureSchema();
      await inTransaction(async (transactionDriver) => {
        await transactionDriver.run(`DELETE FROM ${DIRECT_MESSAGES_TABLE_NAME} WHERE current_user_id = ?`, [currentUserId]);
        await transactionDriver.run(`DELETE FROM ${DIRECT_MESSAGE_PENDING_TABLE_NAME} WHERE current_user_id = ?`, [currentUserId]);
      });
    },

    async getMessagesByContact(currentUserId, contactId, options = {}) {
      if (!isPositiveId(currentUserId) || !isPositiveId(contactId)) {
        return [];
      }

      await ensureSchema();
      const limit = normalizeReadLimit(options.limit);
      const rows = await driver.all<Pick<DirectMessageRecord, "payload_json">>(
        `SELECT payload_json
          FROM ${DIRECT_MESSAGES_TABLE_NAME}
          WHERE current_user_id = ? AND contact_id = ?
          ORDER BY sync_id DESC, message_id DESC
          ${limit == null ? "" : "LIMIT ?"}`,
        limit == null ? [currentUserId, contactId] : [currentUserId, contactId, limit],
      );
      const pendingRows = await driver.all<Pick<DirectMessageRecord, "payload_json">>(
        `SELECT payload_json FROM ${DIRECT_MESSAGE_PENDING_TABLE_NAME}
          WHERE current_user_id = ? AND contact_id = ?`,
        [currentUserId, contactId],
      );
      return fromDirectMessageRecords([...rows, ...pendingRows]);
    },

    async getMaxSyncIdByContact(currentUserId, contactId) {
      if (!isPositiveId(currentUserId) || !isPositiveId(contactId)) {
        return 0;
      }
      await ensureSchema();
      const rows = await driver.all<{ max_sync_id: number | null }>(
        `SELECT MAX(sync_id) AS max_sync_id
          FROM ${DIRECT_MESSAGES_TABLE_NAME}
          WHERE current_user_id = ? AND contact_id = ?`,
        [currentUserId, contactId],
      );
      const maxSyncId = rows[0]?.max_sync_id;
      return typeof maxSyncId === "number" && Number.isFinite(maxSyncId) ? maxSyncId : 0;
    },

    async getMessagesByUser(currentUserId, options = {}) {
      if (!isPositiveId(currentUserId)) {
        return [];
      }

      await ensureSchema();
      const limit = normalizeReadLimit(options.limit);
      const rows = await driver.all<Pick<DirectMessageRecord, "payload_json">>(
        `SELECT payload_json
          FROM ${DIRECT_MESSAGES_TABLE_NAME}
          WHERE current_user_id = ?
          ORDER BY sync_id DESC, message_id DESC
          ${limit == null ? "" : "LIMIT ?"}`,
        limit == null ? [currentUserId] : [currentUserId, limit],
      );
      const pendingRows = await driver.all<Pick<DirectMessageRecord, "payload_json">>(
        `SELECT payload_json FROM ${DIRECT_MESSAGE_PENDING_TABLE_NAME} WHERE current_user_id = ?`,
        [currentUserId],
      );
      return fromDirectMessageRecords([...rows, ...pendingRows]);
    },

    async promotePendingMessage(currentUserId, pendingMessageId, confirmedMessage) {
      if (!isPositiveId(currentUserId) || !Number.isInteger(pendingMessageId) || pendingMessageId >= 0) {
        return;
      }
      await ensureSchema();
      await inTransaction(async (transactionDriver) => {
        await transactionDriver.run(
          `DELETE FROM ${DIRECT_MESSAGE_PENDING_TABLE_NAME}
            WHERE current_user_id = ? AND pending_message_id = ?`,
          [currentUserId, pendingMessageId],
        );
        await upsertPreparedMessages(currentUserId, [confirmedMessage], transactionDriver);
      });
    },

    async rollbackPendingMessage(currentUserId, pendingMessageId) {
      if (!isPositiveId(currentUserId) || !Number.isInteger(pendingMessageId) || pendingMessageId >= 0) {
        return;
      }
      await ensureSchema();
      await driver.run(
        `DELETE FROM ${DIRECT_MESSAGE_PENDING_TABLE_NAME}
          WHERE current_user_id = ? AND pending_message_id = ?`,
        [currentUserId, pendingMessageId],
      );
    },

    async upsertMessages(currentUserId, messages) {
      await upsertPreparedMessages(currentUserId, normalizeDirectMessagesForStorage(currentUserId, messages));
    },

  };
}
