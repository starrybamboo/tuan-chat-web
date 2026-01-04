import { addDocSnapshot, getSnapshotUpdate } from "@/components/chat/infra/blocksuite/runtime/docHistoryDb";
import { getOrCreateSpaceWorkspaceRuntime } from "@/components/chat/infra/blocksuite/runtime/spaceWorkspace";

/**
 * 创建一个本地版本快照。
 */
export async function createLocalDocSnapshot(params: {
  spaceId: number;
  docId: string;
  label?: string;
}) {
  const ws = getOrCreateSpaceWorkspaceRuntime(`space:${params.spaceId}`);
  const update = ws.encodeDocAsUpdate(params.docId);
  await addDocSnapshot({
    spaceId: params.spaceId,
    docId: params.docId,
    update,
    label: params.label,
  });
}

/**
 * 从快照恢复（版本回滚）。
 */
export async function restoreLocalDocFromSnapshot(params: {
  spaceId: number;
  docId: string;
  snapshotId: number;
}) {
  const update = await getSnapshotUpdate({ snapshotId: params.snapshotId });
  if (!update)
    return;

  const ws = getOrCreateSpaceWorkspaceRuntime(`space:${params.spaceId}`);
  ws.restoreDocFromUpdate({ docId: params.docId, update });
}
