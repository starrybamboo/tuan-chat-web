export async function deleteSpaceDoc(params: { spaceId: number; docId: string }) {
  // SSR-safe: this function is only meaningful in the browser.
  // Avoid importing Blocksuite runtime modules at module scope because React Router dev (Vite)
  // may evaluate modules in an SSR context where `document` is not defined.
  if (typeof window === "undefined") {
    return;
  }

  // Best-effort: if this docId maps to the remote snapshot key, delete server-side snapshot too.
  // This is the only case where you'll see a network request for doc deletion.
  try {
    const { parseDescriptionDocId } = await import("./descriptionDocId");
    const key = parseDescriptionDocId(params.docId);
    if (key) {
      const { deleteRemoteSnapshot } = await import("./descriptionDocRemote");
      await deleteRemoteSnapshot(key);
    }
  }
  catch {
    // ignore remote delete errors; local deletion still proceeds
  }

  // Clear any queued offline updates (otherwise a later debounce flush could re-upload snapshot).
  try {
    const { clearUpdates } = await import("./descriptionDocDb");
    await clearUpdates(params.docId);
  }
  catch {
    // ignore
  }

  const { getOrCreateSpaceWorkspace } = await import("./spaceWorkspaceRegistry");
  const ws = getOrCreateSpaceWorkspace(params.spaceId);

  // 尽量使用 blocksuite 提供的删除能力；不同版本 API 可能不同，因此做一次 runtime 兼容。
  const metaAny = ws.meta as any;
  if (typeof metaAny.removeDocMeta === "function") {
    metaAny.removeDocMeta(params.docId);
  }
  else if (typeof metaAny.deleteDocMeta === "function") {
    metaAny.deleteDocMeta(params.docId);
  }
  else if (typeof metaAny.removeMeta === "function") {
    metaAny.removeMeta(params.docId);
  }

  const wsAny = ws as any;
  if (typeof wsAny.removeDoc === "function") {
    wsAny.removeDoc(params.docId);
  }
  else if (typeof wsAny.deleteDoc === "function") {
    wsAny.deleteDoc(params.docId);
  }
}
