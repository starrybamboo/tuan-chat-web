import { getOrCreateSpaceWorkspace } from "./spaceWorkspaceRegistry";

export { ensureSpaceDocMeta, getOrCreateSpaceDoc, getOrCreateSpaceWorkspace } from "./spaceWorkspaceRegistry";

/**
 * @deprecated Prefer `getOrCreateSpaceWorkspace` from `spaceWorkspaceRegistry`.
 * This is kept only for backward compatibility.
 */
export function getOrCreateSpaceCollection(spaceId: number) {
  return getOrCreateSpaceWorkspace(spaceId);
}
