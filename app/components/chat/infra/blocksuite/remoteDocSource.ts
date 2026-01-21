import type { DocSource } from "@blocksuite/sync";

import { debounce } from "lodash";
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

const DEBOUNCE_MS = 5000;

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
  private readonly pushDebouncers = new Map<string, ReturnType<typeof debounce>>();

  private async getRemoteFullUpdate(docId: string): Promise<Uint8Array | null> {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key)
      return null;

    const remote = await getRemoteSnapshot(key);
    if (!remote?.updateB64)
      return null;

    return base64ToUint8Array(remote.updateB64);
  }

  async pull(docId: string, state: Uint8Array) {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key)
      return null;

    const remote = await getRemoteSnapshot(key);
    if (!remote?.updateB64)
      return null;

    const remoteFullUpdate = base64ToUint8Array(remote.updateB64);

    const pending = await listUpdates(docId);
    const mergedForLocal = pending.length ? mergeUpdates([remoteFullUpdate, ...pending]) : remoteFullUpdate;

    this.cache.set(docId, mergedForLocal);

    const diff = state.length ? diffUpdate(mergedForLocal, state) : mergedForLocal;
    return { data: diff, state: encodeStateVectorFromUpdate(mergedForLocal) };
  }

  async push(docId: string, data: Uint8Array) {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key)
      return;

    // 1. Always queue the incremental update locally first (safety net).
    // This allows us to debounce the network request without risking data loss.
    try {
      await addUpdate(docId, data);
    }
    catch {
      // If local DB fails, we still try to proceed with debounce logic,
      // though risk of loss increases if tab closes before flush.
    }

    // 2. Schedule a debounced flush to the server.
    let debounced = this.pushDebouncers.get(docId);
    if (!debounced) {
      debounced = debounce(() => this.flushInternal(docId), DEBOUNCE_MS);
      this.pushDebouncers.set(docId, debounced);
    }
    debounced();
  }

  private async flushInternal(docId: string) {
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
        base = (await this.getRemoteFullUpdate(docId)) ?? undefined;
        if (base)
          this.cache.set(docId, base);
      }
      catch {
        // ignore, we will queue this update below
      }
    }

    // Read all pending local updates (including the ones added just before debounce started).
    const pending = await listUpdates(docId);
    if (!pending.length)
      return;

    const merged = base
      ? mergeUpdates([base, ...pending])
      : mergeUpdates([...pending]);

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

      // Clear queue only after successful remote persist
      if (pending.length)
        await clearUpdates(docId);
    }
    catch {
      // Network/server failure: do nothing.
      // Updates remain in 'descriptionDocDb' and will be retried on next flush/pull.
    }
  }

  subscribe() {
    // No server push channel right now.
    return () => {};
  }
}
