import type { ExtensionType } from "@blocksuite/store";
import type { Signal } from "@preact/signals-core";
import type { QueryClient } from "@tanstack/react-query";

import { createIdentifier } from "@blocksuite/global/di";
import { signal } from "@preact/signals-core";

import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { avatarThumbUrl } from "@/utils/mediaUrl";
import { fetchRoleWithCache } from "api/hooks/RoleAndAvatarHooks";
import { tuanchat } from "api/instance";

export type BlocksuiteRoleInfo = {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
  type?: number;
  removed: boolean;
};

type CacheEntry = {
  roleInfo$: Signal<BlocksuiteRoleInfo | null>;
  loading$: Signal<boolean>;
  error$: Signal<string | null>;
  lastFetchedAt: number;
  inFlight: Promise<void> | null;
};

export type TuanChatRoleService = {
  roleInfo$: (id: string) => Signal<BlocksuiteRoleInfo | null>;
  isLoading$: (id: string) => Signal<boolean>;
  error$: (id: string) => Signal<string | null>;
  revalidateRoleInfo: (id: string) => void;
  prefetch: (ids: string[]) => Promise<void>;
  getCachedRoleInfo: (id: string) => BlocksuiteRoleInfo | null;
  seedRoles: (roles: Array<UserRole | null | undefined>) => void;
};

export const BlocksuiteRoleProvider = createIdentifier<TuanChatRoleService>(
  "tc-blocksuite-role-service",
);

export function BlocksuiteRoleServiceExtension(service: TuanChatRoleService): ExtensionType {
  return {
    setup(di) {
      di.addImpl(BlocksuiteRoleProvider, () => service);
    },
  };
}

function normalizeId(id: string) {
  return String(id ?? "").trim();
}

function parseRoleId(id: string): number | null {
  const value = Number(id);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function toRoleInfo(id: string, role: UserRole): BlocksuiteRoleInfo {
  return {
    id,
    name: role.roleName?.trim() || `角色${id}`,
    avatar: avatarThumbUrl(role.avatarFileId) || null,
    description: role.description?.trim() || null,
    type: role.type,
    removed: false,
  };
}

export function createTuanChatRoleService(params?: {
  ttlMs?: number;
  queryClient?: QueryClient;
}): TuanChatRoleService {
  const ttlMs = params?.ttlMs ?? 10 * 60 * 1000;
  const queryClient = params?.queryClient;
  const cache = new Map<string, CacheEntry>();

  const getOrCreate = (idRaw: string): CacheEntry => {
    const id = normalizeId(idRaw);
    let entry = cache.get(id);
    if (entry) {
      return entry;
    }

    entry = {
      roleInfo$: signal<BlocksuiteRoleInfo | null>(null),
      loading$: signal(false),
      error$: signal<string | null>(null),
      lastFetchedAt: 0,
      inFlight: null,
    };
    cache.set(id, entry);
    return entry;
  };

  const setRemoved = (id: string, message?: string | null) => {
    const entry = getOrCreate(id);
    entry.roleInfo$.value = {
      id,
      name: `角色${id}`,
      avatar: null,
      description: null,
      removed: true,
    };
    entry.error$.value = message ?? null;
  };

  const fetchOne = async (idRaw: string) => {
    const id = normalizeId(idRaw);
    const entry = getOrCreate(id);
    const now = Date.now();

    if (entry.inFlight) {
      return entry.inFlight;
    }

    if (entry.roleInfo$.value && now - entry.lastFetchedAt < ttlMs) {
      return Promise.resolve();
    }

    entry.loading$.value = true;
    entry.error$.value = null;

    const task = (async () => {
      try {
        const roleId = parseRoleId(id);
        if (!roleId) {
          setRemoved(id, "Invalid role id");
          return;
        }

        const response = queryClient
          ? await fetchRoleWithCache(queryClient, roleId)
          : await tuanchat.roleController.getRole(roleId);
        if (!response.success || !response.data) {
          setRemoved(id, response.errMsg ?? "Failed to load role");
          return;
        }

        entry.roleInfo$.value = toRoleInfo(id, response.data);
        entry.lastFetchedAt = Date.now();
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setRemoved(id, message || "Failed to load role");
      }
      finally {
        entry.loading$.value = false;
        entry.inFlight = null;
      }
    })();

    entry.inFlight = task;
    return task;
  };

  const seedRoles = (roles: Array<UserRole | null | undefined>) => {
    roles.forEach((role) => {
      const roleId = role?.roleId;
      if (!Number.isFinite(roleId) || !roleId || roleId <= 0) {
        return;
      }

      const id = String(roleId);
      const entry = getOrCreate(id);
      entry.roleInfo$.value = toRoleInfo(id, role);
      entry.error$.value = null;
      entry.loading$.value = false;
      entry.lastFetchedAt = Date.now();
    });
  };

  return {
    roleInfo$: id => getOrCreate(id).roleInfo$,
    isLoading$: id => getOrCreate(id).loading$,
    error$: id => getOrCreate(id).error$,
    revalidateRoleInfo: (id: string) => {
      void fetchOne(id);
    },
    prefetch: async (ids: string[]) => {
      const uniqueIds = Array.from(new Set(ids.map(normalizeId))).filter(Boolean);
      await Promise.all(uniqueIds.map(fetchOne));
    },
    getCachedRoleInfo: (id: string) => getOrCreate(id).roleInfo$.value,
    seedRoles,
  };
}
