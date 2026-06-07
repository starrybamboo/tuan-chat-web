import type { Space } from "@tuanchat/openapi-client/models/Space";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/auth-session";
import { readMobileKeyValue, writeMobileKeyValue } from "@/lib/mobile-key-value-storage";

import { applySpaceRailOrder, getSpaceRailIds, pruneSpaceRailOrder } from "./spaceRailOrder";

const SPACE_RAIL_ORDER_STORAGE_KEY = "tuanchat.mobile.spaceRail.order";
const EMPTY_SPACE_RAIL_ORDER: number[] = [];

export function useSpaceRailOrder(spaces: Space[]) {
  const { session } = useAuthSession();
  const userId = session?.userId;
  const [storedOrderState, setStoredOrderState] = useState<{ order: number[]; userId: number | null }>(() => ({
    order: [],
    userId: userId ?? null,
  }));
  const storedOrder = storedOrderState.userId === (userId ?? null) ? storedOrderState.order : EMPTY_SPACE_RAIL_ORDER;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let disposed = false;
    void readMobileKeyValue<number[]>(SPACE_RAIL_ORDER_STORAGE_KEY, {
      scope: "space-rail",
      userId,
    })
      .then((entry) => {
        if (!disposed) {
          setStoredOrderState({
            order: Array.isArray(entry?.value) ? entry.value : [],
            userId,
          });
        }
      })
      .catch((error) => {
        if (!disposed) {
          console.warn("[useSpaceRailOrder] 读取 space 顺序失败:", error);
          setStoredOrderState({ order: [], userId });
        }
      });

    return () => {
      disposed = true;
    };
  }, [userId]);

  const normalizedOrder = useMemo(() => pruneSpaceRailOrder(storedOrder, spaces), [spaces, storedOrder]);
  const orderedSpaces = useMemo(() => applySpaceRailOrder(spaces, normalizedOrder), [normalizedOrder, spaces]);

  const setSpaceRailOrder = useCallback((nextOrder: number[]) => {
    const prunedOrder = pruneSpaceRailOrder(nextOrder, spaces);
    setStoredOrderState({ order: prunedOrder, userId: userId ?? null });

    if (!userId) {
      return;
    }

    void writeMobileKeyValue(SPACE_RAIL_ORDER_STORAGE_KEY, prunedOrder, {
      scope: "space-rail",
      userId,
    }).catch((error) => {
      console.warn("[useSpaceRailOrder] 写入 space 顺序失败:", error);
    });
  }, [spaces, userId]);

  const resetSpaceRailOrder = useCallback(() => {
    setSpaceRailOrder(getSpaceRailIds(spaces));
  }, [setSpaceRailOrder, spaces]);

  return {
    orderedSpaces,
    orderedSpaceIds: normalizedOrder,
    resetSpaceRailOrder,
    setSpaceRailOrder,
  };
}
