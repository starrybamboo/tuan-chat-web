import type { Message } from "../../../api";

export type MessageEditorLocalSyncState = "optimistic";

export type MessageEditorMessage = Omit<Partial<Message>, "extra"> & {
  avatarId?: number;
  customRoleName?: string;
  extra?: Record<string, Record<string, any>>;
  roleId?: number;
  tcLocalSyncState?: MessageEditorLocalSyncState;
};
