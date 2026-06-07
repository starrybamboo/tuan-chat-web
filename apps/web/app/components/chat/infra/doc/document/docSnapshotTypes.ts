/**
 * 聊天室文档当前只保留 message-stream 快照。
 */
export type StoredMessageStreamSnapshot = {
  v: 4;
  format: "message-stream";
  updateB64: string;
  updatedAt: number;
};

/**
 * 文档快照的当前主数据类型。
 */
export type StoredSnapshot = StoredMessageStreamSnapshot;
