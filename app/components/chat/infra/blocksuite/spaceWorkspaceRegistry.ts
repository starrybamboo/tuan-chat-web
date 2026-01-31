import type { Store, Workspace } from "@blocksuite/store";

import { getOrCreateSpaceDocStore, getOrCreateSpaceWorkspaceRuntime } from "@/components/chat/infra/blocksuite/runtime/spaceWorkspace";

export function getOrCreateWorkspace(workspaceId: string): Workspace {
  return getOrCreateSpaceWorkspaceRuntime(workspaceId);
}

export function getOrCreateDoc(params: { workspaceId: string; docId: string }): Store {
  return getOrCreateSpaceDocStore({
    workspaceId: params.workspaceId,
    docId: params.docId,
  });
}

export function ensureDocMeta(params: { workspaceId: string; docId: string; title?: string }) {
  const ws = getOrCreateWorkspace(params.workspaceId);
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

/**
 * 业务层的 Space -> Blocksuite Workspace 映射。
 * Demo 阶段仅本地存储，因此 workspaceId 直接用 `space:${spaceId}`。
 */
export function getOrCreateSpaceWorkspace(spaceId: number): Workspace {
  return getOrCreateWorkspace(`space:${spaceId}`);
}

export function getOrCreateSpaceDoc(params: { spaceId: number; docId: string }): Store {
  return getOrCreateDoc({ workspaceId: `space:${params.spaceId}`, docId: params.docId });
}

export function ensureSpaceDocMeta(params: { spaceId: number; docId: string; title?: string }) {
  ensureDocMeta({ workspaceId: `space:${params.spaceId}`, docId: params.docId, title: params.title });
}

