import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import {
  markDirectMessageRecalledData,
  upsertDirectInboxMessagesData,
} from "@tuanchat/query/direct-message";

import type { LocalDbSqliteDriver } from "./index";

export const DIRECT_MESSAGES_TABLE_NAME = "direct_messages";

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
  clearUserMessages: (currentUserId: number) => Promise<void>;
  getMessagesByContact: (currentUserId: number, contactId: number, options?: DirectMessageReadWindowOptions) => Promise<MessageDirectResponse[]>;
  getMessagesByUser: (currentUserId: number, options?: DirectMessageReadWindowOptions) => Promise<MessageDirectResponse[]>;
  markMessagesRecalled: (currentUserId: number, messageIds: number[]) => Promise<void>;
  upsertMessages: (currentUserId: number, messages: MessageDirectResponse[]) => Promise<void>;
  upsertReadLine: (currentUserId: number, contactId: number, syncId: number) => Promise<void>;
};

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeIds(ids: number[]): number[] {
  return Array.from(new Set((ids ?? []).filter(id => Number.isInteger(id))));
}

function createPlaceholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
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

function createReadLineMessageId(_currentUserId: number, contactId: number): number {
  return -contactId;
}

function createReadLineMessage(currentUserId: number, contactId: number, syncId: number): MessageDirectResponse {
  return {
    createTime: new Date().toISOString(),
    messageId: createReadLineMessageId(currentUserId, contactId),
    messageType: 10000,
    receiverId: contactId,
    senderId: currentUserId,
    status: 0,
    syncId,
    userId: currentUserId,
  };
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

  async function inTransaction<T>(task: () => Promise<T>): Promise<T> {
    if (driver.transaction) {
      return driver.transaction(task);
    }
    return task();
  }

  async function upsertPreparedMessages(currentUserId: number, messages: MessageDirectResponse[]) {
    if (!isPositiveId(currentUserId) || messages.length === 0) {
      return;
    }

    await ensureSchema();
    await inTransaction(async () => {
      for (const message of messages) {
        const record = toDirectMessageRecord(currentUserId, message);
        if (!record) {
          continue;
        }

        await driver.run(
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
    });
  }

  return {
    async clearUserMessages(currentUserId) {
      if (!isPositiveId(currentUserId)) {
        return;
      }

      await ensureSchema();
      await driver.run(`DELETE FROM ${DIRECT_MESSAGES_TABLE_NAME} WHERE current_user_id = ?`, [currentUserId]);
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
      return fromDirectMessageRecords(rows);
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
      return fromDirectMessageRecords(rows);
    },

    async markMessagesRecalled(currentUserId, messageIds) {
      if (!isPositiveId(currentUserId)) {
        return;
      }
      const ids = normalizeIds(messageIds);
      if (ids.length === 0) {
        return;
      }

      await ensureSchema();
      const rows = await driver.all<Pick<DirectMessageRecord, "payload_json">>(
        `SELECT payload_json
          FROM ${DIRECT_MESSAGES_TABLE_NAME}
          WHERE current_user_id = ? AND message_id IN (${createPlaceholders(ids.length)})`,
        [currentUserId, ...ids],
      );
      const recalledMessages = markDirectMessageRecalledData(fromDirectMessageRecords(rows), ids[0]);
      const nextMessages = ids.slice(1).reduce(
        (messages, messageId) => markDirectMessageRecalledData(messages, messageId),
        recalledMessages,
      );
      await upsertPreparedMessages(currentUserId, nextMessages ?? []);
    },

    async upsertMessages(currentUserId, messages) {
      await upsertPreparedMessages(currentUserId, normalizeDirectMessagesForStorage(currentUserId, messages));
    },

    async upsertReadLine(currentUserId, contactId, syncId) {
      if (!isPositiveId(currentUserId) || !isPositiveId(contactId) || syncId <= 0) {
        return;
      }

      await upsertPreparedMessages(currentUserId, [
        createReadLineMessage(currentUserId, contactId, syncId),
      ]);
    },
  };
}
