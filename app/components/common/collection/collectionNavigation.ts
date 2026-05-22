export const COMMUNITY_COLLECTION_UNAVAILABLE_MESSAGE = "社区功能已下线，历史帖子收藏暂不支持打开";
export const COLLECTION_TARGET_UNSUPPORTED_MESSAGE = "该收藏类型暂不支持打开";

type CollectionNavigateTarget = {
  kind: "navigate";
  to: "/repository/detail/{-$id}";
  params: { id: string };
};

type CollectionUnavailableTarget = {
  kind: "unavailable";
  message: string;
};

export type CollectionNavigationTarget = CollectionNavigateTarget | CollectionUnavailableTarget;

export function resolveCollectionNavigationTarget(params: {
  collectionId?: number;
  collectionTypeId?: number;
  resourceId?: number;
}): CollectionNavigationTarget {
  if (params.collectionTypeId === 2) {
    return {
      kind: "unavailable",
      message: COMMUNITY_COLLECTION_UNAVAILABLE_MESSAGE,
    };
  }

  if (params.collectionTypeId === 3 && typeof params.resourceId === "number" && params.resourceId > 0) {
    return {
      kind: "navigate",
      to: "/repository/detail/{-$id}",
      params: { id: String(params.resourceId) },
    };
  }

  return {
    kind: "unavailable",
    message: COLLECTION_TARGET_UNSUPPORTED_MESSAGE,
  };
}
