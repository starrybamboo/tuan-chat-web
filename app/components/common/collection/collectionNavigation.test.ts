import { describe, expect, it } from "vitest";

import {
  COLLECTION_TARGET_UNSUPPORTED_MESSAGE,
  COMMUNITY_COLLECTION_UNAVAILABLE_MESSAGE,
  resolveCollectionNavigationTarget,
} from "./collectionNavigation";

describe("collectionNavigation", () => {
  it("routes repository collections through TanStack Router descriptors", () => {
    expect(resolveCollectionNavigationTarget({
      collectionId: 11,
      collectionTypeId: 3,
      resourceId: 99,
    })).toEqual({
      kind: "navigate",
      to: "/repository/detail/{-$id}",
      params: { id: "99" },
    });
  });

  it("keeps community collections unavailable", () => {
    expect(resolveCollectionNavigationTarget({
      collectionId: 11,
      collectionTypeId: 2,
      resourceId: 99,
    })).toEqual({
      kind: "unavailable",
      message: COMMUNITY_COLLECTION_UNAVAILABLE_MESSAGE,
    });
  });

  it("does not navigate to unsupported or invalid collection targets", () => {
    expect(resolveCollectionNavigationTarget({
      collectionId: 11,
      collectionTypeId: 4,
      resourceId: 99,
    })).toEqual({
      kind: "unavailable",
      message: COLLECTION_TARGET_UNSUPPORTED_MESSAGE,
    });

    expect(resolveCollectionNavigationTarget({
      collectionTypeId: 3,
      resourceId: 0,
    })).toEqual({
      kind: "unavailable",
      message: COLLECTION_TARGET_UNSUPPORTED_MESSAGE,
    });
  });
});
