import type { DescriptionDocType, DescriptionEntityType } from "@/components/chat/infra/doc/description/descriptionDocId";

export async function deleteSpaceDoc(params: { spaceId: number; docId: string }) {
  // SSR-safe: this function is only meaningful in the browser.
  if (typeof window === "undefined") {
    return;
  }

  let remoteKey: { entityType: DescriptionEntityType; entityId: number; docType: DescriptionDocType } | null = null;

  try {
    const { parseDescriptionDocId } = await import("@/components/chat/infra/doc/description/descriptionDocId");
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

  try {
    const [
      { removeSpaceDocMetaCacheEntry, removePendingSpaceDocTitleSync },
      { useDocHeaderOverrideStore },
      { setCachedDocSnapshot },
    ] = await Promise.all([
      import("@/components/chat/infra/doc/space/spaceDocMetaPersistence"),
      import("@/components/chat/stores/docHeaderOverrideStore"),
      import("@/components/chat/infra/doc/document/docSnapshotCache"),
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
