import type { Space } from "@tuanchat/openapi-client/models/Space";

export type SpaceRailSpaceLike = Pick<Space, "spaceId">;

function isPositiveId(id: unknown): id is number {
  return Number.isInteger(id) && Number(id) > 0;
}

export function getSpaceRailIds(spaces: readonly SpaceRailSpaceLike[]): number[] {
  return spaces
    .map(space => space.spaceId)
    .filter(isPositiveId);
}

export function applySpaceRailOrder<T extends SpaceRailSpaceLike>(
  spaces: readonly T[],
  order: readonly number[],
): T[] {
  if (spaces.length <= 1 || order.length === 0) {
    return [...spaces];
  }

  const orderIndex = new Map<number, number>();
  order.forEach((spaceId, index) => {
    if (isPositiveId(spaceId) && !orderIndex.has(spaceId)) {
      orderIndex.set(spaceId, index);
    }
  });

  return [...spaces]
    .map((space, originalIndex) => ({
      space,
      originalIndex,
      order: isPositiveId(space.spaceId) ? orderIndex.get(space.spaceId) : undefined,
    }))
    .sort((a, b) => {
      const aOrder = a.order ?? Number.POSITIVE_INFINITY;
      const bOrder = b.order ?? Number.POSITIVE_INFINITY;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.originalIndex - b.originalIndex;
    })
    .map(item => item.space);
}

export function moveSpaceRailId(
  order: readonly number[],
  fromIndex: number,
  toIndex: number,
): number[] {
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= order.length || order.length <= 1) {
    return [...order];
  }

  const clampedToIndex = Math.max(0, Math.min(order.length - 1, toIndex));
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  if (!isPositiveId(moved)) {
    return [...order];
  }
  next.splice(clampedToIndex, 0, moved);
  return next;
}

export function pruneSpaceRailOrder(
  order: readonly number[],
  spaces: readonly SpaceRailSpaceLike[],
): number[] {
  const validIds = new Set(getSpaceRailIds(spaces));
  const seen = new Set<number>();
  const next: number[] = [];

  for (const id of order) {
    if (!validIds.has(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    next.push(id);
  }

  for (const id of validIds) {
    if (!seen.has(id)) {
      next.push(id);
    }
  }

  return next;
}
