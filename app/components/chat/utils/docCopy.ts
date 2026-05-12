import type { StoredSnapshot } from "@/components/chat/infra/doc/document/docSnapshotTypes";

import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotCache";
import { createMessageEditorSnapshot } from "@/components/messageEditor/model/messageEditorCodec";
import { createMessageEditorTextDraft } from "@/components/messageEditor/model/messageEditorTransforms";

import { tuanchat } from "../../../../api/instance";

function getSnapshotForCopy(docId: string): StoredSnapshot | null {
  return getCachedDocSnapshot(docId);
}

function buildCopiedSnapshot(sourceSnapshot: StoredSnapshot | null): StoredSnapshot {
  if (sourceSnapshot?.v === 4 && sourceSnapshot.format === "message-stream") {
    return {
      ...sourceSnapshot,
      updatedAt: Date.now(),
    };
  }

  return createMessageEditorSnapshot([createMessageEditorTextDraft()]);
}

/**
 * 复制空间文档实体，并复制当前会话中的 message-stream 快照缓存。
 */
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
  const sourceSnapshot = getSnapshotForCopy(params.sourceDocId);

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
  const snapshot = buildCopiedSnapshot(sourceSnapshot);

  setCachedDocSnapshot(newDocId, snapshot);

  const { upsertSpaceDocMetaCacheEntry } = await import("@/components/chat/infra/doc/space/spaceDocMetaPersistence");
  upsertSpaceDocMetaCacheEntry({
    spaceId: params.spaceId,
    docId: newDocId,
    title,
    imageUrl: params.imageUrl,
    imageFileId: params.imageFileId,
    originalImageFileId: params.originalImageFileId,
    imageMediaType: params.imageMediaType,
  });

  return { newDocEntityId: createdDocId, newDocId, title };
}

/**
 * 复制用户文档实体，并复制当前会话中的 message-stream 快照缓存。
 */
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
  const sourceSnapshot = getSnapshotForCopy(params.sourceDocId);

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
  const snapshot = buildCopiedSnapshot(sourceSnapshot);

  setCachedDocSnapshot(newDocId, snapshot);

  return { newDocEntityId: newEntityId, newDocId, title };
}
