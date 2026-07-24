import type { MessageDraft } from "@tuanchat/domain/message-draft";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MessageEditorContentAdapter, MessageEditorMessage, MessageEditorSaveState } from "./messageEditorTypes";

import { getLocalValue, setLocalValue } from "../chat/infra/localDb/chatHistoryDb";
import {
  inheritMessageEditorRuntimeBlockId,
  normalizeMessageEditorDraft,
} from "./document/messageEditorTransforms";

const USER_READ_ME_STORAGE_KEY = "profile:user-readme";
const EMPTY_DRAFTS: MessageDraft[] = [];

type UserReadMeSaveScheduler = {
  clear(timer: unknown): void;
  schedule(callback: () => void, delayMs: number): unknown;
};

type UserReadMeSaveCoordinatorDependencies = {
  onState(state: MessageEditorSaveState): void;
  scheduler: UserReadMeSaveScheduler;
  write(drafts: MessageDraft[]): Promise<void>;
};

/** UserReadMe 允许整份草稿覆写，但失败后只在下一次编辑时再次保存。 */
export class UserReadMeSaveCoordinator {
  private active = false;
  private disposed = false;
  private failed = false;
  private pending: MessageDraft[] | null = null;
  private timer: unknown = null;

  constructor(
    private readonly dependencies: UserReadMeSaveCoordinatorDependencies,
    private readonly delayMs = 500,
  ) {}

  edit(drafts: MessageDraft[]): void {
    this.pending = drafts;
    this.failed = false;
    this.dependencies.onState("dirty");
    this.schedule();
  }

  activate(): void {
    this.disposed = false;
  }

  async flush(): Promise<void> {
    if (this.disposed || this.active || !this.pending) return;
    this.clearTimer();
    const submitted = this.pending;
    this.pending = null;
    this.active = true;
    this.dependencies.onState("saving");
    try {
      await this.dependencies.write(submitted);
      this.failed = false;
      this.dependencies.onState(this.pending ? "dirty" : "saved");
    }
    catch (error) {
      this.pending ??= submitted;
      this.failed = true;
      this.dependencies.onState("error");
      throw error;
    }
    finally {
      this.active = false;
    }
    if (this.pending) this.schedule();
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  private schedule(): void {
    if (this.disposed || this.failed || this.active || !this.pending) return;
    this.clearTimer();
    this.timer = this.dependencies.scheduler.schedule(() => {
      this.timer = null;
      void this.flush().catch(error => console.error("[user-readme] local save failed", error));
    }, this.delayMs);
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    this.dependencies.scheduler.clear(this.timer);
    this.timer = null;
  }
}

function getUserReadMeQueryKey(userId: number) {
  return ["userReadMe", userId] as const;
}

export function toUserReadMeMessageDraft(message: MessageEditorMessage): MessageDraft {
  const {
    createTime: _createTime,
    messageId: _messageId,
    position: _position,
    replyMessageId: _replyMessageId,
    roomId: _roomId,
    status: _status,
    syncId: _syncId,
    tcLocalRenderKey: _tcLocalRenderKey,
    tcLocalSyncState: _tcLocalSyncState,
    tcMessageEditorDraft: _tcMessageEditorDraft,
    updateTime: _updateTime,
    userId: _userId,
    ...draft
  } = message;
  const normalized = normalizeMessageEditorDraft(draft) ?? { content: "", messageType: 1 };
  return inheritMessageEditorRuntimeBlockId(message, normalized) as MessageDraft;
}

/** 个人主页 adapter：MessageDraft Query 乐观更新后整份覆写本机 SQLite。 */
export function useUserReadMeMessageAdapter(userId: number): MessageEditorContentAdapter {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => getUserReadMeQueryKey(userId), [userId]);
  const query = useQuery<MessageDraft[]>({
    enabled: false,
    gcTime: Number.POSITIVE_INFINITY,
    initialData: EMPTY_DRAFTS,
    queryFn: () => EMPTY_DRAFTS,
    queryKey,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<MessageEditorSaveState>("idle");
  const editedRef = useRef(false);

  const coordinator = useMemo(() => new UserReadMeSaveCoordinator({
    onState: setSaveState,
    scheduler: {
      clear: timer => window.clearTimeout(timer as number),
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
    },
    write: drafts => setLocalValue(USER_READ_ME_STORAGE_KEY, drafts, { userId }),
  }), [userId]);

  useEffect(() => {
    coordinator.activate();
    editedRef.current = false;
    setReady(false);
    setSaveState("idle");
    let active = true;
    void getLocalValue<MessageDraft[]>(USER_READ_ME_STORAGE_KEY, { userId })
      .then((drafts) => {
        if (!active || editedRef.current) return;
        queryClient.setQueryData(queryKey, drafts ?? EMPTY_DRAFTS);
      })
      .catch(error => console.error("[user-readme] local load failed", error))
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      coordinator.dispose();
    };
  }, [coordinator, queryClient, queryKey, userId]);

  const applyChange = useCallback<MessageEditorContentAdapter["applyChange"]>((change) => {
    const drafts = change.messages.map(toUserReadMeMessageDraft);
    editedRef.current = true;
    queryClient.setQueryData(queryKey, drafts);
    coordinator.edit(drafts);
    return drafts as MessageEditorMessage[];
  }, [coordinator, queryClient, queryKey]);

  return useMemo(() => ({
    applyChange,
    identity: `user-readme:${userId}`,
    messages: query.data as MessageEditorMessage[],
    ready,
    saveState,
  }), [applyChange, query.data, ready, saveState, userId]);
}
