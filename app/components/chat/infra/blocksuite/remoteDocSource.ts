import type { DocSource } from "@blocksuite/sync";

import { diffUpdate, encodeStateVectorFromUpdate, mergeUpdates } from "yjs";

import { base64ToUint8Array, uint8ArrayToBase64 } from "@/components/chat/infra/blocksuite/base64";
import { addUpdate, clearUpdates, listUpdates } from "@/components/chat/infra/blocksuite/descriptionDocDb";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import {
  getRemoteSnapshot,
  setRemoteSnapshot,
} from "@/components/chat/infra/blocksuite/descriptionDocRemote";

function parseRemoteKeyFromDocId(docId: string) {
  return parseDescriptionDocId(docId);
}

/**
 * Remote doc source backed by tuanchat `/blocksuite/doc` snapshot API.
 *
 * The API stores a "merged full update" (base64), so we can:
 * - `pull`: return diffUpdate(fullUpdate, stateVector)
 * - `push`: mergeUpdates([fullUpdate, incrementalUpdate]) then persist
 */
export class RemoteSnapshotDocSource implements DocSource {
  name = "remote-snapshot";

  private readonly cache = new Map<string, Uint8Array>();

  private async getRemoteFullUpdate(docId: string): Promise<Uint8Array | null> {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key)
      return null;

    const remote = await getRemoteSnapshot(key);
    if (!remote?.updateB64)
      return null;

    return base64ToUint8Array(remote.updateB64);
  }

  private async tryFlushPending(docId: string, baseFullUpdate: Uint8Array): Promise<Uint8Array> {
    // If we have queued offline updates, attempt to merge and push a new snapshot.
    const key = parseRemoteKeyFromDocId(docId);
    if (!key)
      return baseFullUpdate;

    const pending = await listUpdates(docId);
    if (!pending.length)
      return baseFullUpdate;

    const merged = mergeUpdates([baseFullUpdate, ...pending]);
    try {
      await setRemoteSnapshot({
        ...key,
        snapshot: {
          v: 1,
          updateB64: uint8ArrayToBase64(merged),
          updatedAt: Date.now(),
        },
      });
      await clearUpdates(docId);
      return merged;
    }
    catch {
      // Keep queued updates for future attempts.
      return baseFullUpdate;
    }
  }

  async pull(docId: string, state: Uint8Array) {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key)
      return null;

    const remote = await getRemoteSnapshot(key);
    if (!remote?.updateB64)
      return null;

    let fullUpdate = base64ToUint8Array(remote.updateB64);

    // Best-effort: if we have offline edits queued, merge them into remote snapshot.
    fullUpdate = await this.tryFlushPending(docId, fullUpdate);
    this.cache.set(docId, fullUpdate);

    const diff = state.length ? diffUpdate(fullUpdate, state) : fullUpdate;
    return { data: diff, state: encodeStateVectorFromUpdate(fullUpdate) };
  }

  async push(docId: string, data: Uint8Array) {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key)
      return;

    // Merge strategy:
    // - Prefer cached fullUpdate (from pull)
    // - If not cached, fetch remote fullUpdate first to avoid overwriting remote state
    // - Also merge any queued offline updates
    let base = this.cache.get(docId);
    if (!base) {
      try {
        base = await this.getRemoteFullUpdate(docId) ?? undefined;
        if (base)
          this.cache.set(docId, base);
      }
      catch {
        // ignore, we will queue this update below
      }
    }

    const pending = await listUpdates(docId);
    const merged = base
      ? mergeUpdates([base, ...pending, data])
      : mergeUpdates([...pending, data]);

    try {
      await setRemoteSnapshot({
        ...key,
        snapshot: {
          v: 1,
          updateB64: uint8ArrayToBase64(merged),
          updatedAt: Date.now(),
        },
      });
      this.cache.set(docId, merged);
      if (pending.length)
        await clearUpdates(docId);
    }
    catch {
      // Network/server failure: queue the incremental update for later flush.
      // Swallow errors so blocksuite sync engine keeps working.
      try {
        await addUpdate(docId, data);
      }
      catch {
        // ignore
      }
    }
  }

  subscribe() {
    // No server push channel right now.
    return () => {};
  }
}
