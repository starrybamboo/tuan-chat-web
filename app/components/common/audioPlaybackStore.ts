import { create } from "zustand";

export type AudioPlaybackKind = "bgm" | "chat" | "resource" | "role" | "unknown";

export type AudioPlaybackEntry = {
  id: string;
  kind: AudioPlaybackKind;
  title?: string;
  url?: string;
  startedAtMs?: number;
  isPlaying: boolean;
  pause?: () => void;
  stop?: () => void;
};

type AudioPlaybackState = {
  entriesById: Record<string, AudioPlaybackEntry | undefined>;

  register: (entry: Omit<AudioPlaybackEntry, "isPlaying"> & { isPlaying?: boolean }) => void;
  unregister: (id: string) => void;
  setPlaying: (id: string, isPlaying: boolean) => void;
  update: (id: string, patch: Partial<Omit<AudioPlaybackEntry, "id">>) => void;

  pause: (id: string) => void;
  stop: (id: string) => void;
};

export const useAudioPlaybackStore = create<AudioPlaybackState>((set, get) => ({
  entriesById: {},

  register: (entry) => {
    const existing = get().entriesById[entry.id];
    const next: AudioPlaybackEntry = {
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      url: entry.url,
      startedAtMs: entry.startedAtMs,
      isPlaying: entry.isPlaying ?? existing?.isPlaying ?? false,
      pause: entry.pause ?? existing?.pause,
      stop: entry.stop ?? existing?.stop,
    };

    set(state => ({
      ...state,
      entriesById: {
        ...state.entriesById,
        [entry.id]: next,
      },
    }));
  },

  unregister: (id) => {
    set((state) => {
      if (!state.entriesById[id])
        return state;

      const next = { ...state.entriesById };
      delete next[id];
      return { ...state, entriesById: next };
    });
  },

  setPlaying: (id, isPlaying) => {
    set((state) => {
      const existing = state.entriesById[id];
      if (!existing)
        return state;

      const next: AudioPlaybackEntry = {
        ...existing,
        isPlaying,
        startedAtMs: isPlaying ? (existing.startedAtMs ?? Date.now()) : existing.startedAtMs,
      };

      return {
        ...state,
        entriesById: {
          ...state.entriesById,
          [id]: next,
        },
      };
    });
  },

  update: (id, patch) => {
    set((state) => {
      const existing = state.entriesById[id];
      if (!existing)
        return state;

      const next: AudioPlaybackEntry = {
        ...existing,
        ...patch,
      };

      return {
        ...state,
        entriesById: {
          ...state.entriesById,
          [id]: next,
        },
      };
    });
  },

  pause: (id) => {
    const entry = get().entriesById[id];
    if (!entry?.pause)
      return;
    try {
      entry.pause();
    }
    catch {
      // ignore
    }
  },

  stop: (id) => {
    const entry = get().entriesById[id];
    if (!entry?.stop)
      return;
    try {
      entry.stop();
    }
    catch {
      // ignore
    }
  },
}));
