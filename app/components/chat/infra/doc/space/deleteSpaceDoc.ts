export async function deleteSpaceDoc(params: { spaceId: number; docId: string }) {
  // SSR-safe: this function is only meaningful in the browser.
  if (typeof window === "undefined") {
    return;
  }

  const docRoomId = Number(params.docId);

  // 文档实体就是 DOC_ROOM；远端删除失败时终止本地移除，避免 UI 假删。
  if (Number.isFinite(docRoomId) && docRoomId > 0) {
    const { tuanchat } = await import("api/instance");
    await tuanchat.spaceDocController.deleteDoc(docRoomId);
  }

  try {
    const [
      { removeSpaceDocMetaCacheEntry, removePendingSpaceDocTitleSync },
      { useDocHeaderOverrideStore },
      { setCachedDocSnapshot },
      { removePersistedDocSnapshot },
    ] = await Promise.all([
      import("@/components/chat/infra/doc/space/spaceDocMetaPersistence"),
      import("@/components/chat/stores/docHeaderOverrideStore"),
      import("@/components/chat/infra/doc/document/docSnapshotCache"),
      import("@/components/chat/infra/doc/document/docSnapshotPersistence"),
    ]);

    removeSpaceDocMetaCacheEntry({ spaceId: params.spaceId, docId: params.docId });
    setCachedDocSnapshot(params.docId, null);
    await removePersistedDocSnapshot(params.docId);
    useDocHeaderOverrideStore.getState().clearHeader({ docId: params.docId });

    if (Number.isFinite(docRoomId) && docRoomId > 0) {
      removePendingSpaceDocTitleSync(docRoomId);
    }
  }
  catch {
    // ignore
  }
}
