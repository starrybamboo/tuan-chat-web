import type { DocSource } from "@blocksuite/sync";

import { debounce } from "lodash";
import { diffUpdate, encodeStateVectorFromUpdate, mergeUpdates } from "yjs";

import type { StoredSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";

import { addUpdate, clearUpdates, listUpdates } from "@/components/chat/infra/blocksuite/description/descriptionDocDb";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import {
  compactRemoteUpdates,
  getRemoteSnapshot,
  getRemoteUpdates,
  pushRemoteUpdate,
  setRemoteSnapshot,

} from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { base64ToUint8Array, uint8ArrayToBase64 } from "@/components/chat/infra/blocksuite/shared/base64";
import {
  isNonRetryableBlocksuiteDocError,
  NonRetryableBlocksuiteDocError,
} from "@/components/chat/infra/blocksuite/shared/blocksuiteDocError";
import { blocksuiteWsClient } from "@/components/chat/infra/blocksuite/space/runtime/blocksuiteWsClient";

function parseRemoteKeyFromDocId(docId: string) {
  return parseDescriptionDocId(docId);
}

function snapshotCursor(snapshot: StoredSnapshot | null) {
  if (!snapshot)
    return 0;
  if (snapshot.v === 2 && typeof snapshot.snapshotServerTime === "number") {
    return Math.max(0, snapshot.snapshotServerTime);
  }
  return Math.max(0, snapshot.updatedAt ?? 0);
}

const OFFLINE_FLUSH_DEBOUNCE_MS = 3500;
const COMPACT_DEBOUNCE_MS = 12_000;

/**
 * Remote doc source backed by:
 * - snapshot (`/blocksuite/doc`) for cold start
 * - updates log (`/blocksuite/doc/update`, `/blocksuite/doc/updates`) for incremental sync
 * - websocket for realtime fanout
 *
 * 说明：
 * - stateVector diff 在前端完成：pull 时把 snapshot + updates 合并为 mergedUpdate，再 diffUpdate(mergedUpdate, stateVector)。
 * - 定期合并 snapshot：当检测到 updates 积累较多时，客户端会写回 v2 snapshot 并调用 compact 删除旧 updates。
 */
class RemoteYjsLogDocSource implements DocSource {
  name = "remote-yjs-log";

  private readonly flushDebouncers = new Map<string, ReturnType<typeof debounce>>();
  private readonly compactDebouncers = new Map<string, ReturnType<typeof debounce>>();

  private subscribedCb: ((docId: string, data: Uint8Array) => void) | null = null;
  private readonly joinedDocIds = new Set<string>();
  private readonly wsDisposers = new Map<string, () => void>();

  async pull(docId: string, state: Uint8Array) {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key)
      return null;

    let snapshot: StoredSnapshot | null = null;
    let snapshotPullFailed = false;
    try {
      snapshot = await getRemoteSnapshot(key);
    }
    catch (error) {
      if (isNonRetryableBlocksuiteDocError(error)) {
        throw new NonRetryableBlocksuiteDocError(error);
      }
      snapshotPullFailed = true;
    }

    let baseUpdate: Uint8Array | null = null;
    let snapshotDecodeFailed = false;
    if (snapshot?.updateB64) {
      try {
        baseUpdate = base64ToUint8Array(snapshot.updateB64);
      }
      catch {
        snapshotDecodeFailed = true;
      }
    }

    const after = snapshotCursor(snapshot);

    // Pull incremental updates after snapshot cursor.
    let remoteUpdates: Awaited<ReturnType<typeof getRemoteUpdates>> = null;
    let updatesPullFailed = false;
    try {
      remoteUpdates = await getRemoteUpdates({
        ...key,
        afterServerTime: after,
        limit: 2000,
      });
    }
    catch (error) {
      if (isNonRetryableBlocksuiteDocError(error)) {
        throw new NonRetryableBlocksuiteDocError(error);
      }
      updatesPullFailed = true;
    }

    const mergedParts: Uint8Array[] = [];
    if (baseUpdate?.length) {
      mergedParts.push(baseUpdate);
    }
    if (remoteUpdates?.updates?.length) {
      for (const b64 of remoteUpdates.updates) {
        try {
          mergedParts.push(base64ToUint8Array(b64));
        }
        catch {
          // ignore bad update
        }
      }
    }

    if (!mergedParts.length) {
      // No snapshot and updates pull failed: likely a transient network issue.
      // Surface as an error so callers can retry with backoff.
      if (snapshotPullFailed || snapshotDecodeFailed || updatesPullFailed) {
        throw new Error("remote-yjs-log pull failed without any recoverable data");
      }
      return null;
    }

    const mergedUpdate = mergedParts.length === 1 ? mergedParts[0] : mergeUpdates(mergedParts);
    const diff = state.length ? diffUpdate(mergedUpdate, state) : mergedUpdate;

    // Join WS room lazily when doc is actually pulled.
    this.ensureJoined(docId);

    // If updates are accumulating (or snapshot missing), schedule a compaction pass (best-effort).
    if (remoteUpdates?.updates?.length && (!snapshot || snapshot.v === 1 || remoteUpdates.updates.length >= 200)) {
      this.scheduleCompaction(docId);
    }

    return { data: diff, state: encodeStateVectorFromUpdate(mergedUpdate) };
  }

  async push(docId: string, data: Uint8Array) {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key)
      return;

    this.ensureJoined(docId);

    // Prefer WS path: store + broadcast happens server-side.
    if (blocksuiteWsClient.tryPushUpdateIfOpen(key, data)) {
      // Best-effort: keep snapshot reasonably fresh for cold-start; compaction is debounced.
      this.scheduleCompaction(docId);
      return;
    }

    // Offline / WS not connected: queue to IndexedDB, flush via HTTP later.
    try {
      await addUpdate(docId, data);
    }
    catch {
      // ignore local DB failure; we still try to flush via debounce
    }

    let debounced = this.flushDebouncers.get(docId);
    if (!debounced) {
      debounced = debounce(() => void this.flushOfflineUpdates(docId), OFFLINE_FLUSH_DEBOUNCE_MS);
      this.flushDebouncers.set(docId, debounced);
    }
    debounced();

    // Offline queue: compaction will happen after flush succeeds.
  }

  subscribe(cb: (docId: string, data: Uint8Array) => void) {
    this.subscribedCb = cb;

    // Attach handlers for already-joined docs.
    for (const docId of this.joinedDocIds) {
      this.attachWsListener(docId);
    }

    return () => {
      this.subscribedCb = null;

      for (const dispose of this.wsDisposers.values()) {
        try {
          dispose();
        }
        catch {
          // ignore
        }
      }
      this.wsDisposers.clear();

      for (const docId of this.joinedDocIds) {
        const key = parseRemoteKeyFromDocId(docId);
        if (key) {
          blocksuiteWsClient.leaveDoc(key);
        }
      }
      this.joinedDocIds.clear();
    };
  }

  private ensureJoined(docId: string) {
    if (this.joinedDocIds.has(docId)) {
      return;
    }
    const key = parseRemoteKeyFromDocId(docId);
    if (!key) {
      return;
    }

    blocksuiteWsClient.joinDoc(key);
    this.joinedDocIds.add(docId);

    this.attachWsListener(docId);
  }

  private attachWsListener(docId: string) {
    if (!this.subscribedCb) {
      return;
    }
    if (this.wsDisposers.has(docId)) {
      return;
    }

    const key = parseRemoteKeyFromDocId(docId);
    if (!key) {
      return;
    }

    const dispose = blocksuiteWsClient.onUpdate(key, ({ update }) => {
      this.subscribedCb?.(docId, update);
    });
    this.wsDisposers.set(docId, dispose);
  }

  private async flushOfflineUpdates(docId: string) {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key) {
      return;
    }

    const pending = await listUpdates(docId);
    if (!pending.length) {
      return;
    }

    const merged = pending.length === 1 ? pending[0] : mergeUpdates(pending);
    try {
      const resp = await pushRemoteUpdate({
        ...key,
        updateB64: uint8ArrayToBase64(merged),
      });
      if (!resp) {
        return;
      }
      await clearUpdates(docId);

      // Once offline backlog is flushed, try to compact into snapshot (best-effort).
      this.scheduleCompaction(docId);
    }
    catch (error) {
      if (isNonRetryableBlocksuiteDocError(error)) {
        await clearUpdates(docId);
      }
      // keep pending for later retry
    }
  }

  private scheduleCompaction(docId: string) {
    let debounced = this.compactDebouncers.get(docId);
    if (!debounced) {
      debounced = debounce(() => void this.compactRemote(docId), COMPACT_DEBOUNCE_MS);
      this.compactDebouncers.set(docId, debounced);
    }
    debounced();
  }

  private async compactRemote(docId: string) {
    const key = parseRemoteKeyFromDocId(docId);
    if (!key) {
      return;
    }

    // Only compact when WS is online and we don't have offline pending updates.
    if (!blocksuiteWsClient.isOpen()) {
      return;
    }
    const pendingLocal = await listUpdates(docId);
    if (pendingLocal.length) {
      return;
    }

    try {
      const snapshot = await getRemoteSnapshot(key);
      const baseUpdate = snapshot?.updateB64 ? base64ToUint8Array(snapshot.updateB64) : null;
      const after = snapshotCursor(snapshot);

      const remoteUpdates = await getRemoteUpdates({ ...key, afterServerTime: after, limit: 5000 });
      if (!remoteUpdates?.updates?.length) {
        return;
      }

      const parts: Uint8Array[] = [];
      if (baseUpdate?.length) {
        parts.push(baseUpdate);
      }
      for (const b64 of remoteUpdates.updates) {
        try {
          parts.push(base64ToUint8Array(b64));
        }
        catch {
          // ignore
        }
      }
      if (!parts.length) {
        return;
      }

      const mergedUpdate = parts.length === 1 ? parts[0] : mergeUpdates(parts);
      const sv = encodeStateVectorFromUpdate(mergedUpdate);
      const latest = remoteUpdates.latestServerTime;

      await setRemoteSnapshot({
        ...key,
        snapshot: {
          v: 2,
          updateB64: uint8ArrayToBase64(mergedUpdate),
          stateVectorB64: uint8ArrayToBase64(sv),
          snapshotServerTime: latest,
          updatedAt: Date.now(),
        },
      });

      await compactRemoteUpdates({
        ...key,
        beforeOrEqServerTime: latest,
      });
    }
    catch {
      // ignore compaction failures
    }
  }
}

// Backward-compat name: existing call sites can switch gradually.
export class RemoteSnapshotDocSource extends RemoteYjsLogDocSource {}
