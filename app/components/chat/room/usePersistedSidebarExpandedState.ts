import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSidebarExpandedMap, setSidebarExpandedMap } from "@/components/chat/infra/indexedDB/sidebarTreeUiDb";

type UsePersistedSidebarExpandedStateParams = {
  activeSpaceId: number | null;
  currentUserId?: number | null;
  storageScope: string;
  validKeys: string[];
  initialExpandedKeys?: string[];
};

type UsePersistedSidebarExpandedStateResult = {
  expandedByKey: Record<string, boolean> | null;
  toggleExpanded: (key: string) => void;
};

function buildExpandedMap(keys: string[]): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const key of keys) {
    next[key] = true;
  }
  return next;
}

function normalizeExpandedMap(params: {
  raw: Record<string, boolean> | null | undefined;
  validKeys: string[];
  initialExpandedKeys?: string[];
}): Record<string, boolean> {
  const validKeySet = new Set(params.validKeys);
  const source = params.raw ?? buildExpandedMap((params.initialExpandedKeys ?? []).filter(key => validKeySet.has(key)));
  const next: Record<string, boolean> = {};

  for (const [key, expanded] of Object.entries(source)) {
    if (expanded && validKeySet.has(key)) {
      next[key] = true;
    }
  }

  return next;
}

function isSameExpandedMap(a: Record<string, boolean> | null, b: Record<string, boolean>): boolean {
  if (!a) {
    return Object.keys(b).length === 0;
  }

  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key, index) => key === bKeys[index]);
}

export default function usePersistedSidebarExpandedState({
  activeSpaceId,
  currentUserId,
  storageScope,
  validKeys,
  initialExpandedKeys,
}: UsePersistedSidebarExpandedStateParams): UsePersistedSidebarExpandedStateResult {
  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean> | null>(null);
  const lastStorageIdentityRef = useRef<string | null>(null);
  const normalizedInitialExpandedMap = useMemo(() => {
    return normalizeExpandedMap({
      raw: null,
      validKeys,
      initialExpandedKeys,
    });
  }, [initialExpandedKeys, validKeys]);
  const validKeySet = useMemo(() => new Set(validKeys), [validKeys]);

  useEffect(() => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      queueMicrotask(() => setExpandedByKey(null));
      lastStorageIdentityRef.current = null;
      return;
    }

    const storageIdentity = `${typeof currentUserId === "number" ? currentUserId : "anon"}:${activeSpaceId}:${storageScope}`;
    if (storageIdentity === lastStorageIdentityRef.current) {
      return;
    }

    lastStorageIdentityRef.current = storageIdentity;
    queueMicrotask(() => setExpandedByKey(normalizedInitialExpandedMap));
    getSidebarExpandedMap({
      userId: currentUserId,
      spaceId: activeSpaceId,
      scope: storageScope,
    })
      .then((stored) => {
        setExpandedByKey(normalizeExpandedMap({
          raw: stored,
          validKeys,
          initialExpandedKeys,
        }));
      })
      .catch(() => {
        setExpandedByKey(normalizedInitialExpandedMap);
      });
  }, [activeSpaceId, currentUserId, initialExpandedKeys, normalizedInitialExpandedMap, storageScope, validKeys]);

  useEffect(() => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      return;
    }
    if (!expandedByKey) {
      return;
    }

    const next = normalizeExpandedMap({
      raw: expandedByKey,
      validKeys,
    });
    if (isSameExpandedMap(expandedByKey, next)) {
      return;
    }

    queueMicrotask(() => setExpandedByKey(next));
    setSidebarExpandedMap({
      userId: currentUserId,
      spaceId: activeSpaceId,
      scope: storageScope,
      expandedByKey: next,
    }).catch(() => {
      // ignore
    });
  }, [activeSpaceId, currentUserId, expandedByKey, storageScope, validKeys]);

  const toggleExpanded = useCallback((key: string) => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      return;
    }
    if (!validKeySet.has(key)) {
      return;
    }

    setExpandedByKey((prev) => {
      const base = prev ?? normalizedInitialExpandedMap;
      const next = { ...base };
      if (next[key]) {
        delete next[key];
      }
      else {
        next[key] = true;
      }

      setSidebarExpandedMap({
        userId: currentUserId,
        spaceId: activeSpaceId,
        scope: storageScope,
        expandedByKey: next,
      }).catch(() => {
        // ignore
      });

      return next;
    });
  }, [activeSpaceId, currentUserId, normalizedInitialExpandedMap, storageScope, validKeySet]);

  return {
    expandedByKey,
    toggleExpanded,
  };
}
