import { tuanchat } from "../../../../api/instance";

export async function getDocUpdateForCopy(params: {
  spaceId: number;
  docId: string;
}): Promise<Uint8Array> {
  const [registry, { parseDescriptionDocId }, { getRemoteSnapshot }, { base64ToUint8Array }] = await Promise.all([
    import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry"),
    import("@/components/chat/infra/blocksuite/descriptionDocId"),
    import("@/components/chat/infra/blocksuite/descriptionDocRemote"),
    import("@/components/chat/infra/blocksuite/base64"),
  ]);

  const ws = registry.getOrCreateSpaceWorkspace(params.spaceId) as any;

  // 优先尝试把“源文档的远端快照”恢复到本地 workspace，确保跨端/跨用户复制可用。
  try {
    const key = parseDescriptionDocId(params.docId);
    if (key) {
      const remote = await getRemoteSnapshot(key);
      if (remote?.updateB64) {
        const update = base64ToUint8Array(remote.updateB64);
        if (typeof ws?.restoreDocFromUpdate === "function") {
          ws.restoreDocFromUpdate({ docId: params.docId, update });
        }
      }
    }
  }
  catch {
    // ignore: 仍可能从本地 IndexedDB 拿到内容
  }

  // 确保 doc 在本地 workspace 里已 load，避免 encode 只拿到空初始化状态
  try {
    const store = registry.getOrCreateSpaceDoc({ spaceId: params.spaceId, docId: params.docId }) as any;
    (store as any)?.load?.();
  }
  catch {
    // ignore
  }

  if (typeof ws?.encodeDocAsUpdate !== "function") {
    throw new TypeError("Blocksuite workspace 不支持导出文档快照");
  }

  return ws.encodeDocAsUpdate(params.docId) as Uint8Array;
}

export async function copyDocToSpaceDoc(params: {
  spaceId: number;
  sourceDocId: string;
  title?: string;
  imageUrl?: string;
}): Promise<{ newDocEntityId: number; newDocId: string; title: string }> {
  const createTitle = (params.title ?? "").trim();
  const title = createTitle ? `${createTitle}（副本）` : "新文档（副本）";
  const sourceUpdate = await getDocUpdateForCopy({ spaceId: params.spaceId, docId: params.sourceDocId });

  let createdDocId: number | null = null;
  try {
    const resp = await tuanchat.request.request<any>({
      method: "POST",
      url: "/space/doc",
      body: { spaceId: params.spaceId, title },
      mediaType: "application/json",
    });
    const id = Number((resp as any)?.data?.docId);
    if (Number.isFinite(id) && id > 0) {
      createdDocId = id;
    }
  }
  catch (err) {
    console.error("[SpaceDoc] create failed", err);
  }

  if (!createdDocId) {
    throw new Error("创建文档失败");
  }

  const [{ buildSpaceDocId }, { setRemoteSnapshot }, { uint8ArrayToBase64 }, registry, { setBlocksuiteDocHeader }] = await Promise.all([
    import("@/components/chat/infra/blocksuite/spaceDocId"),
    import("@/components/chat/infra/blocksuite/descriptionDocRemote"),
    import("@/components/chat/infra/blocksuite/base64"),
    import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry"),
    import("@/components/chat/infra/blocksuite/docHeader"),
  ]);

  const newDocId = buildSpaceDocId({ kind: "independent", docId: createdDocId });

  const ws = registry.getOrCreateSpaceWorkspace(params.spaceId) as any;
  if (typeof ws?.restoreDocFromUpdate === "function") {
    ws.restoreDocFromUpdate({ docId: newDocId, update: sourceUpdate });
  }

  try {
    const store = registry.getOrCreateSpaceDoc({ spaceId: params.spaceId, docId: newDocId }) as any;
    (store as any)?.load?.();
    setBlocksuiteDocHeader(store, { title, imageUrl: params.imageUrl });
  }
  catch {
    // ignore
  }

  registry.ensureSpaceDocMeta({ spaceId: params.spaceId, docId: newDocId, title });

  const fullUpdate = typeof ws?.encodeDocAsUpdate === "function" ? (ws.encodeDocAsUpdate(newDocId) as Uint8Array) : sourceUpdate;
  await setRemoteSnapshot({
    entityType: "space_doc",
    entityId: createdDocId,
    docType: "description",
    snapshot: {
      v: 1,
      updateB64: uint8ArrayToBase64(fullUpdate),
      updatedAt: Date.now(),
    },
  });

  return { newDocEntityId: createdDocId, newDocId, title };
}
