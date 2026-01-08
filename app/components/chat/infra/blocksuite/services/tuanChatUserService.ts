import type { AffineUserInfo, UserService } from "@blocksuite/affine/shared/services";
import type { Signal } from "@preact/signals-core";

import { signal } from "@preact/signals-core";

import { tuanchat } from "api/instance";

type CacheEntry = {
  userInfo$: Signal<AffineUserInfo | null>;
  loading$: Signal<boolean>;
  error$: Signal<string | null>;
  lastFetchedAt: number;
  inFlight: Promise<void> | null;
};

export type TuanChatUserService = UserService & {
  /** best-effort: warm up caches for picker UX */
  prefetch: (ids: string[]) => Promise<void>;
  /** best-effort: read current cache value */
  getCachedUserInfo: (id: string) => AffineUserInfo | null;
};

function normalizeId(id: string) {
  return String(id).trim();
}

function parseUserId(id: string): number | null {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0)
    return null;
  return n;
}

export function createTuanChatUserService(params?: {
  /** cache ttl in ms; default 10 minutes */
  ttlMs?: number;
}): TuanChatUserService {
  const ttlMs = params?.ttlMs ?? 10 * 60 * 1000;

  const cache = new Map<string, CacheEntry>();

  const getOrCreate = (idRaw: string): CacheEntry => {
    const id = normalizeId(idRaw);
    let existing = cache.get(id);
    if (existing)
      return existing;

    existing = {
      userInfo$: signal<AffineUserInfo | null>(null),
      loading$: signal(false),
      error$: signal<string | null>(null),
      lastFetchedAt: 0,
      inFlight: null,
    };
    cache.set(id, existing);
    return existing;
  };

  const fetchOne = async (idRaw: string) => {
    const id = normalizeId(idRaw);
    const entry = getOrCreate(id);

    const now = Date.now();
    if (entry.inFlight)
      return entry.inFlight;

    if (entry.userInfo$.value && now - entry.lastFetchedAt < ttlMs) {
      return Promise.resolve();
    }

    entry.loading$.value = true;
    entry.error$.value = null;

    const p = (async () => {
      try {
        const userId = parseUserId(id);
        if (!userId) {
          entry.userInfo$.value = { id, removed: true };
          return;
        }

        const resp = await tuanchat.userController.getUserInfo(userId);
        if (!resp.success) {
          entry.userInfo$.value = { id, removed: true };
          entry.error$.value = resp.errMsg ?? "Failed to load user";
          return;
        }

        const user = resp.data;
        if (!user) {
          entry.userInfo$.value = { id, removed: true };
          entry.error$.value = resp.errMsg ?? "User not found";
          return;
        }

        entry.userInfo$.value = {
          id,
          name: user.username ?? String(user.userId),
          avatar: user.avatar ?? null,
          removed: false,
        };
        entry.lastFetchedAt = Date.now();
      }
      catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        entry.userInfo$.value = { id, removed: true };
        entry.error$.value = message || "Failed to load user";
      }
      finally {
        entry.loading$.value = false;
        entry.inFlight = null;
      }
    })();

    entry.inFlight = p;
    return p;
  };

  const service: TuanChatUserService = {
    userInfo$: (id: string) => {
      const entry = getOrCreate(id);
      return entry.userInfo$;
    },
    isLoading$: (id: string) => {
      const entry = getOrCreate(id);
      return entry.loading$;
    },
    error$: (id: string) => {
      const entry = getOrCreate(id);
      return entry.error$;
    },
    revalidateUserInfo: (id: string) => {
      void fetchOne(id);
    },

    prefetch: async (ids: string[]) => {
      const uniq = Array.from(new Set(ids.map(normalizeId))).filter(Boolean);
      await Promise.all(uniq.map(fetchOne));
    },
    getCachedUserInfo: (id: string) => {
      return getOrCreate(id).userInfo$.value;
    },
  };

  return service;
}
