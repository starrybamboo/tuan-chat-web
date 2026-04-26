import { useCallback, useEffect, useMemo, useState } from "react";

import type { SidebarTree } from "@/components/chat/room/sidebarTree";

import { parseSidebarTree } from "@/components/chat/room/sidebarTree";
import { useGetSpaceSidebarTreeQuery, useSetSpaceSidebarTreeMutation } from "api/hooks/spaceSidebarTreeHooks";

type UseChatPageSidebarTreeParams = {
  activeSpaceId?: number | null;
};

type UseChatPageSidebarTreeResult = {
  sidebarTree: SidebarTree | null;
  isSidebarTreeReady: boolean;
  saveSidebarTree: (tree: SidebarTree) => void;
};

const SIDEBAR_TREE_CACHE_KEY_PREFIX = "tc:space-sidebar-tree:v1:";

function buildSidebarTreeCacheKey(spaceId: number): string {
  return `${SIDEBAR_TREE_CACHE_KEY_PREFIX}${spaceId}`;
}

function readCachedSidebarTreeJson(spaceId: number): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(buildSidebarTreeCacheKey(spaceId));
    return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
  }
  catch {
    return null;
  }
}

function writeCachedSidebarTreeJson(spaceId: number, treeJson: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(buildSidebarTreeCacheKey(spaceId), treeJson);
  }
  catch {
    // ignore
  }
}

export default function useChatPageSidebarTree({
  activeSpaceId,
}: UseChatPageSidebarTreeParams): UseChatPageSidebarTreeResult {
  const spaceSidebarTreeQuery = useGetSpaceSidebarTreeQuery(activeSpaceId ?? -1);
  const setSpaceSidebarTreeMutation = useSetSpaceSidebarTreeMutation();
  const sidebarTreeVersion = spaceSidebarTreeQuery.data?.data?.version ?? 0;
  const [cachedTreeJson, setCachedTreeJson] = useState<string | null>(null);
  const remoteTreeJson = spaceSidebarTreeQuery.data?.data?.treeJson;

  useEffect(() => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      queueMicrotask(() => setCachedTreeJson(null));
      return;
    }
    queueMicrotask(() => setCachedTreeJson(readCachedSidebarTreeJson(activeSpaceId)));
  }, [activeSpaceId]);

  useEffect(() => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      return;
    }
    if (typeof remoteTreeJson !== "string" || remoteTreeJson.trim().length === 0) {
      return;
    }
    writeCachedSidebarTreeJson(activeSpaceId, remoteTreeJson);
    queueMicrotask(() => setCachedTreeJson(remoteTreeJson));
  }, [activeSpaceId, remoteTreeJson]);

  const sidebarTree = useMemo(() => {
    const effectiveTreeJson = (typeof remoteTreeJson === "string" && remoteTreeJson.trim().length > 0)
      ? remoteTreeJson
      : cachedTreeJson;
    return parseSidebarTree(effectiveTreeJson);
  }, [cachedTreeJson, remoteTreeJson]);

  const saveSidebarTree = useCallback((tree: SidebarTree) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    const treeJson = JSON.stringify(tree);
    writeCachedSidebarTreeJson(activeSpaceId, treeJson);
    setCachedTreeJson(treeJson);
    setSpaceSidebarTreeMutation.mutate({
      spaceId: activeSpaceId,
      expectedVersion: sidebarTreeVersion,
      treeJson,
    });
  }, [activeSpaceId, setSpaceSidebarTreeMutation, sidebarTreeVersion]);

  const hasCachedTree = typeof cachedTreeJson === "string" && cachedTreeJson.trim().length > 0;

  return {
    sidebarTree,
    isSidebarTreeReady: spaceSidebarTreeQuery.isFetched || hasCachedTree,
    saveSidebarTree,
  };
}
