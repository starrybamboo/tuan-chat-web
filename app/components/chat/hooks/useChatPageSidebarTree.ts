import { useCallback, useMemo } from "react";

import type { SidebarTree } from "@/components/chat/room/sidebarTree";

import { parseSidebarTree } from "@/components/chat/room/sidebarTree";
import { useGetSpaceSidebarTreeQuery, useSetSpaceSidebarTreeMutation } from "api/hooks/spaceSidebarTreeHooks";

type UseChatPageSidebarTreeParams = {
  activeSpaceId?: number | null;
};

type UseChatPageSidebarTreeResult = {
  sidebarTree: SidebarTree | null;
  saveSidebarTree: (tree: SidebarTree) => void;
};

export default function useChatPageSidebarTree({
  activeSpaceId,
}: UseChatPageSidebarTreeParams): UseChatPageSidebarTreeResult {
  const spaceSidebarTreeQuery = useGetSpaceSidebarTreeQuery(activeSpaceId ?? -1);
  const setSpaceSidebarTreeMutation = useSetSpaceSidebarTreeMutation();
  const sidebarTreeVersion = spaceSidebarTreeQuery.data?.data?.version ?? 0;

  const sidebarTree = useMemo(() => {
    return parseSidebarTree(spaceSidebarTreeQuery.data?.data?.treeJson);
  }, [spaceSidebarTreeQuery.data?.data?.treeJson]);

  const saveSidebarTree = useCallback((tree: SidebarTree) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setSpaceSidebarTreeMutation.mutate({
      spaceId: activeSpaceId,
      expectedVersion: sidebarTreeVersion,
      treeJson: JSON.stringify(tree),
    });
  }, [activeSpaceId, setSpaceSidebarTreeMutation, sidebarTreeVersion]);

  return {
    sidebarTree,
    saveSidebarTree,
  };
}
