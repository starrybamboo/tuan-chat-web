import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getSidebarExpandedMap, setSidebarExpandedMap } from "@/components/chat/infra/localDb/sidebarTreeUiDb";

type UsePersistedSidebarExpandedStateParams = {
  activeSpaceId: number | null;
  currentUserId?: number | null;
  storageScope: string;
  validKeys: string[];
  initialExpandedKeys?: string[];
};

type UsePersistedSidebarExpandedStateResult = {
  expandedByKey: Record<string, boolean> | null;
  setExpanded: (key: string, expanded: boolean) => void;
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
  const storedExpandedMapRef = useRef<Record<string, boolean> | null | undefined>(undefined);
  const localWriteSeqRef = useRef(0);
  const latestValidKeysRef = useRef(validKeys);
  const latestInitialExpandedKeysRef = useRef(initialExpandedKeys);
  const normalizedInitialExpandedMap = useMemo(() => {
    return normalizeExpandedMap({
      raw: null,
      validKeys,
      initialExpandedKeys,
    });
  }, [initialExpandedKeys, validKeys]);
  const validKeySet = useMemo(() => new Set(validKeys), [validKeys]);
  const normalizeWithLatestKeys = useCallback((raw: Record<string, boolean> | null | undefined) => {
    return normalizeExpandedMap({
      raw,
      validKeys: latestValidKeysRef.current,
      initialExpandedKeys: latestInitialExpandedKeysRef.current,
    });
  }, []);

  useEffect(() => {
    latestValidKeysRef.current = validKeys;
    latestInitialExpandedKeysRef.current = initialExpandedKeys;
  }, [initialExpandedKeys, validKeys]);

  useEffect(() => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      setExpandedByKey(null);
      lastStorageIdentityRef.current = null;
      storedExpandedMapRef.current = undefined;
      return;
    }

    const storageIdentity = `${typeof currentUserId === "number" ? currentUserId : "anon"}:${activeSpaceId}:${storageScope}`;
    if (storageIdentity === lastStorageIdentityRef.current) {
      if (storedExpandedMapRef.current !== undefined) {
        setExpandedByKey(normalizeWithLatestKeys(storedExpandedMapRef.current));
      }
      return;
    }

    lastStorageIdentityRef.current = storageIdentity;
    storedExpandedMapRef.current = undefined;
    setExpandedByKey(normalizeWithLatestKeys(null));
    const readStartedAtWriteSeq = localWriteSeqRef.current;
    getSidebarExpandedMap({
      userId: currentUserId,
      spaceId: activeSpaceId,
      scope: storageScope,
    })
      .then((stored) => {
        if (lastStorageIdentityRef.current !== storageIdentity) {
          return;
        }
        if (localWriteSeqRef.current !== readStartedAtWriteSeq) {
          return;
        }
        storedExpandedMapRef.current = stored;
        setExpandedByKey(normalizeWithLatestKeys(stored));
      })
      .catch(() => {
        if (lastStorageIdentityRef.current !== storageIdentity) {
          return;
        }
        if (localWriteSeqRef.current !== readStartedAtWriteSeq) {
          return;
        }
        storedExpandedMapRef.current = null;
        setExpandedByKey(normalizeWithLatestKeys(null));
      });
  }, [
    activeSpaceId,
    currentUserId,
    initialExpandedKeys,
    normalizeWithLatestKeys,
    storageScope,
    validKeys,
  ]);

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

    setExpandedByKey(next);
  }, [activeSpaceId, expandedByKey, validKeys]);

  const setExpanded = useCallback((key: string, expanded: boolean) => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      return;
    }
    if (!validKeySet.has(key)) {
      return;
    }

    setExpandedByKey((prev) => {
      const base = prev ?? normalizedInitialExpandedMap;
      if (Boolean(base[key]) === expanded) {
        return prev;
      }

      const nextRaw = { ...(storedExpandedMapRef.current ?? base) };
      if (expanded) {
        nextRaw[key] = true;
      }
      else {
        delete nextRaw[key];
      }
      localWriteSeqRef.current += 1;
      storedExpandedMapRef.current = nextRaw;
      const next = normalizeWithLatestKeys(nextRaw);

      setSidebarExpandedMap({
        userId: currentUserId,
        spaceId: activeSpaceId,
        scope: storageScope,
        expandedByKey: nextRaw,
      }).catch(() => {
        // ignore
      });

      return next;
    });
  }, [activeSpaceId, currentUserId, normalizeWithLatestKeys, normalizedInitialExpandedMap, storageScope, validKeySet]);

  const toggleExpanded = useCallback((key: string) => {
    if (activeSpaceId == null || !Number.isFinite(activeSpaceId) || activeSpaceId <= 0) {
      return;
    }
    if (!validKeySet.has(key)) {
      return;
    }

    setExpandedByKey((prev) => {
      const base = prev ?? normalizedInitialExpandedMap;
      const nextRaw = { ...(storedExpandedMapRef.current ?? base) };
      if (base[key]) {
        delete nextRaw[key];
      }
      else {
        nextRaw[key] = true;
      }
      localWriteSeqRef.current += 1;
      storedExpandedMapRef.current = nextRaw;
      const next = normalizeWithLatestKeys(nextRaw);

      setSidebarExpandedMap({
        userId: currentUserId,
        spaceId: activeSpaceId,
        scope: storageScope,
        expandedByKey: nextRaw,
      }).catch(() => {
        // ignore
      });

      return next;
    });
  }, [activeSpaceId, currentUserId, normalizeWithLatestKeys, normalizedInitialExpandedMap, storageScope, validKeySet]);

  return {
    expandedByKey,
    setExpanded,
    toggleExpanded,
  };
}
