import type { DescriptionDocType, DescriptionEntityType } from "@/components/chat/infra/blocksuite/description/descriptionDocId";

export async function deleteSpaceDoc(params: { spaceId: number; docId: string }) {
  // SSR-safe: this function is only meaningful in the browser.
  // Avoid importing Blocksuite runtime modules at module scope because TanStack Start dev (Vite)
  // may evaluate modules in an SSR context where `document` is not defined.
  if (typeof window === "undefined") {
    return;
  }

  let remoteKey: { entityType: DescriptionEntityType; entityId: number; docType: DescriptionDocType } | null = null;

  try {
    const { parseDescriptionDocId } = await import("@/components/chat/infra/blocksuite/description/descriptionDocId");
    remoteKey = parseDescriptionDocId(params.docId);
  }
  catch {
    remoteKey = null;
  }

  // space_doc 的业务实体删除是主路径；失败时应终止本地移除，避免 UI 假删。
  if (remoteKey?.entityType === "space_doc") {
    const { tuanchat } = await import("api/instance");
    await tuanchat.spaceDocController.deleteDoc(remoteKey.entityId);
  }

  // 远端快照/updates 删除仍按 best-effort 处理：
  // - space_doc：业务实体已删，不要因为快照清理失败而把 UI 回滚到“未删除”
  // - room/space description：目前主要用于解散后的附带清理
  try {
    if (remoteKey) {
      const { deleteRemoteSnapshot } = await import("@/components/chat/infra/blocksuite/description/descriptionDocRemote");
      await deleteRemoteSnapshot(remoteKey);
    }
  }
  catch {
    // ignore
  }

  // Clear any queued offline updates (otherwise a later debounce flush could re-upload snapshot).
  try {
    const { clearUpdates } = await import("@/components/chat/infra/blocksuite/description/descriptionDocDb");
    await clearUpdates(params.docId);
  }
  catch {
    // ignore
  }

  try {
    const [
      { removeSpaceDocMetaCacheEntry, removePendingSpaceDocTitleSync },
      { useDocHeaderOverrideStore },
      { setCachedDocSnapshot },
    ] = await Promise.all([
      import("@/components/chat/infra/blocksuite/space/spaceDocMetaPersistence"),
      import("@/components/chat/stores/docHeaderOverrideStore"),
      import("@/components/chat/infra/blocksuite/document/docSnapshotCache"),
    ]);

    removeSpaceDocMetaCacheEntry({ spaceId: params.spaceId, docId: params.docId });
    setCachedDocSnapshot(params.docId, null);
    useDocHeaderOverrideStore.getState().clearHeader({ docId: params.docId });

    if (remoteKey?.entityType === "space_doc") {
      removePendingSpaceDocTitleSync(remoteKey.entityId);
    }
  }
  catch {
    // ignore
  }
}
