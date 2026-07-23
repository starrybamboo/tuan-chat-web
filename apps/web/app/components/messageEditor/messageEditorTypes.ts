import type { Message } from "../../../api";

export type MessageEditorLocalSyncState = "optimistic";

/** message editor 保存状态，供正文编排和头部状态徽标共享。 */
export type MessageEditorSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type MessageEditorRoomSyncProgress = Readonly<{
  backgroundPhase?: "localSaving" | "cloudSaving";
  cloudDurationMs?: number;
  dueAt?: number;
  durationMs?: number;
  localDurationMs?: number;
  phase: "idle" | "editing" | "localSaving" | "localSaved" | "cloudSaving" | "localFinalizing" | "synced" | "syncedLocalPending" | "retrying" | "reconciling" | "error" | "ambiguous";
  startedAt?: number;
}>;

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
  tcLocalRenderKey?: string;
  tcLocalSyncState?: MessageEditorLocalSyncState;
  tcMessageEditorDraft?: boolean;
};

/** 内容和持久化策略由调用方 adapter 提供，编辑器只提交交互事务。 */
export type MessageEditorContentAdapter = {
  applyChange(change: {
    changedBlockIds: readonly string[];
    messages: MessageEditorMessage[];
    previousMessages: MessageEditorMessage[];
    structureChanged: boolean;
  }): MessageEditorMessage[];
  identity: string;
  messages: MessageEditorMessage[];
  ready: boolean;
  saveState: MessageEditorSaveState;
};
