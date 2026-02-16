import { create } from "zustand";

import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/descriptionDocId";

type EntityHeaderOverride = {
  title: string;
  imageUrl: string;
  updatedAt: number;
};

type EntityHeaderOverrideKey = `${DescriptionEntityType}:${number}`;

type EntityHeaderOverrideState = {
  headers: Record<string, EntityHeaderOverride>;
  hydrateFromLocalStorage: () => void;
  setHeader: (params: { entityType: DescriptionEntityType; entityId: number; header: { title: string; imageUrl: string } }) => void;
  clearHeader: (params: { entityType: DescriptionEntityType; entityId: number }) => void;
};

const STORAGE_KEY = "tc:entityHeaderOverride:v1";
const MAX_ENTRIES = 300;

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isSpaceHeaderKey(key: string): boolean {
  return key.startsWith("space:");
}

function buildKey(entityType: DescriptionEntityType, entityId: number): EntityHeaderOverrideKey {
  return `${entityType}:${entityId}`;
}

function sanitizeHeaders(headers: Record<string, EntityHeaderOverride>): Record<string, EntityHeaderOverride> {
  const out: Record<string, EntityHeaderOverride> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (isSpaceHeaderKey(k))
      continue;
    out[k] = v;
  }
  return out;
}

function tryReadFromLocalStorage(): Record<string, EntityHeaderOverride> {
  if (!canUseLocalStorage())
    return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {};
    const parsed = JSON.parse(raw) as any;
    if (!parsed || typeof parsed !== "object")
      return {};
    const map: Record<string, EntityHeaderOverride> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k !== "string" || !v || typeof v !== "object")
        continue;
      // 迁移：space 覆盖已弃用，读取阶段直接剔除。
      if (isSpaceHeaderKey(k))
        continue;
      const title = typeof (v as any).title === "string" ? (v as any).title : "";
      const imageUrl = typeof (v as any).imageUrl === "string" ? (v as any).imageUrl : "";
      const updatedAt = typeof (v as any).updatedAt === "number" ? (v as any).updatedAt : 0;
      if (!title && !imageUrl)
        continue;
      map[k] = { title, imageUrl, updatedAt };
    }
    return map;
  }
  catch {
    return {};
  }
}

function writeToLocalStorage(headers: Record<string, EntityHeaderOverride>) {
  if (!canUseLocalStorage())
    return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeHeaders(headers)));
  }
  catch {
    // ignore
  }
}

function prune(headers: Record<string, EntityHeaderOverride>): Record<string, EntityHeaderOverride> {
  const entries = Object.entries(sanitizeHeaders(headers));
  if (entries.length <= MAX_ENTRIES)
    return Object.fromEntries(entries);
  entries.sort((a, b) => (b[1]?.updatedAt ?? 0) - (a[1]?.updatedAt ?? 0));
  return Object.fromEntries(entries.slice(0, MAX_ENTRIES));
}

let hasHydrated = false;

export const useEntityHeaderOverrideStore = create<EntityHeaderOverrideState>(set => ({
  headers: {},

  hydrateFromLocalStorage: () => {
    if (hasHydrated)
      return;
    hasHydrated = true;
    const next = prune(tryReadFromLocalStorage());
    // 回写一次，清理本地 JSON 中历史的 space:* 覆盖键。
    writeToLocalStorage(next);
    if (Object.keys(next).length > 0) {
      set({ headers: next });
    }
  },

  setHeader: ({ entityType, entityId, header }) => {
    if (!Number.isFinite(entityId) || entityId <= 0)
      return;
    if (entityType === "space")
      return;

    const title = String(header.title ?? "").trim();
    const imageUrl = String(header.imageUrl ?? "").trim();
    const key = buildKey(entityType, entityId);

    set((prev) => {
      const existing = prev.headers[key];
      const nextHeaders = { ...prev.headers };
      if (!title && !imageUrl) {
        if (!existing) {
          return prev;
        }
        delete nextHeaders[key];
      }
      else {
        if (existing && existing.title === title && existing.imageUrl === imageUrl) {
          return prev;
        }
        nextHeaders[key] = { title, imageUrl, updatedAt: Date.now() };
      }

      const pruned = prune(nextHeaders);
      writeToLocalStorage(pruned);
      return { headers: pruned };
    });
  },

  clearHeader: ({ entityType, entityId }) => {
    if (!Number.isFinite(entityId) || entityId <= 0)
      return;
    const key = buildKey(entityType, entityId);
    set((prev) => {
      const nextHeaders = { ...prev.headers };
      if (prev.headers[key]) {
        delete nextHeaders[key];
      }
      const pruned = prune(nextHeaders);
      const hasChanged = Boolean(prev.headers[key]) || Object.keys(pruned).length !== Object.keys(prev.headers).length;
      if (!hasChanged)
        return prev;
      writeToLocalStorage(pruned);
      return { headers: pruned };
    });
  },
}));
