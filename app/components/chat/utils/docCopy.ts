import type { StoredSnapshot } from "@/components/chat/infra/doc/document/docSnapshotTypes";

import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotCache";
import { getPersistedDocSnapshot, setPersistedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotPersistence";
import { createMessageEditorSnapshot } from "@/components/messageEditor/model/messageEditorCodec";
import { createMessageEditorTextDraft } from "@/components/messageEditor/model/messageEditorTransforms";

import { tuanchat } from "../../../../api/instance";

async function getSnapshotForCopy(docId: string): Promise<StoredSnapshot | null> {
  const cached = getCachedDocSnapshot(docId);
  if (cached) {
    return cached;
  }

  const persisted = await getPersistedDocSnapshot(docId).catch(() => null);
  if (persisted) {
    setCachedDocSnapshot(docId, persisted);
  }
  return persisted;
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

  const newDocId = String(createdDocId);
  const snapshot = buildCopiedSnapshot(sourceSnapshot);

  setCachedDocSnapshot(newDocId, snapshot);
  await setPersistedDocSnapshot(newDocId, snapshot).catch((error) => {
    console.error("[DocCopy] persist copied space doc snapshot failed", error);
  });

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
  const sourceSnapshot = await getSnapshotForCopy(params.sourceDocId);

  const createRes = await tuanchat.spaceUserDocController.createDoc1({
    spaceId: params.spaceId,
    title,
    ...(params.tag ? { tag: params.tag } : {}),
  });
  if (!createRes?.success || !createRes.data?.docId) {
    throw new Error(createRes?.errMsg ?? "创建文档失败");
  }

  const newEntityId = createRes.data.docId;
  const newRoomId = Number(createRes.data.roomId);
  if (!Number.isFinite(newRoomId) || newRoomId <= 0) {
    throw new Error("创建文档失败：缺少文档房间");
  }
  const newDocId = String(newRoomId);
  const snapshot = buildCopiedSnapshot(sourceSnapshot);

  setCachedDocSnapshot(newDocId, snapshot);
  await setPersistedDocSnapshot(newDocId, snapshot).catch((error) => {
    console.error("[DocCopy] persist copied user doc snapshot failed", error);
  });

  return { newDocEntityId: newEntityId, newDocId, title };
}
