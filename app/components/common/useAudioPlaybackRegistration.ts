import { useEffect, useRef } from "react";

import type { AudioPlaybackKind } from "@/components/common/audioPlaybackStore";

import { useAudioPlaybackStore } from "@/components/common/audioPlaybackStore";

export type UseAudioPlaybackRegistrationOptions = {
  kind: AudioPlaybackKind;
  title?: string;
  url?: string;
  pause?: () => void;
  stop?: () => void;
  /** 可选：外部提供稳定 id，否则自动生成 */
  id?: string;
};

function createStableId(prefix: string): string {
  return `${prefix}:${Date.now().toString(16)}:${Math.random().toString(16).slice(2)}`;
}

export function useAudioPlaybackRegistration(options: UseAudioPlaybackRegistrationOptions) {
  const idRef = useRef<string>(options.id || createStableId("audio"));
  const initialOptionsRef = useRef(options);

  useEffect(() => {
    const id = idRef.current;
    const initial = initialOptionsRef.current;
    useAudioPlaybackStore.getState().register({
      id,
      kind: initial.kind,
      title: initial.title,
      url: initial.url,
      pause: initial.pause,
      stop: initial.stop,
    });

    return () => {
      useAudioPlaybackStore.getState().unregister(id);
    };
  }, []);

  useEffect(() => {
    useAudioPlaybackStore.getState().update(idRef.current, {
      kind: options.kind,
      title: options.title,
      url: options.url,
      pause: options.pause,
      stop: options.stop,
    });
  }, [options.kind, options.pause, options.stop, options.title, options.url]);

  const setPlaying = (isPlaying: boolean) => {
    useAudioPlaybackStore.getState().setPlaying(idRef.current, isPlaying);
  };

  const update = (patch: Partial<{ title?: string; url?: string }>) => {
    useAudioPlaybackStore.getState().update(idRef.current, patch);
  };

  return {
    id: idRef.current,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    update,
  };
}
