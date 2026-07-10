import type { QuerySnapshotEntry } from "@tuanchat/local-db";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  readMobileQuerySnapshot,
  writeMobileQuerySnapshot,
} from "./mobile-query-snapshot-cache";

const MOBILE_QUERY_SNAPSHOT_WRITE_DEDUPE_WINDOW_MS = 60_000;

type SnapshotBackedQuery<T> = {
  data?: T;
  isLoading?: boolean;
  isPending?: boolean;
  isSuccess?: boolean;
};

export type MobileQuerySnapshotOptions<T> = {
  enabled?: boolean;
  key: string;
  scope?: string | null;
  ttlMs?: number | null;
  userId?: number | null;
  preparePayload?: (data: T) => T;
};

export type SnapshotHydrationState<T> = {
  entry: QuerySnapshotEntry<T> | null;
  key: string;
};

export type MobileQuerySnapshotWriteInput<T> = {
  key: string;
  payload: T;
  scope?: string | null;
  ttlMs?: number | null;
  userId?: number | null;
};

export type MobileQuerySnapshotWriteState = {
  completedAt: number | null;
  completedSignature: string | null;
  pendingSignature: string | null;
};

export function stableStringifyMobileQueryKey(value: unknown): string {
  const serialized = JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }

    return Object.keys(item as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = (item as Record<string, unknown>)[key];
        return result;
      }, {});
  });
  return typeof serialized === "string" ? serialized : String(value);
}

export function createMobileQuerySnapshotKey(parts: readonly unknown[]): string {
  return stableStringifyMobileQueryKey(parts);
}

export function isPositiveMobileUserId(userId: number | null | undefined): userId is number {
  return Number.isInteger(userId) && Number(userId) > 0;
}

export function canUseMobileUserScopedSnapshot(options: {
  enabled?: boolean;
  isAuthenticated: boolean;
  userId?: number | null;
}): boolean {
  return Boolean((options.enabled ?? true) && options.isAuthenticated && isPositiveMobileUserId(options.userId));
}

export function getSnapshotHydratedData<T>(
  networkData: T | undefined,
  hydrationState: SnapshotHydrationState<T> | null,
  key: string,
  networkDataAvailable = networkData !== undefined,
): T | undefined {
  if (networkDataAvailable) {
    return networkData;
  }
  return hydrationState?.key === key ? hydrationState.entry?.payload : undefined;
}

export function isSnapshotBackedPending<T>(
  query: SnapshotBackedQuery<T>,
  hydratedData: T | undefined,
): boolean {
  return Boolean(query.isPending && hydratedData === undefined);
}

export function isSnapshotBackedLoading<T>(
  query: SnapshotBackedQuery<T>,
  hydratedData: T | undefined,
): boolean {
  return Boolean(query.isLoading && hydratedData === undefined);
}

export function isRestoredFromSnapshot<T>(networkData: T | undefined, hydratedData: T | undefined): boolean {
  return networkData === undefined && hydratedData !== undefined;
}

export function isRestoredFromMobileSnapshot<T>(
  networkData: T | undefined,
  hydratedData: T | undefined,
  networkDataAvailable: boolean,
): boolean {
  return !networkDataAvailable && hydratedData !== undefined;
}

export function createMobileQuerySnapshotWriteInput<T>(
  data: T,
  options: MobileQuerySnapshotOptions<T>,
): MobileQuerySnapshotWriteInput<T> {
  return {
    key: options.key,
    payload: options.preparePayload ? options.preparePayload(data) : data,
    scope: options.scope,
    ttlMs: options.ttlMs,
    userId: options.userId,
  };
}

export function createMobileQuerySnapshotWriteSignature<T>(input: MobileQuerySnapshotWriteInput<T>): string {
  return stableStringifyMobileQueryKey({
    key: input.key,
    payload: input.payload,
    scope: input.scope ?? null,
    ttlMs: input.ttlMs ?? null,
    userId: input.userId ?? null,
  });
}

export function shouldSkipMobileQuerySnapshotWrite(
  state: MobileQuerySnapshotWriteState,
  signature: string,
  now: number,
  dedupeWindowMs = MOBILE_QUERY_SNAPSHOT_WRITE_DEDUPE_WINDOW_MS,
): boolean {
  if (state.pendingSignature === signature) {
    return true;
  }
  if (state.completedSignature !== signature || state.completedAt == null) {
    return false;
  }
  return now - state.completedAt < dedupeWindowMs;
}

export function shouldWriteMobileQuerySnapshot<T>(
  query: SnapshotBackedQuery<T>,
  enabled: boolean,
): query is SnapshotBackedQuery<T> & { data: T; isSuccess: true } {
  return Boolean(enabled && query.isSuccess && query.data !== undefined);
}

// 该 hook 只提供 query 的冷启动/离线恢复快照；业务判断必须优先看网络 query 状态。
export function useMobileQuerySnapshot<T, Q extends SnapshotBackedQuery<T>>(
  query: Q,
  options: MobileQuerySnapshotOptions<T>,
): Q & {
  data: T | undefined;
  isLoading: boolean;
  isPending: boolean;
  isRestoredFromSnapshot: boolean;
  snapshotData: T | undefined;
} {
  const {
    key,
    preparePayload,
    scope,
    ttlMs,
    userId,
  } = options;
  const enabled = options.enabled ?? true;
  const [hydrationState, setHydrationState] = useState<SnapshotHydrationState<T> | null>(null);
  const writeStateRef = useRef<MobileQuerySnapshotWriteState>({
    completedAt: null,
    completedSignature: null,
    pendingSignature: null,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;
    void readMobileQuerySnapshot<T>(key, {
      scope,
      userId,
    })
      .then((entry) => {
        if (!disposed) {
          setHydrationState({ entry, key });
        }
      })
      .catch((error) => {
        if (!disposed) {
          console.warn("[useMobileQuerySnapshot] 读取 query 快照失败:", error);
          setHydrationState({ entry: null, key });
        }
      });

    return () => {
      disposed = true;
    };
  }, [enabled, key, scope, userId]);

  const networkDataAvailable = Boolean(query.isSuccess);
  const activeHydrationState = enabled ? hydrationState : null;
  const hydratedData = useMemo(
    () => getSnapshotHydratedData(query.data, activeHydrationState, key, networkDataAvailable),
    [activeHydrationState, key, networkDataAvailable, query.data],
  );
  const snapshotData = activeHydrationState?.key === key
    ? activeHydrationState.entry?.payload
    : undefined;

  useEffect(() => {
    if (!enabled || !query.isSuccess || query.data === undefined) {
      return;
    }

    const queryData = query.data;
    const input = createMobileQuerySnapshotWriteInput(queryData, {
      key,
      preparePayload,
      scope,
      ttlMs,
      userId,
    });
    const signature = createMobileQuerySnapshotWriteSignature(input);
    const now = Date.now();
    if (shouldSkipMobileQuerySnapshotWrite(writeStateRef.current, signature, now)) {
      return;
    }

    writeStateRef.current.pendingSignature = signature;
    void writeMobileQuerySnapshot<T>(input).then(() => {
      if (writeStateRef.current.pendingSignature === signature) {
        writeStateRef.current = {
          completedAt: Date.now(),
          completedSignature: signature,
          pendingSignature: null,
        };
      }
    }).catch((error) => {
      if (writeStateRef.current.pendingSignature === signature) {
        writeStateRef.current = {
          ...writeStateRef.current,
          pendingSignature: null,
        };
      }
      console.warn("[useMobileQuerySnapshot] 写入 query 快照失败:", error);
    });
  }, [
    enabled,
    key,
    preparePayload,
    query.data,
    query.isSuccess,
    scope,
    ttlMs,
    userId,
  ]);

  return {
    ...query,
    data: hydratedData,
    isLoading: isSnapshotBackedLoading(query, hydratedData),
    isPending: isSnapshotBackedPending(query, hydratedData),
    isRestoredFromSnapshot: isRestoredFromMobileSnapshot(query.data, hydratedData, networkDataAvailable),
    snapshotData,
  };
}
