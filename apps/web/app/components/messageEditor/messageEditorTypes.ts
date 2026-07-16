import type { Message } from "../../../api";

export type MessageEditorLocalSyncState = "optimistic";

/** message editor 保存状态，供正文编排和头部状态徽标共享。 */
export type MessageEditorSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/** 团剧共创文档头部兜底信息。 */
export type MessageEditorTcHeader = {
  enabled?: boolean;
  fallbackTitle?: string;
  fallbackImageUrl?: string;
  fallbackImageFileId?: number;
  fallbackOriginalImageFileId?: number;
  fallbackImageMediaType?: string;
}

export type MessageEditorMessage = Omit<Partial<Message>, "extra"> & {
  avatarId?: number;
  customRoleName?: string;
  extra?: Record<string, Record<string, any>>;
  roleId?: number;
  tcLocalSyncState?: MessageEditorLocalSyncState;
};
