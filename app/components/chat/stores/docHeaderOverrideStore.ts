import { create } from "zustand";

type DocHeaderOverride = {
  title: string;
  imageUrl: string;
  updatedAt: number;
};

type DocHeaderOverrideState = {
  headers: Record<string, DocHeaderOverride>;
  hydrateFromLocalStorage: () => void;
  setHeader: (params: { docId: string; header: { title: string; imageUrl: string } }) => void;
  clearHeader: (params: { docId: string }) => void;
};

const STORAGE_KEY = "tc:docHeaderOverride:v1";
const MAX_ENTRIES = 300;

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeDocId(docId: unknown): string {
  return typeof docId === "string" ? docId.trim() : "";
}

function tryReadFromLocalStorage(): Record<string, DocHeaderOverride> {
  if (!canUseLocalStorage())
    return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {};
    const parsed = JSON.parse(raw) as any;
    if (!parsed || typeof parsed !== "object")
      return {};
    const map: Record<string, DocHeaderOverride> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const key = normalizeDocId(k);
      if (!key || !v || typeof v !== "object")
        continue;
      const title = typeof (v as any).title === "string" ? (v as any).title : "";
      const imageUrl = typeof (v as any).imageUrl === "string" ? (v as any).imageUrl : "";
      const updatedAt = typeof (v as any).updatedAt === "number" ? (v as any).updatedAt : 0;
      if (!title && !imageUrl)
        continue;
      map[key] = { title, imageUrl, updatedAt };
    }
    return map;
  }
  catch {
    return {};
  }
}

function writeToLocalStorage(headers: Record<string, DocHeaderOverride>) {
  if (!canUseLocalStorage())
    return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(headers));
  }
  catch {
    // ignore
  }
}

function prune(headers: Record<string, DocHeaderOverride>): Record<string, DocHeaderOverride> {
  const entries = Object.entries(headers);
  if (entries.length <= MAX_ENTRIES)
    return headers;
  entries.sort((a, b) => (b[1]?.updatedAt ?? 0) - (a[1]?.updatedAt ?? 0));
  return Object.fromEntries(entries.slice(0, MAX_ENTRIES));
}

let hasHydrated = false;

export const useDocHeaderOverrideStore = create<DocHeaderOverrideState>(set => ({
  headers: {},

  hydrateFromLocalStorage: () => {
    if (hasHydrated)
      return;
    hasHydrated = true;
    const next = tryReadFromLocalStorage();
    if (Object.keys(next).length > 0) {
      set({ headers: next });
    }
  },

  setHeader: ({ docId, header }) => {
    const key = normalizeDocId(docId);
    if (!key)
      return;

    const title = String(header.title ?? "").trim();
    const imageUrl = String(header.imageUrl ?? "").trim();

    set((prev) => {
      const nextHeaders = { ...prev.headers };
      if (!title && !imageUrl) {
        delete nextHeaders[key];
      }
      else {
        nextHeaders[key] = { title, imageUrl, updatedAt: Date.now() };
      }

      const pruned = prune(nextHeaders);
      writeToLocalStorage(pruned);
      return { headers: pruned };
    });
  },

  clearHeader: ({ docId }) => {
    const key = normalizeDocId(docId);
    if (!key)
      return;
    set((prev) => {
      if (!prev.headers[key])
        return prev;
      const nextHeaders = { ...prev.headers };
      delete nextHeaders[key];
      writeToLocalStorage(nextHeaders);
      return { headers: nextHeaders };
    });
  },
}));
