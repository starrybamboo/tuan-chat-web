import type { StoredSnapshot } from "@/components/chat/infra/doc/description/descriptionDocRemote";

import { parseDescriptionDocId } from "@/components/chat/infra/doc/description/descriptionDocId";
import { getRemoteSnapshot, setRemoteSnapshot } from "@/components/chat/infra/doc/description/descriptionDocRemote";
import { normalizeBlocksuiteDocHeader } from "@/components/chat/infra/doc/document/docHeader";
import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotCache";
import { cloneBlockNoteSnapshotWithHeader, createBlockNoteSnapshot, decodeBlockNoteBlocks, isStoredBlockNoteSnapshot } from "@/components/chat/infra/doc/document/legacyRichTextSnapshot";
import { upsertSpaceDocMetaCacheEntry } from "@/components/chat/infra/doc/space/spaceDocMetaPersistence";

import { tuanchat } from "../../../../api/instance";

async function getSnapshotForCopy(docId: string): Promise<StoredSnapshot | null> {
  const cached = getCachedDocSnapshot(docId);
  if (cached) {
    return cached;
  }

  const key = parseDescriptionDocId(docId);
  if (!key) {
    return null;
  }

  return await getRemoteSnapshot(key);
}

function buildCopiedSnapshot(
  sourceSnapshot: StoredSnapshot | null,
  header: {
    title: string;
    imageUrl?: string;
    imageFileId?: number;
    originalImageFileId?: number;
    imageMediaType?: string;
  },
) {
  const normalizedHeader = normalizeBlocksuiteDocHeader({
    title: header.title,
    imageUrl: header.imageUrl,
    imageFileId: header.imageFileId,
    originalImageFileId: header.originalImageFileId,
    imageMediaType: header.imageMediaType,
  });

  if (isStoredBlockNoteSnapshot(sourceSnapshot)) {
    return cloneBlockNoteSnapshotWithHeader(sourceSnapshot, normalizedHeader)
      ?? createBlockNoteSnapshot({
        blocks: decodeBlockNoteBlocks(sourceSnapshot),
        header: normalizedHeader,
      });
  }

  return createBlockNoteSnapshot({
    blocks: decodeBlockNoteBlocks(sourceSnapshot),
    header: normalizedHeader,
  });
}

export async function copyDocToSpaceDoc(params: {
  spaceId: number;
  sourceDocId: string;
  sourceSpaceId?: number;
  title?: string;
  imageUrl?: string;
  imageFileId?: number;
  originalImageFileId?: number;
  imageMediaType?: string;
}): Promise<{ newDocEntityId: number; newDocId: string; title: string }> {
  const createTitle = (params.title ?? "").trim();
  const title = createTitle ? `${createTitle}（副本）` : "新文档（副本）";
  const sourceSnapshot = await getSnapshotForCopy(params.sourceDocId);

  let createdDocId: number | null = null;
  try {
    const response = await tuanchat.spaceDocController.createDoc({
      spaceId: params.spaceId,
      title,
    });
    const docId = Number((response as any)?.data?.docId);
    if (Number.isFinite(docId) && docId > 0) {
      createdDocId = docId;
    }
  }
  catch (error) {
    console.error("[SpaceDoc] create failed", error);
  }

  if (!createdDocId) {
    throw new Error("创建文档失败");
  }

  const { buildSpaceDocId } = await import("@/components/chat/infra/doc/space/spaceDocId");

  const newDocId = buildSpaceDocId({ kind: "independent", docId: createdDocId });
  const snapshot = buildCopiedSnapshot(sourceSnapshot, {
    title,
    imageUrl: params.imageUrl,
    imageFileId: params.imageFileId,
    originalImageFileId: params.originalImageFileId,
    imageMediaType: params.imageMediaType,
  });

  setCachedDocSnapshot(newDocId, snapshot);
  upsertSpaceDocMetaCacheEntry({ spaceId: params.spaceId, docId: newDocId, title });

  await setRemoteSnapshot({
    entityType: "space_doc",
    entityId: createdDocId,
    docType: "description",
    snapshot,
  });

  return { newDocEntityId: createdDocId, newDocId, title };
}

export async function copyDocToSpaceUserDoc(params: {
  spaceId: number;
  sourceDocId: string;
  sourceSpaceId?: number;
  title?: string;
  imageUrl?: string;
  imageFileId?: number;
  originalImageFileId?: number;
  imageMediaType?: string;
  tag?: string;
}): Promise<{ newDocEntityId: number; newDocId: string; title: string }> {
  const createTitle = (params.title ?? "").trim();
  const title = createTitle ? `${createTitle}（副本）` : "新文档（副本）";
  const sourceSnapshot = await getSnapshotForCopy(params.sourceDocId);

  const createDocWithRetry = async (): Promise<number> => {
    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const createRes = await tuanchat.spaceUserDocController.createDoc1({
        spaceId: params.spaceId,
        title,
        ...(params.tag ? { tag: params.tag } : {}),
      });
      if (createRes?.success && createRes.data?.docId) {
        return createRes.data.docId;
      }
      lastErr = createRes?.errMsg ?? "创建文档失败";
      if (!lastErr.includes("版本冲突")) {
        throw new Error(lastErr);
      }
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 120 * (attempt + 1));
      });
    }
    throw new Error(lastErr || "创建文档失败");
  };

  const newEntityId = await createDocWithRetry();
  const { buildDescriptionDocId } = await import("@/components/chat/infra/doc/description/descriptionDocId");

  const newDocId = buildDescriptionDocId({
    entityType: "space_user_doc",
    entityId: newEntityId,
    docType: "description",
  });
  const snapshot = buildCopiedSnapshot(sourceSnapshot, {
    title,
    imageUrl: params.imageUrl,
    imageFileId: params.imageFileId,
    originalImageFileId: params.originalImageFileId,
    imageMediaType: params.imageMediaType,
  });

  setCachedDocSnapshot(newDocId, snapshot);
  upsertSpaceDocMetaCacheEntry({ spaceId: params.spaceId, docId: newDocId, title });

  await setRemoteSnapshot({
    entityType: "space_user_doc",
    entityId: newEntityId,
    docType: "description",
    snapshot,
  });

  return { newDocEntityId: newEntityId, newDocId, title };
}
