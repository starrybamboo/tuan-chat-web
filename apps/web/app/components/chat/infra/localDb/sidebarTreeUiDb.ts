import { getLocalValue, setLocalValue } from "@/components/chat/infra/localDb/chatHistoryDb";

type SidebarExpandedState = {
  key: string;
  expandedByKey?: Record<string, boolean>;
  expandedByCategoryId?: Record<string, boolean>;
  updatedAt: number;
};

const KV_KEY_PREFIX = "sidebar-tree-expanded:";

function buildKey(params: { userId: number | null | undefined; spaceId: number; scope?: string }): string {
  const userSeg = typeof params.userId === "number" && Number.isFinite(params.userId) ? String(params.userId) : "anon";
  const scopeSeg = params.scope?.trim() || "room-doc-tree";
  return `${KV_KEY_PREFIX}${userSeg}:${params.spaceId}:${scopeSeg}`;
}

export async function getSidebarExpandedMap(params: {
  userId: number | null | undefined;
  spaceId: number;
  scope: string;
}): Promise<Record<string, boolean> | null> {
  const row = await getLocalValue<SidebarExpandedState>(buildKey(params));
  return row?.expandedByKey ?? row?.expandedByCategoryId ?? null;
}

export async function setSidebarExpandedMap(params: {
  userId: number | null | undefined;
  spaceId: number;
  scope: string;
  expandedByKey: Record<string, boolean>;
}): Promise<void> {
  const key = buildKey(params);

  await setLocalValue(key, {
    key,
    expandedByKey: params.expandedByKey,
    expandedByCategoryId: params.expandedByKey,
    updatedAt: Date.now(),
  } satisfies SidebarExpandedState);
}
