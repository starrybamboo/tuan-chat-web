import { diffUpdate, encodeStateVectorFromUpdate, mergeUpdates } from "yjs";

import type { StoredSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";

import { deleteUpdatesByIds, listUpdateRecords } from "@/components/chat/infra/blocksuite/description/descriptionDocDb";
import { getRemoteSnapshot, getRemoteUpdates, pushRemoteUpdate, setRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { base64ToUint8Array, uint8ArrayToBase64 } from "@/components/chat/infra/blocksuite/shared/base64";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/space/spaceDocId";
import { encodeLoadedSpaceDocAsUpdateIfExistsForSpace } from "@/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry";
import { tuanchat } from "api/instance";

type RemoteKey = {
  entityType: "space_doc";
  entityId: number;
  docType: "description";
};

function snapshotCursor(snapshot: StoredSnapshot | null) {
  if (!snapshot)
    return 0;
  if (snapshot.v === 2 && typeof snapshot.snapshotServerTime === "number") {
    return Math.max(0, snapshot.snapshotServerTime);
  }
  return Math.max(0, snapshot.updatedAt ?? 0);
}

function mergeRemoteState(snapshot: StoredSnapshot | null, remoteUpdates: string[]) {
  const parts: Uint8Array[] = [];
  if (snapshot?.updateB64) {
    try {
      parts.push(base64ToUint8Array(snapshot.updateB64));
    }
    catch {
      // ignore broken snapshot payload
    }
  }
  for (const updateB64 of remoteUpdates) {
    try {
      parts.push(base64ToUint8Array(updateB64));
    }
    catch {
      // ignore broken update payload
    }
  }
  return mergeAvailableUpdates(parts);
}

function mergeAvailableUpdates(parts: Array<Uint8Array | null | undefined>) {
  const normalized = parts.filter((part): part is Uint8Array => Boolean(part?.length));
  if (!normalized.length) {
    return null;
  }
  return normalized.length === 1 ? normalized[0] : mergeUpdates(normalized);
}

async function prepareSingleSpaceDocForArchive(spaceId: number, docId: number) {
  const remoteKey: RemoteKey = {
    entityType: "space_doc",
    entityId: docId,
    docType: "description",
  };
  const snapshot = await getRemoteSnapshot(remoteKey);
  const after = snapshotCursor(snapshot);
  const remoteUpdates = await getRemoteUpdates({
    ...remoteKey,
    afterServerTime: after,
    limit: 5000,
  });
  const mergedRemote = mergeRemoteState(snapshot, remoteUpdates?.updates ?? []);

  const runtimeDocId = buildSpaceDocId({ kind: "independent", docId });
  const offlineRecords = await listUpdateRecords(runtimeDocId);
  const offlineMerged = mergeAvailableUpdates(offlineRecords.map(record => record.data));
  const loadedMerged = encodeLoadedSpaceDocAsUpdateIfExistsForSpace({
    spaceId,
    docId: runtimeDocId,
  });
  const mergedCurrent = mergeAvailableUpdates([mergedRemote, offlineMerged, loadedMerged]);
  if (!mergedCurrent?.length) {
    return;
  }

  let latestServerTime = remoteUpdates?.latestServerTime ?? after;
  const missingRemoteDiff = mergedRemote?.length
    ? diffUpdate(mergedCurrent, encodeStateVectorFromUpdate(mergedRemote))
    : mergedCurrent;
  let remoteAcceptedLocalState = false;
  if (missingRemoteDiff.length) {
    const pushed = await pushRemoteUpdate({
      ...remoteKey,
      updateB64: uint8ArrayToBase64(missingRemoteDiff),
    });
    if (typeof pushed?.serverTime === "number" && pushed.serverTime > 0) {
      latestServerTime = pushed.serverTime;
      remoteAcceptedLocalState = true;
    }
  }
  else {
    remoteAcceptedLocalState = true;
  }

  if (remoteAcceptedLocalState && offlineRecords.length) {
    await deleteUpdatesByIds(offlineRecords.map(record => record.id));
  }

  await setRemoteSnapshot({
    ...remoteKey,
    snapshot: {
      v: 2,
      updateB64: uint8ArrayToBase64(mergedCurrent),
      stateVectorB64: uint8ArrayToBase64(encodeStateVectorFromUpdate(mergedCurrent)),
      snapshotServerTime: latestServerTime > 0 ? latestServerTime : undefined,
      updatedAt: Date.now(),
    },
  });
}

export async function prepareSpaceDocsForArchive(spaceId: number): Promise<void> {
  if (!Number.isFinite(spaceId) || spaceId <= 0) {
    return;
  }

  const response = await tuanchat.spaceDocController.listDocs2(spaceId);
  const docs = response?.data?.filter(doc => typeof doc.docId === "number" && doc.docId > 0) ?? [];
  for (const doc of docs) {
    await prepareSingleSpaceDocForArchive(spaceId, doc.docId!);
  }
}
