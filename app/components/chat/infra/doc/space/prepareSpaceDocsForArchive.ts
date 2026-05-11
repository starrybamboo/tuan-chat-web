import { getRemoteSnapshot, setRemoteSnapshot } from "@/components/chat/infra/doc/description/descriptionDocRemote";
import { getCachedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotCache";
import { isStoredBlockNoteSnapshot } from "@/components/chat/infra/doc/document/legacyRichTextSnapshot";
import { buildSpaceDocId } from "@/components/chat/infra/doc/space/spaceDocId";
import { tuanchat } from "api/instance";

async function prepareSingleSpaceDocForArchive(docId: number) {
  const remoteKey = {
    entityType: "space_doc" as const,
    entityId: docId,
    docType: "description" as const,
  };
  const runtimeDocId = buildSpaceDocId({ kind: "independent", docId });
  const cachedSnapshot = getCachedDocSnapshot(runtimeDocId);

  if (isStoredBlockNoteSnapshot(cachedSnapshot)) {
    await setRemoteSnapshot({
      ...remoteKey,
      snapshot: {
        ...cachedSnapshot,
        updatedAt: Date.now(),
      },
    });
    return;
  }

  const remoteSnapshot = await getRemoteSnapshot(remoteKey);
  if (isStoredBlockNoteSnapshot(remoteSnapshot)) {
    await setRemoteSnapshot({
      ...remoteKey,
      snapshot: {
        ...remoteSnapshot,
        updatedAt: Date.now(),
      },
    });
  }
}

export async function prepareSpaceDocsForArchive(spaceId: number): Promise<void> {
  if (!Number.isFinite(spaceId) || spaceId <= 0) {
    return;
  }

  const response = await tuanchat.spaceDocController.listDocs2(spaceId);
  const docs = response?.data?.filter(doc => typeof doc.docId === "number" && doc.docId > 0) ?? [];
  for (const doc of docs) {
    await prepareSingleSpaceDocForArchive(doc.docId!);
  }
}
