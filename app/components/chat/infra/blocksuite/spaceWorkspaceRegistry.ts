import type { Store, Workspace } from "@blocksuite/store";

import { getOrCreateSpaceDocStore, getOrCreateSpaceWorkspaceRuntime } from "@/components/chat/infra/blocksuite/runtime/spaceWorkspace";

/**
 * 业务层的 Space -> Blocksuite Workspace 映射。
 * Demo 阶段仅本地存储，因此 workspaceId 直接用 `space:${spaceId}`。
 */
export function getOrCreateSpaceWorkspace(spaceId: number): Workspace {
  return getOrCreateSpaceWorkspaceRuntime(`space:${spaceId}`);
}

export function getOrCreateSpaceDoc(params: { spaceId: number; docId: string }): Store {
  return getOrCreateSpaceDocStore({
    workspaceId: `space:${params.spaceId}`,
    docId: params.docId,
  });
}

export function ensureSpaceDocMeta(params: { spaceId: number; docId: string; title?: string }) {
  const ws = getOrCreateSpaceWorkspace(params.spaceId);
  const meta = ws.meta.getDocMeta(params.docId);
  if (!meta) {
    ws.meta.addDocMeta({
      id: params.docId,
      title: params.title ?? "",
      tags: [],
      createDate: Date.now(),
    });
  }
  else if (typeof params.title === "string" && params.title !== meta.title) {
    ws.meta.setDocMeta(params.docId, { title: params.title });
  }
}
