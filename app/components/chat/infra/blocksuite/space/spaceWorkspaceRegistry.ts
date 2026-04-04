import type { Store, Workspace } from "@blocksuite/store";

import {
  getOrCreateSpaceDocStore,
  getOrCreateSpaceWorkspaceRuntime,
  getSpaceWorkspaceRuntimeIfExists,
  releaseSpaceWorkspaceRuntime,
  retainSpaceWorkspaceRuntime,
} from "@/components/chat/infra/blocksuite/space/runtime/spaceWorkspace";

/**
 * 业务层与 SpaceWorkspace 之间的窄接口。
 *
 * 上层不要直接碰 SpaceWorkspace 细节，而是统一通过 registry 获取：
 * - Workspace 级能力
 * - Doc/Store 级能力
 * - Meta 初始化能力
 */
export function getOrCreateWorkspace(workspaceId: string): Workspace {
  return getOrCreateSpaceWorkspaceRuntime(workspaceId);
}

function getWorkspaceIfExists(workspaceId: string): Workspace | null {
  return getSpaceWorkspaceRuntimeIfExists(workspaceId);
}

export function retainWorkspace(workspaceId: string): Workspace {
  return retainSpaceWorkspaceRuntime(workspaceId);
}

export function releaseWorkspace(workspaceId: string): void {
  releaseSpaceWorkspaceRuntime(workspaceId);
}

export function getOrCreateDoc(params: { workspaceId: string; docId: string; readonly?: boolean }): Store {
  return getOrCreateSpaceDocStore({
    workspaceId: params.workspaceId,
    docId: params.docId,
    readonly: params.readonly,
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

function ensureDocMetaIfWorkspaceExists(params: { workspaceId: string; docId: string; title?: string }): boolean {
  const ws = getWorkspaceIfExists(params.workspaceId);
  if (!ws) {
    return false;
  }

  const meta = ws.meta.getDocMeta(params.docId);
  if (!meta) {
    ws.meta.addDocMeta({
      id: params.docId,
      title: params.title ?? "",
      tags: [],
      createDate: Date.now(),
    });
    return true;
  }

  if (typeof params.title === "string" && params.title !== meta.title) {
    ws.meta.setDocMeta(params.docId, { title: params.title });
  }
  return true;
}

/**
 * 业务层的 Space -> Blocksuite Workspace 映射。
 * Demo 阶段仅本地存储，因此 workspaceId 直接用 `space:${spaceId}`。
 */
export function getOrCreateSpaceWorkspace(spaceId: number): Workspace {
  return getOrCreateWorkspace(`space:${spaceId}`);
}

export function getSpaceWorkspaceIfExists(spaceId: number): Workspace | null {
  return getWorkspaceIfExists(`space:${spaceId}`);
}

function retainSpaceWorkspace(spaceId: number): Workspace {
  return retainWorkspace(`space:${spaceId}`);
}

function releaseSpaceWorkspace(spaceId: number): void {
  releaseWorkspace(`space:${spaceId}`);
}

export function getOrCreateSpaceDoc(params: { spaceId: number; docId: string; readonly?: boolean }): Store {
  return getOrCreateDoc({ workspaceId: `space:${params.spaceId}`, docId: params.docId, readonly: params.readonly });
}

export function ensureSpaceDocMeta(params: { spaceId: number; docId: string; title?: string }) {
  ensureDocMeta({ workspaceId: `space:${params.spaceId}`, docId: params.docId, title: params.title });
}

export function ensureSpaceDocMetaIfWorkspaceExists(params: { spaceId: number; docId: string; title?: string }): boolean {
  return ensureDocMetaIfWorkspaceExists({
    workspaceId: `space:${params.spaceId}`,
    docId: params.docId,
    title: params.title,
  });
}
